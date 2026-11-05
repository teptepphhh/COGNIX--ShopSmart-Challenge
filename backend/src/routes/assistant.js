import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { prisma } from '../lib/prisma.js';
import { answerQuestion } from '../services/assistantOrchestrator.js';
import { createGeminiProvider } from '../services/gemini.js';
import { assistantQuestionSchema } from '../validators/schemas.js';
const router = Router();

const assistantLimiter = rateLimit({
  windowMs: 60_000,
  limit: 20,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  handler: (_request, response, _next, options) => response.status(options.statusCode).json({
    error: { code: 'RATE_LIMITED', message: 'Too many assistant questions. Please wait a minute and try again.' }
  })
});

// Created on first use, after dotenv has loaded. null means no key: rule-based fallback.
let provider;
function getProvider() {
  if (provider === undefined) provider = createGeminiProvider();
  return provider;
}

router.post('/questions', assistantLimiter, async (request, response, next) => {
  try {
    const parsed = assistantQuestionSchema.safeParse(request.body);
    if (!parsed.success) return response.status(422).json({ error: { code: 'INVALID_QUESTION', message: 'Question must contain between 3 and 300 characters.' } });
    const products = await prisma.product.findMany({ where: { active: true, stock: { gt: 0 } }, orderBy: { price: 'asc' } });
    response.json(await answerQuestion({ question: parsed.data.question, products, provider: getProvider() }));
  } catch (error) { next(error); }
});

export default router;
