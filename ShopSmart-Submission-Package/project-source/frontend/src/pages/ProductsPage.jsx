import { useEffect, useState } from 'react';
import ProductCard from '../components/ProductCard.jsx';
import StatusMessage from '../components/StatusMessage.jsx';
import { useCart } from '../context/CartContext.jsx';
import { api } from '../services/api.js';

export default function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState(['All']);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [sort, setSort] = useState('default');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { addToCart, cartMessage } = useCart();

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');

    api.getProducts(search.trim())
      .then((data) => {
        if (!search.trim()) {
          setCategories(['All', ...new Set(data.products.map((product) => product.category))]);
        }
        if (active) setProducts(data.products);
      })
      .catch((caught) => {
        if (active) {
          setProducts([]);
          setError(caught.message);
        }
      })
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [search]);

  const visibleProducts = products.filter((product) => {
    return category === 'All' || product.category === category;
  });

  // Sort a copy so the catalog order in `products` is never changed.
  const sortedProducts = [...visibleProducts];
  if (sort === 'price-asc') sortedProducts.sort((a, b) => a.price - b.price);
  if (sort === 'price-desc') sortedProducts.sort((a, b) => b.price - a.price);
  if (sort === 'name-asc') sortedProducts.sort((a, b) => a.name.localeCompare(b.name));


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
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Try keyboard" />
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
      {loading && <StatusMessage>Loading products…</StatusMessage>}
      {error && <StatusMessage type="error">{error} Make sure the backend is running.</StatusMessage>}
      {!loading && !error && visibleProducts.length === 0 && <StatusMessage>No products match your filters.</StatusMessage>}

      <div className="product-grid">
        {!loading && !error && sortedProducts.map((product) => (
          <ProductCard key={product.id} product={product} onAddToCart={addToCart} />
        ))}
      </div>
    </section>
  );
}
