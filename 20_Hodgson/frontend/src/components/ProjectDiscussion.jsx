//u23530996 Kiara Hodgson
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../api';

export default function ProjectDiscussion({ projectId, currentUser, resolveUserName }) {
  const [items, setItems] = useState([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const userId = currentUser?._id;

  const canPost = Boolean(userId);

  const load = useCallback(async () => {
    if (!projectId || !userId) { setItems([]); setLoading(false); return; }
    setLoading(true);
    setError('');
    try {
      const data = await api.discussions(projectId, { userId });
      setItems(data);
    } catch (err) {
      setError(err.message || 'Failed to load discussion');
    } finally {
      setLoading(false);
    }
  }, [projectId, userId]);

  useEffect(() => { load(); }, [load]);

  async function handlePost(ev) {
    ev.preventDefault();
    if (!message.trim()) return;
    try {
      await api.createDiscussion(projectId, { userId, message: message.trim() });
      setMessage('');
      await load();
    } catch (err) {
      setError(err.message || 'Failed to post');
    }
  }

  async function handleDelete(id) {
    try {
      await api.deleteDiscussion(id, { userId });
      await load();
    } catch (err) {
      setError(err.message || 'Failed to delete');
    }
  }

  if (!userId) return null;

  return (
    <section className="card">
      <h3>Discussion</h3>
      <form onSubmit={handlePost} style={{ marginBottom: '.75rem' }}>
        <label className="label" htmlFor="disc-message">Message</label>
        <textarea id="disc-message" className="textarea" rows="2" value={message} onChange={(e) => setMessage(e.target.value)} />
        <button className="btn" type="submit" disabled={!message.trim()}>Post</button>
      </form>
      {error && <p className="error" role="alert">{error}</p>}
      {loading ? (
        <p>Loading…</p>
      ) : items.length === 0 ? (
        <p>No messages yet.</p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {items.map((it) => {
            const author = resolveUserName?.(it.userId) || it.userId;
            const dateLabel = it.createdAt ? new Date(it.createdAt).toLocaleString() : '';
            const canDelete = userId === it.userId;
            return (
              <li key={it._id} style={{ borderBottom: '1px solid #eee', padding: '.5rem 0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <div><strong>{author}</strong> <span className="helper">{dateLabel}</span></div>
                  {canDelete && (
                    <button className="btn secondary" type="button" onClick={() => handleDelete(it._id)}>Delete</button>
                  )}
                </div>
                <div style={{ marginTop: '.25rem' }}>{it.message}</div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

