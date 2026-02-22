/**
 * routes/comments.js — /api/posts/:id/comments
 */

const router = require('express').Router({ mergeParams: true });
const db     = require('../database');
const { requireAuth, requireRole } = require('../middleware/auth');

/* ── GET /api/posts/:id/comments  (public) ── */
router.get('/', (req, res) => {
  const comments = db.prepare(`
    SELECT c.id, c.body, c.created_at,
           u.id AS user_id, u.username, u.role AS user_role
    FROM comments c
    JOIN users u ON u.id = c.user_id
    WHERE c.post_id = ?
    ORDER BY c.created_at ASC
  `).all(req.params.id);
  res.json(comments);
});

/* ── POST /api/posts/:id/comments  (any logged-in user) ── */
router.post('/', requireAuth, (req, res) => {
  const { body } = req.body || {};
  if (!body || !body.trim()) return res.status(400).json({ error: 'Comment body is required' });

  const post = db.prepare('SELECT id FROM posts WHERE id = ? AND published = 1').get(req.params.id);
  if (!post) return res.status(404).json({ error: 'Post not found' });

  const info = db.prepare(`
    INSERT INTO comments (post_id, user_id, body) VALUES (?, ?, ?)
  `).run(req.params.id, req.user.id, body.trim());

  const comment = db.prepare(`
    SELECT c.id, c.body, c.created_at,
           u.id AS user_id, u.username, u.role AS user_role
    FROM comments c JOIN users u ON u.id = c.user_id
    WHERE c.id = ?
  `).get(info.lastInsertRowid);
  res.status(201).json(comment);
});

/* ── DELETE /api/posts/:id/comments/:cid  (own comment | admin) ── */
router.delete('/:cid', requireAuth, (req, res) => {
  const comment = db.prepare('SELECT * FROM comments WHERE id = ?').get(req.params.cid);
  if (!comment) return res.status(404).json({ error: 'Comment not found' });
  if (req.user.role !== 'admin' && comment.user_id !== req.user.id)
    return res.status(403).json({ error: 'Not your comment' });
  db.prepare('DELETE FROM comments WHERE id = ?').run(req.params.cid);
  res.json({ ok: true });
});

module.exports = router;
