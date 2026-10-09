import { useState } from 'react';
import { api } from './api.js';

// Login / sign-up screen. Rendered as an overlay so unsaved doodles are never lost.
export default function Auth({ onDone, onClose }) {
  const [mode, setMode] = useState('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const fn = mode === 'login' ? api.login : api.register;
      const { user } = await fn(username.trim(), password);
      onDone(user);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="absolute inset-0 z-50 flex flex-col bg-white" style={{ backgroundImage: 'radial-gradient(rgba(27,27,143,0.12) 1px, transparent 1.2px)', backgroundSize: '16px 16px' }}>
      <header className="relative flex items-center justify-center pt-4 pb-2 shrink-0">
        <button className="absolute left-4 top-3 text-[#1b1b8f] text-3xl font-bold leading-none px-2" onClick={onClose} aria-label="Close">
          ‹
        </button>
        <h1 className="title-box text-xl">Editique</h1>
      </header>

      <form onSubmit={submit} className="flex-1 flex flex-col items-center justify-center gap-4 px-6">
        <p className="font-marker text-[#1b1b8f] text-2xl -rotate-2">{mode === 'login' ? 'Welcome back!' : 'Join the booth!'}</p>

        <div className="note w-full max-w-xs p-4 flex flex-col gap-3">
          <label className="flex flex-col gap-1">
            <span className="font-marker text-sm">Username</span>
            <input className="field" value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" required autoFocus />
          </label>
          <label className="flex flex-col gap-1">
            <span className="font-marker text-sm">Password</span>
            <input
              className="field"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              required
            />
          </label>
          {error && <p className="text-[#c0262d] text-base leading-tight">{error}</p>}
        </div>

        <button className="btn font-marker text-xl" style={{ background: '#1b1b8f', color: '#fff', padding: '0.3rem 1.6rem' }} disabled={busy}>
          {busy ? '…' : mode === 'login' ? 'Log in' : 'Sign up'}
        </button>

        <button
          type="button"
          className="underline text-[#1b1b8f]"
          onClick={() => {
            setMode(mode === 'login' ? 'register' : 'login');
            setError('');
          }}
        >
          {mode === 'login' ? 'New here? Create an account' : 'Have an account? Log in'}
        </button>
      </form>
    </div>
  );
}
