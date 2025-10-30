const { Router } = require('express');
const router = Router();

router.post('/signup', (req, res) => {
  const { email, password, name, username } = req.body || {};
  const safeName = (name || username || 'New User').toString();
  const safeEmail = (email || 'demo@example.com').toString();

  const user = {
    _id: 'u_' + Math.random().toString(36).slice(2, 10),
    name: safeName,
    username: username || safeName.toLowerCase().replace(/\s+/g, ''),
    email: safeEmail,
    bio: '',
    friends: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const token = 'fake.jwt.' + Math.random().toString(36).slice(2, 12);
  res.status(201).json({ message: 'Signed up', user, token });
});

router.post('/login', (req, res) => {
  const { login } = req.body || {};
  const handle = (login || 'demo').toString();

  const user = {
    _id: 'u_demo',
    name: handle,
    username: handle,
    email: handle.includes('@') ? handle : `${handle}@example.com`,
    bio: 'Demo account',
    friends: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const token = 'fake.jwt.demo';
  res.json({ message: 'Signed in', user, token });
});

router.post('/logout', (_req, res) => {
  res.json({ message: 'Logged out' });
});

module.exports = router;
