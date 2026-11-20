import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import StatusMessage from '../components/StatusMessage.jsx';
import { useAuth } from '../context/AuthContext.jsx';

export default function LoginPage() {
  const { user, login, register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = location.state?.from || '/orders';
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (user) return <Navigate to={redirectTo} replace />;

  function updateField(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  }

  async function submit(event) {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      if (mode === 'register') await register(form);
      else await login({ email: form.email, password: form.password });
      navigate(redirectTo, { replace: true });
    } catch (caught) {
      setError(caught.message);
    } finally {
      setSubmitting(false);
    }
  }

  const registering = mode === 'register';
  return (
    <section className="checkout-layout">
      <form onSubmit={submit}>
        <p className="eyebrow">CUSTOMER ACCOUNT</p>
        <h1>{registering ? 'Create an account' : 'Sign in'}</h1>
        <StatusMessage>Classroom demo: use a fictional name and email only.</StatusMessage>
        <StatusMessage type="error">{error}</StatusMessage>
        {registering && <label>Full name<input name="name" value={form.name} onChange={updateField} minLength="2" maxLength="80" autoComplete="name" required /></label>}
        <label>Email address<input name="email" type="email" value={form.email} onChange={updateField} autoComplete="email" required /></label>
        <label>Password<input name="password" type="password" value={form.password} onChange={updateField} minLength={registering ? 8 : 1} maxLength="128" autoComplete={registering ? 'new-password' : 'current-password'} required /></label>
        <button disabled={submitting}>{submitting ? 'Please wait…' : registering ? 'Create account' : 'Sign in'}</button>
        <button type="button" className="button secondary" onClick={() => { setMode(registering ? 'login' : 'register'); setError(''); }}>
          {registering ? 'I already have an account' : 'Create a new account'}
        </button>
      </form>
    </section>
  );
}
