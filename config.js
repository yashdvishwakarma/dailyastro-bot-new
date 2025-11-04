import dotenv from 'dotenv';
dotenv.config();

export const config = {
  telegram: {
    token: process.env.TELEGRAM_TOKEN,
    webhookUrl: process.env.RENDER_EXTERNAL_URL || process.env.VERCEL_URL || 'http://localhost:3000'
  },
  openai: {
    apiKey: process.env.OPENAI_KEY,
    model: 'gpt-3.5-turbo',
    maxTokens: 150,
    temperature: 0.85
  },
  supabase: {
    url: process.env.SUPABASE_URL,
    key: process.env.SUPABASE_KEY
  },
  server: {
    port: process.env.PORT || 3000
  }
};

// Validate required config
const required = ['telegram.token', 'openai.apiKey', 'supabase.url', 'supabase.key'];
required.forEach(key => {
  const value = key.split('.').reduce((obj, k) => obj?.[k], config);
  if (!value) {
    console.error(`❌ Missing required config: ${key}`);
    process.exit(1);
  }
});