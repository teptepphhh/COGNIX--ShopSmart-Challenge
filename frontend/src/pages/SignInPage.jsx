import { useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import StatusMessage from '../components/StatusMessage.jsx';
import { useAuth } from '../context/AuthContext.jsx';

// Only same-site paths are allowed after sign-in, so ?next= cannot send the user to another website.
function safeNext(value) {
  return value && value.startsWith('/') && !value.startsWith('//') ? value : '/orders';
}

export default function SignInPage() {
  const { user, login, register } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const next = safeNext(searchParams.get('next'));
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (user) return <Navigate to={next} replace />;

  function updateField(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  }

  async function submit(event) {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      if (mode === 'login') await login({ email: form.email, password: form.password });
      else await register(form);
      navigate(next, { replace: true });
    } catch (caught) {
      setError(caught.message);
    } finally {
      setSubmitting(false);
    }
  }

  const isLogin = mode === 'login';
  return (
    <section className="auth-layout">
      <form onSubmit={submit} aria-labelledby="auth-heading">
        <p className="eyebrow">{isLogin ? 'CUSTOMER SIGN-IN' : 'CREATE A TEST ACCOUNT'}</p>
        <h1 id="auth-heading">{isLogin ? 'Sign in' : 'Register'}</h1>
        <StatusMessage>Use fictional test details only. Do not use a real password you use anywhere else.</StatusMessage>
        <StatusMessage type="error">{error}</StatusMessage>
        {!isLogin && <label>Full name<input name="name" value={form.name} onChange={updateField} minLength="2" maxLength="80" autoComplete="name" required /></label>}
        <label>Email address<input name="email" type="email" value={form.email} onChange={updateField} maxLength="120" autoComplete="email" required /></label>
        <label>Password<input name="password" type="password" value={form.password} onChange={updateField} minLength={isLogin ? 1 : 8} maxLength="72" autoComplete={isLogin ? 'current-password' : 'new-password'} required /></label>
        <button disabled={submitting}>{submitting ? 'Please wait…' : isLogin ? 'Sign in' : 'Create account'}</button>
        <button type="button" className="button secondary" onClick={() => { setMode(isLogin ? 'register' : 'login'); setError(''); }}>
          {isLogin ? 'New here? Create a test account' : 'Already registered? Sign in'}
        </button>
        <Link to="/">Back to products</Link>
      </form>
    </section>
  );
}
