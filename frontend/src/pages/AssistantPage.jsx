import { useState } from 'react';
import { Link } from 'react-router-dom';
import StatusMessage from '../components/StatusMessage.jsx';
import { api } from '../services/api.js';

const MODE_LABELS = {
  ai: 'AI draft · checked against the catalog',
  rules: 'Catalog rules answer',
  no_match: 'No matching product'
};

const peso = (value) => `₱${Number(value).toLocaleString('en-PH')}`;

export default function AssistantPage() {
  const [question, setQuestion] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function ask(event) {
    event.preventDefault(); setError(''); setResult(null); setLoading(true);
    try { setResult(await api.askAssistant(question)); }
    catch (caught) {
      setError(caught instanceof TypeError ? 'ShopSmart could not reach the server. Check that the backend is running, then try again.' : caught.message);
    }
    finally { setLoading(false); }
  }

  return (
    <section className="assistant-layout">
      <div>
        <p className="eyebrow">GROUNDED ASSISTANT</p>
        <h1>Find a product</h1>
        <p>Answers use the live ShopSmart catalog. An AI service may help phrase them, but ShopSmart checks every product, price and stock claim before you see it.</p>
        <form onSubmit={ask}>
          <label>Your question<textarea value={question} onChange={(event) => setQuestion(event.target.value)} minLength="3" maxLength="300" placeholder="Which keyboard is below ₱2,000?" required /></label>
          <button disabled={loading}>{loading ? 'Checking the catalog…' : 'Ask ShopSmart'}</button>
        </form>
      </div>
      <div className="assistant-answer" aria-busy={loading}>
        <h2>Assistant response</h2>
        {loading && <StatusMessage>Checking the current catalog and preparing an answer…</StatusMessage>}
        <StatusMessage type="error">{error && `The assistant could not answer: ${error}`}</StatusMessage>
        {!result && !error && !loading && <p>Your answer will appear here.</p>}
        {result && <>
          <span className={`answer-mode ${result.mode}`}>{MODE_LABELS[result.mode] || 'Answer'}</span>
          {result.notice && <StatusMessage type="warning">{result.notice}</StatusMessage>}
          <p className="answer-text">{result.answer}</p>
          {result.recommendedProducts.length > 0 && <>
            <h3>Recommended</h3>
            <div className="recommendations">
              {result.recommendedProducts.map((product) => (
                <Link key={product.id} to={`/products/${product.id}`}>
                  {product.name} — {peso(product.price)}
                  {product.stock !== undefined && <small> · {product.stock} in stock</small>}
                </Link>
              ))}
            </div>
          </>}
          <details className="answer-sources" open>
            <summary>Sources ({result.sources.length})</summary>
            {result.sources.length === 0
              ? <p>No catalog product supports a recommendation for this question.</p>
              : <ul>
                {result.sources.map((source) => (
                  <li key={source.id}>
                    <Link to={`/products/${source.id}`}>Product #{source.id} · {source.name}</Link>
                    {source.price !== undefined && <span> — {peso(source.price)}, {source.stock > 0 ? `${source.stock} in stock` : 'out of stock'}</span>}
                  </li>
                ))}
              </ul>}
          </details>
        </>}
      </div>
    </section>
  );
}
