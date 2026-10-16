import { useEffect, useState } from 'react';
import ProductCard from '../components/ProductCard.jsx';
import StatusMessage from '../components/StatusMessage.jsx';
import { useCart } from '../context/CartContext.jsx';
import { api } from '../services/api.js';

// LAB 3: wait briefly after typing before asking the server, so one request
// is sent per pause instead of one per keystroke.
const SEARCH_DELAY_MS = 300;

export default function ProductsPage() {
  const [products, setProducts] = useState([]);
  // LAB 3: category choices are kept separately from the search results so the
  // dropdown does not shrink when a search returns one product or none.
  const [categories, setCategories] = useState(['All']);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [sort, setSort] = useState('default');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { addToCart, cartMessage } = useCart();

  const query = search.trim();

  // LAB 3: request matching products from the API whenever the search term changes.
  useEffect(() => {
    let active = true; // becomes false when a newer search replaces this one
    setLoading(true);
    setError('');

    const timer = setTimeout(() => {
      api.getProducts(query)
        .then((data) => {
          if (!active) return; // ignore an older response
          setProducts(data.products);
          // Grow the stable category list; never shrink it.
          setCategories((current) => [...new Set([...current, ...data.products.map((product) => product.category)])]);
        })
        .catch((caught) => {
          if (!active) return;
          setProducts([]);
          setError(caught.message);
        })
        .finally(() => active && setLoading(false));
    }, query ? SEARCH_DELAY_MS : 0);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [query]);

  // The server already applied the search; the page applies category and sort.
  const visibleProducts = products.filter(
    (product) => category === 'All' || product.category === category
  );

  // Sort a copy so the catalog order in `products` is never changed.
  const sortedProducts = [...visibleProducts];
  if (sort === 'price-asc') sortedProducts.sort((a, b) => a.price - b.price);
  if (sort === 'price-desc') sortedProducts.sort((a, b) => b.price - a.price);
  if (sort === 'name-asc') sortedProducts.sort((a, b) => a.name.localeCompare(b.name));

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
        <StatusMessage type="error">Could not load products: {error} Make sure the backend is running, then try again.</StatusMessage>
      )}
      {!loading && !error && visibleProducts.length === 0 && <StatusMessage>{emptyMessage}</StatusMessage>}

      <div className="product-grid">
        {!loading && sortedProducts.map((product) => (
          <ProductCard key={product.id} product={product} onAddToCart={addToCart} />
        ))}
      </div>
    </section>
  );
}
