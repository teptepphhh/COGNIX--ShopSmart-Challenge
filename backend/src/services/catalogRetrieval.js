// Lab 5: picks the catalog facts an answer is allowed to use.
// ShopSmart code (not the AI provider) decides which products are eligible.

const STOPWORDS = new Set([
  'a', 'an', 'and', 'any', 'anything', 'are', 'around', 'best', 'budget', 'buy', 'can', 'cheap', 'cheaper',
  'cheapest', 'could', 'does', 'for', 'from', 'get', 'good', 'have', 'help', 'how', 'item', 'items', 'less',
  'looking', 'max', 'maximum', 'more', 'most', 'much', 'need', 'one', 'ones', 'php', 'peso', 'pesos', 'please',
  'price', 'priced', 'product', 'products', 'recommend', 'sell', 'shopsmart', 'show', 'something', 'than',
  'that', 'the', 'there', 'this', 'under', 'below', 'what', 'which', 'with', 'within', 'want', 'you', 'your',
  'there', 'about', 'some', 'got', 'stock', 'available', 'buy', 'offer', 'up', 'is', 'it', 'me', 'my'
]);

export const MAX_FACTS = 3;

function normalizeToken(token) {
  if (token.length > 4 && token.endsWith('es') && /(ches|shes|xes|sses)$/.test(token)) return token.slice(0, -2);
  if (token.length > 3 && token.endsWith('s') && !token.endsWith('ss')) return token.slice(0, -1);
  return token;
}

export function extractTerms(question) {
  const words = question.toLowerCase().replace(/₱\s?[\d,.]+k?/g, ' ').split(/[^a-z0-9]+/);
  const terms = words
    .filter((word) => word.length > 2 && !STOPWORDS.has(word) && !/^\d+k?$/.test(word))
    .map(normalizeToken);
  return [...new Set(terms)];
}

// A budget is only read when the question marks it as money or as a limit,
// so "1080p webcam" is not mistaken for a ₱1,080 budget.
export function parseBudget(question) {
  const text = question.toLowerCase();
  const patterns = [
    /(?:₱|\bphp|\bp)\s?(\d[\d,]*(?:\.\d{1,2})?)\s*(k)?\b/,
    /(\d[\d,]*(?:\.\d{1,2})?)\s*(k)?\s*(?:pesos?|php)\b/,
    /(?:below|under|less than|cheaper than|at most|max(?:imum)?|budget(?: of| is)?|up to|within|not more than)\s*(?:₱|php)?\s?(\d[\d,]*(?:\.\d{1,2})?)\s*(k)?\b/
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const amount = Number(match[1].replaceAll(',', ''));
      if (Number.isFinite(amount) && amount > 0) return match[2] ? amount * 1000 : amount;
    }
  }
  return null;
}

// Database prices are Prisma Decimal values; convert them once, deliberately.
export function toPeso(value) {
  const amount = Number(value);
  return Number.isFinite(amount) ? Math.round(amount * 100) / 100 : null;
}

function productTokens(product) {
  return `${product.name} ${product.category} ${product.description}`.toLowerCase()
    .split(/[^a-z0-9]+/).filter(Boolean).map(normalizeToken);
}

function scoreProduct(product, terms) {
  const tokens = productTokens(product);
  const joined = tokens.join(' ');
  return terms.reduce((score, term) => score + (tokens.includes(term) || (term.length >= 5 && joined.includes(term)) ? 1 : 0), 0);
}

// The only fields sent to the AI provider.
export function toFact(product) {
  return {
    id: product.id,
    name: product.name,
    description: product.description,
    category: product.category,
    price: toPeso(product.price),
    stock: product.stock
  };
}

export function selectCatalogFacts(products, question) {
  const terms = extractTerms(question);
  const budget = parseBudget(question);
  const usable = products.filter((product) => product.active !== false && toPeso(product.price) !== null);
  const scored = usable.map((product) => ({ product, score: terms.length ? scoreProduct(product, terms) : 0 }));
  const relevant = terms.length ? scored.filter((entry) => entry.score > 0) : (budget !== null ? scored : []);

  const eligible = relevant
    .filter(({ product }) => product.stock > 0 && (budget === null || toPeso(product.price) <= budget))
    .sort((a, b) => b.score - a.score || toPeso(a.product.price) - toPeso(b.product.price))
    .slice(0, MAX_FACTS)
    .map(({ product }) => toFact(product));

  return {
    terms,
    budget,
    facts: eligible,
    outOfStock: relevant.filter(({ product }) => product.stock <= 0).map(({ product }) => toFact(product)),
    overBudget: relevant
      .filter(({ product }) => product.stock > 0 && budget !== null && toPeso(product.price) > budget)
      .map(({ product }) => toFact(product))
  };
}

// Kept for the starter tests and the rule-based fallback.
export function rankProducts(products, question) {
  const { facts } = selectCatalogFacts(products, question);
  return facts;
}
