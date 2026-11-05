// Lab 5: treats the AI response as a draft and checks it against catalog facts.

const MONEY = /(?:₱|\bphp\s?|\bp(?=\d))\s?(\d[\d,]*(?:\.\d{1,2})?)|(\d[\d,]*(?:\.\d{1,2})?)\s*(?:pesos?|php)\b/gi;
const STOCK_COUNT = /\b(\d+)\s*(?:units?|pieces?|pcs|items?)?\s*(?:left|in stock|available|remaining)\b/gi;
const NOT_AVAILABLE = /\b(?:out of stock|sold out|unavailable|not available|no stock)\b/i;
const EXTRA_CLAIMS = ['discount', 'sale', '% off', 'free shipping', 'shipping', 'delivery', 'warranty', 'guarantee', 'rating', 'review', 'bestseller', 'best-seller', 'promo', 'voucher', 'bundle'];

export const MAX_ANSWER_LENGTH = 700;

function amountsIn(text) {
  return [...text.matchAll(MONEY)].map((match) => Number((match[1] || match[2]).replaceAll(',', '')));
}

export function verifyDraft(draft, { facts, catalog = [], budget = null }) {
  const issues = [];
  const factIds = new Set(facts.map((fact) => fact.id));
  const answer = typeof draft?.answer === 'string' ? draft.answer.trim() : '';

  if (!answer) issues.push('EMPTY_ANSWER');
  if (answer.length > MAX_ANSWER_LENGTH) issues.push('ANSWER_TOO_LONG');

  const ids = Array.isArray(draft?.productIds) ? draft.productIds : [];
  const productIds = [];
  for (const raw of ids) {
    const id = Number(raw);
    if (!Number.isInteger(id) || !factIds.has(id)) issues.push('UNKNOWN_PRODUCT_ID');
    else if (!productIds.includes(id)) productIds.push(id);
  }

  // Every peso amount must be a selected product's current price or the customer's own budget.
  const allowedAmounts = new Set(facts.map((fact) => fact.price));
  if (budget !== null) allowedAmounts.add(budget);
  if (amountsIn(answer).some((amount) => !allowedAmounts.has(amount))) issues.push('UNSUPPORTED_PRICE');

  // Stock numbers must match current stock; selected products are all in stock.
  const stockValues = new Set(facts.map((fact) => fact.stock));
  if ([...answer.matchAll(STOCK_COUNT)].some((match) => !stockValues.has(Number(match[1])))) issues.push('UNSUPPORTED_STOCK');
  if (NOT_AVAILABLE.test(answer)) issues.push('UNSUPPORTED_AVAILABILITY');

  // Details the catalog does not contain (discounts, shipping, warranty...).
  const lower = answer.toLowerCase();
  const factText = facts.map((fact) => `${fact.name} ${fact.description}`).join(' ').toLowerCase();
  if (EXTRA_CLAIMS.some((claim) => lower.includes(claim) && !factText.includes(claim))) issues.push('UNSUPPORTED_DETAIL');

  // Naming a real catalog product that was not selected for this request.
  const mentionedOther = catalog.some((product) => !factIds.has(product.id) && lower.includes(product.name.toLowerCase()));
  if (mentionedOther) issues.push('UNSELECTED_PRODUCT_MENTIONED');

  return { ok: issues.length === 0, answer, productIds, issues: [...new Set(issues)] };
}
