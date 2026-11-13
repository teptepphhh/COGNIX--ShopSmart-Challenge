import { useState } from 'react';
import { Link } from 'react-router-dom';
import StatusMessage from '../components/StatusMessage.jsx';
import { api } from '../services/api.js';

export default function AssistantPage() {
  const [question, setQuestion] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function ask(event) {
    event.preventDefault(); setError(''); setResult(null); setLoading(true);
    try { setResult(await api.askAssistant(question)); }
    catch (caught) { setError(caught.message); }
    finally { setLoading(false); }
  }

  return (
    <section className="assistant-layout">
      <div>
        <p className="eyebrow">SHOPSMART ASSISTANT</p>
        <h1>Find a product</h1>
        <p>Ask about a product or budget. Recommendations use current, in-stock ShopSmart catalog items.</p>
        <form onSubmit={ask}>
          <label>Your question<textarea value={question} onChange={(event) => setQuestion(event.target.value)} minLength="3" maxLength="300" placeholder="Which keyboard is below ₱2,000?" required /></label>
          <button disabled={loading}>{loading ? 'Searching…' : 'Ask ShopSmart'}</button>
        </form>
      </div>
      <div className="assistant-answer">
        <h2>Assistant response</h2>
        {loading && <StatusMessage>Searching the current catalog…</StatusMessage>}
        <StatusMessage type="error">{error}</StatusMessage>
        {!result && !error && <p>Your answer will appear here.</p>}
        {result && <>
          {result.answerMode === 'ai' && <StatusMessage>AI-drafted answer, checked against the current catalog.</StatusMessage>}
          {result.answerMode === 'fallback' && <StatusMessage>AI phrasing is unavailable or could not be verified. Showing a catalog-verified answer.</StatusMessage>}
          <p>{result.answer}</p>
          <div className="recommendations">
            {result.recommendedProducts.map((product) => (
              <Link key={product.id} to={`/products/${product.id}`}>{product.name} — ₱{Number(product.price).toLocaleString('en-PH')}</Link>
            ))}
          </div>
          {result.sources.length > 0 && <details>
            <summary>Sources</summary>
            <ul>
              {result.sources.map((source) => (
                <li key={source.id}><Link to={`/products/${source.id}`}>{source.name}</Link> (product #{source.id})</li>
              ))}
            </ul>
          </details>}
        </>}
      </div>
    </section>
  );
}
