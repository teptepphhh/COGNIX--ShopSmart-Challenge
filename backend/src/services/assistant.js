// Lab 5: grounded product assistant.
// Flow: select catalog facts -> (optional) AI draft -> verify -> respond, with a rule-based fallback.
import { parseBudget, rankProducts, selectCatalogFacts, toPeso } from './catalogRetrieval.js';
import { verifyDraft } from './answerVerifier.js';

export { parseBudget, rankProducts };

const NOTICES = {
  NOT_CONFIGURED: 'AI drafting is not configured on this server, so this answer comes straight from the catalog rules.',
  PROVIDER_TIMEOUT: 'The AI service took too long to reply, so this answer was built directly from the catalog.',
  PROVIDER_RATE_LIMITED: 'The AI service is busy right now (rate limit reached), so this answer was built directly from the catalog.',
  PROVIDER_UNAVAILABLE: 'The AI service is unavailable right now, so this answer was built directly from the catalog.',
  PROVIDER_AUTH: 'The AI service rejected the server configuration, so this answer was built directly from the catalog.',
  PROVIDER_INVALID_FORMAT: 'The AI service returned a malformed reply, so this answer was built directly from the catalog.',
  VERIFICATION_FAILED: 'The AI draft made claims that could not be verified against the catalog, so it was replaced with a catalog-only answer.'
};

export function formatPeso(amount) {
  return `₱${amount.toLocaleString('en-PH', { minimumFractionDigits: amount % 1 ? 2 : 0, maximumFractionDigits: 2 })}`;
}

function describe(fact) {
  return `${fact.name} (${formatPeso(fact.price)}, ${fact.stock} in stock)`;
}

function toRecommended(fact) {
  return { id: fact.id, name: fact.name, price: fact.price, category: fact.category, stock: fact.stock };
}

function toSource(fact) {
  return { type: 'product', id: fact.id, name: fact.name, price: fact.price, stock: fact.stock };
}

export function buildNoMatchAnswer({ terms, budget, outOfStock, overBudget }) {
  const parts = [];
  if (outOfStock.length) parts.push(`${outOfStock.map((fact) => fact.name).join(', ')} ${outOfStock.length > 1 ? 'are' : 'is'} currently out of stock, so I can't recommend ${outOfStock.length > 1 ? 'them' : 'it'} right now.`);
  if (overBudget.length) parts.push(`The closest match${overBudget.length > 1 ? 'es are' : ' is'} ${overBudget.map(describe).join(', ')}, which is above your ${formatPeso(budget)} budget.`);
  const lead = terms.length || budget !== null
    ? 'I could not find an in-stock ShopSmart product that matches that request.'
    : 'Tell me what kind of product you are looking for (for example a keyboard, lamp or headset) and I will check the catalog.';
  return [lead, ...parts].join(' ');
}

export function buildRuleAnswer(facts, budget) {
  const [first, ...others] = facts;
  const budgetText = budget !== null ? ` and is within your ${formatPeso(budget)} budget` : '';
  const otherText = others.length ? ` Other matching options: ${others.map(describe).join('; ')}.` : '';
  return `From the current ShopSmart catalog, the ${describe(first)} matches your request${budgetText}.${otherText}`;
}

// Synchronous rule-based answer (the starter behaviour, now with honest no-match handling).
export function buildAssistantResponse(products, question) {
  const retrieval = selectCatalogFacts(products, question);
  const verification = { checked: true, issues: [] };
  if (retrieval.facts.length === 0) {
    const context = [...retrieval.outOfStock, ...retrieval.overBudget];
    return { answer: buildNoMatchAnswer(retrieval), recommendedProducts: [], sources: context.map(toSource), mode: 'no_match', verification };
  }
  return {
    answer: buildRuleAnswer(retrieval.facts, retrieval.budget),
    recommendedProducts: retrieval.facts.map(toRecommended),
    sources: retrieval.facts.map(toSource),
    mode: 'rules',
    verification
  };
}

export async function answerQuestion({ products, question, provider, logger = console }) {
  const ruleResponse = buildAssistantResponse(products, question);

  // No eligible product: answer honestly without calling the provider.
  if (ruleResponse.mode === 'no_match') return ruleResponse;
  if (!provider) return { ...ruleResponse, notice: NOTICES.NOT_CONFIGURED };

  const { facts, budget } = selectCatalogFacts(products, question);
  let draft;
  try {
    draft = await provider.draftAnswer(question, facts);
  } catch (error) {
    const code = error.code && NOTICES[error.code] ? error.code : 'PROVIDER_UNAVAILABLE';
    logger.warn(`[assistant] provider fallback: ${code}`);
    return { ...ruleResponse, notice: NOTICES[code], fallbackReason: code };
  }

  const catalog = products.map((product) => ({ id: product.id, name: product.name, price: toPeso(product.price) }));
  const result = verifyDraft(draft, { facts, catalog, budget });
  if (!result.ok) {
    logger.warn(`[assistant] AI draft rejected: ${result.issues.join(', ')}`);
    return { ...ruleResponse, notice: NOTICES.VERIFICATION_FAILED, fallbackReason: 'VERIFICATION_FAILED', verification: { checked: true, issues: result.issues } };
  }

  const recommended = result.productIds.map((id) => facts.find((fact) => fact.id === id));
  return {
    answer: result.answer,
    recommendedProducts: recommended.map(toRecommended),
    sources: (recommended.length ? recommended : facts).map(toSource),
    mode: 'ai',
    provider: provider.name,
    verification: { checked: true, issues: [] }
  };
}
