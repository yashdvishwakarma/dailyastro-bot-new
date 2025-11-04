import { DatabaseService } from '../services/DatabaseService.js';

export class StateManager {
  constructor() {
    this.states = new Map();
    this.db = new DatabaseService();
  }

  async getUser(chatId) {
    // Check memory cache first
    if (this.states.has(chatId)) {
      return this.states.get(chatId);
    }

    // Load from database
    const dbUser = await this.db.getUser(chatId);
    
    if (dbUser) {
      const state = {
        chatId: chatId.toString(),
        stage: 'conversation',
        ...dbUser,
        messageCount: await this.db.getMessageCount(chatId)
      };
      this.states.set(chatId, state);
      return state;
    }

    // Create new user
    const newUser = {
      chatId: chatId.toString(),
      stage: 'awaiting_name',
      createdAt: new Date().toISOString()
    };
    
    await this.db.createUser(newUser);
    this.states.set(chatId, newUser);
    return newUser;
  }

  async updateUser(chatId, updates) {
    const user = await this.getUser(chatId);
    Object.assign(user, updates);
    
    // Update cache
    this.states.set(chatId, user);
    
    // Update database
    await this.db.updateUser(chatId, updates);
    
    return user;
  }

  clearUser(chatId) {
    this.states.delete(chatId);
  }
}