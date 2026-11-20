import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import StatusMessage from '../components/StatusMessage.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../services/api.js';

const peso = (value) => `₱${Number(value).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;

export default function OrdersPage() {
  const { user, checking } = useAuth();
  const [orders, setOrders] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) return;
    api.getOrders().then((data) => setOrders(data.orders)).catch((caught) => setError(caught.message));
  }, [user]);

  if (checking) return <StatusMessage>Checking your session…</StatusMessage>;
  if (!user) return <Navigate to="/login" state={{ from: '/orders' }} replace />;

  return (
    <section>
      <div className="page-heading"><p className="eyebrow">MY ACCOUNT</p><h1>My simulated orders</h1></div>
      <StatusMessage type="error">{error}</StatusMessage>
      {!orders && !error && <StatusMessage>Loading your orders…</StatusMessage>}
      {orders?.length === 0 && <div className="empty-state"><h2>No orders yet</h2><Link className="button" to="/">Browse products</Link></div>}
      {orders?.length > 0 && (
        <div className="cart-items">
          {orders.map((order) => (
            <article className="cart-item" key={order.id}>
              <div>
                <h2><Link to={`/orders/${order.id}`}>Order #{order.id}</Link></h2>
                <p>{new Date(order.createdAt).toLocaleString('en-PH')} • {order.status}</p>
              </div>
              <strong>{peso(order.total)}</strong>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
