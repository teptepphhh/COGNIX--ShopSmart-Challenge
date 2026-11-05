import { useEffect, useMemo, useState } from 'react';
import ProductCard from '../components/ProductCard.jsx';
import StatusMessage from '../components/StatusMessage.jsx';
import { useCart } from '../context/CartContext.jsx';
import { api } from '../services/api.js';
import {
  filterByCategory, getCatalogCategories, getCategoryOptions, sortProducts
} from '../utils/catalog.js';

// LAB 3: wait briefly after typing before asking the server, so one request
// is sent per pause instead of one per keystroke.
const SEARCH_DELAY_MS = 300;

export default function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [catalogCategories, setCatalogCategories] = useState([]);
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');
  const [sort, setSort] = useState('default');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { addToCart, cartMessage } = useCart();

  // LAB 3: request matching products from the API whenever the search term changes.
  useEffect(() => {
    const trimmed = search.trim();
    const timer = setTimeout(() => setQuery(trimmed), trimmed ? 300 : 0);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    api.getProducts(query)
      .then((data) => {
        if (!active) return;
        setProducts(data.products);
        if (!query) setCatalogCategories(getCatalogCategories(data.products));
      })
      .catch((caught) => {
        if (!active) return;
        setProducts([]);
        setError(caught.message);
      })
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [query]);

  const categories = useMemo(
    () => getCategoryOptions(catalogCategories, category),
    [catalogCategories, category]
  );

  const visibleProducts = filterByCategory(products, category);
  const sortedProducts = sortProducts(visibleProducts, sort);
  // LAB 5 fix: this message was lost in the Lab 3 merge, which made `npm run check` fail
  // and would crash the page when a search returned no products.
  const emptyMessage = query
    ? `No products match "${query}"${category === 'All' ? '' : ` in ${category}`}.`
    : 'No products match your filters.';

  return (
    <section>
      <div className="hero">
        <div>
          <p className="eyebrow">BSIT FULL-STACK PROJECT</p>
          <h1>Technology for study, work and play</h1>
          <p>Browse the starter catalog, build a cart and complete a simulated order.</p>
        </div>
      </div>

      <div className="toolbar">
        <label>
          <span>Search products</span>
          <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Try keyboard" />
        </label>
        <label>
          <span>Category</span>
          <select value={category} onChange={(event) => setCategory(event.target.value)}>
            {categories.map((item) => <option key={item}>{item}</option>)}
          </select>
        </label>
        <label>
          <span>Sort by</span>
          <select value={sort} onChange={(event) => setSort(event.target.value)}>
            <option value="default">Default</option>
            <option value="price-asc">Price: Low to High</option>
            <option value="price-desc">Price: High to Low</option>
            <option value="name-asc">Name: A–Z</option>
          </select>
        </label>
      </div>

      <StatusMessage>{cartMessage}</StatusMessage>
      {loading && <StatusMessage>{query ? `Searching for "${query}"…` : 'Loading products…'}</StatusMessage>}
      {!loading && error && (
        <StatusMessage type="error">Could not load products. {error} Make sure the backend is running, then try again.</StatusMessage>
      )}
      {!loading && !error && visibleProducts.length === 0 && <StatusMessage>{emptyMessage}</StatusMessage>}

      <div className="product-grid">
        {!loading && !error && sortedProducts.map((product) => (
          <ProductCard key={product.id} product={product} onAddToCart={addToCart} />
        ))}
      </div>
    </section>
  );
}
