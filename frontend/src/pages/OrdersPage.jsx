import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import StatusMessage from '../components/StatusMessage.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../services/api.js';

export default function OrdersPage() {
  const { user, ready } = useAuth();
  const [orders, setOrders] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) return;
    api.getOrders().then(setOrders).catch((caught) => setError(caught.message));
  }, [user]);

  if (!ready) return <p>Loading…</p>;
  if (!user) return <section><div className="empty-state"><h1>Sign in to see your orders</h1><Link className="button" to="/account">Sign in</Link></div></section>;

  return (
    <section>
      <p className="eyebrow">MY ORDERS</p><h1>Your simulated orders</h1>
      <StatusMessage type="error">{error}</StatusMessage>
      {orders && orders.length === 0 && <p>No orders yet.</p>}
      <ul className="checkout-items">
        {(orders || []).map((order) => (
          <li key={order.id}><span>Order #{order.id}<small>{order.items.length} item(s) • {order.status}</small></span><strong>₱{Number(order.total).toLocaleString('en-PH')}</strong></li>
        ))}
      </ul>
    </section>
  );
}
