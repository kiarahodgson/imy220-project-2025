import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../api";
import ProjectView from "../components/ProjectView";
import ProjectFiles from "../components/ProjectFiles";
import ProjectMessages from "../components/ProjectMessages";
import EditProjectForm from "../components/EditProjectForm";
import CheckInForm from "../components/CheckInForm";
import { Link } from "react-router-dom";
import ProjectDiscussion from "../components/ProjectDiscussion";

const hydrateProject = (doc) => {
  if (!doc) return null;
  return {
    ...doc,
    title: doc.name,
    tags: doc.hashtags,
    files: doc.files ?? [],
    messages: doc.messages ?? [],
  };
};

export default function ProjectPage({ currentUser }){
  const { id } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [ownerName, setOwnerName] = useState("");
  const [userNames, setUserNames] = useState({});
  const [checkins, setCheckins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [checkinBusy, setCheckinBusy] = useState(false);
  const [memberBusy, setMemberBusy] = useState(false);
  const [friends, setFriends] = useState([]);
  const [addUserId, setAddUserId] = useState("");
  const [transferTo, setTransferTo] = useState("");
  const [isSaved, setIsSaved] = useState(false);

  const fetchUserNames = useCallback(async (ids) => {
    const unique = Array.from(new Set((ids || []).filter(Boolean)));
    if (unique.length === 0) return {};
    const entries = await Promise.all(unique.map(async (id) => {
      try {
        const user = await api.userById(id);
        const label = user?.name || user?.username || id;
        return [id, label];
      } catch (error) {
        console.debug('[ProjectPage] Failed to fetch user', id, error);
        return [id, id];
      }
    }));
    return Object.fromEntries(entries);
  }, []);

  const loadData = useCallback(async (options = {}) => {
    const { silent = false } = options;
    if (!silent) {
      setLoading(true);
      setErr("");
    }
    try {
      const data = await api.projectById(id);
      const hydrated = hydrateProject(data);
      setProject(hydrated);

      const checkinsData = await api.checkins({ projectId: id });
      setCheckins(checkinsData);

      const idsToResolve = [data?.ownerId, ...(data?.members || []), ...checkinsData.map((c) => c.userId)];
      const labels = await fetchUserNames(idsToResolve);
      setUserNames(labels);
      if (data?.ownerId) {
        setOwnerName(labels[data.ownerId] || data.ownerId);
      } else {
        setOwnerName("");
      }

      if (currentUser?._id) {
        try {
          const savedResp = await api.isProjectSaved({ userId: currentUser._id, projectId: id });
          setIsSaved(Boolean(savedResp?.saved));
        } catch (e) {
          setIsSaved(false);
        }
      } else {
        setIsSaved(false);
      }
    } catch (error) {
      if (silent) throw error;
      setErr(error.message || "Failed to load project");
    } finally {
      if (!silent) setLoading(false);
    }
  }, [fetchUserNames, id]);

  useEffect(() => {
    async function loadFriends() {
      if (!currentUser?._id) return;
      try {
        const list = await api.friends(currentUser._id);
        setFriends(list);
      } catch (e) {
        console.debug('[ProjectPage] friends fetch failed', e);
      }
    }
    loadFriends();
  }, [currentUser?._id]);

  useEffect(() => {
    let active = true;
    loadData().catch((error) => {
      if (active) setErr(error.message || "Failed to load project");
    });
    return () => { active = false; };
  }, [loadData]);

  const isOwner = useMemo(() => {
    if (!project || !currentUser) return false;
    return project.ownerId === currentUser._id;
  }, [project, currentUser]);

  const isMember = useMemo(() => {
    if (!project || !currentUser) return false;
    if (isOwner) return true;
    const members = project.members || [];
    return members.includes(currentUser._id);
  }, [project, currentUser, isOwner]);

  const isLocker = useMemo(() => {
    if (!project || !currentUser) return false;
    return project.lockedBy && String(project.lockedBy) === String(currentUser._id);
  }, [project, currentUser]);

  const currentMemberIds = useMemo(() => new Set((project?.members || []).map(String)), [project]);
  const addableFriends = useMemo(() => {
    if (!friends || !project) return [];
    return friends.filter((f) => !currentMemberIds.has(String(f._id)) && String(f._id) !== String(project.ownerId));
  }, [friends, project, currentMemberIds]);

  const handleSave = useCallback(async (updated) => {
    if (!project) return;
    if (!isOwner) throw new Error('Only the project owner can edit this project.');
    try {
      setSaving(true);
      await api.updateProject(project._id, {
        name: updated.title ?? updated.name ?? project.name,
        description: updated.description,
        type: updated.type ?? project.type,
        hashtags: updated.tags ?? updated.hashtags ?? project.tags ?? [],
      });
      await loadData({ silent: true });
    } finally {
      setSaving(false);
    }
  }, [project, isOwner, loadData]);

  const handleDelete = useCallback(async () => {
    if (!project || !isOwner) return;
    try {
      setDeleting(true);
      await api.deleteProject(project._id);
      navigate('/home');
    } catch (error) {
      setErr(error.message || 'Failed to delete project');
    } finally {
      setDeleting(false);
    }
  }, [project, isOwner, navigate]);

  const handleAddMember = useCallback(async () => {
    if (!project || !currentUser?._id || !addUserId) return;
    try {
      setMemberBusy(true);
      await api.addProjectMember(project._id, { actorId: currentUser._id, userId: addUserId });
      setAddUserId("");
      await loadData({ silent: true });
    } catch (e) {
      setErr(e.message || 'Failed to add member');
    } finally {
      setMemberBusy(false);
    }
  }, [project, currentUser, addUserId, loadData]);

  const handleRemoveMember = useCallback(async (userId) => {
    if (!project || !currentUser?._id || !userId) return;
    try {
      setMemberBusy(true);
      await api.removeProjectMember(project._id, { actorId: currentUser._id, userId });
      await loadData({ silent: true });
    } catch (e) {
      setErr(e.message || 'Failed to remove member');
    } finally {
      setMemberBusy(false);
    }
  }, [project, currentUser, loadData]);

  const handleTransfer = useCallback(async () => {
    if (!project || !currentUser?._id || !transferTo) return;
    try {
      setMemberBusy(true);
      await api.transferProjectOwnership(project._id, { actorId: currentUser._id, newOwnerId: transferTo });
      setTransferTo("");
      await loadData({ silent: true });
    } catch (e) {
      setErr(e.message || 'Failed to transfer ownership');
    } finally {
      setMemberBusy(false);
    }
  }, [project, currentUser, transferTo, loadData]);

  const handleToggleSave = useCallback(async () => {
    if (!currentUser?._id || !project?._id) return;
    try {
      if (isSaved) {
        await api.unsaveProject({ userId: currentUser._id, projectId: project._id });
        setIsSaved(false);
      } else {
        await api.saveProject({ userId: currentUser._id, projectId: project._id });
        setIsSaved(true);
      }
    } catch (e) {
      setErr(e.message || 'Failed to update saved state');
    }
  }, [currentUser, project, isSaved]);

  const resolveUserName = useCallback((uid) => {
    if (!uid) return 'Unknown user';
    if (uid === project?.ownerId && ownerName) return ownerName;
    return userNames[uid] || uid;
  }, [project, ownerName, userNames]);

  const handleCreateCheckin = useCallback(async (payload) => {
    if (!project) throw new Error('Project not loaded');
    if (!currentUser?._id) throw new Error('You must be logged in to log activity.');
    if (!isMember) throw new Error('Only project members can log activity.');

    setCheckinBusy(true);
    try {
      const base = { projectId: project._id, userId: currentUser._id, type: payload.type, message: payload.message, version: payload.version, removeFiles: payload.removeFiles || [] };
      if (payload.files && payload.files.length > 0) {
        await api.createCheckinWithFiles({ ...base, files: payload.files });
      } else {
        await api.createCheckin(base);
      }
      await loadData({ silent: true });
    } finally {
      setCheckinBusy(false);
    }
  }, [project, currentUser, isMember, loadData]);

  if (loading) return <p>Loading…</p>;
  if (err) return <p role="alert">Error: {err}</p>;
  if (!project) return <p>Project not found.</p>;

  const fileNames = (project.files || []).map((file) =>
    typeof file === 'string' ? file : file?.name || ''
  ).filter(Boolean);

  return (
    <div className="project-bg full-bleed">
      <main className="container">
        <article>
          <ProjectView project={project} ownerName={ownerName || project.ownerId} />

          {currentUser?._id && (
            <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div><strong>{isSaved ? 'Saved' : 'Not saved'}</strong></div>
              <button className="btn" type="button" onClick={handleToggleSave}>
                {isSaved ? 'Unsave' : 'Save'}
              </button>
            </div>
          )}

          {isMember && (
            <CheckInForm
              onSubmit={handleCreateCheckin}
              disabled={checkinBusy}
              currentStatus={project.status || 'checked-in'}
              currentVersion={project.version || ''}
              allowedActions={(() => {
                const status = project.status || 'checked-in';
                if (status === 'checked-in') {
                  // Members can check out or leave a note
                  return ['check-out', 'note'];
                }
                // checked-out
                if (isLocker) return ['check-in', 'note'];
                return ['note'];
              })()}
              existingFiles={project.files || []}
            />
          )}

          <div className="grid">
            <ProjectFiles projectId={project._id} files={project.files || []} />
            <ProjectMessages messages={checkins} resolveUserName={resolveUserName} />
          </div>

          {isMember && (
            <ProjectDiscussion
              projectId={project._id}
              currentUser={currentUser}
              resolveUserName={resolveUserName}
            />
          )}

          {(isMember || isOwner) && (
            <section className="card">
              <h3>Members</h3>
              <ul>
                <li key={project.ownerId}>
                  <strong>{resolveUserName(project.ownerId)}</strong> <span className="badge" style={{ marginLeft: '.5rem' }}>Owner</span>
                </li>
                {(project.members || []).filter((m) => String(m) !== String(project.ownerId)).map((m) => (
                  <li key={m} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Link to={`/profile/${m}`}>{resolveUserName(m)}</Link>
                    {isOwner && (
                      <button className="btn secondary" type="button" disabled={memberBusy} onClick={() => handleRemoveMember(m)}>
                        Remove
                      </button>
                    )}
                  </li>
                ))}
              </ul>

              <div className="flex" style={{ marginTop: '.5rem' }}>
                <select className="select" value={addUserId} onChange={(e) => setAddUserId(e.target.value)} disabled={!isMember || memberBusy}>
                  <option value="">Add friend as member…</option>
                  {addableFriends.map((f) => (
                    <option key={f._id} value={f._id}>{f.name || f.username}</option>
                  ))}
                </select>
                <button className="btn" type="button" onClick={handleAddMember} disabled={!addUserId || !isMember || memberBusy}>Add</button>
              </div>

              {isOwner && (
                <div className="flex" style={{ marginTop: '.5rem' }}>
                  <select className="select" value={transferTo} onChange={(e) => setTransferTo(e.target.value)} disabled={memberBusy}>
                    <option value="">Transfer ownership to…</option>
                    {(project.members || []).filter((m) => String(m) !== String(project.ownerId)).map((m) => (
                      <option key={m} value={m}>{resolveUserName(m)}</option>
                    ))}
                  </select>
                  <button className="btn secondary" type="button" onClick={handleTransfer} disabled={!transferTo || memberBusy}>Transfer</button>
                </div>
              )}
            </section>
          )}

          {isOwner && (
            <>
              <EditProjectForm
                project={project}
                onSave={handleSave}
                disabled={saving}
              />
              <button
                className="btn secondary"
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                style={{ marginTop: '.75rem' }}
              >
                {deleting ? 'Deleting…' : 'Delete project'}
              </button>
            </>
          )}
        </article>
      </main>
    </div>
  );
}
