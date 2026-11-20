import { useEffect, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import StatusMessage from '../components/StatusMessage.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../services/api.js';
import { formatPeso } from './OrdersPage.jsx';

export default function OrderDetailsPage() {
  const { orderId } = useParams();
  const { user, checking, signedOut } = useAuth();
  const [order, setOrder] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) return;
    let active = true;
    setOrder(null);
    setError('');
    api.getOrder(orderId)
      .then((data) => { if (active) setOrder(data); })
      .catch((caught) => {
        if (!active) return;
        if (caught.status === 401) signedOut();
        setError(caught.message);
      });
    return () => { active = false; };
  }, [orderId, user, signedOut]);

  if (checking) return <section><StatusMessage>Checking your sign-in…</StatusMessage></section>;
  if (!user) return <Navigate to={`/login?next=/orders/${encodeURIComponent(orderId)}`} replace />;

  return (
    <section>
      <Link to="/orders">← My orders</Link>
      <StatusMessage type="error">{error}</StatusMessage>
      {!order && !error && <StatusMessage>Loading order…</StatusMessage>}
      {order && (
        <div className="summary">
          <p className="eyebrow">SIMULATED ORDER</p>
          <h1>Order #{order.id}</h1>
          <p><span>Status</span><strong>{order.status}</strong></p>
          <p><span>Placed</span><strong>{new Date(order.createdAt).toLocaleString('en-PH')}</strong></p>
          <p><span>Deliver to</span><strong>{order.customerName}</strong></p>
          <ul className="checkout-items">
            {order.items.map((item) => (
              <li key={item.id}>
                <span>{item.product?.emoji} {item.product?.name || `Product #${item.productId}`}<small>Qty: {item.quantity} × {formatPeso(item.unitPrice)}</small></span>
                <strong>{formatPeso(item.unitPrice * item.quantity)}</strong>
              </li>
            ))}
          </ul>
          <p className="summary-total"><span>Total</span><strong>{formatPeso(order.total)}</strong></p>
          <small>No actual payment was collected.</small>
        </div>
      )}
    </section>
  );
}
