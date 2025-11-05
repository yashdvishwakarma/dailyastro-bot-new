// AstroNow v3.0 — Memory Graph Layer
// Purpose: Long-term memory & topic tracking via vector embeddings
// Integrates with soulEngine.js
// Author: Jarvis x GPT-5

import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';
import { config } from '../config.js';

const openai = new OpenAI({ apiKey: config.openai.apiKey });

// === Setup ================================================================
const MEMORY_VECTOR_FILE = path.resolve('./astro_memory_vectors.json');
if (!fs.existsSync(MEMORY_VECTOR_FILE)) fs.writeFileSync(MEMORY_VECTOR_FILE, JSON.stringify({ users: {} }, null, 2));

const loadVectors = () => JSON.parse(fs.readFileSync(MEMORY_VECTOR_FILE, 'utf-8'));
const saveVectors = (data) => fs.writeFileSync(MEMORY_VECTOR_FILE, JSON.stringify(data, null, 2));

// === Helper: Cosine Similarity ============================================
function cosineSimilarity(vecA, vecB) {
  const dot = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
  const magA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
  const magB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
  return dot / (magA * magB);
}

// === MemoryGraph Class ====================================================
export class MemoryGraph {
  constructor() {
    this.vectors = loadVectors();
  }

  // 🧠 Create embedding from text
  async embed(text) {
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: text
    });
    return response.data[0].embedding;
  }

  // 💾 Store new memory
  async storeMemory(userId, content, emotion) {
    const embedding = await this.embed(content);
    if (!this.vectors.users[userId]) this.vectors.users[userId] = [];

    this.vectors.users[userId].push({
      text: content,
      emotion,
      embedding,
      ts: Date.now()
    });

    saveVectors(this.vectors);
  }

  // 🔍 Recall related memories
  async recall(userId, newMessage, topK = 3) {
    if (!this.vectors.users[userId]) return [];

    const queryVector = await this.embed(newMessage);
    const memories = this.vectors.users[userId];

    const scored = memories.map(m => ({
      ...m,
      score: cosineSimilarity(queryVector, m.embedding)
    }));

    const top = scored.sort((a, b) => b.score - a.score).slice(0, topK);
    return top.filter(m => m.score > 0.75); // threshold for meaningful recall
  }

  // 🧩 Generate contextual memory summary
  summarizeMemories(memories) {
    if (!memories.length) return '';
    const emotionalTrends = memories.map(m => m.emotion).join(', ');
    const timeline = memories.map(m => `• (${new Date(m.ts).toLocaleDateString()}): ${m.text}`).join('\n');

    return `Previously, the user expressed emotions like ${emotionalTrends}.\nRecent key moments:\n${timeline}`;
  }
}

export const memoryGraph = new MemoryGraph();