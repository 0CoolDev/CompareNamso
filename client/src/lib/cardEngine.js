/**
 * Card Generation Engine Module
 * Features:
 * - Crypto-secure RNG using window.crypto.getRandomValues
 * - Optimized Luhn algorithm with vectorized checksum
 * - Support for 15/16 digit lengths with dynamic CVV rules
 * - Expiry validation (current month to +7 years)
 * - IIN range validation with BIN database
 * - Web Worker pool for parallel batch generation
 * - Duplicate prevention via Set cache
 */

// Import BIN database for IIN validation
import { binRanges } from '../data/binRanges.js';

/**
 * Crypto-secure Random Number Generator
 * Uses window.crypto.getRandomValues for cryptographically secure randomness
 */
class CryptoRNG {
  constructor() {
    // Use crypto API if available, fallback to Math.random with warning
    this.useCrypto = typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues;
    if (!this.useCrypto) {
      console.warn('Crypto API not available, falling back to Math.random (less secure)');
    }
  }

  /**
   * Generate a random integer between min and max (inclusive)
   */
  nextInt(min, max) {
    if (this.useCrypto) {
      const range = max - min + 1;
      const bytesNeeded = Math.ceil(Math.log2(range) / 8);
      const maxValue = Math.pow(256, bytesNeeded);
      const array = new Uint8Array(bytesNeeded);
      
      let value;
      do {
        window.crypto.getRandomValues(array);
        value = 0;
        for (let i = 0; i < bytesNeeded; i++) {
          value = (value << 8) | array[i];
        }
      } while (value >= maxValue - (maxValue % range));
      
      return min + (value % range);
    } else {
      return Math.floor(Math.random() * (max - min + 1)) + min;
    }
  }

  /**
   * Generate random digits string of specified length
   */
  randomDigits(length) {
    let result = '';
    for (let i = 0; i < length; i++) {
      result += this.nextInt(0, 9);
    }
    return result;
  }
}

/**
 * Optimized Luhn Algorithm with vectorized checksum
 * Uses array operations for better performance
 */
class OptimizedLuhn {
  /**
   * Pre-computed double values for optimization
   */
  static DOUBLE_VALUES = [0, 2, 4, 6, 8, 1, 3, 5, 7, 9];

  /**
   * Calculate Luhn checksum using vectorized operations
   */
  static checksum(cardNumber) {
    const digits = cardNumber.split('').map(Number);
    const len = digits.length;
    let sum = 0;
    
    // Vectorized approach - process from right to left
    for (let i = len - 1; i >= 0; i--) {
      const digit = digits[i];
      // Every second digit from right (excluding check digit position)
      if ((len - i) % 2 === 0) {
        sum += this.DOUBLE_VALUES[digit];
      } else {
        sum += digit;
      }
    }
    
    return sum % 10;
  }

  /**
   * Generate Luhn check digit for a card number without check digit
   */
  static generateCheckDigit(cardNumberWithoutCheck) {
    const digits = cardNumberWithoutCheck.split('').map(Number);
    const len = digits.length;
    let sum = 0;
    
    // Process from right to left, doubling every second digit
    for (let i = len - 1; i >= 0; i--) {
      const digit = digits[i];
      if ((len - i) % 2 === 1) {
        sum += this.DOUBLE_VALUES[digit];
      } else {
        sum += digit;
      }
    }
    
    return (10 - (sum % 10)) % 10;
  }

  /**
   * Validate if a card number passes Luhn check
   */
  static validate(cardNumber) {
    return this.checksum(cardNumber) === 0;
  }
}

/**
 * Card Brand Detection and Validation
 */
class CardBrandValidator {
  static BRAND_RULES = {
    'visa': {
      prefixes: [/^4/],
      lengths: [13, 16, 19],
      cvvLength: 3
    },
    'mastercard': {
      prefixes: [/^5[1-5]/, /^2[2-7]/],
      lengths: [16],
      cvvLength: 3
    },
    'amex': {
      prefixes: [/^3[47]/],
      lengths: [15],
      cvvLength: 4
    },
    'discover': {
      prefixes: [/^6011/, /^64[4-9]/, /^65/],
      lengths: [16, 19],
      cvvLength: 3
    },
    'diners': {
      prefixes: [/^30[0-5]/, /^36/, /^38/],
      lengths: [14],
      cvvLength: 3
    },
    'jcb': {
      prefixes: [/^35/],
      lengths: [16],
      cvvLength: 3
    },
    'unionpay': {
      prefixes: [/^62/],
      lengths: [16, 17, 18, 19],
      cvvLength: 3
    },
    'maestro': {
      prefixes: [/^50/, /^5[6-9]/, /^6/],
      lengths: [12, 13, 14, 15, 16, 17, 18, 19],
      cvvLength: 3
    }
  };

  /**
   * Detect card brand from BIN
   */
  static detectBrand(bin) {
    for (const [brand, rules] of Object.entries(this.BRAND_RULES)) {
      for (const prefix of rules.prefixes) {
        if (prefix.test(bin)) {
          return brand;
        }
      }
    }
    return 'unknown';
  }

  /**
   * Get CVV length for brand
   */
  static getCvvLength(brand) {
    return this.BRAND_RULES[brand]?.cvvLength || 3;
  }

  /**
   * Get valid card lengths for brand
   */
  static getValidLengths(brand) {
    return this.BRAND_RULES[brand]?.lengths || [16];
  }

  /**
   * Validate IIN against BIN database ranges
   */
  static async validateIIN(bin) {
    // Check if BIN exists in our database
    if (binRanges && binRanges[bin]) {
      return {
        valid: true,
        info: binRanges[bin]
      };
    }

    // Check for range matches (first 6 digits)
    const bin6 = bin.substring(0, 6);
    for (const [rangeStart, rangeData] of Object.entries(binRanges || {})) {
      if (bin6 >= rangeStart && bin6 <= rangeData.rangeEnd) {
        return {
          valid: true,
          info: rangeData
        };
      }
    }

    return {
      valid: false,
      info: null
    };
  }
}

/**
 * Expiry Date Validator
 */
class ExpiryValidator {
  /**
   * Validate expiry date
   * Must be >= current month and <= 7 years from now
   */
  static validate(month, year) {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    
    const expYear = parseInt(year);
    const expMonth = parseInt(month);
    
    // Check if date is valid
    if (expMonth < 1 || expMonth > 12) {
      return false;
    }
    
    // Convert to comparable format
    const currentDate = currentYear * 12 + currentMonth;
    const expiryDate = expYear * 12 + expMonth;
    const maxDate = (currentYear + 7) * 12 + 12; // 7 years from now, December
    
    return expiryDate >= currentDate && expiryDate <= maxDate;
  }

  /**
   * Generate random valid expiry date
   */
  static generateRandom(rng) {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    
    // Generate year between now and +7 years
    const year = rng.nextInt(currentYear, currentYear + 7);
    
    // Generate month based on year
    let minMonth = 1;
    let maxMonth = 12;
    
    if (year === currentYear) {
      minMonth = currentMonth;
    }
    
    const month = rng.nextInt(minMonth, maxMonth);
    
    return {
      month: month.toString().padStart(2, '0'),
      year: year.toString()
    };
  }
}

/**
 * Main Card Generation Engine
 */
class CardEngine {
  constructor(options = {}) {
    this.rng = new CryptoRNG();
    this.duplicateCache = new Set();
    this.options = {
      defaultLength: 16,
      enableDuplicateCheck: true,
      ...options
    };
  }

  /**
   * Generate a single card with all validations
   */
  async generateCard(params = {}) {
    const {
      bin,
      length = this.options.defaultLength,
      month = 'random',
      year = 'random',
      cvv = 'random'
    } = params;

    // Validate BIN
    const brand = CardBrandValidator.detectBrand(bin);
    const validLengths = CardBrandValidator.getValidLengths(brand);
    
    // Adjust length if not valid for brand
    const cardLength = validLengths.includes(length) ? length : validLengths[0];
    
    // Generate card number
    let cardNumber;
    let attempts = 0;
    const maxAttempts = 100;
    
    do {
      const baseNumber = bin + this.rng.randomDigits(cardLength - bin.length - 1);
      const checkDigit = OptimizedLuhn.generateCheckDigit(baseNumber);
      cardNumber = baseNumber + checkDigit;
      attempts++;
    } while (this.options.enableDuplicateCheck && 
             this.duplicateCache.has(cardNumber) && 
             attempts < maxAttempts);
    
    if (this.options.enableDuplicateCheck) {
      this.duplicateCache.add(cardNumber);
    }
    
    // Generate or validate expiry
    let expMonth, expYear;
    if (month === 'random' || year === 'random') {
      const expiry = ExpiryValidator.generateRandom(this.rng);
      expMonth = month === 'random' ? expiry.month : month;
      expYear = year === 'random' ? expiry.year : year;
    } else {
      expMonth = month;
      expYear = year;
    }
    
    // Validate expiry
    if (!ExpiryValidator.validate(expMonth, expYear)) {
      throw new Error(`Invalid expiry date: ${expMonth}/${expYear}`);
    }
    
    // Generate CVV based on brand rules
    const cvvLength = CardBrandValidator.getCvvLength(brand);
    let cardCvv;
    if (cvv === 'random') {
      const minCvv = Math.pow(10, cvvLength - 1);
      const maxCvv = Math.pow(10, cvvLength) - 1;
      cardCvv = this.rng.nextInt(minCvv, maxCvv).toString();
    } else {
      cardCvv = cvv;
    }
    
    // Validate IIN against database
    const iinValidation = await CardBrandValidator.validateIIN(bin);
    
    return {
      cardNumber,
      month: expMonth,
      year: expYear,
      cvv: cardCvv,
      brand,
      isLuhnValid: OptimizedLuhn.validate(cardNumber),
      iinValid: iinValidation.valid,
      binInfo: iinValidation.info,
      metadata: {
        length: cardNumber.length,
        generatedAt: new Date().toISOString()
      }
    };
  }

  /**
   * Generate batch of cards
   */
  async generateBatch(params = {}) {
    const {
      bin,
      quantity = 10,
      ...cardParams
    } = params;
    
    const cards = [];
    
    for (let i = 0; i < quantity; i++) {
      const card = await this.generateCard({
        bin,
        ...cardParams
      });
      cards.push(card);
    }
    
    return cards;
  }

  /**
   * Clear duplicate cache
   */
  clearCache() {
    this.duplicateCache.clear();
  }

  /**
   * Get cache size
   */
  getCacheSize() {
    return this.duplicateCache.size;
  }
}

/**
 * Web Worker Pool Manager for parallel batch generation
 */
class WorkerPoolManager {
  constructor(workerCount = 4) {
    this.workerCount = workerCount;
    this.workers = [];
    this.taskQueue = [];
    this.busyWorkers = new Set();
    this.initialized = false;
  }

  /**
   * Initialize worker pool
   */
  async initialize() {
    if (this.initialized) return;
    
    for (let i = 0; i < this.workerCount; i++) {
      const worker = new Worker(new URL('./cardWorkerOptimized.js', import.meta.url), {
        type: 'module'
      });
      
      worker.id = i;
      worker.onmessage = this.handleWorkerMessage.bind(this, worker);
      worker.onerror = this.handleWorkerError.bind(this, worker);
      
      this.workers.push(worker);
    }
    
    this.initialized = true;
  }

  /**
   * Handle worker message
   */
  handleWorkerMessage(worker, event) {
    const { type, data, taskId, error } = event.data;
    
    // Find the task
    const taskIndex = this.taskQueue.findIndex(t => t.id === taskId);
    if (taskIndex === -1) return;
    
    const task = this.taskQueue[taskIndex];
    
    switch (type) {
      case 'progress':
        if (task.onProgress) {
          task.onProgress(data);
        }
        break;
        
      case 'complete':
        task.resolve(data);
        this.taskQueue.splice(taskIndex, 1);
        this.busyWorkers.delete(worker.id);
        this.processNextTask();
        break;
        
      case 'error':
        task.reject(new Error(error));
        this.taskQueue.splice(taskIndex, 1);
        this.busyWorkers.delete(worker.id);
        this.processNextTask();
        break;
    }
  }

  /**
   * Handle worker error
   */
  handleWorkerError(worker, error) {
    console.error(`Worker ${worker.id} error:`, error);
    this.busyWorkers.delete(worker.id);
    this.processNextTask();
  }

  /**
   * Generate cards in parallel chunks
   */
  async generateParallel(params, options = {}) {
    if (!this.initialized) {
      await this.initialize();
    }
    
    const {
      bin,
      quantity = 1000,
      chunkSize = 1000,
      onProgress
    } = { ...params, ...options };
    
    const chunks = Math.ceil(quantity / chunkSize);
    const promises = [];
    
    for (let i = 0; i < chunks; i++) {
      const chunkQuantity = Math.min(chunkSize, quantity - i * chunkSize);
      const promise = this.addTask({
        bin,
        quantity: chunkQuantity,
        ...params
      }, onProgress);
      promises.push(promise);
    }
    
    const results = await Promise.all(promises);
    return results.flat();
  }

  /**
   * Add task to queue
   */
  addTask(params, onProgress) {
    return new Promise((resolve, reject) => {
      const task = {
        id: Date.now() + Math.random(),
        params,
        resolve,
        reject,
        onProgress
      };
      
      this.taskQueue.push(task);
      this.processNextTask();
    });
  }

  /**
   * Process next task in queue
   */
  processNextTask() {
    // Find available worker
    const availableWorker = this.workers.find(w => !this.busyWorkers.has(w.id));
    if (!availableWorker) return;
    
    // Find next task
    const task = this.taskQueue.find(t => !t.processing);
    if (!task) return;
    
    task.processing = true;
    this.busyWorkers.add(availableWorker.id);
    
    // Send task to worker
    availableWorker.postMessage({
      type: 'generate',
      taskId: task.id,
      params: task.params
    });
  }

  /**
   * Terminate all workers
   */
  terminate() {
    this.workers.forEach(worker => worker.terminate());
    this.workers = [];
    this.taskQueue = [];
    this.busyWorkers.clear();
    this.initialized = false;
  }
}

// Export the main classes and utilities
export {
  CardEngine,
  WorkerPoolManager,
  CryptoRNG,
  OptimizedLuhn,
  CardBrandValidator,
  ExpiryValidator
};

// Default export for convenience
export default CardEngine;
