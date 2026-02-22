/**
 * server.js — asgineer.github.io backend
 *
 * Usage:
 *   cd backend && npm install && npm start
 *   (or npm run dev  for auto-reload with nodemon)
 *
 * API base: http://localhost:3001/api
 */

const express  = require('express');
const cors     = require('cors');
const path     = require('path');

// Trigger DB init + seed
require('./database');

const app  = express();
const PORT = process.env.PORT || 3001;

/* ── Allowed origins ── */
const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:5500',
  'http://127.0.0.1:5500',
  'http://localhost',
  'https://asgineer.github.io',     // GitHub Pages
  process.env.EXTRA_ORIGIN,          // set on Render if needed
].filter(Boolean);

/* ── Middleware ── */
app.use(cors({
  origin: (origin, cb) => {
    // allow requests with no origin (curl, Postman, same-origin)
    if (!origin || ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
    cb(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve uploaded images
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

/* ── Routes ── */
app.use('/api/auth',  require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/posts', require('./routes/posts'));

// Comments are nested under posts
const commentsRouter = require('./routes/comments');
app.use('/api/posts/:id/comments', commentsRouter);

/* ── Health check ── */
app.get('/api/health', (req, res) => res.json({ ok: true, time: new Date().toISOString() }));

/* ── Global error handler ── */
app.use((err, req, res, _next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`\n🚀  asgineer backend running on http://localhost:${PORT}`);
  console.log(`   API docs: GET http://localhost:${PORT}/api/health\n`);
});
