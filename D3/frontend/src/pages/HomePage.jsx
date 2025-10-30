import { useEffect, useState, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import CreateProjectForm from '../components/CreateProjectForm';

const relationStates = {
  self: 'self',
  friends: 'friends',
  incoming: 'incoming',
  outgoing: 'outgoing',
  none: 'none',
};

export default function HomePage({ currentUser }) {
  const [err, setErr] = useState('');
  const [allUsers, setAllUsers] = useState([]);
  const [viewerDetails, setViewerDetails] = useState(currentUser || null);
  const [incomingRequests, setIncomingRequests] = useState([]);
  const [outgoingRequests, setOutgoingRequests] = useState([]);
  const [requestProfiles, setRequestProfiles] = useState({});
  const [busyUserId, setBusyUserId] = useState('');
  const [feedScope, setFeedScope] = useState('local');
  const [feedSort, setFeedSort] = useState('latest'); // 'latest' | 'popular'
  const [feedItems, setFeedItems] = useState([]);
  const [feedLoading, setFeedLoading] = useState(false);
  const [feedError, setFeedError] = useState('');

  const viewerId = viewerDetails?._id || currentUser?._id;

  const friendKey = useMemo(() => {
    const list = (viewerDetails?.friends || []).map(String);
    if (list.length === 0) return '';
    return Array.from(new Set(list)).sort().join(',');
  }, [viewerDetails?.friends]);

  // ⬇️ Enhanced: augment local feed with projects created/saved by friends (frontend merge)
  const loadFeed = useCallback(async (scope) => {
    try {
      setFeedLoading(true);
      setFeedError('');

      // Base params for the primary feed request
      const baseParams = { scope, limit: 25 };
      if (viewerId) baseParams.userId = viewerId;
      if (feedSort === 'popular') baseParams.sort = 'popular';

      const requests = [api.feed(baseParams)];

      // For local scope, also fetch a slice of the global feed and filter for friend-created/saved
      const friendIds = friendKey ? friendKey.split(',') : [];
      const shouldAugmentLocal = scope === 'local' && friendIds.length > 0;

      if (shouldAugmentLocal) {
        const globalParams = {
          scope: 'global',
          limit: 120, // broaden the window to capture friends' create/save activity
        };
        if (viewerId) globalParams.userId = viewerId;
        if (feedSort === 'popular') globalParams.sort = 'popular';
        requests.push(api.feed(globalParams));
      }

      const results = await Promise.all(requests);
      let items = Array.isArray(results[0]) ? results[0] : [];

      if (shouldAugmentLocal && Array.isArray(results[1])) {
        const globalItems = results[1];
        const friendSet = new Set(friendIds);

        const getId = (val) => (val ? String(val) : '');
        const getActorId = (it) => getId(it?.user?._id || it?.userId);
        const getOwnerId = (it) => getId(it?.project?.ownerId);
        const getSavedById = (it) => getId(it?.savedByUserId || it?.savedBy);
        const getType = (it) => String(it?.type || '').toLowerCase();

        const friendCreatedOrSaved = globalItems.filter((it) => {
          const actorIsFriend = friendSet.has(getActorId(it));
          const ownerIsFriend = friendSet.has(getOwnerId(it));
          const savedByFriend = friendSet.has(getSavedById(it));
          const t = getType(it);
          const looksCreated = t.includes('create'); // e.g., 'project-created'
          const looksSaved = t.includes('save') || t.includes('bookmark'); // e.g., 'project-saved'

          return (
            ownerIsFriend ||
            (actorIsFriend && (looksCreated || looksSaved)) ||
            savedByFriend
          );
        });

        // Merge + dedupe by activity _id
        const byId = new Map();
        for (const it of [...items, ...friendCreatedOrSaved]) {
          if (it && it._id && !byId.has(it._id)) byId.set(it._id, it);
        }
        items = Array.from(byId.values());
      }

      // Apply sorting after merge
      if (feedSort === 'popular') {
        items.sort((a, b) => {
          const ad = a?.project?.downloadCount ?? 0;
          const bd = b?.project?.downloadCount ?? 0;
          return bd - ad;
        });
      } else {
        items.sort((a, b) => {
          const at = a?.createdAt ? new Date(a.createdAt).getTime() : 0;
          const bt = b?.createdAt ? new Date(b.createdAt).getTime() : 0;
          return bt - at;
        });
      }

      setFeedItems(items);
    } catch (error) {
      setFeedError(error.message || 'Failed to load activity feed');
    } finally {
      setFeedLoading(false);
    }
  }, [viewerId, feedSort, friendKey]);
  // ⬆️ Enhanced

  useEffect(() => {
    setViewerDetails(currentUser || null);
  }, [currentUser]);

  const loadUsers = useCallback(async () => {
    try {
      const data = await api.users();
      setAllUsers(data);
    } catch (error) {
      console.debug('[Home] Failed to load users', error);
    }
  }, []);

  const loadViewerDetails = useCallback(async () => {
    if (!viewerId) return;
    try {
      const updated = await api.userById(viewerId);
      setViewerDetails(updated);
      if (typeof window !== 'undefined') {
        localStorage.setItem('merge_user', JSON.stringify(updated));
        window.dispatchEvent(new CustomEvent('merge-auth-changed', { detail: { user: updated } }));
      }
    } catch (error) {
      console.debug('[Home] Failed to refresh viewer details', error);
    }
  }, [viewerId]);

  const loadFriendRequests = useCallback(async () => {
    if (!viewerId) {
      setIncomingRequests([]);
      setOutgoingRequests([]);
      setRequestProfiles({});
      return;
    }
    try {
      const [incoming, outgoing] = await Promise.all([
        api.friendRequests({ userId: viewerId, direction: 'incoming', status: 'pending' }),
        api.friendRequests({ userId: viewerId, direction: 'outgoing', status: 'pending' }),
      ]);
      setIncomingRequests(incoming);
      setOutgoingRequests(outgoing);

      const relatedIds = Array.from(new Set([
        ...incoming.map((req) => req.fromUserId),
        ...outgoing.map((req) => req.toUserId),
      ].filter(Boolean)));

      if (relatedIds.length === 0) {
        setRequestProfiles({});
      } else {
        const entries = await Promise.all(relatedIds.map(async (id) => {
          try {
            const profile = await api.userById(id);
            return [id, profile];
          } catch (error) {
            console.debug('[Home] Failed to fetch request profile', error);
            return [id, null];
          }
        }));
        setRequestProfiles(Object.fromEntries(entries.filter(([, value]) => Boolean(value))));
      }
    } catch (error) {
      console.debug('[Home] Failed to load friend requests', error);
    }
  }, [viewerId]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  useEffect(() => {
    // Always load feed; only load viewer-specific data if logged in
    if (viewerId) {
      loadViewerDetails();
      loadFriendRequests();
    }
    loadFeed(feedScope);
  }, [viewerId, feedScope, feedSort, loadViewerDetails, loadFriendRequests, loadFeed]);


  useEffect(() => {
    if (!viewerId && feedScope === 'local') {
      setFeedScope('global');
    }
  }, [viewerId, feedScope]);

  useEffect(() => {
    if (feedScope === 'global') {
      loadFeed('global');
    }
  }, [feedScope, loadFeed]);

  const handleCreate = useCallback(async (payload) => {
    if (!viewerId) throw new Error('You must be logged in to create a project.');
    const { imageFile, imageUrl, ...rest } = payload || {};
    // Create project first
    const created = await api.createProject({
      ...rest,
      imageUrl: imageUrl || '',
      ownerId: viewerId,
      members: [viewerId],
    });
    // Then upload image if provided
    if (imageFile && created?._id) {
      if (imageFile.size > 5 * 1024 * 1024) throw new Error('Image must be 5MB or less');
      await api.uploadProjectImage(created._id, imageFile);
    }
  }, [viewerId]);

  const friendSet = useMemo(() => new Set((viewerDetails?.friends || []).map(String)), [viewerDetails]);
  const incomingSet = useMemo(() => new Set(incomingRequests.map((req) => String(req.fromUserId))), [incomingRequests]);
  const outgoingSet = useMemo(() => new Set(outgoingRequests.map((req) => String(req.toUserId))), [outgoingRequests]);

  const people = useMemo(() => {
    if (!allUsers) return [];
    return allUsers.filter((user) => !viewerId || user._id !== viewerId);
  }, [allUsers, viewerId]);

  if (err) return <p role="alert">Error: {err}</p>;

  return (
    <div className="home-bg full-bleed">
      <main className="container home">
        {viewerId && (
          <CreateProjectForm onCreate={handleCreate} />
        )}

        <section className="card section">
          <div className="toolbar">
            <h2 className="section-title">Activity Feed</h2>
            <div className="btn-group">
              <button
                type="button"
                className="btn"
                disabled={!viewerId || feedScope === 'local'}
                onClick={() => setFeedScope('local')}
              >
                Local
              </button>
              <button
                type="button"
                className="btn secondary"
                disabled={feedScope === 'global'}
                onClick={() => setFeedScope('global')}
              >
                Global
              </button>
              <button
                type="button"
                className="btn secondary"
                disabled={feedSort === 'latest'}
                onClick={() => setFeedSort('latest')}
              >
                Latest
              </button>
              <button
                type="button"
                className="btn"
                disabled={feedSort === 'popular'}
                onClick={() => setFeedSort('popular')}
              >
                Popular
              </button>
            </div>
          </div>

          {!viewerId && feedScope === 'local' && (
            <p className="helper" style={{ marginTop: '.5rem' }}>
              Log in to view your personalized feed.
            </p>
          )}

          {feedError && <p className="error" role="alert">{feedError}</p>}

          {feedLoading ? (
            <p>Loading activity…</p>
          ) : feedItems.length === 0 ? (
            <p>No activity yet.</p>
          ) : (
            <ul className="feed-list">
              {feedItems.map((item) => {
                const actor = item.user?.name || item.user?.username || 'Someone';
                const projectName = item.project?.name || item.project?.title || 'a project';
                const typeLabel = (item.type || 'check-in').replace(/-/g, ' ');
                const dateLabel = item.createdAt ? new Date(item.createdAt).toLocaleString() : '';
                return (
                  <li key={item._id} className="feed-item">
                    <strong>{actor}</strong> {typeLabel}{' '}
                    <Link to={`/project/${item.projectId}`}>{projectName}</Link>
                    {item.version && <span className="badge" style={{ marginLeft: '.5rem' }}>v{item.version}</span>}
                    {typeof item.project?.downloadCount === 'number' && (
                      <span className="badge" style={{ marginLeft: '.5rem' }}>
                        {item.project.downloadCount} downloads
                      </span>
                    )}
                    <div className="meta">{dateLabel}</div>
                    {item.message && <p>{item.message}</p>}
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <div className="card section">
          <p>
            Looking for projects? Visit the <Link to="/search">Search</Link> page,
            or view them on user profiles.
          </p>
        </div>

        {viewerId && (
          <section className="card section">
            <h2 className="section-title">Suggested Profiles</h2>
            {people.length === 0 ? (
              <p>No other users found.</p>
            ) : (
              <ul className="people-list">
                {people.map((person) => {
                  const status = (() => {
                    if (friendSet.has(person._id)) return relationStates.friends;
                    if (incomingSet.has(person._id)) return relationStates.incoming;
                    if (outgoingSet.has(person._id)) return relationStates.outgoing;
                    return relationStates.none;
                  })();

                  const label = person.name || person.username || person.email;

                  return (
                    <li key={person._id} className="person-row">
                      <Link to={`/profile/${person._id}`} className="person-link">
                        {label}
                      </Link>

                      {status === relationStates.friends && <span className="badge">Friends</span>}
                      {status === relationStates.outgoing && <span className="helper">Request sent</span>}

                      {status === relationStates.incoming && (
                        <div className="actions">
                          <button
                            className="btn"
                            type="button"
                            disabled={busyUserId === person._id}
                            onClick={async () => {
                              if (!viewerId) return;
                              const req = incomingRequests.find((r) => r.fromUserId === person._id);
                              if (!req) return;
                              setBusyUserId(person._id);
                              setErr('');
                              try {
                                await api.acceptFriendRequest(req._id);
                                await Promise.all([loadFriendRequests(), loadViewerDetails()]);
                              } catch (error) {
                                setErr(error.message || 'Failed to accept request');
                              } finally {
                                setBusyUserId('');
                              }
                            }}
                          >
                            {busyUserId === person._id ? 'Accepting…' : 'Accept'}
                          </button>
                          <button
                            className="btn secondary"
                            type="button"
                            disabled={busyUserId === person._id}
                            onClick={async () => {
                              if (!viewerId) return;
                              const req = incomingRequests.find((r) => r.fromUserId === person._id);
                              if (!req) return;
                              setBusyUserId(person._id);
                              setErr('');
                              try {
                                await api.declineFriendRequest(req._id);
                                await loadFriendRequests();
                              } catch (error) {
                                setErr(error.message || 'Failed to decline request');
                              } finally {
                                setBusyUserId('');
                              }
                            }}
                          >
                            Decline
                          </button>
                        </div>
                      )}

                      {status === relationStates.none && (
                        <div className="actions">
                          <button
                            className="btn"
                            type="button"
                            disabled={busyUserId === person._id}
                            onClick={async () => {
                              if (!viewerId) return;
                              setBusyUserId(person._id);
                              setErr('');
                              try {
                                await api.sendFriendRequest({ fromUserId: viewerId, toUserId: person._id });
                                await Promise.all([loadFriendRequests(), loadViewerDetails()]);
                              } catch (error) {
                                setErr(error.message || 'Failed to send friend request');
                              } finally {
                                setBusyUserId('');
                              }
                            }}
                          >
                            {busyUserId === person._id ? 'Sending…' : 'Add friend'}
                          </button>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        )}
      </main>
    </div>
  );
}