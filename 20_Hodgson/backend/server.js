//u23530996 Kiara Hodgson

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { MongoClient, ObjectId } = require('mongodb');
const multer = require('multer');

const DEFAULT_ATLAS_URI = 'mongodb+srv://kiara220:220projectpassword@imy220.rfpry.mongodb.net/?retryWrites=true&w=majority&appName=IMY220';

const RAW_ATLAS_URI = process.env.ATLAS_URI || process.env.MONGO_URI || '';
const isValidMongoUri = (u) => typeof u === 'string' && /^(mongodb(\+srv)?:\/\/)/.test(u);
const ATLAS_URI = isValidMongoUri(RAW_ATLAS_URI) ? RAW_ATLAS_URI : DEFAULT_ATLAS_URI;
if (!isValidMongoUri(RAW_ATLAS_URI) && RAW_ATLAS_URI) {
  console.warn('[DB] Ignoring invalid ATLAS_URI/MONGO_URI; falling back to default');
}

const DB_NAME = 'projectsDB';
const COLLECTIONS = {
  users: 'users',
  projects: 'projects',
  checkins: 'checkins',
  friendRequests: 'friendRequests',
  discussions: 'discussions',
  saves: 'saves',
};

const app = express();
app.use(cors());
app.use(express.json());


const STATIC_DIR = path.join(__dirname, 'public');
app.use(express.static(STATIC_DIR));

// Upload project files
const UPLOADS_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
app.use('/uploads', express.static(UPLOADS_DIR, { fallthrough: true }));

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (_req, file, cb) => {
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, `${Date.now()}_${safeName}`);
  },
});
const upload = multer({ storage });


app.use((req, _res, next) => { console.log('[REQ]', req.method, req.url); next(); });

let client, db, Users, Projects, Checkins, FriendRequests, Discussions, Saves;
let dbConnected = false;
let dbError = null;

app.get('/', (_req, res) => {
  res.type('text').send('IMY220 API running. Try /api/health');
});

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, dbConnected, dbError: dbError ? String(dbError) : null });
});

// ensure DB is connected
function requireDb(_req, res, next) {
  if (!dbConnected) return res.status(503).json({ error: 'Database not connected yet' });
  next();
}

// helpers
const isHex24 = (s) => typeof s === 'string' && /^[a-fA-F0-9]{24}$/.test(s);
const toId = (val) => (isHex24(val) ? new ObjectId(val) : val);
const idQuery = (id) => (isHex24(id) ? { _id: new ObjectId(id) } : { _id: id });

const toIso = (val) => (val instanceof Date ? val.toISOString() : val ?? null);
const normalizeString = (val) => (typeof val === 'string' ? val.trim() : '');
const normalizeArray = (input) => {
  if (Array.isArray(input)) return input;
  if (typeof input === 'string') {
    return input
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
};

const dedupeIds = (values = []) => {
  const seen = new Set();
  const out = [];
  for (const raw of values) {
    if (!raw) continue;
    const asId = toId(raw);
    const key = asId instanceof ObjectId ? asId.toHexString() : String(asId);
    if (!seen.has(key)) {
      seen.add(key);
      out.push(asId);
    }
  }
  return out;
};

const normalizeMembers = (input, ownerId) => {
  const base = normalizeArray(input);
  if (ownerId) base.push(ownerId);
  return dedupeIds(base);
};

const normalizeFiles = (input) => {
  if (!Array.isArray(input)) return [];
  return input
    .map((file) => {
      if (file && typeof file === 'object') {
        const name = normalizeString(file.name || file.filename);
        if (!name) return null;
        return {
          name,
          url: normalizeString(file.url || file.href),
          path: normalizeString(file.path),
          size: typeof file.size === 'number' ? file.size : Number(file.size) || 0,
        };
      }
      if (typeof file === 'string') {
        const name = file.trim();
        return name ? { name, url: '', path: '', size: 0 } : null;
      }
      return null;
    })
    .filter(Boolean);
};

const sanitizeProject = (doc) => {
  if (!doc) return null;
  return {
    _id: doc._id?.toString?.() ?? doc._id,
    ownerId: doc.ownerId?.toString?.() ?? doc.ownerId,
    name: doc.name,
    description: doc.description ?? '',
    type: doc.type ?? '',
    imageUrl: doc.imageUrl ?? '',
    hashtags: Array.isArray(doc.hashtags) ? doc.hashtags : [],
    files: Array.isArray(doc.files) ? doc.files : [],
    members: Array.isArray(doc.members)
      ? doc.members.map((m) => (m?.toString?.() ?? m)).filter(Boolean)
      : [],
    status: doc.status ?? 'checked-in',
    downloadCount: typeof doc.downloadCount === 'number' ? doc.downloadCount : 0,
    lockedBy: doc.lockedBy?.toString?.() ?? (doc.lockedBy ?? null),
    lockedAt: toIso(doc.lockedAt),
    version: doc.version ?? '1.0.0',
    createdAt: toIso(doc.createdAt),
    updatedAt: toIso(doc.updatedAt),
  };
};

const sanitizeUser = (doc) => {
  if (!doc) return null;
  const { password, passwordHash, ...rest } = doc;
  return {
    ...rest,
    _id: doc._id?.toString?.() ?? doc._id,
    friends: Array.isArray(rest.friends) ? rest.friends.map((id) => id?.toString?.() ?? id) : [],
    createdAt: toIso(rest.createdAt),
    updatedAt: toIso(rest.updatedAt),
  };
};

const sanitizeCheckin = (doc) => {
  if (!doc) return null;
  return {
    _id: doc._id?.toString?.() ?? doc._id,
    projectId: doc.projectId?.toString?.() ?? doc.projectId,
    userId: doc.userId?.toString?.() ?? doc.userId,
    message: doc.message ?? '',
    type: doc.type ?? 'check-in',
    createdAt: toIso(doc.createdAt),
    updatedAt: toIso(doc.updatedAt),
    version: doc.version ?? null,
    files: Array.isArray(doc.files) ? doc.files : [],
  };
};

const sanitizeDiscussion = (doc) => {
  if (!doc) return null;
  return {
    _id: doc._id?.toString?.() ?? doc._id,
    projectId: doc.projectId?.toString?.() ?? doc.projectId,
    userId: doc.userId?.toString?.() ?? doc.userId,
    message: doc.message ?? '',
    createdAt: toIso(doc.createdAt),
    updatedAt: toIso(doc.updatedAt),
  };
};

const sanitizeFriendRequest = (doc) => {
  if (!doc) return null;
  return {
    _id: doc._id?.toString?.() ?? doc._id,
    fromUserId: doc.fromUserId?.toString?.() ?? doc.fromUserId,
    toUserId: doc.toUserId?.toString?.() ?? doc.toUserId,
    status: doc.status ?? 'pending',
    createdAt: toIso(doc.createdAt),
    updatedAt: toIso(doc.updatedAt),
  };
};

const buildRegex = (value) => {
  const escaped = value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(escaped, 'i');
};

async function ensureUsers() {
  if (!Users) throw new Error('Users collection not ready');
}

async function addFriendship(userIdA, userIdB) {
  const a = toId(userIdA);
  const b = toId(userIdB);
  await Users.updateOne(
    { _id: a },
    {
      $addToSet: { friends: b },
      $set: { updatedAt: new Date() },
    }
  );
  await Users.updateOne(
    { _id: b },
    {
      $addToSet: { friends: a },
      $set: { updatedAt: new Date() },
    }
  );
}

async function removeFriendship(userIdA, userIdB) {
  const a = toId(userIdA);
  const b = toId(userIdB);
  await Users.updateOne(
    { _id: a },
    {
      $pull: { friends: b },
      $set: { updatedAt: new Date() },
    }
  );
  await Users.updateOne(
    { _id: b },
    {
      $pull: { friends: a },
      $set: { updatedAt: new Date() },
    }
  );
}

async function removeFriendRequest(requestId) {
  const query = idQuery(requestId);
  await FriendRequests.deleteOne(query);
}

//USERS
// Upload user pfp
app.post('/api/users/:id/avatar', requireDb, multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } }).single('avatar'), async (req, res) => {
  try {
    const userId = req.params.id;
    const user = await Users.findOne(idQuery(userId));
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (!req.file) return res.status(400).json({ error: 'Avatar image is required' });

    const file = req.file;
    const url = `/uploads/${file.filename}`;
    const relPath = path.join('uploads', file.filename);

    try {
      const prevPath = user.avatarPath || '';
      if (prevPath && prevPath.startsWith('uploads')) {
        const absPrev = path.join(__dirname, prevPath);
        if (fs.existsSync(absPrev)) fs.unlink(absPrev, () => {});
      }
    } catch (_) {}

    await Users.updateOne({ _id: user._id }, {
      $set: {
        avatarUrl: url,
        avatarPath: relPath,
        updatedAt: new Date(),
      },
    });

    const updated = await Users.findOne({ _id: user._id });
    res.json(sanitizeUser(updated));
  } catch (err) {
    console.error('[USERS] Avatar upload failed:', err?.message || err);
    const msg = /File too large/.test(String(err)) ? 'Image exceeds 5MB limit' : 'Failed to upload avatar';
    res.status(500).json({ error: msg, detail: String(err?.message || err) });
  }
});
app.get('/api/users', requireDb, async (_req, res) => {
  try {
    const docs = await Users.find({}).sort({ createdAt: -1 }).toArray();
    res.json(docs.map(sanitizeUser));
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch users', detail: String(err?.message || err) });
  }
});

app.get('/api/users/:id', requireDb, async (req, res) => {
  try {
    const doc = await Users.findOne(idQuery(req.params.id));
    if (!doc) return res.status(404).json({ error: 'User not found' });
    res.json(sanitizeUser(doc));
  } catch (err) {
    res.status(400).json({ error: 'Invalid user id', detail: String(err?.message || err) });
  }
});

app.patch('/api/users/:id', requireDb, async (req, res) => {
  try {
    const userId = req.params.id;
    const body = req.body || {};
    const updates = {};

    if (body.name !== undefined) updates.name = normalizeString(body.name) || null;
    if (body.username !== undefined) updates.username = normalizeString(body.username) || null;
    if (body.bio !== undefined) updates.bio = body.bio?.toString?.() ?? '';
    if (body.avatarUrl !== undefined) updates.avatarUrl = normalizeString(body.avatarUrl);
    if (body.email !== undefined) updates.email = normalizeString(body.email).toLowerCase();

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No valid fields provided' });
    }

    const candidateFilters = [];
    if (isHex24(userId)) candidateFilters.push({ _id: new ObjectId(userId) });
    candidateFilters.push({ _id: userId });

    const excludeIds = candidateFilters
      .map((candidate) => candidate._id)
      .filter((idValue) => idValue !== undefined);

    if (updates.email) {
      const emailQuery = { email: updates.email };
      if (excludeIds.length) {
        emailQuery._id = { $nin: excludeIds };
      }
      const existingEmail = await Users.findOne(emailQuery);
      if (existingEmail) return res.status(409).json({ error: 'Email already in use' });
    }

    if (updates.username) {
      const usernameQuery = { username: updates.username };
      if (excludeIds.length) {
        usernameQuery._id = { $nin: excludeIds };
      }
      const existingUsername = await Users.findOne(usernameQuery);
      if (existingUsername) return res.status(409).json({ error: 'Username already in use' });
    }

    updates.updatedAt = new Date();

    let matchedFilter = null;
    for (const filter of candidateFilters) {
      const result = await Users.updateOne(filter, { $set: updates });
      if (result?.matchedCount) {
        matchedFilter = filter;
        break;
      }
    }

    if (!matchedFilter) return res.status(404).json({ error: 'User not found' });

    const updatedDoc = await Users.findOne(matchedFilter);
    res.json(sanitizeUser(updatedDoc));
  } catch (err) {
    console.error('[USERS] Update failed:', err?.message || err);
    res.status(500).json({ error: 'Failed to update user', detail: String(err?.message || err) });
  }
});

//PROJECTS
app.get('/api/projects', requireDb, async (req, res) => {
  try {
    const { ownerId, memberId, hashtag } = req.query;
    const q = {};
    const ors = [];
    if (ownerId) ors.push({ ownerId: toId(ownerId) });
    if (memberId) ors.push({ members: { $in: [toId(memberId)] } });
    if (ors.length > 0) q.$or = ors;
    if (hashtag) q.hashtags = { $in: [hashtag] };

    const docs = await Projects.find(q).sort({ createdAt: -1 }).toArray();
    res.json(docs.map(sanitizeProject));
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch projects', detail: String(err?.message || err) });
  }
});

app.get('/api/projects/:id', requireDb, async (req, res) => {
  try {
    const doc = await Projects.findOne(idQuery(req.params.id));
    if (!doc) return res.status(404).json({ error: 'Project not found' });
    res.json(sanitizeProject(doc));
  } catch (err) {
    res.status(400).json({ error: 'Invalid project id', detail: String(err?.message || err) });
  }
});

app.post('/api/projects', requireDb, async (req, res) => {
  try {
    const body = req.body || {};
    const ownerIdRaw = body.ownerId;
    const name = normalizeString(body.name || body.title);
    if (!ownerIdRaw) return res.status(400).json({ error: 'ownerId is required' });
    if (!name) return res.status(400).json({ error: 'Project name is required' });

    const ownerId = toId(ownerIdRaw);
    const now = new Date();

    const hashtags = normalizeArray(body.hashtags).map((tag) => tag.replace(/^#/, '').trim()).filter(Boolean);
    const members = normalizeMembers(body.members, ownerId);

    const doc = {
      ownerId,
      name,
      description: normalizeString(body.description),
      type: normalizeString(body.type),
      imageUrl: normalizeString(body.imageUrl),
      hashtags,
      files: normalizeFiles(body.files),
      members,
      status: normalizeString(body.status) || 'checked-in',
      version: normalizeString(body.version) || '1.0.0',
      downloadCount: 0,
      createdAt: now,
      updatedAt: now,
    };

    const { insertedId } = await Projects.insertOne(doc);

    // Log activity: project created
    try {
      await Checkins.insertOne({
        projectId: insertedId,
        userId: ownerId,
        message: `Created project "${name}"`,
        type: 'project-created',
        version: doc.version || null,
        files: [],
        createdAt: now,
        updatedAt: now,
      });
    } catch (_) {
    }

    const stored = await Projects.findOne({ _id: insertedId });
    res.status(201).json(sanitizeProject(stored));
  } catch (err) {
    console.error('[PROJECTS] Create failed:', err?.message || err);
    res.status(500).json({ error: 'Failed to create project', detail: String(err?.message || err) });
  }
});

app.patch('/api/projects/:id', requireDb, async (req, res) => {
  try {
    const projectId = req.params.id;
    const query = idQuery(projectId);
    const existing = await Projects.findOne(query);
    if (!existing) return res.status(404).json({ error: 'Project not found' });

    const body = req.body || {};
    const set = {};

    if (body.name !== undefined) set.name = normalizeString(body.name);
    if (body.description !== undefined) set.description = normalizeString(body.description);
    if (body.type !== undefined) set.type = normalizeString(body.type);
    if (body.imageUrl !== undefined) set.imageUrl = normalizeString(body.imageUrl);
    if (body.status !== undefined) set.status = normalizeString(body.status) || existing.status || 'checked-in';
    if (body.version !== undefined) set.version = normalizeString(body.version) || existing.version || '1.0.0';

    if (body.ownerId !== undefined) {
      set.ownerId = toId(body.ownerId);
    }
    const ownerIdForMembers = set.ownerId ?? existing.ownerId;

    if (body.hashtags !== undefined) {
      set.hashtags = normalizeArray(body.hashtags)
        .map((tag) => tag.replace(/^#/, '').trim())
        .filter(Boolean);
    }

    if (body.members !== undefined) {
      set.members = normalizeMembers(body.members, ownerIdForMembers);
    }

    if (body.files !== undefined) {
      set.files = normalizeFiles(body.files);
    }

    if (Object.keys(set).length === 0) {
      return res.status(400).json({ error: 'No valid fields provided for update' });
    }

    set.updatedAt = new Date();

    const { value } = await Projects.findOneAndUpdate(query, { $set: set }, { returnDocument: 'after' });
    res.json(sanitizeProject(value));
  } catch (err) {
    console.error('[PROJECTS] Update failed:', err?.message || err);
    res.status(500).json({ error: 'Failed to update project', detail: String(err?.message || err) });
  }
});

app.delete('/api/projects/:id', requireDb, async (req, res) => {
  try {
    const projectId = req.params.id;
    const query = idQuery(projectId);
    const existing = await Projects.findOne(query);
    if (!existing) return res.status(404).json({ error: 'Project not found' });

    await Projects.deleteOne({ _id: existing._id });
    const relatedDelete = await Checkins.deleteMany({
      $or: [
        { projectId: existing._id },
        { projectId: existing._id?.toString?.() },
      ],
    });

    res.json({ ok: true, project: sanitizeProject(existing), removedCheckins: relatedDelete.deletedCount });
  } catch (err) {
    console.error('[PROJECTS] Delete failed:', err?.message || err);
    res.status(500).json({ error: 'Failed to delete project', detail: String(err?.message || err) });
  }
});

//PROJECT MEMBERS & OWNERSHIP
app.post('/api/projects/:id/members', requireDb, async (req, res) => {
  try {
    const projectId = req.params.id;
    const { actorId: actorIdRaw, userId: userIdRaw } = req.body || {};
    if (!actorIdRaw || !userIdRaw) return res.status(400).json({ error: 'actorId and userId are required' });

    const [project, actor, target] = await Promise.all([
      Projects.findOne(idQuery(projectId)),
      Users.findOne(idQuery(actorIdRaw)),
      Users.findOne(idQuery(userIdRaw)),
    ]);
    if (!project) return res.status(404).json({ error: 'Project not found' });
    if (!actor) return res.status(404).json({ error: 'Actor user not found' });
    if (!target) return res.status(404).json({ error: 'Target user not found' });

    const actorIsMember = String(project.ownerId) === String(actor._id) || (project.members || []).some((m) => String(m) === String(actor._id));
    if (!actorIsMember) return res.status(403).json({ error: 'Only project members can add members' });

    const actorFriends = new Set((actor.friends || []).map((f) => String(f)));
    if (!actorFriends.has(String(target._id))) return res.status(403).json({ error: 'You can only add your friends' });

    await Projects.updateOne(
      { _id: project._id },
      { $addToSet: { members: toId(target._id) }, $set: { updatedAt: new Date() } }
    );
    const updated = await Projects.findOne({ _id: project._id });
    res.json(sanitizeProject(updated));
  } catch (err) {
    console.error('[PROJECTS] Add member failed:', err?.message || err);
    res.status(500).json({ error: 'Failed to add member', detail: String(err?.message || err) });
  }
});

app.delete('/api/projects/:id/members/:userId', requireDb, async (req, res) => {
  try {
    const projectId = req.params.id;
    const removeUserIdRaw = req.params.userId;
    const actorIdRaw = req.query.actorId || (req.body && req.body.actorId) || '';
    if (!actorIdRaw) return res.status(400).json({ error: 'actorId is required' });

    const [project, actor] = await Promise.all([
      Projects.findOne(idQuery(projectId)),
      Users.findOne(idQuery(actorIdRaw)),
    ]);
    if (!project) return res.status(404).json({ error: 'Project not found' });
    if (!actor) return res.status(404).json({ error: 'Actor user not found' });

    if (String(project.ownerId) !== String(actor._id)) return res.status(403).json({ error: 'Only the owner can remove members' });
    if (String(project.ownerId) === String(removeUserIdRaw)) return res.status(400).json({ error: 'Cannot remove the owner' });

    await Projects.updateOne(
      { _id: project._id },
      { $pull: { members: toId(removeUserIdRaw) }, $set: { updatedAt: new Date() } }
    );
    const updated = await Projects.findOne({ _id: project._id });
    res.json(sanitizeProject(updated));
  } catch (err) {
    console.error('[PROJECTS] Remove member failed:', err?.message || err);
    res.status(500).json({ error: 'Failed to remove member', detail: String(err?.message || err) });
  }
});

app.post('/api/projects/:id/transfer-ownership', requireDb, async (req, res) => {
  try {
    const projectId = req.params.id;
    const { actorId: actorIdRaw, newOwnerId: newOwnerIdRaw } = req.body || {};
    if (!actorIdRaw || !newOwnerIdRaw) return res.status(400).json({ error: 'actorId and newOwnerId are required' });

    const project = await Projects.findOne(idQuery(projectId));
    if (!project) return res.status(404).json({ error: 'Project not found' });

    const [actor, newOwner] = await Promise.all([
      Users.findOne(idQuery(actorIdRaw)),
      Users.findOne(idQuery(newOwnerIdRaw)),
    ]);
    if (!actor) return res.status(404).json({ error: 'Actor user not found' });
    if (!newOwner) return res.status(404).json({ error: 'New owner user not found' });

    if (String(project.ownerId) !== String(actor._id)) return res.status(403).json({ error: 'Only the owner can transfer ownership' });

    const members = project.members || [];
    const isMember = members.some((m) => String(m) === String(newOwner._id));
    if (!isMember) return res.status(400).json({ error: 'New owner must be a current project member' });

    // Ensure previous owner remains a member
    const updates = {
      ownerId: toId(newOwner._id),
      updatedAt: new Date(),
    };

    await Projects.updateOne(
      { _id: project._id },
      {
        $set: updates,
        $addToSet: { members: toId(actor._id) },
      }
    );
    const updated = await Projects.findOne({ _id: project._id });
    res.json(sanitizeProject(updated));
  } catch (err) {
    console.error('[PROJECTS] Transfer ownership failed:', err?.message || err);
    res.status(500).json({ error: 'Failed to transfer ownership', detail: String(err?.message || err) });
  }
});

//CHECKINS
app.get('/api/checkins', requireDb, async (req, res) => {
  try {
    const { projectId, userId, limit } = req.query;
    const query = {};
    if (projectId) query.projectId = toId(projectId);
    if (userId) query.userId = toId(userId);

    const cursor = Checkins.find(query).sort({ createdAt: -1 });
    if (limit) cursor.limit(Number(limit) || 0);

    const docs = await cursor.toArray();
    res.json(docs.map(sanitizeCheckin));
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch checkins', detail: String(err?.message || err) });
  }
});

app.post('/api/checkins', requireDb, upload.array('files', 50), async (req, res) => {
  try {
    const body = req.body || {};
    const projectIdRaw = body.projectId;
    const userIdRaw = body.userId;
    const message = normalizeString(body.message);
    const type = normalizeString(body.type) || 'check-in';
    const version = normalizeString(body.version);

    if (!projectIdRaw) return res.status(400).json({ error: 'projectId is required' });
    if (!userIdRaw) return res.status(400).json({ error: 'userId is required' });
    const requiresMessage = (type !== 'check-out');
    if (requiresMessage && !message) return res.status(400).json({ error: 'message is required' });

    const projectId = toId(projectIdRaw);
    const userId = toId(userIdRaw);

    const project = await Projects.findOne(idQuery(projectIdRaw));
    if (!project) return res.status(404).json({ error: 'Project not found' });

    const user = await Users.findOne(idQuery(userIdRaw));
    if (!user) return res.status(404).json({ error: 'User not found' });

    const isOwner = String(project.ownerId) === String(user._id);
    const isMember = isOwner || (project.members || []).some((m) => String(m) === String(user._id));
    if (!isMember) return res.status(403).json({ error: 'Only project members can log activity' });

    // Enforce check-out/in rules
    if (type === 'check-out') {
      if ((project.status || 'checked-in') === 'checked-out') {
        return res.status(409).json({ error: 'Project is already checked out' });
      }
    }
    if (type === 'check-in') {
      if ((project.status || 'checked-in') !== 'checked-out') {
        return res.status(409).json({ error: 'Project is not checked out' });
      }
      if (project.lockedBy && String(project.lockedBy) !== String(user._id)) {
        return res.status(403).json({ error: 'Only the user who checked out can check in' });
      }
    }

    const now = new Date();

    const uploaded = Array.isArray(req.files)
      ? req.files.map((f) => ({ name: f.originalname, url: `/uploads/${f.filename}`, path: path.join('uploads', f.filename), size: f.size, downloadCount: 0 }))
      : [];


    let removeFiles = [];
    if (Array.isArray(body.removeFiles)) {
      removeFiles = body.removeFiles.map((n) => normalizeString(n)).filter(Boolean);
    } else if (typeof body.removeFiles === 'string') {
      try {
        const parsed = JSON.parse(body.removeFiles);
        if (Array.isArray(parsed)) removeFiles = parsed.map((n) => normalizeString(n)).filter(Boolean);
      } catch (_) {}
    }

    const doc = {
      projectId,
      userId,
      message,
      type,
      version: type === 'check-in' ? (version || project.version || null) : (project.version || null),
      files: [...normalizeFiles(body.files), ...uploaded],
      createdAt: now,
      updatedAt: now,
    };

    const { insertedId } = await Checkins.insertOne(doc);

    const updates = { updatedAt: now };
    // Only incr project version on check-in
    if (type === 'check-in' && version) updates.version = version;
    if (type === 'check-out') {
      updates.status = 'checked-out';
      updates.lockedBy = userId;
      updates.lockedAt = now;
    }
    if (type === 'check-in') {
      updates.status = 'checked-in';
      updates.lockedBy = null;
      updates.lockedAt = null;
      const existing = Array.isArray(project.files) ? project.files : [];
      const byName = new Map(existing.map((f) => [f?.name, f]).filter(([k]) => Boolean(k)));

      // removals
      for (const name of removeFiles) {
        const prev = byName.get(name);
        if (prev) {
          try {
            const prevPath = prev.path || '';
            if (prevPath && prevPath.startsWith('uploads')) {
              const absPrev = path.join(__dirname, prevPath);
              if (fs.existsSync(absPrev)) fs.unlink(absPrev, () => {});
            }
          } catch (_) {}
          byName.delete(name);
        }
      }

      // Merge newly uploaded files
      if (Array.isArray(doc.files) && doc.files.length > 0) {
        for (const f of doc.files) {
          if (!f || !f.name) continue;
          const prev = byName.get(f.name);
          const downloadCount = typeof (prev?.downloadCount) === 'number' ? prev.downloadCount : 0;
          try {
            if (prev?.path && f?.path && prev.path !== f.path) {
              const absPrev = path.isAbsolute(prev.path) ? prev.path : path.join(__dirname, prev.path);
              if (absPrev && absPrev.startsWith(UPLOADS_DIR) && fs.existsSync(absPrev)) {
                fs.unlink(absPrev, () => {});
              }
            }
          } catch (_) {}
          byName.set(f.name, { ...f, downloadCount });
        }
      }
      updates.files = Array.from(byName.values()).map((f) => ({
        ...f,
        downloadCount: typeof f.downloadCount === 'number' ? f.downloadCount : 0,
      }));
    }
    await Projects.updateOne({ _id: project._id }, { $set: updates });

    const stored = await Checkins.findOne({ _id: insertedId });
    res.status(201).json(sanitizeCheckin(stored));
  } catch (err) {
    console.error('[CHECKINS] Create failed:', err?.message || err);
    res.status(500).json({ error: 'Failed to create check-in', detail: String(err?.message || err) });
  }
});

// upload proj img
app.post('/api/projects/:id/image', requireDb, multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } }).single('image'), async (req, res) => {
  try {
    const projectId = req.params.id;
    const project = await Projects.findOne(idQuery(projectId));
    if (!project) return res.status(404).json({ error: 'Project not found' });

    if (!req.file) return res.status(400).json({ error: 'Image file is required' });

    const file = req.file;
    const url = `/uploads/${file.filename}`;
    const relPath = path.join('uploads', file.filename);

    try {
      const prevPath = project.imagePath || '';
      if (prevPath && prevPath.startsWith('uploads')) {
        const absPrev = path.join(__dirname, prevPath);
        if (fs.existsSync(absPrev)) fs.unlink(absPrev, () => {});
      }
    } catch (_) {}

    await Projects.updateOne({ _id: project._id }, {
      $set: {
        imageUrl: url,
        imagePath: relPath,
        updatedAt: new Date(),
      }
    });

    const updated = await Projects.findOne({ _id: project._id });
    res.json(sanitizeProject(updated));
  } catch (err) {
    console.error('[PROJECTS] Image upload failed:', err?.message || err);
    const msg = /File too large/.test(String(err)) ? 'Image exceeds 5MB limit' : 'Failed to upload image';
    res.status(500).json({ error: msg, detail: String(err?.message || err) });
  }
});

app.get('/api/projects/:id/files', requireDb, async (req, res) => {
  try {
    const project = await Projects.findOne(idQuery(req.params.id));
    if (!project) return res.status(404).json({ error: 'Project not found' });
    const files = Array.isArray(project.files) ? project.files : [];
    res.json(files);
  } catch (err) {
    res.status(500).json({ error: 'Failed to list files', detail: String(err?.message || err) });
  }
});

app.get('/api/projects/:id/files/:name', requireDb, async (req, res) => {
  try {
    const project = await Projects.findOne(idQuery(req.params.id));
    if (!project) return res.status(404).json({ error: 'Project not found' });
    const name = req.params.name;
    const entry = (project.files || []).find((f) => (f && (f.name === name)));
    if (!entry) return res.status(404).json({ error: 'File not found' });
    let absPath = entry.path && path.isAbsolute(entry.path) ? entry.path : path.join(__dirname, entry.path || '');
    if (!absPath || !fs.existsSync(absPath)) {
      // Fallback to compute from URL if path is absolute from previous runs
      if (entry.url) {
        const rel = entry.url.replace(/^\//, '');
        const tryPath = path.join(__dirname, rel);
        if (fs.existsSync(tryPath)) {
          absPath = tryPath;
        }
      }
    }
    if (!absPath || !fs.existsSync(absPath)) return res.status(404).json({ error: 'File missing on server' });

    await Projects.updateOne(
      { _id: project._id, 'files.name': name },
      { $inc: { 'files.$.downloadCount': 1, downloadCount: 1 }, $set: { updatedAt: new Date() } }
    );

    res.download(absPath, entry.name);
  } catch (err) {
    console.error('[FILES] Download failed:', err?.message || err);
    res.status(500).json({ error: 'Failed to download file', detail: String(err?.message || err) });
  }
});

app.delete('/api/checkins/:id', requireDb, async (req, res) => {
  try {
    const query = idQuery(req.params.id);
    const existing = await Checkins.findOne(query);
    if (!existing) return res.status(404).json({ error: 'Check-in not found' });

    await Checkins.deleteOne({ _id: existing._id });
    res.json({ ok: true, checkin: sanitizeCheckin(existing) });
  } catch (err) {
    console.error('[CHECKINS] Delete failed:', err?.message || err);
    res.status(500).json({ error: 'Failed to delete check-in', detail: String(err?.message || err) });
  }
});

// PROJECT DISCUSSIONS
// Members-only: view and post comments on discussion board

app.get('/api/projects/:id/discussions', requireDb, async (req, res) => {
  try {
    const projectId = req.params.id;
    const userIdRaw = req.query.userId || '';

    const project = await Projects.findOne(idQuery(projectId));
    if (!project) return res.status(404).json({ error: 'Project not found' });

    if (!userIdRaw) return res.status(400).json({ error: 'userId is required' });
    const isOwner = String(project.ownerId) === String(userIdRaw);
    const isMember = isOwner || (project.members || []).some((m) => String(m) === String(userIdRaw));
    if (!isMember) return res.status(403).json({ error: 'Only members can view discussions' });

    const items = await Discussions.find({ projectId: toId(projectId) })
      .sort({ createdAt: 1 })
      .toArray();
    res.json(items.map(sanitizeDiscussion));
  } catch (err) {
    console.error('[DISCUSS] List failed:', err?.message || err);
    res.status(500).json({ error: 'Failed to fetch discussion', detail: String(err?.message || err) });
  }
});

app.post('/api/projects/:id/discussions', requireDb, async (req, res) => {
  try {
    const projectId = req.params.id;
    const { userId, message } = req.body || {};
    if (!userId) return res.status(400).json({ error: 'userId is required' });
    const text = normalizeString(message);
    if (!text) return res.status(400).json({ error: 'message is required' });

    const [project, user] = await Promise.all([
      Projects.findOne(idQuery(projectId)),
      Users.findOne(idQuery(userId)),
    ]);
    if (!project) return res.status(404).json({ error: 'Project not found' });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const isOwner = String(project.ownerId) === String(userId);
    const isMember = isOwner || (project.members || []).some((m) => String(m) === String(userId));
    if (!isMember) return res.status(403).json({ error: 'Only members can post in discussions' });

    const now = new Date();
    const doc = {
      projectId: toId(projectId),
      userId: toId(userId),
      message: text,
      createdAt: now,
      updatedAt: now,
    };
    const { insertedId } = await Discussions.insertOne(doc);
    const stored = await Discussions.findOne({ _id: insertedId });
    res.status(201).json(sanitizeDiscussion(stored));
  } catch (err) {
    console.error('[DISCUSS] Create failed:', err?.message || err);
    res.status(500).json({ error: 'Failed to create discussion post', detail: String(err?.message || err) });
  }
});

app.patch('/api/discussions/:id', requireDb, async (req, res) => {
  try {
    const discId = req.params.id;
    const { userId, message } = req.body || {};
    if (!userId) return res.status(400).json({ error: 'userId is required' });
    const text = normalizeString(message);
    if (!text) return res.status(400).json({ error: 'message is required' });

    const existing = await Discussions.findOne(idQuery(discId));
    if (!existing) return res.status(404).json({ error: 'Discussion not found' });
    const project = await Projects.findOne({ _id: toId(existing.projectId) });
    const isOwner = project && String(project.ownerId) === String(userId);
    const isAuthor = String(existing.userId) === String(userId);
    if (!isOwner && !isAuthor) return res.status(403).json({ error: 'Not allowed to edit this post' });

    await Discussions.updateOne({ _id: existing._id }, { $set: { message: text, updatedAt: new Date() } });
    const stored = await Discussions.findOne({ _id: existing._id });
    res.json(sanitizeDiscussion(stored));
  } catch (err) {
    console.error('[DISCUSS] Update failed:', err?.message || err);
    res.status(500).json({ error: 'Failed to update discussion post', detail: String(err?.message || err) });
  }
});

app.delete('/api/discussions/:id', requireDb, async (req, res) => {
  try {
    const discId = req.params.id;
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ error: 'userId is required' });

    const existing = await Discussions.findOne(idQuery(discId));
    if (!existing) return res.status(404).json({ error: 'Discussion not found' });
    const project = await Projects.findOne({ _id: toId(existing.projectId) });
    const isOwner = project && String(project.ownerId) === String(userId);
    const isAuthor = String(existing.userId) === String(userId);
    if (!isOwner && !isAuthor) return res.status(403).json({ error: 'Not allowed to delete this post' });

    await Discussions.deleteOne({ _id: existing._id });
    res.json({ ok: true, discussion: sanitizeDiscussion(existing) });
  } catch (err) {
    console.error('[DISCUSS] Delete failed:', err?.message || err);
    res.status(500).json({ error: 'Failed to delete discussion post', detail: String(err?.message || err) });
  }
});
//FRIENDS & REQUESTS
app.get('/api/friends/:id', requireDb, async (req, res) => {
  try {
    const userId = req.params.id;
    const user = await Users.findOne(idQuery(userId));
    if (!user) return res.status(404).json({ error: 'User not found' });

    const friendIds = (user.friends || []).map((id) => toId(id));
    if (friendIds.length === 0) return res.json([]);

    const friends = await Users.find({ _id: { $in: friendIds } }).toArray();
    res.json(friends.map(sanitizeUser));
  } catch (err) {
    console.error('[FRIENDS] Fetch failed:', err?.message || err);
    res.status(500).json({ error: 'Failed to fetch friends', detail: String(err?.message || err) });
  }
});

// Unfriend
app.delete('/api/friends', requireDb, async (req, res) => {
  try {
    const userId = req.query.userId || req.body?.userId;
    const targetId = req.query.targetId || req.body?.targetId;
    if (!userId || !targetId) return res.status(400).json({ error: 'userId and targetId are required' });
    if (String(userId) === String(targetId)) return res.status(400).json({ error: 'Cannot unfriend yourself' });

    const [userA, userB] = await Promise.all([
      Users.findOne(idQuery(userId)),
      Users.findOne(idQuery(targetId)),
    ]);
    if (!userA || !userB) return res.status(404).json({ error: 'User not found' });

    await removeFriendship(userId, targetId);

    // Clean up pending friend requests
    await FriendRequests.deleteMany({
      $or: [
        { fromUserId: toId(userId), toUserId: toId(targetId) },
        { fromUserId: toId(targetId), toUserId: toId(userId) },
      ],
    });

    res.json({ ok: true });
  } catch (err) {
    console.error('[FRIENDS] Unfriend failed:', err?.message || err);
    res.status(500).json({ error: 'Failed to unfriend', detail: String(err?.message || err) });
  }
});

//SAVED PROJECTS
app.post('/api/saves', requireDb, async (req, res) => {
  try {
    const { userId, projectId } = req.body || {};
    if (!userId || !projectId) return res.status(400).json({ error: 'userId and projectId are required' });

    const [user, project] = await Promise.all([
      Users.findOne(idQuery(userId)),
      Projects.findOne(idQuery(projectId)),
    ]);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (!project) return res.status(404).json({ error: 'Project not found' });

    const existing = await Saves.findOne({ userId: toId(userId), projectId: toId(projectId) });
    if (existing) return res.json({ ok: true, saved: true });

    const now = new Date();
    await Saves.insertOne({ userId: toId(userId), projectId: toId(projectId), createdAt: now });

    // Log activity: project saved
    try {
      await Checkins.insertOne({
        projectId: toId(projectId),
        userId: toId(userId),
        message: project?.name ? `Saved project "${project.name}"` : 'Saved project',
        type: 'saved-project',
        version: project?.version ?? null,
        files: [],
        createdAt: now,
        updatedAt: now,
      });
    } catch (_) {}

    res.status(201).json({ ok: true, saved: true });
  } catch (err) {
    console.error('[SAVES] Save failed:', err?.message || err);
    res.status(500).json({ error: 'Failed to save project', detail: String(err?.message || err) });
  }
});

app.delete('/api/saves', requireDb, async (req, res) => {
  try {
    const userId = req.query.userId || req.body?.userId;
    const projectId = req.query.projectId || req.body?.projectId;
    if (!userId || !projectId) return res.status(400).json({ error: 'userId and projectId are required' });

    await Saves.deleteOne({ userId: toId(userId), projectId: toId(projectId) });
    res.json({ ok: true, saved: false });
  } catch (err) {
    console.error('[SAVES] Unsave failed:', err?.message || err);
    res.status(500).json({ error: 'Failed to unsave project', detail: String(err?.message || err) });
  }
});

app.get('/api/users/:id/saved-projects', requireDb, async (req, res) => {
  try {
    const userId = req.params.id;
    const docs = await Saves.find({ userId: toId(userId) }).toArray();
    const ids = docs.map((d) => d.projectId).filter(Boolean);
    if (ids.length === 0) return res.json([]);
    const projects = await Projects.find({ _id: { $in: ids.map((i) => toId(i)) } }).sort({ createdAt: -1 }).toArray();
    res.json(projects.map(sanitizeProject));
  } catch (err) {
    console.error('[SAVES] List user saved failed:', err?.message || err);
    res.status(500).json({ error: 'Failed to fetch saved projects', detail: String(err?.message || err) });
  }
});

app.get('/api/saves/check', requireDb, async (req, res) => {
  try {
    const { userId, projectId } = req.query;
    if (!userId || !projectId) return res.status(400).json({ error: 'userId and projectId are required' });
    const existing = await Saves.findOne({ userId: toId(userId), projectId: toId(projectId) });
    res.json({ saved: Boolean(existing) });
  } catch (err) {
    res.status(500).json({ error: 'Failed to check saved', detail: String(err?.message || err) });
  }
});
app.get('/api/friend-requests', requireDb, async (req, res) => {
  try {
    const { userId, direction = 'all', status = 'pending' } = req.query;
    const query = {};
    if (status && status !== 'all') query.status = status;

    if (userId) {
      const id = toId(userId);
      if (direction === 'incoming') query.toUserId = id;
      else if (direction === 'outgoing') query.fromUserId = id;
      else query.$or = [{ toUserId: id }, { fromUserId: id }];
    }

    const docs = await FriendRequests.find(query).sort({ createdAt: -1 }).toArray();
    res.json(docs.map(sanitizeFriendRequest));
  } catch (err) {
    console.error('[FRIENDS] List requests failed:', err?.message || err);
    res.status(500).json({ error: 'Failed to fetch friend requests', detail: String(err?.message || err) });
  }
});

app.post('/api/friend-requests', requireDb, async (req, res) => {
  try {
    const body = req.body || {};
    const fromUserIdRaw = body.fromUserId;
    const toUserIdRaw = body.toUserId;

    if (!fromUserIdRaw || !toUserIdRaw) {
      return res.status(400).json({ error: 'fromUserId and toUserId are required' });
    }

    if (String(fromUserIdRaw) === String(toUserIdRaw)) {
      return res.status(400).json({ error: 'You cannot friend yourself' });
    }

    const fromUser = await Users.findOne(idQuery(fromUserIdRaw));
    const toUser = await Users.findOne(idQuery(toUserIdRaw));
    if (!fromUser || !toUser) return res.status(404).json({ error: 'User not found' });

    const fromFriends = fromUser.friends || [];
    if (fromFriends.some((f) => String(f) === String(toUser._id))) {
      return res.status(409).json({ error: 'Users are already friends' });
    }

    const existing = await FriendRequests.findOne({
      $or: [
        { fromUserId: toId(fromUserIdRaw), toUserId: toId(toUserIdRaw), status: 'pending' },
        { fromUserId: toId(toUserIdRaw), toUserId: toId(fromUserIdRaw), status: 'pending' },
      ],
    });
    if (existing) {
      return res.status(409).json({ error: 'A pending request already exists' });
    }

    const now = new Date();
    const doc = {
      fromUserId: toId(fromUserIdRaw),
      toUserId: toId(toUserIdRaw),
      status: 'pending',
      createdAt: now,
      updatedAt: now,
    };

    const { insertedId } = await FriendRequests.insertOne(doc);
    const stored = await FriendRequests.findOne({ _id: insertedId });
    res.status(201).json(sanitizeFriendRequest(stored));
  } catch (err) {
    console.error('[FRIENDS] Create request failed:', err?.message || err);
    res.status(500).json({ error: 'Failed to create friend request', detail: String(err?.message || err) });
  }
});

app.post('/api/friend-requests/:id/accept', requireDb, async (req, res) => {
  try {
    const request = await FriendRequests.findOne(idQuery(req.params.id));
    if (!request) return res.status(404).json({ error: 'Request not found' });
    if (request.status !== 'pending') {
      return res.status(409).json({ error: `Request already ${request.status}` });
    }

    await addFriendship(request.fromUserId, request.toUserId);
    const update = {
      status: 'accepted',
      updatedAt: new Date(),
    };
    await FriendRequests.updateOne({ _id: request._id }, { $set: update });
    const stored = await FriendRequests.findOne({ _id: request._id });
    res.json(sanitizeFriendRequest(stored));
  } catch (err) {
    console.error('[FRIENDS] Accept request failed:', err?.message || err);
    res.status(500).json({ error: 'Failed to accept friend request', detail: String(err?.message || err) });
  }
});

app.post('/api/friend-requests/:id/decline', requireDb, async (req, res) => {
  try {
    const request = await FriendRequests.findOne(idQuery(req.params.id));
    if (!request) return res.status(404).json({ error: 'Request not found' });
    if (request.status !== 'pending') {
      return res.status(409).json({ error: `Request already ${request.status}` });
    }

    const update = {
      status: 'declined',
      updatedAt: new Date(),
    };
    await FriendRequests.updateOne({ _id: request._id }, { $set: update });
    const stored = await FriendRequests.findOne({ _id: request._id });
    res.json(sanitizeFriendRequest(stored));
  } catch (err) {
    console.error('[FRIENDS] Decline request failed:', err?.message || err);
    res.status(500).json({ error: 'Failed to decline friend request', detail: String(err?.message || err) });
  }
});

//ACTIVITY FEEDS
app.get('/api/feed', requireDb, async (req, res) => {
  try {
    const { userId, scope = 'global', limit = 25, sort = 'time' } = req.query;
    const take = Math.min(Number(limit) || 25, 100);

    let filter = {};

    if (scope === 'local') {
      if (!userId) {
        // No viewer specified: empty local feed
        return res.json([]);
      }

      const viewer = await Users.findOne(idQuery(userId));
      if (!viewer) {
        // Unknown viewer: empty local feed
        return res.json([]);
      }

      const friendIds = (viewer.friends || []).map((id) => toId(id));
      const projectDocs = await Projects.find({
        $or: [
          { ownerId: toId(userId) },
          { members: { $in: [toId(userId)] } },
        ],
      }).project({ _id: 1 }).toArray();

      const projectIdList = projectDocs.map((doc) => doc._id);

      filter = {
        $or: [
          { userId: { $in: [toId(userId), ...friendIds] } },
          { projectId: { $in: projectIdList } },
        ],
      };
    }

    const activities = await Checkins.find(filter)
      .sort({ createdAt: -1 })
      .limit(take)
      .toArray();

    const projectIds = Array.from(new Set(activities.map((act) => act.projectId).filter(Boolean)));
    const userIds = Array.from(new Set(activities.map((act) => act.userId).filter(Boolean)));

    const [projects, users] = await Promise.all([
      projectIds.length
        ? Projects.find({ _id: { $in: projectIds.map((id) => toId(id)) } }).toArray()
        : Promise.resolve([]),
      userIds.length
        ? Users.find({ _id: { $in: userIds.map((id) => toId(id)) } }).toArray()
        : Promise.resolve([]),
    ]);

    const projectMap = new Map(projects.map((doc) => [doc._id.toString(), sanitizeProject(doc)]));
    const userMap = new Map(users.map((doc) => [doc._id.toString(), sanitizeUser(doc)]));

    let feed = activities.map((act) => {
      const payload = sanitizeCheckin(act);
      return {
        ...payload,
        project: projectMap.get(payload.projectId) || null,
        user: userMap.get(payload.userId) || null,
      };
    });

    if (String(sort).toLowerCase() === 'popular') {
      feed.sort((a, b) => {
        const ap = a.project?.downloadCount || 0;
        const bp = b.project?.downloadCount || 0;
        if (bp !== ap) return bp - ap;
        const at = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bt = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return bt - at;
      });
    }

    res.json(feed);
  } catch (err) {
    console.error('[FEED] Fetch failed:', err?.message || err);
    res.status(500).json({ error: 'Failed to load feed', detail: String(err?.message || err) });
  }
});

app.get('/api/search', requireDb, async (req, res) => {
  try {
    const { q = '', type = 'all', limit = 20 } = req.query;
    const text = q.toString().trim();
    const take = Math.min(Number(limit) || 20, 50);

    const responses = {};

    const includeUsers = type === 'all' || type === 'users';
    const includeProjects = type === 'all' || type === 'projects';
    const includeCheckins = type === 'all' || type === 'checkins';

    const regex = text ? buildRegex(text) : null;

    if (includeUsers) {
      const userQuery = text
        ? {
            $or: [
              { name: { $regex: regex } },
              { username: { $regex: regex } },
              { email: { $regex: regex } },
            ],
          }
        : {};
      const users = await Users.find(userQuery).limit(take).toArray();
      responses.users = users.map(sanitizeUser);
    }

    if (includeProjects) {
      const projectQuery = text
        ? {
            $or: [
              { name: { $regex: regex } },
              { description: { $regex: regex } },
              { hashtags: { $elemMatch: { $regex: regex } } },
            ],
          }
        : {};
      const projects = await Projects.find(projectQuery).limit(take).toArray();
      responses.projects = projects.map(sanitizeProject);
    }

    if (includeCheckins) {
      const checkinQuery = text
        ? {
            $or: [
              { message: { $regex: regex } },
              { type: { $regex: regex } },
              { version: { $regex: regex } },
            ],
          }
        : {};
      const checkins = await Checkins.find(checkinQuery)
        .sort({ createdAt: -1 })
        .limit(take)
        .toArray();

      const projectIds = Array.from(new Set(checkins.map((act) => act.projectId).filter(Boolean)));
      const userIds = Array.from(new Set(checkins.map((act) => act.userId).filter(Boolean)));

      const [projects, users] = await Promise.all([
        projectIds.length
          ? Projects.find({ _id: { $in: projectIds.map((id) => toId(id)) } }).toArray()
          : Promise.resolve([]),
        userIds.length
          ? Users.find({ _id: { $in: userIds.map((id) => toId(id)) } }).toArray()
          : Promise.resolve([]),
      ]);

      const projectMap = new Map(projects.map((doc) => [doc._id.toString(), sanitizeProject(doc)]));
      const userMap = new Map(users.map((doc) => [doc._id.toString(), sanitizeUser(doc)]));

      responses.checkins = checkins.map((doc) => {
        const payload = sanitizeCheckin(doc);
        return {
          ...payload,
          project: projectMap.get(payload.projectId) || null,
          user: userMap.get(payload.userId) || null,
        };
      });
    }

    res.json(responses);
  } catch (err) {
    console.error('[SEARCH] Failed:', err?.message || err);
    res.status(500).json({ error: 'Search failed', detail: String(err?.message || err) });
  }
});

//AUTH
app.post('/api/auth/signup', requireDb, async (req, res) => {
  try {
    const body = req.body || {};
    const name = (body.name || '').toString().trim();
    const username = (body.username || '').toString().trim();
    const email = (body.email || '').toString().trim().toLowerCase();
    const password = (body.password || '').toString();

    if (!name || !username || !email || !password) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const existing = await Users.findOne({ $or: [{ email }, { username }] });
    if (existing) {
      const field = existing.email === email ? 'email' : 'username';
      return res.status(409).json({ error: `That ${field} is already in use` });
    }

    const now = new Date();
    const newUser = {
      name,
      username,
      email,
      password,
      bio: body.bio ?? '',
      avatarUrl: body.avatarUrl ?? '',
      friends: [],
      createdAt: now,
      updatedAt: now,
      roles: ['user'],
    };

    const { insertedId } = await Users.insertOne(newUser);
    const safeUser = {
      _id: insertedId.toString(),
      name,
      username,
      email,
      bio: newUser.bio,
      avatarUrl: newUser.avatarUrl,
      friends: newUser.friends,
      createdAt: now,
      updatedAt: now,
      roles: newUser.roles,
    };

    res.status(201).json({ user: safeUser, token: null });
  } catch (err) {
    console.error('[AUTH] Signup failed:', err?.message || err);
    res.status(500).json({ error: 'Signup failed', detail: String(err?.message || err) });
  }
});

app.post('/api/auth/login', requireDb, async (req, res) => {
  try {
    const body = req.body || {};
    const raw = (body.login ?? body.username ?? body.email ?? '').toString().trim();
    const password = (body.password ?? '').toString();

    console.log('[AUTH] POST /api/auth/login body=', { login: raw, hasPassword: Boolean(password) });

    if (!raw || !password) {
      return res.status(400).json({ error: 'Missing login or password' });
    }

    const or = [{ username: raw }, { email: raw }];
    if (isHex24(raw)) or.push({ _id: new ObjectId(raw) });

    const user = await Users.findOne({ $or: or });
    if (!user) {
      console.log('[AUTH] No user matched', { tried: or });
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const stored = user.password ?? user.passwordHash;
    if (!stored) {
      return res.status(401).json({ error: 'Account has no password set. Please contact support.' });
    }
    if (stored !== password) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const { password: _pw, passwordHash: _hash, ...rest } = user;
    const safeUser = { ...rest, _id: user._id?.toString?.() ?? user._id };


    res.json({ user: safeUser, token: null });
  } catch (err) {
    console.error('[AUTH] Login failed:', err?.message || err);
    res.status(500).json({ error: 'Login failed', detail: String(err?.message || err) });
  }
});

app.post('/api/auth/logout', (_req, res) => {
  res.json({ ok: true });
});

// 404
app.use((req, res, next) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: 'Route not found', path: req.path });
  }
  next();
});

app.get('*', (req, res, next) => {
  if (req.method !== 'GET') return next();
  res.sendFile(path.join(STATIC_DIR, 'index.html'));
});

app.use((req, res) => res.status(404).json({ error: 'Route not found', path: req.path }));

// HTTP, then connect DB

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
  console.log(`[API] http://localhost:${PORT}`);
  connectDb();
});

async function connectDb() {
  try {
    client = new MongoClient(ATLAS_URI, { serverSelectionTimeoutMS: 8000 });
    await client.connect();
    db = client.db(DB_NAME);

    Users          = db.collection(COLLECTIONS.users);
    Projects       = db.collection(COLLECTIONS.projects);
    Checkins       = db.collection(COLLECTIONS.checkins);
    FriendRequests = db.collection(COLLECTIONS.friendRequests);
    Discussions    = db.collection(COLLECTIONS.discussions);
    Saves          = db.collection(COLLECTIONS.saves);

    dbConnected = true;
    dbError = null;
    console.log(`[DB] Connected to "${DB_NAME}"`);
  } catch (err) {
    dbConnected = false;
    dbError = err;
    console.error('[DB] Connection failed:', err?.message || err);
    setTimeout(connectDb, 8000); 
  }
}
