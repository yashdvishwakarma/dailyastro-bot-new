const queue = [];
const perChatCooldown = new Map();
let processing = false;

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

export function enqueueMessage(bot, method, chatId, payload, options = {}) {
  console.log(`[Queue] ${method} → ${chatId} (${queue.length} waiting)`);
  return new Promise((resolve, reject) => {
    queue.push({ bot, method, chatId, payload, options, resolve, reject });
    processQueue();
  });
}

async function processQueue() {
  if (processing) return;
  processing = true;

  while (queue.length > 0) {
    const item = queue.shift();
    const { bot, method, chatId, payload, options, resolve, reject } = item;

    const last = perChatCooldown.get(chatId) || 0;
    const since = Date.now() - last;
    if (since < 1200) await sleep(1200 - since);

    try {
      let result;
      if (method === 'sendMessage') result = await bot._origSendMessage(chatId, payload, options);
      else if (method === 'sendChatAction') result = await bot._origSendChatAction(chatId, payload);

      perChatCooldown.set(chatId, Date.now());
      await sleep(500); // global pacing
      resolve(result);
    } catch (err) {
      if (err.code === 'ETELEGRAM' && err.response?.body?.parameters?.retry_after) {
        const retry = err.response.body.parameters.retry_after * 1000;
        console.warn(`⏳ Telegram rate limit hit. Retrying in ${retry / 1000}s`);
        queue.unshift(item);
        await sleep(retry + 200);
      } else reject(err);
    }
  }

  processing = false;
}
