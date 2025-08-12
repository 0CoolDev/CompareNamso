import { z } from "zod";

export const generateCardSchema = z.object({
  bin: z.string().regex(/^\d{6,16}$/, "BIN must be 6-16 digits"),
  month: z.string().optional(),
  year: z.string().optional(),
  ccv2: z.string().optional(),
  quantity: z.number().min(1).max(100),
  seed: z.number().optional()
});

export const binInfoSchema = z.object({
  bin: z.string(),
  bank: z.string().optional(),
  brand: z.string().optional(),
  country: z.string().optional(),
  type: z.string().optional(),
  level: z.string().optional()
});

export const cardWithMetaSchema = z.object({
  cardNumber: z.string(),
  month: z.string(),
  year: z.string(),
  ccv: z.string(),
  brand: z.string().optional(),
  isLuhnValid: z.boolean()
});

export const cardResultSchema = z.object({
  cards: z.array(z.string()),
  cardsWithMeta: z.array(cardWithMetaSchema),
  binInfo: binInfoSchema.optional(),
  isLuhnApproved: z.boolean()
});

export type GenerateCardRequest = z.infer<typeof generateCardSchema>;
export type CardResult = z.infer<typeof cardResultSchema>;
export type BinInfo = z.infer<typeof binInfoSchema>;
export type CardWithMeta = z.infer<typeof cardWithMetaSchema>;
