import { useState, type FormEvent } from 'react';
import { supabase } from '../lib/supabase';
import { BlueprintMark } from './BlueprintMark';

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
      <div className="login-card bp-rise">
        <div className="login-brand">
          <BlueprintMark size={26} />
          <span className="word">Home Base</span>
        </div>
        <p className="login-sub">// sign in to your inventory</p>

        {error && <div className="login-error">{error}</div>}
        {info && (
          <div className="login-error" style={{ background: 'var(--bp-trace-dim)', borderColor: 'var(--bp-trace)', color: '#d3fff0' }}>
            {info}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label>Email</label>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
          </div>
          <div className="field">
            <label>Password</label>
            <input
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
