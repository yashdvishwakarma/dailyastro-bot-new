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
}

export const databaseService = new DatabaseService();