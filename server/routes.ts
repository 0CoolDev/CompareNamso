import type { Express } from "express";
import { createServer, type Server } from "http";
import { generateCardSchema } from "@shared/schema";
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

// Polynomial Random Number Generator
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
  // Card generation endpoint
  app.post("/api/generate-cards", async (req, res) => {
    try {
      const validatedData = generateCardSchema.parse(req.body);
      const { bin, month, year, ccv2, quantity } = validatedData;

      const rng = new PolynomialRNG();
      const results: string[] = [];

      for (let i = 0; i < quantity; i++) {
        const cardNumber = generateCardNumber(bin, rng);
        const ccv = generateCCV(ccv2, rng);
        const date = generateDate(month, year, rng);
        
        results.push(`${cardNumber}|${date.month}|${date.year}|${ccv}`);
      }

      res.json({ cards: results });
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
