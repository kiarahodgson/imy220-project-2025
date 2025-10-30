import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api';
import EditProfileForm from '../components/EditProfileForm';

const relationStates = {
  self: 'self',
  friends: 'friends',
  incoming: 'incoming',
  outgoing: 'outgoing',
  none: 'none',
};

export default function ProfilePage({ currentUser }) {
  const { id } = useParams();
  const viewerId = currentUser?._id;
  const [user, setUser] = useState(null);
  const [projects, setProjects] = useState([]);
  const [friends, setFriends] = useState([]);
  const [saved, setSaved] = useState([]);
  const [activity, setActivity] = useState([]);
  const [incomingRequests, setIncomingRequests] = useState([]);
  const [outgoingRequests, setOutgoingRequests] = useState([]);
  const [requestUsers, setRequestUsers] = useState({});
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [profileBusy, setProfileBusy] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef(null);

  const isSelf = Boolean(viewerId && id && viewerId === id);

  const loadProfile = useCallback(async () => {
    if (!id) throw new Error('Missing user id');
    const [userDoc, ownedProjects, memberProjects, userFriends, userCheckins, savedProjects] = await Promise.all([
      api.userById(id),
      api.projects({ ownerId: id }),
      api.projects({ memberId: id }),
      api.friends(id).catch(() => []),
      api.checkins({ userId: id, limit: 50 }).catch(() => []),
      api.savedProjects(id).catch(() => []),
    ]);
    setUser(userDoc);
    // Merge and deduplicate by _id
    const byId = new Map([
      ...ownedProjects.map((p) => [String(p._id), p]),
      ...memberProjects.map((p) => [String(p._id), p]),
    ]);
    setProjects(Array.from(byId.values()));
    setFriends(userFriends);
    setActivity(userCheckins);
    setSaved(savedProjects);
  }, [id]);

  const loadRequestsForViewer = useCallback(async () => {
    if (!viewerId) {
      setIncomingRequests([]);
      setOutgoingRequests([]);
      return;
    }
    const [incoming, outgoing] = await Promise.all([
      api.friendRequests({ userId: viewerId, direction: 'incoming', status: 'pending' }),
      api.friendRequests({ userId: viewerId, direction: 'outgoing', status: 'pending' }),
    ]);

    const relatedIds = Array.from(new Set([
      ...incoming.map((req) => req.fromUserId),
      ...outgoing.map((req) => req.toUserId),
    ].filter(Boolean)));

    if (relatedIds.length > 0) {
      const entries = await Promise.all(relatedIds.map(async (userId) => {
        try {
          const profile = await api.userById(userId);
          return [userId, profile];
        } catch (error) {
          console.debug('[Profile] Failed to fetch request user', userId, error);
          return [userId, null];
        }
      }));
      setRequestUsers(Object.fromEntries(entries.filter(([, value]) => Boolean(value))));
    } else {
      setRequestUsers({});
    }

    setIncomingRequests(incoming);
    setOutgoingRequests(outgoing);
  }, [viewerId]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setErr('');
    loadProfile()
      .then(() => { if (active) setLoading(false); })
      .catch((e) => {
        if (active) {
          setErr(e.message || 'Failed to load profile');
          setLoading(false);
        }
      });
    if (viewerId) {
      loadRequestsForViewer().catch((e) => console.debug('[Profile] requests fetch failed', e));
    }
    return () => { active = false; };
  }, [loadProfile, loadRequestsForViewer, viewerId]);

  const friendIds = useMemo(() => new Set((friends || []).map((f) => f._id)), [friends]);
  const viewerFriendIds = useMemo(() => new Set((currentUser?.friends || []).map(String)), [currentUser]);

  const relation = useMemo(() => {
    if (!viewerId || !id) return relationStates.none;
    if (viewerId === id) return relationStates.self;
    if (friendIds.has(viewerId) || viewerFriendIds.has(id)) return relationStates.friends;

    const incoming = incomingRequests.find((req) => req.fromUserId === id && req.toUserId === viewerId);
    if (incoming) return relationStates.incoming;
    const outgoing = outgoingRequests.find((req) => req.fromUserId === viewerId && req.toUserId === id);
    if (outgoing) return relationStates.outgoing;
    return relationStates.none;
  }, [viewerId, id, friendIds, viewerFriendIds, incomingRequests, outgoingRequests]);

  const targetIncomingRequest = useMemo(() => incomingRequests.find((req) => req.fromUserId === id), [incomingRequests, id]);
  const targetOutgoingRequest = useMemo(() => outgoingRequests.find((req) => req.toUserId === id), [outgoingRequests, id]);

  const refreshViewerUser = useCallback(async () => {
    if (!viewerId) return;
    try {
      const updated = await api.userById(viewerId);
      if (viewerId === id) {
        setUser(updated);
      }
      if (typeof window !== 'undefined') {
        localStorage.setItem('merge_user', JSON.stringify(updated));
        window.dispatchEvent(new CustomEvent('merge-auth-changed', { detail: { user: updated } }));
      }
    } catch (error) {
      console.debug('[Profile] Unable to refresh viewer user', error);
    }
  }, [viewerId, id]);

  const handleSendFriendRequest = useCallback(async () => {
    if (!viewerId || !id) return;
    setBusy(true);
    setErr('');
    try {
      await api.sendFriendRequest({ fromUserId: viewerId, toUserId: id });
      await Promise.all([loadRequestsForViewer(), loadProfile(), refreshViewerUser()]);
    } catch (error) {
      setErr(error.message || 'Failed to send request');
    } finally {
      setBusy(false);
    }
  }, [viewerId, id, loadRequestsForViewer, loadProfile, refreshViewerUser]);

  const handleRequestAction = useCallback(async (action) => {
    if (!targetIncomingRequest) return;
    setBusy(true);
    setErr('');
    try {
      if (action === 'accept') {
        await api.acceptFriendRequest(targetIncomingRequest._id);
      } else {
        await api.declineFriendRequest(targetIncomingRequest._id);
      }
      await Promise.all([loadProfile(), loadRequestsForViewer(), refreshViewerUser()]);
    } catch (error) {
      setErr(error.message || 'Failed to update request');
    } finally {
      setBusy(false);
    }
  }, [targetIncomingRequest, loadProfile, loadRequestsForViewer, refreshViewerUser]);

  const handleProfileUpdate = useCallback(async ({ name, bio }) => {
    if (!isSelf || !viewerId) throw new Error('You can only edit your own profile');
    setProfileBusy(true);
    try {
      const payload = {};
      if (name !== undefined) payload.name = name;
      if (bio !== undefined) payload.bio = bio;
      const updated = await api.updateUser(viewerId, payload);
      setUser(updated);
      await refreshViewerUser();
      return updated;
    } catch (error) {
      throw error;
    } finally {
      setProfileBusy(false);
    }
  }, [isSelf, viewerId, refreshViewerUser]);

  // Minimal avatar choose/select handlers (single-file step)
  const handleChooseAvatar = useCallback(() => {
    if (fileInputRef.current) fileInputRef.current.click();
  }, []);

  const handleAvatarSelected = useCallback(async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file || !viewerId) return;
    setUploadingAvatar(true);
    setErr('');
    try {
      const fd = new FormData();
      fd.append('avatar', file);
      const res = await fetch(`/api/users/${viewerId}/avatar`, { method: 'POST', body: fd });
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`Avatar upload failed (${res.status}) ${text ? '- ' + text : ''}`);
      }
      const updated = await res.json();
      setUser(updated);
      await refreshViewerUser();
    } catch (error) {
      setErr(error.message || 'Failed to update profile picture');
    } finally {
      setUploadingAvatar(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }, [viewerId, refreshViewerUser]);

  if (loading) return <p>Loading…</p>;
  if (err) return <p role="alert">Error: {err}</p>;
  if (!user) return <p>Profile not found.</p>;

  const displayName = user.name || user.username || 'Profile';

  return (
    <div className="profile-bg full-bleed">
      <div className="container">
    <main className="profile">
      <section className="card" style={{ marginBottom: '1rem' }}>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            {user.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={`${displayName} avatar`}
                style={{ width: 72, height: 72, borderRadius: '50%', objectFit: 'cover' }}
              />
            ) : (
              <div
                aria-label="Avatar placeholder"
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: '50%',
                  background: '#e8e8e8',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: '1.2rem',
                }}
              >
                {(displayName || '?').slice(0, 1).toUpperCase()}
              </div>
            )}
            {relation === relationStates.self && (
              <div style={{ marginTop: '.5rem' }}>
                <button
                  className="btn secondary"
                  type="button"
                  onClick={handleChooseAvatar}
                  disabled={uploadingAvatar}
                  aria-label="Change profile picture"
                >
                  {uploadingAvatar ? 'Uploading…' : 'Change photo'}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={handleAvatarSelected}
                />
              </div>
            )}
          </div>
          <div>
            <h1 style={{ margin: 0 }}>{displayName}</h1>
            {user.bio && <p style={{ margin: '.4rem 0 0' }}>{user.bio}</p>}
          </div>
        </div>
      {relation !== relationStates.self && viewerId && (
        <div style={{ marginTop: '.75rem' }}>
          {relation === relationStates.friends && (
            <>
              <span className="badge">Friends</span>
              <button
                className="btn secondary"
                type="button"
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  setErr('');
                  try {
                    await api.unfriend({ userId: viewerId, targetId: id });
                    await Promise.all([loadProfile(), refreshViewerUser()]);
                  } catch (error) {
                    setErr(error.message || 'Failed to unfriend');
                  } finally {
                    setBusy(false);
                  }
                }}
                style={{ marginLeft: '.5rem' }}
              >
                Unfriend
              </button>
            </>
          )}
          {relation === relationStates.none && (
            <button className="btn" type="button" disabled={busy} onClick={handleSendFriendRequest}>
              {busy ? 'Sending…' : 'Add friend'}
            </button>
          )}
          {relation === relationStates.outgoing && <span className="helper">Friend request pending…</span>}
          {relation === relationStates.incoming && (
            <div className="flex" style={{ marginTop: '.5rem' }}>
              <button className="btn" type="button" disabled={busy} onClick={() => handleRequestAction('accept')}>
                {busy ? 'Accepting…' : 'Accept request'}
              </button>
              <button className="btn secondary" type="button" disabled={busy} onClick={() => handleRequestAction('decline')}>
                Decline
              </button>
            </div>
          )}
        </div>
      )}

      {relation === relationStates.self && (
        <EditProfileForm
          user={user}
          onSave={handleProfileUpdate}
          disabled={profileBusy}
        />
      )}
      </section>

      {isSelf && incomingRequests.length > 0 && (
        <section className="card" style={{ marginBottom: '1rem' }}>
          <h2>Pending friend requests</h2>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {incomingRequests.map((req) => {
              const sender = requestUsers[req.fromUserId];
              const label = sender?.name || sender?.username || sender?.email || req.fromUserId;
              return (
                <li key={req._id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '.5rem' }}>
                  <Link to={`/profile/${req.fromUserId}`} style={{ textDecoration: 'none', color: 'inherit' }}>{label}</Link>
                  <div style={{ display: 'flex', gap: '.5rem' }}>
                    <button
                      className="btn"
                      type="button"
                      disabled={busy}
                      onClick={async () => {
                        setBusy(true);
                        setErr('');
                        try {
                          await api.acceptFriendRequest(req._id);
                          await Promise.all([loadRequestsForViewer(), loadProfile(), refreshViewerUser()]);
                        } catch (e) {
                          setErr(e.message || 'Failed to accept request');
                        } finally {
                          setBusy(false);
                        }
                      }}
                    >
                      {busy ? 'Accepting…' : 'Accept'}
                    </button>
                    <button
                      className="btn secondary"
                      type="button"
                      disabled={busy}
                      onClick={async () => {
                        setBusy(true);
                        setErr('');
                        try {
                          await api.declineFriendRequest(req._id);
                          await loadRequestsForViewer();
                        } catch (e) {
                          setErr(e.message || 'Failed to decline request');
                        } finally {
                          setBusy(false);
                        }
                      }}
                    >
                      Decline
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {(relation === relationStates.self || relation === relationStates.friends) && (
        <section className="card" style={{ marginBottom: '1rem' }}>
          <h2>Friends ({friends.length})</h2>
          {friends.length === 0 ? (
            <p>No connections yet.</p>
          ) : (
            <ul>
              {friends.map((friend) => (
                <li key={friend._id}>
                  <Link to={`/profile/${friend._id}`}>{friend.name || friend.username}</Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {(relation === relationStates.self || relation === relationStates.friends) ? (
        <>
          <section className="card" style={{ marginBottom: '1rem' }}>
            <h2>Projects</h2>
            {projects.length === 0 ? (
              <p>No projects yet.</p>
            ) : (
              <ul>
                {projects.map((p) => (
                  <li key={p._id}>
                    <Link to={`/project/${p._id}`}>{p.name || p.title || '(untitled project)'}</Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="card" style={{ marginBottom: '1rem' }}>
            <h2>Saved Projects</h2>
            {saved.length === 0 ? (
              <p>No saved projects.</p>
            ) : (
              <ul>
                {saved.map((p) => (
                  <li key={p._id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Link to={`/project/${p._id}`}>{p.name || p.title || '(untitled project)'}</Link>
                    {isSelf && (
                      <button className="btn secondary" type="button" onClick={async () => {
                        try {
                          await api.unsaveProject({ userId: viewerId, projectId: p._id });
                          setSaved((prev) => prev.filter((x) => x._id !== p._id));
                        } catch (e) {
                          console.debug('[Profile] Unsave failed', e);
                        }
                      }}>
                        Unsave
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="card">
            <h2>Activity</h2>
            {activity.length === 0 ? (
              <p>No recent activity.</p>
            ) : (
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {activity.map((item) => {
                  const typeLabel = (item.type || 'check-in').replace(/-/g, ' ');
                  const dateLabel = item.createdAt ? new Date(item.createdAt).toLocaleString() : '';
                  return (
                    <li key={item._id} style={{ padding: '.5rem 0', borderBottom: '1px solid #eee' }}>
                      <strong>{typeLabel}</strong>{' '}on{' '}
                      <Link to={`/project/${item.projectId}`}>project</Link>
                      {item.version && <span className="badge" style={{ marginLeft: '.5rem' }}>v{item.version}</span>}
                      {dateLabel && <div className="helper activity-date">{dateLabel}</div>}
                      {item.message && <div style={{ marginTop: '.25rem' }}>{item.message}</div>}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </>
      ) : (
        <section className="card">
          <p>This profile is limited. Add as a friend to view full details.</p>
        </section>
      )}
    </main>
      </div>
    </div>
  );
}
