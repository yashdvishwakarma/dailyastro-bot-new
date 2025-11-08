import { hookGenerationService } from './HookGenerationService.js';
import { databaseService } from './DatabaseService.js';
import { enqueueMessage } from '../utils/TelegramQueue.js';
import { bot } from '../bot.js';

class EngagementService {
  constructor() {
    this.hookSchedule = { 1: 6, 2: 12, 3: 24 };
  }

  async checkInactiveUsers() {
    try {
      console.log('🔍 Checking for inactive users...');
      const users = await this.getUsersNeedingHooks();
      console.log(`Found ${users.length} users needing hooks`);

      for (const user of users) {
        try {
          await this.sendHookToUser(user);
          await this.delay(2000); // Small gap to prevent bursts
        } catch (error) {
          console.error(`Error sending hook to ${user.chat_id}:`, error);
        }
      }
    } catch (error) {
      console.error('Error in checkInactiveUsers:', error);
    }
  }

  async getUsersNeedingHooks() {
    const now = new Date();
    const users = [];

    try {
      const { data: states, error } = await databaseService.supabase
        .from('user_engagement_state')
        .select('*')
        .eq('is_active', true)
        .order('last_message_at', { ascending: true });

      if (error) throw error;

      for (const s of states) {
        const hrsSilent = (now - new Date(s.last_message_at)) / 36e5;
        const hrsSinceHook = s.last_hook_sent_at ? (now - new Date(s.last_hook_sent_at)) / 36e5 : Infinity;
        const hookNumber = (s.hook_count || 0) + 1;
        const required = this.getRequiredHoursForHook(hookNumber);

        if (hrsSilent >= required && (hookNumber === 1 || hrsSinceHook >= this.getHookInterval(hookNumber))) {
          const userData = await this.getUserData(s.chat_id);
          if (userData) users.push({ ...userData, hookNumber, hoursSilent: Math.floor(hrsSilent) });
        }
      }

      return users;
    } catch (error) {
      console.error('Error getting users needing hooks:', error);
      return [];
    }
  }

  getRequiredHoursForHook(n) {
    return 6;
  }

  getHookInterval(n) {
    return n === 2 ? 12 : 24;
  }

  async sendHookToUser(user) {
    try {
      console.log(`🌙 Generating hook for ${user.name || user.chat_id} (${user.sign})`);
      const hook = await hookGenerationService.generateUniqueHook(user, user.hookNumber);
      await this.storeHook(user.chat_id, hook, user.hookNumber);

      // ✅ SAFE QUEUE SEND
      await enqueueMessage(bot.bot, 'sendMessage', user.chat_id, hook.message);

      await this.updateEngagementState(user.chat_id, user.hookNumber);
      console.log(`✅ Hook sent to ${user.name || user.chat_id}: "${hook.message}"`);
    } catch (error) {
      console.error(`Failed to send hook to ${user.chat_id}:`, error);
      throw error;
    }
  }

  async getUserData(chatId) {
    try {
      const { data, error } = await databaseService.supabase
        .from('users')
        .select('*')
        .eq('chat_id', chatId)
        .single();
      if (error) throw error;
      return data;
    } catch (error) {
      console.error(`Error getting user data for ${chatId}:`, error);
      return null;
    }
  }

  async storeHook(chatId, hook, n) {
    try {
      const { error } = await databaseService.supabase
        .from('engagement_hooks')
        .insert({
          chat_id: chatId,
          hook_message: hook.message,
          hook_fingerprint: hook.fingerprint,
          hook_number: n,
          context_used: hook.context,
        });
      if (error) throw error;
    } catch (error) {
      console.error('Error storing hook:', error);
    }
  }

  async updateEngagementState(chatId, n) {
    try {
      const { error } = await databaseService.supabase
        .from('user_engagement_state')
        .update({
          last_hook_sent_at: new Date(),
          hook_count: n,
        })
        .eq('chat_id', chatId);
      if (error) throw error;
    } catch (error) {
      console.error('Error updating engagement state:', error);
    }
  }

  async updateLastMessageTime(chatId) {
    try {
      const { data: existing } = await databaseService.supabase
        .from('user_engagement_state')
        .select('chat_id')
        .eq('chat_id', chatId)
        .single();

      if (!existing) {
        await databaseService.supabase
          .from('user_engagement_state')
          .insert({ chat_id: chatId, last_message_at: new Date(), is_active: true });
      } else {
        await databaseService.supabase
          .from('user_engagement_state')
          .update({
            last_message_at: new Date(),
            hook_count: 0,
            is_active: true,
          })
          .eq('chat_id', chatId);
      }
    } catch (error) {
      console.error('Error updating last message time:', error);
    }
  }

  async checkIfHookResponse(chatId) {
    try {
      const { data, error } = await databaseService.supabase
        .from('engagement_hooks')
        .select('*')
        .eq('chat_id', chatId)
        .eq('response_received', false)
        .order('sent_at', { ascending: false })
        .limit(1)
        .single();

      if (!error && data) {
        await databaseService.supabase
          .from('engagement_hooks')
          .update({ response_received: true, response_received_at: new Date() })
          .eq('id', data.id);
        return data;
      }
      return null;
    } catch (error) {
      console.error('Error checking hook response:', error);
      return null;
    }
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export const engagementService = new EngagementService();
