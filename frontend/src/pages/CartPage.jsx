import { useState } from 'react';
import { Link } from 'react-router-dom';
import StatusMessage from '../components/StatusMessage.jsx';
import { useCart } from '../context/CartContext.jsx';
import { parseQuantityDraft } from '../utils/cart.js';

// D1: the box keeps what the customer types as a draft. The cart only changes on
// blur or Enter, so typing "10" is checked as 10, not as 1 and then 0.
// CartPage gives this component key={item.quantity}, so the draft resets when the quantity changes.
function QuantityInput({ item, onCommit }) {
  const [draft, setDraft] = useState(String(item.quantity));

  function commit() {
    const quantity = parseQuantityDraft(draft);
    if (quantity !== item.quantity) onCommit(quantity);
    // If the value was refused, the cart keeps the old quantity, so show it again.
    setDraft(String(item.quantity));
  }

  return (
    <input id={`quantity-${item.productId}`} type="number" min="1" max={item.stock} value={draft}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === 'Enter') { event.preventDefault(); commit(); }
        if (event.key === 'Escape') setDraft(String(item.quantity));
      }} />
  );
}

export default function CartPage() {
  const { cart, total, cartMessage, cartMessageType, setQuantity, removeFromCart, itemCount } = useCart();

  return (
    <section>
      <div className="page-heading"><p className="eyebrow">YOUR ORDER</p><h1>Shopping cart</h1></div>
      <StatusMessage type={cartMessageType}>{cartMessage}</StatusMessage>
      {cart.length === 0 ? (
        <div className="empty-state"><h2>Your cart is empty</h2><Link className="button" to="/">Browse products</Link></div>
      ) : (
        <div className="cart-layout">
          <div className="cart-items">
            {cart.map((item) => (
              <article className="cart-item" key={item.productId}>
                <div><h2>{item.name}</h2><p>₱{item.price.toLocaleString('en-PH')} each</p></div>
                <div className="quantity-field">
                  <label htmlFor={`quantity-${item.productId}`}>Quantity</label>
                  <div className="quantity-control">
                    <button type="button" aria-label={`Decrease quantity of ${item.name}`}
                      disabled={item.quantity <= 1}
                      onClick={() => setQuantity(item.productId, item.quantity - 1)}>−</button>
                    <QuantityInput key={item.quantity} item={item}
                      onCommit={(quantity) => setQuantity(item.productId, quantity)} />
                    <button type="button" aria-label={`Increase quantity of ${item.name}`}
                      disabled={item.quantity >= item.stock}
                      onClick={() => setQuantity(item.productId, item.quantity + 1)}>+</button>
                  </div>
                </div>
                <strong>₱{(item.price * item.quantity).toLocaleString('en-PH')}</strong>
                <button className="danger" onClick={() => removeFromCart(item.productId)}>Remove</button>
              </article>
            ))}
          </div>
          <aside className="summary">
            <h2>Order summary</h2>
            <p><span>Items</span><strong>{itemCount}</strong></p>
            <p className="summary-total"><span>Total</span><strong>₱{total.toLocaleString('en-PH')}</strong></p>
            <Link className="button full" to="/checkout">Proceed to checkout</Link>
          </aside>
        </div>
      )}
    </section>
  );
}
