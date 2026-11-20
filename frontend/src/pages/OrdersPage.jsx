import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import StatusMessage from '../components/StatusMessage.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../services/api.js';

export const formatPeso = (amount) => `₱${Number(amount).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;

export default function OrdersPage() {
  const { user, checking, signedOut } = useAuth();
  const [orders, setOrders] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) return;
    let active = true;
    api.getMyOrders()
      .then((data) => { if (active) setOrders(data.orders); })
      .catch((caught) => {
        if (!active) return;
        if (caught.status === 401) signedOut();
        setError(caught.message);
      });
    return () => { active = false; };
  }, [user, signedOut]);

  if (checking) return <section><StatusMessage>Checking your sign-in…</StatusMessage></section>;
  if (!user) return <Navigate to="/login?next=/orders" replace />;

  return (
    <section>
      <p className="eyebrow">MY ACCOUNT</p>
      <h1>My orders</h1>
      <p>Signed in as <strong>{user.name}</strong> ({user.email}). Only your own simulated orders are shown.</p>
      <StatusMessage type="error">{error}</StatusMessage>
      {orders === null && !error && <StatusMessage>Loading your orders…</StatusMessage>}
      {orders?.length === 0 && <div className="empty-state"><h2>No orders yet</h2><Link className="button" to="/">Browse products</Link></div>}
      {orders?.length > 0 && (
        <ul className="order-list">
          {orders.map((order) => (
            <li key={order.id}>
              <Link to={`/orders/${order.id}`}>
                <strong>Order #{order.id}</strong>
                <span>{new Date(order.createdAt).toLocaleString('en-PH')}</span>
                <span>{order.items.length} item(s)</span>
                <strong>{formatPeso(order.total)}</strong>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
