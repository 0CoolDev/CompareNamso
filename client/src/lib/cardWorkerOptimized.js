/**
 * Optimized Card Generation Web Worker
 * Handles parallel batch generation with progress reporting
 */

import { CardEngine } from './cardEngine.js';

// Initialize card engine instance for this worker
const engine = new CardEngine({
  enableDuplicateCheck: true
});

// Message handler
self.addEventListener('message', async (event) => {
  const { type, taskId, params } = event.data;
  
  if (type !== 'generate') {
    self.postMessage({
      type: 'error',
      taskId,
      error: 'Unknown message type'
    });
    return;
  }
  
  try {
    const {
      bin,
      quantity = 1000,
      length,
      month,
      year,
      cvv
    } = params;
    
    const cards = [];
    const batchSize = 100; // Process in smaller batches for progress updates
    const batches = Math.ceil(quantity / batchSize);
    
    for (let i = 0; i < batches; i++) {
      const currentBatchSize = Math.min(batchSize, quantity - i * batchSize);
      const batchCards = [];
      
      // Generate batch
      for (let j = 0; j < currentBatchSize; j++) {
        const card = await engine.generateCard({
          bin,
          length,
          month,
          year,
          cvv
        });
        batchCards.push(card);
      }
      
      cards.push(...batchCards);
      
      // Send progress update
      const progress = Math.floor(((i + 1) / batches) * 100);
      self.postMessage({
        type: 'progress',
        taskId,
        data: {
          progress,
          processed: cards.length,
          total: quantity
        }
      });
    }
    
    // Clear cache periodically to prevent memory issues
    if (engine.getCacheSize() > 10000) {
      engine.clearCache();
    }
    
    // Send completion message
    self.postMessage({
      type: 'complete',
      taskId,
      data: cards
    });
    
  } catch (error) {
    self.postMessage({
      type: 'error',
      taskId,
      error: error.message || 'Unknown error occurred'
    });
  }
});

// Export to make this a module
export {};
