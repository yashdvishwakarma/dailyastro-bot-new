// services/CleanupService.js
import getDatabase from './DatabaseService.js';

class CleanupService {
  constructor() {
    this.RETENTION_DAYS = 30;
    this.ARCHIVE_BATCH_SIZE = 100;
  }

  async performCleanup() {
    console.log('🧹 Starting cleanup process...');
    const db = await getDatabase();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.RETENTION_DAYS);
    
    try {
      // 1. Get all unique chat IDs with old messages
      const { data: chatsToClean } = await db.supabase
        .from('conversation_history')
        .select('chat_id')
        .lt('created_at', cutoffDate.toISOString())
        .limit(100);

      if (!chatsToClean || chatsToClean.length === 0) {
        console.log('✅ No messages to archive');
        return { archived: 0, cleaned: 0 };
      }

      const uniqueChats = [...new Set(chatsToClean.map(c => c.chat_id))];
      console.log(`📦 Found ${uniqueChats.length} chats with old messages`);

      let totalArchived = 0;
      let totalSpaceSaved = 0;

      for (const chatId of uniqueChats) {
        const result = await this.cleanupChat(chatId, cutoffDate);
        totalArchived += result.archived;
        totalSpaceSaved += result.spaceSaved;
      }

      console.log(`✅ Cleanup complete: ${totalArchived} messages archived`);
      console.log(`💾 Space saved: ${(totalSpaceSaved / 1024).toFixed(2)} MB`);

      return { 
        archived: totalArchived, 
        spaceSaved: totalSpaceSaved,
        chats: uniqueChats.length
      };

    } catch (error) {
      console.error('❌ Cleanup failed:', error);
      return { archived: 0, error: error.message };
    }
  }

  async cleanupChat(chatId, cutoffDate) {
    const db = await getDatabase();
    
    // 1. Check if chat has summaries
    const { data: summaries } = await db.supabase
      .from('conversation_summaries')
      .select('id')
      .eq('chat_id', chatId)
      .limit(1);

    // Only archive if we have summaries (don't lose context)
    if (!summaries || summaries.length === 0) {
      console.log(`⚠️  Skipping ${chatId} - no summaries yet`);
      return { archived: 0, spaceSaved: 0 };
    }

    // 2. Get messages to archive
    const { data: messagesToArchive, error } = await db.supabase
      .from('conversation_history')
      .select('*')
      .eq('chat_id', chatId)
      .lt('created_at', cutoffDate.toISOString())
      .eq('summarized', true); // Only archive summarized messages

    if (error || !messagesToArchive || messagesToArchive.length === 0) {
      return { archived: 0, spaceSaved: 0 };
    }

    console.log(`📦 Archiving ${messagesToArchive.length} messages for chat ${chatId}`);

    // 3. Archive messages
    const archiveData = messagesToArchive.map(msg => ({
      ...msg,
      archived_at: new Date().toISOString()
    }));

    const { error: archiveError } = await db.supabase
      .from('conversation_history_archive')
      .insert(archiveData);

    if (archiveError) {
      console.error(`Archive error for ${chatId}:`, archiveError);
      return { archived: 0, spaceSaved: 0 };
    }

    // 4. Delete archived messages
    const messageIds = messagesToArchive.map(m => m.id);
    const { error: deleteError } = await db.supabase
      .from('conversation_history')
      .delete()
      .in('id', messageIds);

    if (deleteError) {
      console.error(`Delete error for ${chatId}:`, deleteError);
      return { archived: 0, spaceSaved: 0 };
    }

    // 5. Calculate space saved (rough estimate)
    const spaceSaved = messagesToArchive.reduce((sum, msg) => {
      return sum + (msg.message?.length || 0) + 100; // message + metadata
    }, 0);

    // 6. Log cleanup
    await db.supabase
      .from('cleanup_log')
      .insert({
        chat_id: chatId,
        messages_archived: messagesToArchive.length,
        summaries_kept: summaries.length,
        space_saved_kb: spaceSaved / 1024
      });

    return { 
      archived: messagesToArchive.length, 
      spaceSaved 
    };
  }

  // Get cleanup statistics
  async getCleanupStats() {
    const db = await getDatabase();
    
    // Get total messages
    const { count: totalMessages } = await db.supabase
      .from('conversation_history')
      .select('*', { count: 'exact', head: true });

    // Get archived messages
    const { count: archivedMessages } = await db.supabase
      .from('conversation_history_archive')
      .select('*', { count: 'exact', head: true });

    // Get recent cleanups
    const { data: recentCleanups } = await db.supabase
      .from('cleanup_log')
      .select('*')
      .order('cleanup_date', { ascending: false })
      .limit(5);

    // Calculate average message age
    const { data: oldestMessage } = await db.supabase
      .from('conversation_history')
      .select('created_at')
      .order('created_at', { ascending: true })
      .limit(1)
      .single();

    const avgAge = oldestMessage 
      ? Math.floor((Date.now() - new Date(oldestMessage.created_at)) / (1000 * 60 * 60 * 24))
      : 0;

    return {
      activeMessages: totalMessages || 0,
      archivedMessages: archivedMessages || 0,
      totalMessages: (totalMessages || 0) + (archivedMessages || 0),
      oldestMessageDays: avgAge,
      recentCleanups: recentCleanups || [],
      nextCleanupNeeded: avgAge > 30
    };
  }
}

export default CleanupService;