import { createClient } from '@supabase/supabase-js';
import { config } from '../config.js';

export class DatabaseService {
  constructor() {
    this.supabase = createClient(config.supabase.url, config.supabase.key);
  }

  async getUser(chatId) {
    const { data, error } = await this.supabase
      .from('users')
      .select('*')
      .eq('chat_id', chatId.toString())
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Get user error:', error);
    }
    
    return data;
  }

  async createUser(userData) {
    const { error } = await this.supabase
      .from('users')
      .insert(userData);

    if (error) {
      console.error('Create user error:', error);
    }
  }

  async updateUser(chatId, updates) {
    const { error } = await this.supabase
      .from('users')
      .update({
        ...updates,
        last_interaction: new Date().toISOString()
      })
      .eq('chat_id', chatId.toString());

    if (error) {
      console.error('Update user error:', error);
    }
  }

  async storeMessage(chatId, sender, message, emotion = null) {
    const { error } = await this.supabase
      .from('conversation_history')
      .insert({
        chat_id: chatId.toString(),
        sender,
        message,
        emotion_tone: emotion,
        created_at: new Date().toISOString()
      });

    if (error) {
      console.error('Store message error:', error);
    }
  }

  async getRecentMessages(chatId, limit = 10) {
    const { data } = await this.supabase
      .from('conversation_history')
      .select('*')
      .eq('chat_id', chatId.toString())
      .order('created_at', { ascending: false })
      .limit(limit);

    return data || [];
  }

  async getMessageCount(chatId) {
    const { count } = await this.supabase
      .from('conversation_history')
      .select('*', { count: 'exact', head: true })
      .eq('chat_id', chatId.toString());

    return count || 0;
  }

  // Add these methods to your existing DatabaseService class:

async getBotConsciousness() {
  const { data } = await this.supabase
    .from('bot_consciousness')
    .select('*')
    .single();
  return data;
}

async createBotConsciousness(consciousness) {
  const { error } = await this.supabase
    .from('bot_consciousness')
    .insert(consciousness);
  if (error) console.error('Create consciousness error:', error);
}

async updateBotConsciousness(updates) {
  const { error } = await this.supabase
    .from('bot_consciousness')
    .update(updates)
    .eq('id', 1);  // Single row for bot state
  if (error) console.error('Update consciousness error:', error);
}

async getCurrentThread(chatId) {
  const { data } = await this.supabase
    .from('conversation_threads')
    .select('*')
    .eq('chat_id', chatId.toString())
    .eq('thread_status', 'active')
    .single();
  return data;
}

async getActiveUsers() {
  const { data } = await this.supabase
    .from('users')
    .select('*')
    .gt('last_interaction', new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString());
  return data || [];
}
}


export default DatabaseService;