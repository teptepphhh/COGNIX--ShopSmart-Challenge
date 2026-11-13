const QUESTION_STOP_WORDS = new Set([
  'a', 'an', 'and', 'are', 'below', 'best', 'can', 'for', 'find', 'get', 'good',
  'help', 'i', 'in', 'is', 'it', 'looking', 'me', 'my', 'of', 'on', 'or', 'please',
  'recommend', 'recommendation', 'show', 'some', 'that', 'the', 'there', 'to', 'under',
  'what', 'which', 'with', 'would', 'you'
]);

const NEUTRAL_DRAFT_WORDS = new Set([
  'a', 'an', 'and', 'are', 'at', 'available', 'based', 'below', 'budget', 'catalog',
  'consider', 'current', 'currently', 'for', 'found', 'here', 'i', 'in', 'is', 'it',
  'listed', 'match', 'matching', 'might', 'no', 'on', 'option', 'options', 'or', 'our',
  'php', 'price', 'priced', 'product', 'products', 'recommend', 'recommended', 'request',
  'shop', 'shopsmart', 'stock', 'the', 'this', 'these', 'to', 'under', 'we', 'within',
  'with', 'you', 'your',
  // Common recommendation phrasing that adds no product claim.
  'also', 'as', 'be', 'both', 'buy', 'can', 'choice', 'comes', 'cost', 'costs', 'details',
  'fit', 'fits', 'good', 'great', 'has', 'have', 'if', 'ideal', 'its', 'just', 'left', 'less',
  'meets', 'need', 'needs', 'of', 'offers', 'only', 'pick', 'right', 's', 'solid', 'suits',
  'than', 'that', 'there', 'they', 'unit', 'units', 'value', 'want', 'well', 'which', 'would',
  'design', 'designed', 'feature', 'features', 'featuring', 'includes', 'including', 'item', 'items',
  'perfect', 'suitable', 'under', 'option'
]);

export function parseBudget(question) {
  const amount = String.raw`((?:\d{1,3}(?:,\d{3})+|\d{2,6})(?:\.\d{1,2})?)(?!\d)`;
  const currencyMatch = question.match(new RegExp(String.raw`(?:₱|php\s*)${amount}`, 'i'));
  const budgetMatch = question.match(new RegExp(
    String.raw`\b(?:below|under|less\s+than|up\s+to|max(?:imum)?|budget(?:\s+of)?|within|at\s+most|cheaper\s+than)\b\s*(?:₱|php\s*)?${amount}`,
    'i'
  ));
  const match = currencyMatch || budgetMatch;
  return match ? Number(match[1].replaceAll(',', '')) : null;
}

function getQuestionTerms(question) {
  return [...new Set(
    question.toLowerCase().split(/[^a-z0-9]+/)
      .filter((term) => term.length > 2 && !QUESTION_STOP_WORDS.has(term) && !/^\d+$/.test(term))
  )];
}

function productText(product) {
  return `${product.name} ${product.category} ${product.description}`.toLowerCase();
}

export function rankProducts(products, question) {
  const terms = getQuestionTerms(question);
  const budget = parseBudget(question);
  if (terms.length === 0) return [];

  return products
    .filter((product) => product.active !== false && product.stock > 0
      && (budget === null || Number(product.price) <= budget))
    .map((product) => {
      const text = productText(product);
      return { ...product, score: terms.reduce((score, term) => score + (text.includes(term) ? 1 : 0), 0) };
    })
    .filter((product) => product.score > 0)
    .sort((a, b) => b.score - a.score || Number(a.price) - Number(b.price));
}

function responseForProducts(products, answer, answerMode) {
  return {
    answer,
    recommendedProducts: products.map(({ id, name, price, category }) => ({
      id, name, price: Number(price), category
    })),
    sources: products.map(({ id, name }) => ({ type: 'product', id, name })),
    answerMode
  };
}

function buildFallbackAnswer(products) {
  const options = products.map((product) =>
    `${product.name} at ₱${Number(product.price).toLocaleString('en-PH')}`
  );
  const introduction = options.length === 1 ? 'this in-stock option matches' : 'these in-stock options match';
  return `Based on the current catalog, ${introduction}: ${options.join('; ')}.`;
}

export function buildAssistantResponse(products, question) {
  const ranked = rankProducts(products, question).slice(0, 3);
  if (ranked.length === 0) {
    return responseForProducts([], 'I could not find an in-stock product matching that request.', 'no_match');
  }
  return responseForProducts(ranked, buildFallbackAnswer(ranked), 'fallback');
}

function providerQuestionSummary(question, products) {
  const terms = getQuestionTerms(question).filter((term) =>
    products.some((product) => productText(product).includes(term))
  );
  const budget = parseBudget(question);
  return [
    `Catalog-matched search terms: ${terms.join(', ') || 'general product request'}.`,
    ...(budget === null ? [] : [`Maximum budget: PHP ${budget}.`])
  ].join(' ');
}

export function sanitizeQuestion(question) {
  return question
    .replace(/[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g, '[email removed]')
    .replace(/\+?\d[\d\s-]{8,}\d/g, '[number removed]')
    .slice(0, 300);
}

export async function requestGeminiDraft(question, products, apiKey, fetchImpl = fetch) {
  const model = process.env.GEMINI_MODEL || 'gemini-3.8-flash';
  const response = await fetchImpl(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      signal: AbortSignal.timeout(8_000),
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: [
              'Write one concise customer-facing product answer using only the supplied catalog facts.',
              'Never add a specification, price, stock claim, product, or source that is not present in the facts.',
              'Return JSON with exactly an answer string and productIds array; productIds must contain only supplied IDs.',
              'You may describe a product only with words from its supplied name, category, and description.',
              `Customer question: ${sanitizeQuestion(question)}`,
              `Customer intent summary: ${providerQuestionSummary(question, products)}`,
              `Catalog facts: ${JSON.stringify(products.map(({ id, name, description, category, price, stock }) => ({
                id, name, description, category, price: Number(price), stock
              })))}`
            ].join('\n')
          }]
        }],
        generationConfig: {
          temperature: 0.1,
          responseMimeType: 'application/json',
          responseJsonSchema: {
            type: 'object',
            properties: {
              answer: { type: 'string' },
              productIds: { type: 'array', items: { type: 'integer' } }
            },
            required: ['answer', 'productIds']
          }
        }
      })
    }
  );

  if (!response.ok) throw new Error('Gemini request failed.');
  const payload = await response.json();
  const text = payload.candidates?.[0]?.content?.parts?.find((part) => typeof part.text === 'string')?.text;
  if (!text) throw new Error('Gemini returned no text.');
  return JSON.parse(text);
}

function isGroundedDraft(draft, selectedProducts, question) {
  if (typeof draft?.answer !== 'string' || draft.answer.trim().length === 0 || draft.answer.length > 600) return false;
  if (!Array.isArray(draft.productIds) || draft.productIds.length === 0 || draft.productIds.length > 3) return false;
  if (new Set(draft.productIds).size !== draft.productIds.length) return false;
  if (draft.productIds.some((id) => !selectedProducts.some((product) => product.id === id))) return false;

  const products = draft.productIds.map((id) => selectedProducts.find((product) => product.id === id));
  const answer = draft.answer.toLowerCase();
  if (!products.some((product) => answer.includes(product.name.toLowerCase()))) return false;

  const allowedNumbers = new Set(products.flatMap((product) => [Number(product.price), Number(product.stock)]));
  for (const product of products) {
    for (const [value] of `${product.name} ${product.description}`.matchAll(/\d[\d,]*(?:\.\d{1,2})?/g)) {
      allowedNumbers.add(Number(value.replaceAll(',', '')));
    }
  }
  const budget = parseBudget(question);
  const budgetContext = /\b(?:below|under|less\s+than|up\s+to|max(?:imum)?|budget(?:\s+of)?|within|at\s+most|cheaper\s+than)\s*(?:₱|php\s*)?$/i;
  const numbers = [...draft.answer.matchAll(/\d[\d,]*(?:\.\d{1,2})?/g)];
  if (numbers.some(([value, index]) => {
    const number = Number(value.replaceAll(',', ''));
    if (allowedNumbers.has(number)) return false;
    return number !== budget || !budgetContext.test(draft.answer.slice(0, index));
  })) return false;

  const allowedWords = new Set(NEUTRAL_DRAFT_WORDS);
  for (const product of products) {
    for (const word of `${product.name} ${product.category} ${product.description}`.toLowerCase().split(/[^a-z0-9]+/)) {
      if (word) allowedWords.add(word);
    }
  }
  const words = answer.split(/[^a-z0-9]+/).filter((word) => word && !/^\d+$/.test(word));
  return words.every((word) => allowedWords.has(word));
}

export async function createAssistantResponse(products, question, {
  apiKey = process.env.GEMINI_API_KEY,
  generateDraft = requestGeminiDraft
} = {}) {
  const ranked = rankProducts(products, question).slice(0, 3);
  if (ranked.length === 0) {
    return responseForProducts([], 'I could not find an in-stock product matching that request.', 'no_match');
  }

  const fallback = responseForProducts(ranked, buildFallbackAnswer(ranked), 'fallback');
  if (!apiKey) return fallback;

  try {
    const draft = await generateDraft(question, ranked, apiKey);
    if (!isGroundedDraft(draft, ranked, question)) return fallback;
    const selected = draft.productIds.map((id) => ranked.find((product) => product.id === id));
    return responseForProducts(selected, draft.answer.trim(), 'ai');
  } catch {
    return fallback;
  }
}
