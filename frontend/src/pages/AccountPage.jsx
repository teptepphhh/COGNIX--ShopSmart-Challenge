import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import StatusMessage from '../components/StatusMessage.jsx';
import { useAuth } from '../context/AuthContext.jsx';

export default function AccountPage() {
  const { user, login, register } = useAuth();
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to="/orders" replace />;

  function update(event) { setForm((current) => ({ ...current, [event.target.name]: event.target.value })); }

  async function submit(event) {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      if (mode === 'login') await login({ email: form.email, password: form.password });
      else await register(form);
    } catch (caught) { setError(caught.message); } finally { setBusy(false); }
  }

  return (
    <section>
      <form onSubmit={submit}>
        <p className="eyebrow">{mode === 'login' ? 'SIGN IN' : 'CREATE ACCOUNT'}</p>
        <h1>{mode === 'login' ? 'Welcome back' : 'Join ShopSmart'}</h1>
        <p><small>Classroom demo: use fictional details only.</small></p>
        <StatusMessage type="error">{error}</StatusMessage>
        {mode === 'register' && <label>Full name<input name="name" value={form.name} onChange={update} minLength="2" maxLength="80" required /></label>}
        <label>Email address<input name="email" type="email" value={form.email} onChange={update} required /></label>
        <label>Password<input name="password" type="password" value={form.password} onChange={update} minLength={mode === 'register' ? 8 : 1} maxLength="100" required autoComplete={mode === 'login' ? 'current-password' : 'new-password'} /></label>
        <button disabled={busy}>{busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}</button>
        <p><button type="button" className="link-button" onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}>
          {mode === 'login' ? 'New here? Create an account' : 'Already registered? Sign in'}
        </button></p>
      </form>
    </section>
  );
}
