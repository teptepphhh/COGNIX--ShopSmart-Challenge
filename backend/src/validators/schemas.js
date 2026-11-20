import { z } from 'zod';

export const orderSchema = z.object({
  customerName: z.string().trim().min(2).max(80),
  email: z.email(),
  address: z.string().trim().min(10).max(300),
  items: z.array(z.object({
    productId: z.coerce.number().int().positive(),
    quantity: z.coerce.number().int().min(1).max(20)
  })).min(1).max(20).refine(
    (items) => new Set(items.map((item) => item.productId)).size === items.length,
    { message: 'Each product may appear only once in an order.' }
  )
});

export const assistantQuestionSchema = z.object({
  question: z.string().trim().min(3).max(300)
});

// Shape the AI provider must return. Gemini's JSON mode guarantees valid JSON,
// not valid values, so the server checks every field again here.
export const aiAssistantOutputSchema = z.object({
  answer: z.string().trim().min(1).max(800),
  productIds: z.array(z.number().int().positive()).max(3)
});

// Sign-in for fictional test customers. Email is stored in lower case so sign-in is not case-sensitive.
const emailField = z.string().trim().toLowerCase().pipe(z.email()).pipe(z.string().max(120));
export const registerSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: emailField,
  // scrypt has no length limit, but a cap keeps hashing time predictable.
  password: z.string().min(8).max(72)
});

export const loginSchema = z.object({
  email: emailField,
  password: z.string().min(1).max(72)
});
