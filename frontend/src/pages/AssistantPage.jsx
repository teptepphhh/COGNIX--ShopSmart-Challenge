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
        <p className="eyebrow">GROUNDED AI ASSISTANT</p>
        <h1>Find a product</h1>
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
