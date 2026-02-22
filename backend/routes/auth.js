/**
 * routes/auth.js — /api/auth/*
 */

const router  = require('express').Router();
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const db      = require('../database');
const { JWT_SECRET } = require('../middleware/auth');

/* ── POST /api/auth/signup ── */
router.post('/signup', (req, res) => {
  const { username, email, password } = req.body || {};

  if (!username || !email || !password)
    return res.status(400).json({ error: 'username, email, and password are required' });

  if (password.length < 6)
    return res.status(400).json({ error: 'Password must be at least 6 characters' });

  const emailRx = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRx.test(email))
    return res.status(400).json({ error: 'Invalid email address' });

  const hash = bcrypt.hashSync(password, 10);
  try {
    const stmt = db.prepare(`
      INSERT INTO users (username, email, password, role)
      VALUES (?, ?, ?, 'user')
    `);
    const info = stmt.run(username.trim(), email.trim().toLowerCase(), hash);
    const user = db.prepare('SELECT id, username, email, role, created_at FROM users WHERE id = ?')
                   .get(info.lastInsertRowid);
    const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ user, token });
  } catch (err) {
    if (err.message.includes('UNIQUE')) {
      const field = err.message.includes('username') ? 'Username' : 'Email';
      return res.status(409).json({ error: `${field} is already taken` });
    }
    throw err;
  }
});

/* ── POST /api/auth/login ── */
router.post('/login', (req, res) => {
  const { login, password } = req.body || {};   // login = email OR username
  if (!login || !password)
    return res.status(400).json({ error: 'login and password are required' });

  const user = db.prepare(`
    SELECT * FROM users WHERE email = ? OR username = ? COLLATE NOCASE LIMIT 1
  `).get(login.trim(), login.trim());

  if (!user || !bcrypt.compareSync(password, user.password))
    return res.status(401).json({ error: 'Invalid credentials' });

  const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
  const { password: _pw, ...safe } = user;
  res.json({ user: safe, token });
});

/* ── GET /api/auth/me ── */
const { requireAuth } = require('../middleware/auth');
router.get('/me', requireAuth, (req, res) => {
  const user = db.prepare('SELECT id, username, email, role, created_at FROM users WHERE id = ?')
                 .get(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(user);
});

module.exports = router;
