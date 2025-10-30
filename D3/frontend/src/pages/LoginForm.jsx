import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';

export default function LoginForm() {
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setMessage('');
    if (!login.trim()) {
      setMessage('Please enter your username, email, or 24-hex ID.');
      return;
    }
    if (!password) {
      setMessage('Please enter your password.');
      return;
    }

    try {
      setLoading(true);

      const { user, token } = await api.login({ login: login.trim(), password });

      // Persist whatever your app expects
      localStorage.setItem('merge_user', JSON.stringify(user));
      localStorage.setItem('merge_token', token ?? '');
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('merge-auth-changed', { detail: { user, token } }));
      }

      navigate('/home');
    } catch (err) {
      setMessage(err.message || 'Login failed');
      // quick debug (you can comment these out later)
      console.debug('[Login] error:', err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card" aria-label="Login">
      <h3>Login</h3>

      <label className="label" htmlFor="loginInput">Username / Email</label>
      <input
        id="loginInput"
        name="login"
        className="input"
        type="text"
        value={login}
        onChange={(e) => setLogin(e.target.value)}
        autoComplete="username"
        required
      />

      <label className="label" htmlFor="password">Password</label>
      <input
        id="password"
        name="password"
        className="input"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Enter your password"
        autoComplete="current-password"
        required
      />

      <button className="btn" type="submit" disabled={loading}>
        {loading ? 'Logging in…' : 'Login'}
      </button>

      {message && <p className="helper" role="alert">{message}</p>}
    </form>
  );
}
