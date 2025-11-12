// services/BatchProcessor.js
class BatchProcessor {
  constructor() {
    this.queue = [];
    this.processing = false;
    this.batchSize = 5;
    this.batchDelay = 1000; // 1 second
  }

  async addToQueue(task) {
    this.queue.push(task);
    
    if (!this.processing) {
      setTimeout(() => this.processBatch(), this.batchDelay);
    }
  }

  async processBatch() {
    if (this.queue.length === 0) {
      this.processing = false;
      return;
    }

    this.processing = true;
    const batch = this.queue.splice(0, this.batchSize);
    
    // Process batch in parallel
    await Promise.all(batch.map(task => task()));
    
    // Continue with next batch
    if (this.queue.length > 0) {
      setTimeout(() => this.processBatch(), this.batchDelay);
    } else {
      this.processing = false;
    }
  }
}