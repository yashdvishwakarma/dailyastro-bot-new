import { hookGenerationService } from './HookGenerationService.js';
import { databaseService } from './DatabaseService.js';
import { bot } from '../bot.js';

class EngagementService {
    constructor() {
        this.hookSchedule = {
            1: 6,    // First hook after 6 hours
            2: 12,   // Second hook after 12 hours
            3: 24    // Then daily
        };
    }

    async checkInactiveUsers() {
        try {
            console.log('🔍 Checking for inactive users...');
            
            // Get all users who need hooks
            const usersNeedingHooks = await this.getUsersNeedingHooks();
            
            console.log(`Found ${usersNeedingHooks.length} users needing hooks`);
            
            for (const user of usersNeedingHooks) {
                try {
                    await this.sendHookToUser(user);
                    // Add delay to avoid rate limits
                    await this.delay(1000);
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
            // Get all users' engagement states
            const { data: engagementStates, error } = await databaseService.supabase
                .from('user_engagement_state')
                .select('*')
                .eq('is_active', true)
                .order('last_message_at', { ascending: true });

            if (error) throw error;

            for (const state of engagementStates) {
                const hoursSinceLastMessage = (now - new Date(state.last_message_at)) / (1000 * 60 * 60);
                const hoursSinceLastHook = state.last_hook_sent_at 
                    ? (now - new Date(state.last_hook_sent_at)) / (1000 * 60 * 60)
                    : Infinity;

                // Determine which hook should be sent
                const hookNumber = (state.hook_count || 0) + 1;
                const requiredHours = this.getRequiredHoursForHook(hookNumber);

                // Check if it's time for a hook
                if (hoursSinceLastMessage >= requiredHours && 
                    (hookNumber === 1 || hoursSinceLastHook >= this.getHookInterval(hookNumber))) {
                    
                    // Get full user data
                    const userData = await this.getUserData(state.chat_id);
                    if (userData) {
                        users.push({
                            ...userData,
                            hookNumber,
                            hoursSilent: Math.floor(hoursSinceLastMessage)
                        });
                    }
                }
            }

            return users;
        } catch (error) {
            console.error('Error getting users needing hooks:', error);
            return [];
        }
    }

    getRequiredHoursForHook(hookNumber) {
        // First hook at 6 hours, subsequent ones follow schedule
        if (hookNumber === 1) return 6;
        if (hookNumber === 2) return 6; // Still check from 6 hours of initial silence
        return 6; // Daily hooks also start checking from 6 hours
    }

    getHookInterval(hookNumber) {
        // Time between hooks
        if (hookNumber === 2) return 12;  // 12 hours after first hook
        return 24; // Daily thereafter
    }

    async sendHookToUser(user) {
        try {
            console.log(`🌙 Generating hook for ${user.name || user.chat_id} (${user.sign})`);
            
            // Generate unique hook
            const hookData = await hookGenerationService.generateUniqueHook(user, user.hookNumber);
            
            // Store hook in database
            await this.storeHook(user.chat_id, hookData, user.hookNumber);
            
            // Send via Telegram
            await bot.sendMessage(user.chat_id, hookData.message);
            
            // Update user engagement state
            await this.updateEngagementState(user.chat_id, user.hookNumber);
            
            console.log(`✅ Hook sent to ${user.name || user.chat_id}: "${hookData.message}"`);
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

    async storeHook(chatId, hookData, hookNumber) {
        try {
            const { error } = await databaseService.supabase
                .from('engagement_hooks')
                .insert({
                    chat_id: chatId,
                    hook_message: hookData.message,
                    hook_fingerprint: hookData.fingerprint,
                    hook_number: hookNumber,
                    context_used: hookData.context
                });

            if (error) throw error;
        } catch (error) {
            console.error('Error storing hook:', error);
        }
    }

    async updateEngagementState(chatId, hookNumber) {
        try {
            const { error } = await databaseService.supabase
                .from('user_engagement_state')
                .update({
                    last_hook_sent_at: new Date(),
                    hook_count: hookNumber,
                    total_hooks_sent: databaseService.supabase.raw('total_hooks_sent + 1')
                })
                .eq('chat_id', chatId);

            if (error) throw error;
        } catch (error) {
            console.error('Error updating engagement state:', error);
        }
    }

    async updateLastMessageTime(chatId) {
        try {
            // First, ensure engagement state exists
            const { data: existing } = await databaseService.supabase
                .from('user_engagement_state')
                .select('chat_id')
                .eq('chat_id', chatId)
                .single();

            if (!existing) {
                // Create new engagement state
                await databaseService.supabase
                    .from('user_engagement_state')
                    .insert({
                        chat_id: chatId,
                        last_message_at: new Date(),
                        is_active: true
                    });
            } else {
                // Update existing
                await databaseService.supabase
                    .from('user_engagement_state')
                    .update({
                        last_message_at: new Date(),
                        hook_count: 0, // Reset hook count when user messages
                        is_active: true
                    })
                    .eq('chat_id', chatId);
            }
        } catch (error) {
            console.error('Error updating last message time:', error);
        }
    }

    async checkIfHookResponse(chatId) {
        try {
            // Get the most recent unanswered hook
            const { data, error } = await databaseService.supabase
                .from('engagement_hooks')
                .select('*')
                .eq('chat_id', chatId)
                .eq('response_received', false)
                .order('sent_at', { ascending: false })
                .limit(1)
                .single();

            if (!error && data) {
                // Mark hook as responded
                await databaseService.supabase
                    .from('engagement_hooks')
                    .update({
                        response_received: true,
                        response_received_at: new Date()
                    })
                    .eq('id', data.id);

                // Update engagement metrics
                await databaseService.supabase
                    .from('user_engagement_state')
                    .update({
                        total_hooks_responded: databaseService.supabase.raw('total_hooks_responded + 1')
                    })
                    .eq('chat_id', chatId);

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