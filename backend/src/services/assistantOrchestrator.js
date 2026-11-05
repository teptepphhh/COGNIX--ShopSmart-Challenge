// Grounded assistant flow: retrieve -> ask the provider -> verify -> respond.
// Every recommended product and source is built from database rows that were
// retrieved for this request, never from text written by the model.
import { aiAssistantOutputSchema } from '../validators/schemas.js';
import {
  MAX_RECOMMENDED_PRODUCTS, buildAssistantResponse, isAvailable, noMatchResponse, parseBudget,
  retrieveProducts, toRecommendedProducts, toSources
} from './assistant.js';
import { PROVIDER_ERROR_CODES } from './gemini.js';

export const AI_UNAVAILABLE_NOTE = '(AI assistant unavailable — showing catalog-based results.)';
export const AI_UNVERIFIED_NOTE = '(The AI draft could not be verified against the catalog — showing catalog-based results.)';

export const FALLBACK_REASONS = Object.freeze({
  ...PROVIDER_ERROR_CODES,
  UNGROUNDED: 'UNGROUNDED',
  PRICE_MISMATCH: 'PRICE_MISMATCH',
  AVAILABILITY_MISMATCH: 'AVAILABILITY_MISMATCH'
});

// The provider could not be reached or used: the AI is "unavailable".
const UNAVAILABLE_REASONS = new Set([
  FALLBACK_REASONS.NO_KEY, FALLBACK_REASONS.TIMEOUT, FALLBACK_REASONS.RATE_LIMITED, FALLBACK_REASONS.PROVIDER_ERROR
]);

// Every other reason means the AI did answer, but its draft failed a check.
export function fallbackNoteFor(reason) {
  return UNAVAILABLE_REASONS.has(reason) ? AI_UNAVAILABLE_NOTE : AI_UNVERIFIED_NOTE;
}

const AMOUNT = String.raw`(\d{1,3}(?:,\d{3})+(?:\.\d{1,2})?|\d+(?:\.\d{1,2})?)(?![a-z\d])`;
const MENTIONED_AMOUNT_PATTERNS = [
  new RegExp(String.raw`(?:₱|\bphp\.?|\bp\.?(?=\s?\d))\s*${AMOUNT}`, 'gi'), // ₱1,850  PHP 1,850  P1850  P 1850  P.1850
  new RegExp(String.raw`${AMOUNT}\s*(?:pesos?|php)\b`, 'gi'), // 1850 pesos  1,850 PHP
  /(?<![\d.,])(\d{1,3}(?:,\d{3})+(?:\.\d{1,2})?)(?![\d,]|\.\d)/g, // 1,850 or 1,850.00 without a symbol
  /(?<![\d.,])(\d+\.\d{2})(?![\d])/g // 1850.00 without a symbol
];
const UNAVAILABLE_PATTERN = /\b(?:out of stock|sold out|unavailable|not available|no longer available|not in stock|no stock|discontinued)\b|\bisn['’]t available\b/i;

const toCents = (amount) => Math.round(Number(amount) * 100);

export function extractMentionedAmounts(text) {
  const amounts = new Set();
  for (const pattern of MENTIONED_AMOUNT_PATTERNS) {
    for (const match of text.matchAll(pattern)) amounts.add(toCents(match[1].replaceAll(',', '')));
  }
  return [...amounts];
}

// Every amount in the answer must be the DB price of a selected product.
// The customer's own budget may be repeated back to them.
export function hasPriceMismatch(answer, selectedProducts, budget = null) {
  const allowed = new Set(selectedProducts.map((product) => toCents(product.price)));
  if (budget !== null) allowed.add(toCents(budget));
  return extractMentionedAmounts(answer).some((amount) => !allowed.has(amount));
}

// A sentence that names a selected product must not call it unavailable, and a
// selected product must really be available.
export function hasAvailabilityMismatch(answer, selectedProducts) {
  if (selectedProducts.some((product) => !isAvailable(product))) return true;
  const sentences = answer.split(/(?<=[.!?])\s+|\n+/);
  return sentences.some((sentence) => {
    const lower = sentence.toLowerCase();
    return UNAVAILABLE_PATTERN.test(sentence)
      && selectedProducts.some((product) => lower.includes(product.name.toLowerCase()));
  });
}

function selectGroundedProducts(productIds, retrieved) {
  const byId = new Map(retrieved.map((product) => [product.id, product]));
  const selected = [];
  for (const id of new Set(productIds)) {
    if (byId.has(id)) selected.push(byId.get(id));
  }
  return selected.slice(0, MAX_RECOMMENDED_PRODUCTS);
}

export async function answerQuestion({ question, products, provider, logger = console }) {
  const retrieved = retrieveProducts(products, question);
  if (retrieved.length === 0) return noMatchResponse();

  // Only a reason code is logged: never the key, the prompt or the question.
  const fallback = (reason, status) => {
    logger.warn(`[assistant] fallback reason=${reason}${status ? ` status=${status}` : ''}`);
    return buildAssistantResponse(retrieved, question, { note: fallbackNoteFor(reason) });
  };

  if (!provider) return fallback(FALLBACK_REASONS.NO_KEY);

  let output;
  try {
    output = await provider.generate({ question, products: retrieved });
  } catch (error) {
    const reason = Object.values(PROVIDER_ERROR_CODES).includes(error?.code) ? error.code : FALLBACK_REASONS.PROVIDER_ERROR;
    return fallback(reason, error?.status);
  }

  const parsed = aiAssistantOutputSchema.safeParse(output);
  if (!parsed.success) return fallback(FALLBACK_REASONS.INVALID_RESPONSE);

  const { answer, productIds } = parsed.data;
  const budget = parseBudget(question);

  // The AI judged that none of the retrieved products fit (e.g. "study lamp" only
  // matched the Laptop Stand by category). An honest "no" is a valid grounded answer.
  if (productIds.length === 0) {
    if (hasPriceMismatch(answer, [], budget)) return fallback(FALLBACK_REASONS.PRICE_MISMATCH);
    return { answer, recommendedProducts: [], sources: [] };
  }

  // Ids that were not retrieved for this request are dropped. If the AI named
  // products but none of them are real retrieved products, its answer is not trusted.
  const selected = selectGroundedProducts(productIds, retrieved);
  if (selected.length === 0) return fallback(FALLBACK_REASONS.UNGROUNDED);

  if (hasPriceMismatch(answer, selected, budget)) return fallback(FALLBACK_REASONS.PRICE_MISMATCH);
  if (hasAvailabilityMismatch(answer, selected)) return fallback(FALLBACK_REASONS.AVAILABILITY_MISMATCH);

  return { answer, recommendedProducts: toRecommendedProducts(selected), sources: toSources(selected) };
}
