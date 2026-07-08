import { useState, type FormEvent } from 'react';
import { supabase } from '../lib/supabase';
import { Logo } from './Logo';

export function Login() {
  const [mode, setMode] = useState<'sign-in' | 'sign-up'>('sign-in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setBusy(true);
    try {
      if (mode === 'sign-in') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setInfo('Account created. Check your email to confirm, then sign in.');
        setMode('sign-in');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login-wrap">
      <div className="login-card rise">
        <div className="login-brand">
          <Logo size={30} />
          <h1 className="word">Home Base</h1>
        </div>
        <p className="login-sub">Sign in to your inventory</p>

        {error && (
          <div className="login-error" role="alert">
            {error}
          </div>
        )}
        {info && (
          <div
            className="login-error"
            role="status"
            style={{ background: 'var(--accent-soft)', borderColor: 'var(--accent)', color: 'var(--accent-hover)' }}
          >
            {info}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="login-email">Email</label>
            <input
              id="login-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </div>
          <div className="field">
            <label htmlFor="login-password">Password</label>
            <input
              id="login-password"
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>
          <button type="submit" className="btn primary" style={{ width: '100%' }} disabled={busy}>
            {busy ? 'Please wait…' : mode === 'sign-in' ? 'Sign in' : 'Create account'}
          </button>
        </form>

        <div className="login-toggle">
          {mode === 'sign-in' ? (
            <>
              New here?{' '}
              <button type="button" onClick={() => setMode('sign-up')}>
                Create an account
              </button>
            </>
          ) : (
            <>
              Already have an account?{' '}
              <button type="button" onClick={() => setMode('sign-in')}>
                Sign in
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
