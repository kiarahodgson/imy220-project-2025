import { Router } from 'express';
const router = Router();

router.post('/signup', (req, res) => {
  const { email, password, name } = req.body || {};
  const user = { id: 'u_' + Math.random().toString(36).slice(2,9), email, name: name || 'New User' };
  const token = 'fake.jwt.' + Math.random().toString(36).slice(2,8);
  res.status(201).json({ message: 'Signed up', user, token });
});

router.post('/signin', (req, res) => {
  const { email } = req.body || {};
  const user = { id: 'u_demo', email: email || 'demo@example.com', name: 'Demo User' };
  const token = 'fake.jwt.demo';
  res.json({ message: 'Signed in', user, token });
});

export default router;
