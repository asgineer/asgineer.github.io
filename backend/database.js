/**
 * database.js — SQLite schema initialisation + seed admin user
 */

const Database = require('better-sqlite3');
const bcrypt   = require('bcryptjs');
const path     = require('path');

// On Render: set DB_PATH=/var/data/asgineer.db and mount a Disk at /var/data
const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'data', 'asgineer.db');

// Ensure the directory exists
const fs = require('fs');
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const db = new Database(DB_PATH);

// Enable WAL mode for better concurrent read performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

/* ────────── Schema ────────── */
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    username    TEXT    NOT NULL UNIQUE COLLATE NOCASE,
    email       TEXT    NOT NULL UNIQUE COLLATE NOCASE,
    password    TEXT    NOT NULL,
    role        TEXT    NOT NULL DEFAULT 'user'   CHECK(role IN ('admin','author','user')),
    created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS posts (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    title       TEXT    NOT NULL,
    slug        TEXT    NOT NULL UNIQUE,
    excerpt     TEXT,
    body        TEXT    NOT NULL,
    category    TEXT    NOT NULL DEFAULT 'technical' CHECK(category IN ('technical','travel','diy','general')),
    cover_emoji TEXT    NOT NULL DEFAULT '📝',
    author_id   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    published   INTEGER NOT NULL DEFAULT 1,
    created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
    updated_at  TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS comments (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    post_id     INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    body        TEXT    NOT NULL,
    created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS likes (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    post_id     INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(post_id, user_id)
  );

  CREATE INDEX IF NOT EXISTS idx_posts_author   ON posts(author_id);
  CREATE INDEX IF NOT EXISTS idx_posts_category ON posts(category);
  CREATE INDEX IF NOT EXISTS idx_comments_post  ON comments(post_id);
  CREATE INDEX IF NOT EXISTS idx_likes_post     ON likes(post_id);
`);

/* ────────── Seed admin ────────── */
const adminExists = db.prepare("SELECT id FROM users WHERE role = 'admin' LIMIT 1").get();
if (!adminExists) {
  const hash = bcrypt.hashSync('Admin123!', 10);
  db.prepare(`
    INSERT INTO users (username, email, password, role)
    VALUES (?, ?, ?, 'admin')
  `).run('admin', 'admin@asgineer.dev', hash);
  console.log('[DB] Seeded admin user  →  admin@asgineer.dev  /  Admin123!');
}

module.exports = db;
