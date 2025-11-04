import { config } from './config.js';
import { DatabaseService } from './services/DatabaseService.js';

console.log('Config loaded:', config.telegram.token ? '✅' : '❌');
console.log('Database service:', DatabaseService ? '✅' : '❌');

const db = new DatabaseService();
console.log('Database initialized:', db ? '✅' : '❌');