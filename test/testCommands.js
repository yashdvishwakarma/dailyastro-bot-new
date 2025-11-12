// test/testCommands.js (continued)
import readline from 'readline';
import getDatabase from '../services/DatabaseService.js';
import getMemoryManager from '../services/ConversationMemoryManager.js';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

class InteractiveMemoryTester {
  constructor() {
    this.chatId = '6729670408';
    this.currentUser = 'user';
  }

  async start() {
    console.log('🎮 INTERACTIVE MEMORY TESTER');
    console.log('Commands:');
    console.log('  /add <message>   - Add a message');
    console.log('  /sum            - Force summarization');
    console.log('  /count          - Show message count');
    console.log('  /context        - Show current context');
    console.log('  /clear          - Clear unsummarized messages');
    console.log('  /exit           - Exit');
    console.log('-'.repeat(50));
    
    this.prompt();
  }

  prompt() {
    rl.question('> ', async (input) => {
      await this.handleCommand(input);
      this.prompt();
    });
  }

  async handleCommand(input) {
    const [command, ...args] = input.split(' ');
    const message = args.join(' ');
    
    const db = await getDatabase();
    const memoryManager = getMemoryManager();
    
    switch(command) {
      case '/add':
        await db.storeMessage(this.chatId, this.currentUser, message);
        this.currentUser = this.currentUser === 'user' ? 'bot' : 'user';
        console.log(`✅ Added message as ${this.currentUser === 'bot' ? 'user' : 'bot'}`);
        
        // Check for auto-summarization
        await memoryManager.checkAndTriggerSummarization(this.chatId);
        break;
        
      case '/sum':
        console.log('🤖 Forcing summarization...');
        await memoryManager.performSummarization(this.chatId);
        console.log('✅ Summarization complete');
        break;
        
      case '/count':
        const total = await db.getMessageCount(this.chatId);
        const unsummarized = await db.getUnsummarizedMessageCount(this.chatId);
        console.log(`📊 Total: ${total}, Unsummarized: ${unsummarized}`);
        break;
        
      case '/context':
        const context = await memoryManager.getEnhancedContext(this.chatId, "test query");
        console.log(memoryManager.formatContextForDisplay(context));
        break;
        
      case '/clear':
        const { error } = await db.supabase
          .from('conversation_history')
          .update({ summarized: false })
          .eq('chat_id', this.chatId);
        console.log(error ? '❌ Failed' : '✅ Cleared summarization flags');
        break;
        
      case '/exit':
        process.exit(0);
        break;
        
      default:
        console.log('Unknown command');
    }
  }
}

const tester = new InteractiveMemoryTester();
tester.start();