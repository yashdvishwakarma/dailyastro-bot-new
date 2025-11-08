// utils/TelegramUtils.js
export async function safeSendMessage(bot, chatId, text, options = {}, attempt = 1) {
  try {
    await sleep(Math.random() * 500 + 200);
    return await bot.sendMessage(chatId, text, options);
  } catch (error) {
    if (error.code === 'TETELEGRAM' && error.response?.body?.error_code === 429) {
      const retryAfter = error.response.body.parameters.retry_after || 5;
      console.warn(`⏳ Rate limited (message). Retrying after ${retryAfter}s...`);
      await sleep((retryAfter + 1) * 1000);
      return safeSendMessage(bot, chatId, text, options, attempt + 1);
    } else {
      console.error('🚨 Telegram send error:', error.message);
    }
  }
}

export async function safeSendChatAction(bot, chatId, action, attempt = 1) {
  try {
    return await bot.sendChatAction(chatId, action);
  } catch (error) {
    if (error.code === 'TETELEGRAM' && error.response?.body?.error_code === 429) {
      const retryAfter = error.response.body.parameters.retry_after || 5;
      console.warn(`⏳ Rate limited (action). Retrying after ${retryAfter}s...`);
      await sleep((retryAfter + 1) * 1000);
      return safeSendChatAction(bot, chatId, action, attempt + 1);
    } else {
      console.error('🚨 Telegram action error:', error.message);
    }
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
