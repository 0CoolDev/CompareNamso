import * as Comlink from 'comlink';
import type { GenerateCardRequest, CardWithMeta } from '@shared/schema';
import type { WorkerMessage } from '@/workers/cardWorker';

export interface CardWorkerAPI {
  generateCards: (request: GenerateCardRequest) => Promise<CardWithMeta[]>;
}

export class CardWorkerService {
  private worker: Worker | null = null;
  private progressCallback: ((progress: number, processed: number, total: number) => void) | null = null;

  /**
   * Initialize the worker for large batch processing
   */
  private initWorker(): Worker {
    if (!this.worker) {
      // Use Vite's worker import syntax
      this.worker = new Worker(
        new URL('../workers/cardWorker.ts', import.meta.url),
        { type: 'module' }
      );
    }
    return this.worker;
  }

  /**
   * Set progress callback for tracking generation progress
   */
  setProgressCallback(callback: (progress: number, processed: number, total: number) => void) {
    this.progressCallback = callback;
  }

  /**
   * Generate cards using Web Worker for large batches (500+)
   * Falls back to main thread for smaller batches
   */
  async generateCards(request: GenerateCardRequest): Promise<CardWithMeta[]> {
    // Use worker for large batches (500+ cards)
    if (request.quantity >= 500) {
      return this.generateCardsInWorker(request);
    }
    
    // For smaller batches, use main thread to avoid worker overhead
    return this.generateCardsInMainThread(request);
  }

  /**
   * Generate cards in Web Worker
   */
  private generateCardsInWorker(request: GenerateCardRequest): Promise<CardWithMeta[]> {
    return new Promise((resolve, reject) => {
      const worker = this.initWorker();
      
      const handleMessage = (event: MessageEvent<WorkerMessage>) => {
        const message = event.data;
        
        switch (message.type) {
          case 'progress':
            if (this.progressCallback && message.progress !== undefined) {
              this.progressCallback(
                message.progress,
                message.processedCards || 0,
                message.totalCards || request.quantity
              );
            }
            break;
            
          case 'complete':
            worker.removeEventListener('message', handleMessage);
            worker.removeEventListener('error', handleError);
            resolve(message.cards || []);
            break;
            
          case 'error':
            worker.removeEventListener('message', handleMessage);
            worker.removeEventListener('error', handleError);
            reject(new Error(message.error || 'Worker error'));
            break;
        }
      };
      
      const handleError = (error: ErrorEvent) => {
        worker.removeEventListener('message', handleMessage);
        worker.removeEventListener('error', handleError);
        reject(new Error(`Worker error: ${error.message}`));
      };
      
      worker.addEventListener('message', handleMessage);
      worker.addEventListener('error', handleError);
      
      // Send request to worker
      worker.postMessage(request);
    });
  }

  /**
   * Generate cards in main thread (for small batches)
   */
  private async generateCardsInMainThread(request: GenerateCardRequest): Promise<CardWithMeta[]> {
    // This is a fallback - the actual generation should still happen on the server
    // This is just to demonstrate the pattern
    const response = await fetch('/api/generate-cards', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });
    
    if (!response.ok) {
      throw new Error('Failed to generate cards');
    }
    
    const result = await response.json();
    return result.cardsWithMeta || [];
  }

  /**
   * Terminate the worker to free resources
   */
  terminate() {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
  }
}

// Create a singleton instance
export const cardWorkerService = new CardWorkerService();

// Comlink-wrapped version for advanced usage
export function createComlinkWorker(): Comlink.Remote<CardWorkerAPI> {
  const worker = new Worker(
    new URL('../workers/cardWorker.ts', import.meta.url),
    { type: 'module' }
  );
  
  return Comlink.wrap<CardWorkerAPI>(worker);
}
