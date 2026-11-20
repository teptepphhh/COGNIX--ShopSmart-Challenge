import { useEffect, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import StatusMessage from '../components/StatusMessage.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../services/api.js';

const peso = (value) => `₱${Number(value).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;

export default function OrderDetailsPage() {
  const { orderId } = useParams();
  const { user, checking } = useAuth();
  const [order, setOrder] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) return;
    api.getOrder(orderId).then(setOrder).catch((caught) => setError(caught.message));
  }, [user, orderId]);

  if (checking) return <StatusMessage>Checking your session…</StatusMessage>;
  if (!user) return <Navigate to="/login" state={{ from: `/orders/${orderId}` }} replace />;

  return (
    <section>
      <div className="page-heading"><p className="eyebrow">ORDER DETAILS</p><h1>Order #{orderId}</h1></div>
      <StatusMessage type="error">{error}</StatusMessage>
      {!order && !error && <StatusMessage>Loading order…</StatusMessage>}
      {order && (
        <aside className="summary">
          <p>{new Date(order.createdAt).toLocaleString('en-PH')} • {order.status}</p>
          <p>Deliver to: {order.customerName}, {order.address}</p>
          <ul className="checkout-items">
            {order.items.map((item) => (
              <li key={item.id}>
                <span>{item.product?.emoji} {item.product?.name || `Product #${item.productId}`}<small>Qty: {item.quantity} × {peso(item.unitPrice)}</small></span>
                <strong>{peso(item.unitPrice * item.quantity)}</strong>
              </li>
            ))}
          </ul>
          <p className="summary-total"><span>Total</span><strong>{peso(order.total)}</strong></p>
        </aside>
      )}
      <Link className="button secondary" to="/orders">Back to my orders</Link>
    </section>
  );
}
