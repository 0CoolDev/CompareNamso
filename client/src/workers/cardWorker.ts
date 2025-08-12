// Card generation Web Worker for heavy processing
import type { GenerateCardRequest, CardWithMeta } from '@shared/schema';

// Polynomial RNG implementation (matching server-side)
class PolynomialRNG {
  private state: number;
  private readonly a = 1664525;
  private readonly c = 1013904223;
  private readonly m = Math.pow(2, 32);

  constructor(seed?: number) {
    this.state = seed ?? Date.now();
  }

  next(): number {
    this.state = (this.a * this.state + this.c) % this.m;
    return this.state / this.m;
  }

  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }
}

// Luhn algorithm implementation
function generateLuhnCheckDigit(cardNumberWithoutCheckDigit: string): string {
  const digits = cardNumberWithoutCheckDigit.split('').reverse().map(Number);
  let sum = 0;
  
  for (let i = 0; i < digits.length; i++) {
    let digit = digits[i];
    if (i % 2 === 0) {
      digit *= 2;
      if (digit > 9) {
        digit -= 9;
      }
    }
    sum += digit;
  }
  
  const checkDigit = (10 - (sum % 10)) % 10;
  return checkDigit.toString();
}

function validateLuhn(cardNumber: string): boolean {
  const digits = cardNumber.split('').reverse().map(Number);
  let sum = 0;
  
  for (let i = 0; i < digits.length; i++) {
    let digit = digits[i];
    if (i % 2 === 1) {
      digit *= 2;
      if (digit > 9) {
        digit -= 9;
      }
    }
    sum += digit;
  }
  
  return sum % 10 === 0;
}

// Card generation logic
function generateCardNumber(bin: string, rng: PolynomialRNG): string {
  let cardNumber = bin;
  
  // Pad BIN to 15 digits with random numbers
  while (cardNumber.length < 15) {
    cardNumber += rng.nextInt(0, 9).toString();
  }
  
  // Add Luhn check digit
  const checkDigit = generateLuhnCheckDigit(cardNumber);
  return cardNumber + checkDigit;
}

function generateCCV(ccv2Input: string | undefined, rng: PolynomialRNG): string {
  if (ccv2Input && ccv2Input.trim()) {
    return ccv2Input.trim();
  }
  return rng.nextInt(100, 999).toString();
}

function generateDate(monthInput: string | undefined, yearInput: string | undefined, rng: PolynomialRNG): { month: string; year: string } {
  let month = monthInput;
  let year = yearInput;
  
  if (!month || month === "" || month === "random") {
    month = rng.nextInt(1, 12).toString().padStart(2, '0');
  }

  if (!year || year === "" || year === "random") {
    year = rng.nextInt(2024, 2030).toString();
  }
  
  return { month: month!, year: year! };
}

// Detect card brand based on BIN
function detectCardBrand(bin: string): string {
  const firstDigit = bin[0];
  const firstTwo = bin.substring(0, 2);
  const firstFour = bin.substring(0, 4);
  
  if (firstDigit === '4') return 'Visa';
  if (['51', '52', '53', '54', '55'].includes(firstTwo)) return 'Mastercard';
  if (['2221', '2222', '2223', '2224', '2225', '2226', '2227', '2228', '2229'].includes(firstFour)) return 'Mastercard';
  if (['223', '224', '225', '226', '227', '228', '229'].includes(bin.substring(0, 3))) return 'Mastercard';
  if (['23', '24', '25', '26'].includes(firstTwo)) return 'Mastercard';
  if (['270', '271', '272'].includes(bin.substring(0, 3))) return 'Mastercard';
  if (['34', '37'].includes(firstTwo)) return 'American Express';
  if (firstFour === '6011' || firstTwo === '65') return 'Discover';
  if (['644', '645', '646', '647', '648', '649'].includes(bin.substring(0, 3))) return 'Discover';
  if (['300', '301', '302', '303', '304', '305'].includes(bin.substring(0, 3))) return 'Diners Club';
  if (firstTwo === '36' || firstTwo === '38') return 'Diners Club';
  if (['3528', '3529'].includes(firstFour)) return 'JCB';
  if (['353', '354', '355', '356', '357', '358'].includes(bin.substring(0, 3))) return 'JCB';
  if (firstTwo === '62') return 'UnionPay';
  if (['5018', '5020', '5038', '5893', '6304', '6759', '6761', '6762', '6763'].includes(firstFour)) return 'Maestro';
  
  return 'Unknown';
}

export interface WorkerMessage {
  type: 'progress' | 'complete' | 'error';
  progress?: number;
  cards?: CardWithMeta[];
  error?: string;
  totalCards?: number;
  processedCards?: number;
}

// Main worker message handler
self.addEventListener('message', (event: MessageEvent<GenerateCardRequest>) => {
  const data = event.data;
  
  try {
    const { bin, month, year, ccv2, quantity, seed } = data;
    const rng = new PolynomialRNG(seed);
    const cards: CardWithMeta[] = [];
    const brand = detectCardBrand(bin);
    
    // For large batches, send progress updates
    const shouldSendProgress = quantity >= 500;
    let lastProgressUpdate = 0;
    
    for (let i = 0; i < quantity; i++) {
      const cardNumber = generateCardNumber(bin, rng);
      const { month: genMonth, year: genYear } = generateDate(month, year, rng);
      const ccv = generateCCV(ccv2, rng);
      
      cards.push({
        cardNumber,
        month: genMonth,
        year: genYear,
        ccv,
        isLuhnValid: validateLuhn(cardNumber),
        brand
      });
      
      // Send progress updates for large batches
      if (shouldSendProgress) {
        const progress = Math.floor((i + 1) / quantity * 100);
        if (progress - lastProgressUpdate >= 5) { // Update every 5%
          lastProgressUpdate = progress;
          self.postMessage({
            type: 'progress',
            progress,
            processedCards: i + 1,
            totalCards: quantity
          } as WorkerMessage);
        }
      }
    }
    
    // Send completion message
    self.postMessage({
      type: 'complete',
      cards,
      progress: 100,
      totalCards: quantity,
      processedCards: quantity
    } as WorkerMessage);
    
  } catch (error) {
    self.postMessage({
      type: 'error',
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    } as WorkerMessage);
  }
});

// Export empty object to make this a module
export {};
