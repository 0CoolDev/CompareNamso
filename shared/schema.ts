import { z } from "zod";

export const generateCardSchema = z.object({
  bin: z.string().regex(/^\d{6,16}$/, "BIN must be 6-16 digits"),
  month: z.string().optional(),
  year: z.string().optional(),
  ccv2: z.string().optional(),
  quantity: z.number().min(1).max(100)
});

export const cardResultSchema = z.object({
  cards: z.array(z.string())
});

export type GenerateCardRequest = z.infer<typeof generateCardSchema>;
export type CardResult = z.infer<typeof cardResultSchema>;
