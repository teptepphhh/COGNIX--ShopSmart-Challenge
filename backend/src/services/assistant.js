// Retrieval and the rule-based assistant.
// This module never calls an AI provider. It decides which catalog products are
// relevant to a question, and it builds the rule-based answer that is used when
// the AI provider is unavailable or its output fails verification.

export const MAX_RETRIEVED_PRODUCTS = 5;
export const MAX_RECOMMENDED_PRODUCTS = 3;
export const NO_MATCH_ANSWER = 'I could not find an in-stock ShopSmart product matching that request.';

// Words that describe the request rather than the product, so they never count as matches.
const STOPWORDS = new Set([
  'about', 'above', 'all', 'also', 'and', 'any', 'anything', 'are', 'around', 'available', 'below', 'best',
  'budget', 'buy', 'can', 'cheap', 'cheaper', 'cheapest', 'could', 'does', 'for', 'from', 'get', 'good', 'got',
  'have', 'has', 'hello', 'help', 'how', 'item', 'items', 'less', 'like', 'looking', 'lower', 'max', 'maximum',
  'more', 'most', 'need', 'not', 'one', 'only', 'over', 'peso', 'pesos', 'php', 'please', 'price', 'product',
  'products', 'recommend', 'sell', 'selling', 'shopsmart', 'show', 'some', 'something', 'stock', 'store',
  'suggest', 'than', 'that', 'the', 'there', 'this', 'under', 'want', 'what', 'where', 'which', 'with',
  'within', 'would', 'you', 'your'
]);

// An amount such as 2000, 2,000 or 2,000.50. The lookahead rejects numbers that
// are part of a word, so "1080p" is never read as an amount.
const AMOUNT = String.raw`(\d{1,3}(?:,\d{3})+(?:\.\d{1,2})?|\d+(?:\.\d{1,2})?)(?![a-z\d])`;
const BUDGET_CUE = String.raw`(?:below|under|less\s+than|cheaper\s+than|lower\s+than|up\s+to|at\s+most|no\s+more\s+than|not\s+more\s+than|max(?:imum)?|budget(?:\s+(?:of|is))?|within)`;
const CURRENCY = String.raw`(?:₱|\bphp\s*|\bp(?=\d))`;
const CUED_AMOUNT_PATTERN = new RegExp(String.raw`\b${BUDGET_CUE}\s*[:=]?\s*${CURRENCY}?\s*${AMOUNT}`, 'gi');
const CURRENCY_AMOUNT_PATTERN = new RegExp(String.raw`${CURRENCY}\s*${AMOUNT}`, 'gi');
// "above ₱1,000" is a minimum, not a budget ceiling.
const MINIMUM_CUE_BEFORE = /\b(?:above|over|more\s+than|at\s+least|from|starting\s+at)\s*$/i;

function toAmount(text) {
  return Number(text.replaceAll(',', ''));
}

export function parseBudget(question) {
  const text = String(question ?? '');
  const amounts = [...text.matchAll(CUED_AMOUNT_PATTERN)].map((match) => toAmount(match[1]));
  for (const match of text.matchAll(CURRENCY_AMOUNT_PATTERN)) {
    if (!MINIMUM_CUE_BEFORE.test(text.slice(0, match.index))) amounts.push(toAmount(match[1]));
  }
  return amounts.length > 0 ? Math.max(...amounts) : null;
}

export function extractKeywords(question) {
  const normalized = String(question ?? '').toLowerCase().replace(/(\d),(?=\d{3}\b)/g, '$1');
  const terms = normalized
    .split(/[^a-z0-9]+/)
    .filter((term) => term.length > 2 && !/^\d+$/.test(term) && !STOPWORDS.has(term));
  return [...new Set(terms)];
}

function matchesTerm(text, term) {
  if (text.includes(term)) return true;
  if (term.length > 4 && term.endsWith('es') && text.includes(term.slice(0, -2))) return true;
  return term.length > 3 && term.endsWith('s') && text.includes(term.slice(0, -1));
}

export function isAvailable(product) {
  return product.active !== false && Number(product.stock) > 0;
}

// Returns every relevant, available product, best match first.
// A product is relevant when at least one keyword matches its name, category or
// description. A budget-only question ("anything under ₱1,000?") matches every
// product within budget. Products that match no keyword are never used as filler.
export function rankProducts(products, question) {
  const keywords = extractKeywords(question);
  const budget = parseBudget(question);
  if (keywords.length === 0 && budget === null) return [];

  return products
    .filter((product) => isAvailable(product) && (budget === null || Number(product.price) <= budget))
    .map((product) => {
      const text = `${product.name} ${product.category} ${product.description}`.toLowerCase();
      return { ...product, score: keywords.filter((term) => matchesTerm(text, term)).length };
    })
    .filter((product) => keywords.length === 0 || product.score >= 1)
    .sort((a, b) => b.score - a.score || Number(a.price) - Number(b.price) || a.id - b.id);
}

export function retrieveProducts(products, question) {
  return rankProducts(products, question).slice(0, MAX_RETRIEVED_PRODUCTS);
}

export function formatPeso(amount) {
  return `₱${Number(amount).toLocaleString('en-PH', { maximumFractionDigits: 2 })}`;
}

export function toRecommendedProducts(products) {
  return products.map(({ id, name, price, category }) => ({ id, name, price: Number(price), category }));
}

export function toSources(products) {
  return products.map(({ id, name }) => ({ type: 'product', id, name }));
}

export function noMatchResponse() {
  return { answer: NO_MATCH_ANSWER, recommendedProducts: [], sources: [] };
}

// The rule-based answer. It is also the fallback when the AI provider fails.
export function buildAssistantResponse(products, question, { note } = {}) {
  const ranked = retrieveProducts(products, question).slice(0, MAX_RECOMMENDED_PRODUCTS);
  if (ranked.length === 0) return noMatchResponse();
  const names = ranked.map((product) => `${product.name} (${formatPeso(product.price)})`).join(', ');
  return {
    answer: `Based on the current ShopSmart catalog, consider: ${names}.${note ? ` ${note}` : ''}`,
    recommendedProducts: toRecommendedProducts(ranked),
    sources: toSources(ranked)
  };
}
