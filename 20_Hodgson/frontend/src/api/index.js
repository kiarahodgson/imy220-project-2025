//u23530996 Kiara Hodgson
import { getJson, postJson, patchJson, deleteJson, postForm } from './client';

export const api = {
  // READ endpoints
  users: () => getJson('/api/users'),
  userById: (id) => getJson(`/api/users/${id}`),
  updateUser: (id, body) => patchJson(`/api/users/${id}`, body),

  projects: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return getJson(`/api/projects${q ? `?${q}` : ''}`);
  },
  projectById: (id) => getJson(`/api/projects/${id}`),
  createProject: (body) => postJson('/api/projects', body),
  updateProject: (id, body) => patchJson(`/api/projects/${id}`, body),
  deleteProject: (id) => deleteJson(`/api/projects/${id}`),

  // Project members & ownership
  addProjectMember: (projectId, { actorId, userId }) => postJson(`/api/projects/${projectId}/members`, { actorId, userId }),
  removeProjectMember: (projectId, { actorId, userId }) => deleteJson(`/api/projects/${projectId}/members/${userId}?actorId=${encodeURIComponent(actorId)}`),
  transferProjectOwnership: (projectId, { actorId, newOwnerId }) => postJson(`/api/projects/${projectId}/transfer-ownership`, { actorId, newOwnerId }),
  uploadProjectImage: (projectId, file) => {
    const fd = new FormData();
    fd.append('image', file);
    return postForm(`/api/projects/${projectId}/image`, fd);
  },

  checkins: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return getJson(`/api/checkins${q ? `?${q}` : ''}`);
  },
  createCheckin: (body) => postJson('/api/checkins', body),
  createCheckinWithFiles: ({ projectId, userId, type, message, version, files, removeFiles }) => {
    const fd = new FormData();
    fd.append('projectId', projectId);
    fd.append('userId', userId);
    if (type) fd.append('type', type);
    if (message) fd.append('message', message);
    if (version) fd.append('version', version);
    if (removeFiles && removeFiles.length) fd.append('removeFiles', JSON.stringify(removeFiles));
    (files || []).forEach((file) => fd.append('files', file));
    return postForm('/api/checkins', fd);
  },
  deleteCheckin: (id) => deleteJson(`/api/checkins/${id}`),

  // Discussions
  discussions: (projectId, { userId } = {}) => {
    const q = new URLSearchParams(userId ? { userId } : {}).toString();
    return getJson(`/api/projects/${projectId}/discussions${q ? `?${q}` : ''}`);
  },
  createDiscussion: (projectId, body) => postJson(`/api/projects/${projectId}/discussions`, body),
  updateDiscussion: (id, body) => patchJson(`/api/discussions/${id}`, body),
  deleteDiscussion: (id, { userId }) => deleteJson(`/api/discussions/${id}?userId=${encodeURIComponent(userId)}`),

  feed: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return getJson(`/api/feed${q ? `?${q}` : ''}`);
  },

  search: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return getJson(`/api/search${q ? `?${q}` : ''}`);
  },

  friends: (userId) => getJson(`/api/friends/${userId}`),
  unfriend: ({ userId, targetId }) => deleteJson(`/api/friends?userId=${encodeURIComponent(userId)}&targetId=${encodeURIComponent(targetId)}`),
  friendRequests: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return getJson(`/api/friend-requests${q ? `?${q}` : ''}`);
  },
  sendFriendRequest: (body) => postJson('/api/friend-requests', body),
  acceptFriendRequest: (id) => postJson(`/api/friend-requests/${id}/accept`, {}),
  declineFriendRequest: (id) => postJson(`/api/friend-requests/${id}/decline`, {}),

  // AUTH
  signup: (body) => postJson('/api/auth/signup', body),
  login: ({ login, password }) => postJson('/api/auth/login', { login, password }),
  logout: () => postJson('/api/auth/logout', {}),

  // SAVES
  saveProject: ({ userId, projectId }) => postJson('/api/saves', { userId, projectId }),
  unsaveProject: ({ userId, projectId }) => deleteJson(`/api/saves?userId=${encodeURIComponent(userId)}&projectId=${encodeURIComponent(projectId)}`),
  savedProjects: (userId) => getJson(`/api/users/${userId}/saved-projects`),
  isProjectSaved: ({ userId, projectId }) => getJson(`/api/saves/check?userId=${encodeURIComponent(userId)}&projectId=${encodeURIComponent(projectId)}`),
};
