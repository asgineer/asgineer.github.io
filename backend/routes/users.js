/**
 * routes/users.js — /api/users/*  (admin operations)
 */

const router = require('express').Router();
const db     = require('../database');
const { requireAuth, requireRole } = require('../middleware/auth');

/* ── GET /api/users  (admin only) ── */
router.get('/', requireAuth, requireRole('admin'), (req, res) => {
  const users = db.prepare(`
    SELECT id, username, email, role, created_at FROM users ORDER BY created_at DESC
  `).all();
  res.json(users);
});

/* ── PATCH /api/users/:id/role  (admin only) ── */
router.patch('/:id/role', requireAuth, requireRole('admin'), (req, res) => {
  const { role } = req.body || {};
  if (!['admin', 'author', 'user'].includes(role))
    return res.status(400).json({ error: 'role must be admin, author, or user' });

  // Prevent demoting yourself
  if (parseInt(req.params.id) === req.user.id && role !== 'admin')
    return res.status(400).json({ error: 'Cannot change your own admin role' });

  const info = db.prepare('UPDATE users SET role = ? WHERE id = ?')
                 .run(role, req.params.id);
  if (info.changes === 0) return res.status(404).json({ error: 'User not found' });

  const user = db.prepare('SELECT id, username, email, role, created_at FROM users WHERE id = ?')
                 .get(req.params.id);
  res.json(user);
});

/* ── DELETE /api/users/:id  (admin only) ── */
router.delete('/:id', requireAuth, requireRole('admin'), (req, res) => {
  if (parseInt(req.params.id) === req.user.id)
    return res.status(400).json({ error: 'Cannot delete your own account' });

  const info = db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
  if (info.changes === 0) return res.status(404).json({ error: 'User not found' });
  res.json({ ok: true });
});

module.exports = router;
