import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import StatusMessage from '../components/StatusMessage.jsx';
import { api } from '../services/api.js';

function AssistantModeBadge({ mode }) {
  if (mode === 'catalog-only') return (
    <p className="mode-badge catalog" role="note">
      <strong>Catalog-only mode (no live AI).</strong> This server has no AI provider configured. Answers are built by ShopSmart from the product catalog, not written by an AI.
    </p>
  );
  if (mode === 'live-ai') return (
    <p className="mode-badge live" role="note">
      <strong>Live AI provider connected.</strong> AI drafts are checked against the catalog before they are shown.
    </p>
  );
  return null;
}

export default function AssistantPage() {
  const [question, setQuestion] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  // Improvement 1: show which kind of assistant this server runs, before and after each answer.
  const [mode, setMode] = useState(null);

  useEffect(() => {
    let active = true;
    api.getAssistantStatus().then((data) => { if (active) setMode(data.mode); }).catch(() => {});
    return () => { active = false; };
  }, []);

  async function ask(event) {
    event.preventDefault(); setError(''); setResult(null); setLoading(true);
    try {
      const answer = await api.askAssistant(question);
      setResult(answer);
      if (answer.mode) setMode(answer.mode);
    }
    catch (caught) { setError(caught.message); }
    finally { setLoading(false); }
  }

  return (
    <section className="assistant-layout">
      <div>
        <p className="eyebrow">GROUNDED PRODUCT ASSISTANT</p>
        <h1>Find a product</h1>
        <AssistantModeBadge mode={mode} />
        <p>Ask about ShopSmart products. The server finds matching in-stock products first, and the AI answers only from those catalog facts. Every recommendation links to its source product. If the AI service is unavailable, you get catalog-based results instead.</p>
        <form onSubmit={ask}>
          <label>Your question<textarea value={question} onChange={(event) => setQuestion(event.target.value)} minLength="3" maxLength="300" placeholder="Which keyboard is below ₱2,000?" required /></label>
          <button disabled={loading}>{loading ? 'Searching…' : 'Ask ShopSmart'}</button>
        </form>
      </div>
      <div className="assistant-answer">
        <h2>Assistant response</h2>
        <StatusMessage type="error">{error}</StatusMessage>
        {!result && !error && <p>Your answer will appear here.</p>}
        {result && <>
          <p>{result.answer}</p>
          <div className="recommendations">
            {result.recommendedProducts.map((product) => (
              <Link key={product.id} to={`/products/${product.id}`}>{product.name} — ₱{Number(product.price).toLocaleString('en-PH')}</Link>
            ))}
          </div>
          {result.sources?.length > 0 && (
            <div className="assistant-sources">
              <h3>Sources</h3>
              <ul>
                {result.sources.map((source) => (
                  <li key={source.id}>
                    <Link to={`/products/${source.id}`}>{source.name}</Link> <small>(product #{source.id})</small>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>}
      </div>
    </section>
  );
}
