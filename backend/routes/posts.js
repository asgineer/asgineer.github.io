/**
 * routes/posts.js — /api/posts/*
 */

const router = require('express').Router();
const db     = require('../database');
const { requireAuth, requireRole } = require('../middleware/auth');
const multer = require('multer');
const path   = require('path');
const fs     = require('fs');

/* ── Image upload (stored in /public/uploads) ── */
const uploadDir = path.join(__dirname, '..', '..', 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (req, file, cb) => {
    const ext  = path.extname(file.originalname);
    const name = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
    cb(null, name);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },  // 5 MB
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image files are allowed'));
    }
    cb(null, true);
  }
});

/* ── Slug helper ── */
function slugify(str) {
  return str.toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 80);
}
function uniqueSlug(base) {
  let slug = slugify(base), n = 1;
  while (db.prepare('SELECT id FROM posts WHERE slug = ?').get(slug)) {
    slug = `${slugify(base)}-${n++}`;
  }
  return slug;
}

/* ── GET /api/posts  (public) ── */
router.get('/', (req, res) => {
  const { cat, author, page = 1, limit = 20 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);
  let where = 'WHERE p.published = 1';
  const params = [];
  if (cat)    { where += ' AND p.category = ?';   params.push(cat); }
  if (author) { where += ' AND u.username = ? COLLATE NOCASE'; params.push(author); }

  const posts = db.prepare(`
    SELECT
      p.id, p.title, p.slug, p.excerpt, p.category, p.cover_emoji, p.created_at,
      u.id AS author_id, u.username AS author,
      (SELECT COUNT(*) FROM likes    l WHERE l.post_id = p.id) AS likes,
      (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id) AS comments
    FROM posts p
    JOIN users u ON u.id = p.author_id
    ${where}
    ORDER BY p.created_at DESC
    LIMIT ? OFFSET ?
  `).all(...params, parseInt(limit), offset);

  const { total } = db.prepare(`
    SELECT COUNT(*) AS total FROM posts p
    JOIN users u ON u.id = p.author_id ${where}
  `).get(...params);

  res.json({ posts, total, page: parseInt(page), limit: parseInt(limit) });
});

/* ── GET /api/posts/:slug  (public) ── */
router.get('/:slug', (req, res) => {
  const post = db.prepare(`
    SELECT
      p.*,
      u.id AS author_id, u.username AS author, u.role AS author_role,
      (SELECT COUNT(*) FROM likes    l WHERE l.post_id = p.id) AS likes,
      (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id) AS comment_count
    FROM posts p
    JOIN users u ON u.id = p.author_id
    WHERE p.slug = ? AND p.published = 1
  `).get(req.params.slug);
  if (!post) return res.status(404).json({ error: 'Post not found' });
  res.json(post);
});

/* ── POST /api/posts  (author | admin) ── */
router.post('/', requireAuth, requireRole('author', 'admin'), (req, res) => {
  const { title, excerpt = '', body, category = 'technical', cover_emoji = '📝', published = 1 } = req.body || {};
  if (!title || !body) return res.status(400).json({ error: 'title and body are required' });
  if (!['technical','travel','diy','general'].includes(category))
    return res.status(400).json({ error: 'Invalid category' });

  const slug = uniqueSlug(title);
  const info = db.prepare(`
    INSERT INTO posts (title, slug, excerpt, body, category, cover_emoji, author_id, published)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(title, slug, excerpt, body, category, cover_emoji, req.user.id, published ? 1 : 0);

  const post = db.prepare('SELECT * FROM posts WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json(post);
});

/* ── PUT /api/posts/:id  (own post's author | admin) ── */
router.put('/:id', requireAuth, requireRole('author', 'admin'), (req, res) => {
  const existing = db.prepare('SELECT * FROM posts WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Post not found' });
  if (req.user.role !== 'admin' && existing.author_id !== req.user.id)
    return res.status(403).json({ error: 'Not your post' });

  const { title, excerpt, body, category, cover_emoji, published } = req.body || {};
  const newTitle = title    ?? existing.title;
  const newSlug  = (title && title !== existing.title) ? uniqueSlug(title) : existing.slug;

  db.prepare(`
    UPDATE posts SET
      title = ?, slug = ?, excerpt = ?, body = ?, category = ?,
      cover_emoji = ?, published = ?, updated_at = datetime('now')
    WHERE id = ?
  `).run(
    newTitle, newSlug,
    excerpt     ?? existing.excerpt,
    body        ?? existing.body,
    category    ?? existing.category,
    cover_emoji ?? existing.cover_emoji,
    published !== undefined ? (published ? 1 : 0) : existing.published,
    req.params.id
  );
  res.json(db.prepare('SELECT * FROM posts WHERE id = ?').get(req.params.id));
});

/* ── DELETE /api/posts/:id  (own post's author | admin) ── */
router.delete('/:id', requireAuth, (req, res) => {
  const post = db.prepare('SELECT * FROM posts WHERE id = ?').get(req.params.id);
  if (!post) return res.status(404).json({ error: 'Post not found' });
  if (req.user.role !== 'admin' && post.author_id !== req.user.id)
    return res.status(403).json({ error: 'Not your post' });
  db.prepare('DELETE FROM posts WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

/* ── POST /api/posts/:id/like  (auth) ── */
router.post('/:id/like', requireAuth, (req, res) => {
  const post = db.prepare('SELECT id FROM posts WHERE id = ? AND published = 1').get(req.params.id);
  if (!post) return res.status(404).json({ error: 'Post not found' });
  try {
    db.prepare('INSERT INTO likes (post_id, user_id) VALUES (?, ?)').run(req.params.id, req.user.id);
    const { count } = db.prepare('SELECT COUNT(*) AS count FROM likes WHERE post_id = ?').get(req.params.id);
    res.json({ liked: true, count });
  } catch {
    db.prepare('DELETE FROM likes WHERE post_id = ? AND user_id = ?').run(req.params.id, req.user.id);
    const { count } = db.prepare('SELECT COUNT(*) AS count FROM likes WHERE post_id = ?').get(req.params.id);
    res.json({ liked: false, count });
  }
});

/* ── GET /api/posts/:id/like  — check if current user liked ── */
router.get('/:id/like', requireAuth, (req, res) => {
  const liked = !!db.prepare('SELECT id FROM likes WHERE post_id = ? AND user_id = ?')
                    .get(req.params.id, req.user.id);
  const { count } = db.prepare('SELECT COUNT(*) AS count FROM likes WHERE post_id = ?').get(req.params.id);
  res.json({ liked, count });
});

/* ── POST /api/posts/upload-image  (author | admin) ── */
router.post('/upload-image', requireAuth, requireRole('author', 'admin'), upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No image uploaded' });
  res.json({ url: `/uploads/${req.file.filename}` });
});

module.exports = router;
