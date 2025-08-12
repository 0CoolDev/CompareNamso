import type { Express } from "express";
import { createServer, type Server } from "http";
import { generateCardSchema, type BinInfo, type CardWithMeta } from "@shared/schema";
import { z } from "zod";

// Luhn Algorithm Implementation
function luhnChecksum(cardNumber: string): number {
  const digits = cardNumber.split('').map(Number);
  let sum = 0;
  let alternate = false;
  
  for (let i = digits.length - 1; i >= 0; i--) {
    let n = digits[i];
    if (alternate) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    alternate = !alternate;
  }
  
  return sum % 10;
}

function generateLuhnCheckDigit(partialNumber: string): number {
  const checksum = luhnChecksum(partialNumber + '0');
  return checksum === 0 ? 0 : 10 - checksum;
}

// Card Brand Detection
function detectCardBrand(cardNumber: string): string {
  const firstDigit = cardNumber[0];
  const firstTwo = cardNumber.substring(0, 2);
  const firstThree = cardNumber.substring(0, 3);
  const firstFour = cardNumber.substring(0, 4);

  if (firstDigit === '4') return 'Visa';
  if (firstTwo >= '51' && firstTwo <= '55') return 'Mastercard';
  if (firstTwo === '34' || firstTwo === '37') return 'American Express';
  if (firstFour === '6011' || firstTwo === '65') return 'Discover';
  if (firstThree >= '300' && firstThree <= '305') return 'Diners Club';
  if (firstTwo === '35') return 'JCB';
  
  return 'Unknown';
}

// BIN Information Database
function getBinInfo(bin: string): BinInfo {
  const binData: Record<string, Partial<BinInfo>> = {
    // Visa
    '4': { brand: 'Visa', type: 'Credit' },
    '40': { brand: 'Visa', type: 'Credit', level: 'Classic' },
    '41': { brand: 'Visa', type: 'Credit', level: 'Gold' },
    '42': { brand: 'Visa', type: 'Credit', level: 'Classic' },
    '43': { brand: 'Visa', type: 'Credit', level: 'Platinum' },
    '44': { brand: 'Visa', type: 'Credit', level: 'Standard' },
    '45': { brand: 'Visa', type: 'Credit', level: 'Gold' },
    '46': { brand: 'Visa', type: 'Credit', level: 'Standard' },
    '47': { brand: 'Visa', type: 'Credit', level: 'Platinum' },
    '48': { brand: 'Visa', type: 'Credit', level: 'Standard' },
    '49': { brand: 'Visa', type: 'Credit', level: 'Premium' },
    
    // Mastercard
    '51': { brand: 'Mastercard', type: 'Credit', level: 'Standard' },
    '52': { brand: 'Mastercard', type: 'Credit', level: 'Gold' },
    '53': { brand: 'Mastercard', type: 'Credit', level: 'Platinum' },
    '54': { brand: 'Mastercard', type: 'Credit', level: 'World' },
    '55': { brand: 'Mastercard', type: 'Credit', level: 'World Elite' },
    
    // American Express
    '34': { brand: 'American Express', type: 'Credit', level: 'Gold' },
    '37': { brand: 'American Express', type: 'Credit', level: 'Platinum' },
    
    // Discover
    '6011': { brand: 'Discover', type: 'Credit', level: 'Standard' },
    '65': { brand: 'Discover', type: 'Credit', level: 'Standard' },
  };

  // Find the best match (longest prefix)
  let bestMatch = '';
  for (const prefix in binData) {
    if (bin.startsWith(prefix) && prefix.length > bestMatch.length) {
      bestMatch = prefix;
    }
  }

  const baseInfo = binData[bestMatch] || {};
  return {
    bin,
    brand: baseInfo.brand || 'Unknown',
    type: baseInfo.type || 'Credit',
    level: baseInfo.level || 'Standard',
    bank: getBankName(bin),
    country: getCountryFromBin(bin)
  };
}

function getBankName(bin: string): string {
  const bankData: Record<string, string> = {
    '4000': 'Test Bank',
    '4111': 'Visa Test Card',
    '4207': 'Chase Bank',
    '4532': 'Bank of America',
    '4556': 'Wells Fargo',
    '4929': 'Citibank',
    '5555': 'Mastercard Test Card',
    '5105': 'Capital One',
    '5200': 'HSBC',
    '5454': 'American Express Bank',
    '3782': 'American Express',
    '3714': 'American Express Gold',
  };

  for (const prefix in bankData) {
    if (bin.startsWith(prefix)) {
      return bankData[prefix];
    }
  }
  
  return 'Unknown Bank';
}

function getCountryFromBin(bin: string): string {
  // Simplified country detection based on common BIN patterns
  const countryData: Record<string, string> = {
    '4': 'United States',
    '5': 'United States', 
    '3': 'United States',
    '6': 'United States'
  };
  
  return countryData[bin[0]] || 'Unknown';
}

// Polynomial Random Number Generator with Seed Support
class PolynomialRNG {
  private seed: number;

  constructor(seed: number = Date.now()) {
    this.seed = seed % 2147483647;
    if (this.seed <= 0) this.seed += 2147483646;
  }

  next(): number {
    this.seed = (this.seed * 16807) % 2147483647;
    return this.seed;
  }

  nextFloat(): number {
    return (this.next() - 1) / 2147483646;
  }

  nextInt(min: number, max: number): number {
    return Math.floor(this.nextFloat() * (max - min + 1)) + min;
  }
}

// Card Generation Functions
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
  
  return { month, year };
}

export async function registerRoutes(app: Express): Promise<Server> {
  // BIN lookup endpoint
  app.get("/api/bin-lookup/:bin", async (req, res) => {
    try {
      const { bin } = req.params;
      if (!bin || !/^\d{6,16}$/.test(bin)) {
        return res.status(400).json({ message: "Invalid BIN format" });
      }
      
      const binInfo = getBinInfo(bin);
      res.json(binInfo);
    } catch (error) {
      res.status(500).json({ message: "BIN lookup failed" });
    }
  });

  // Card generation endpoint
  app.post("/api/generate-cards", async (req, res) => {
    try {
      const validatedData = generateCardSchema.parse(req.body);
      const { bin, month, year, ccv2, quantity, seed } = validatedData;

      const rng = new PolynomialRNG(seed);
      const results: string[] = [];
      const cardsWithMeta: CardWithMeta[] = [];
      let allCardsValid = true;

      for (let i = 0; i < quantity; i++) {
        const cardNumber = generateCardNumber(bin, rng);
        const ccv = generateCCV(ccv2, rng);
        const date = generateDate(month, year, rng);
        const brand = detectCardBrand(cardNumber);
        const isLuhnValid = luhnChecksum(cardNumber) === 0;
        
        if (!isLuhnValid) allCardsValid = false;
        
        results.push(`${cardNumber}|${date.month}|${date.year}|${ccv}`);
        cardsWithMeta.push({
          cardNumber,
          month: date.month,
          year: date.year,
          ccv,
          brand,
          isLuhnValid
        });
      }

      const binInfo = getBinInfo(bin);

      res.json({ 
        cards: results,
        cardsWithMeta,
        binInfo,
        isLuhnApproved: allCardsValid
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ 
          message: "Validation error", 
          errors: error.errors 
        });
      } else {
        res.status(500).json({ 
          message: "Internal server error" 
        });
      }
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
