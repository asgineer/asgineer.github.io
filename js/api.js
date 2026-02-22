/**
 * js/api.js — thin fetch wrapper around the asgineer backend
 *
 * Usage (from any page):
 *   import { api } from './api.js';           // or load as plain <script>
 *   const { user, token } = await api.post('/auth/login', { login, password });
 */

// ⚠️  After deploying the backend to Render, replace the production URL below.
const API_BASE = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
  ? 'http://localhost:3001/api'
  : 'https://asgineer-backend.onrender.com/api';  // ← update this after Render deploy

const api = {
  /* ── token helpers ── */
  getToken()        { return localStorage.getItem('token'); },
  getUser()         { const u = localStorage.getItem('user'); return u ? JSON.parse(u) : null; },
  isLoggedIn()      { return !!this.getToken(); },
  hasRole(...roles) { const u = this.getUser(); return u && roles.includes(u.role); },

  saveSession(user, token) {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
  },
  clearSession() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },

  /* ── request ── */
  async request(method, path, body, opts = {}) {
    const headers = { 'Content-Type': 'application/json' };
    const token = this.getToken();
    if (token) headers['Authorization'] = 'Bearer ' + token;
    Object.assign(headers, opts.headers || {});

    const res = await fetch(API_BASE + path, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw Object.assign(new Error(data.error || 'Request failed'), { status: res.status });
    return data;
  },

  get   (path, opts)       { return this.request('GET',    path, undefined, opts); },
  post  (path, body, opts) { return this.request('POST',   path, body, opts); },
  put   (path, body, opts) { return this.request('PUT',    path, body, opts); },
  patch (path, body, opts) { return this.request('PATCH',  path, body, opts); },
  del   (path, opts)       { return this.request('DELETE', path, undefined, opts); },

  /* ── auth shortcuts ── */
  async login(login, password) {
    const data = await this.post('/auth/login', { login, password });
    this.saveSession(data.user, data.token);
    return data;
  },
  async signup(username, email, password) {
    const data = await this.post('/auth/signup', { username, email, password });
    this.saveSession(data.user, data.token);
    return data;
  },
  logout() {
    this.clearSession();
    window.location.href = resolveRoot('index.html');
  },

  /* ── image upload (multipart) ── */
  async uploadImage(file) {
    const fd = new FormData();
    fd.append('image', file);
    const headers = {};
    const token = this.getToken();
    if (token) headers['Authorization'] = 'Bearer ' + token;
    const res = await fetch(API_BASE + '/posts/upload-image', { method: 'POST', headers, body: fd });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Upload failed');
    return data.url;   // relative path e.g. /uploads/xyz.jpg
  }
};

/** resolveRoot: returns relative path to root from the current page depth */
function resolveRoot(page) {
  const parts = window.location.pathname.split('/').filter(Boolean);
  // on GitHub Pages the repo name is part of the path; detect by checking hostname
  const inSubdir = document.currentScript
    ? new URL(document.currentScript.src).pathname.includes('/js/')
    : false;
  // simple heuristic: posts/ subdir
  const depth = window.location.pathname.endsWith('/posts/') ||
                window.location.pathname.split('/').slice(-2,-1)[0] === 'posts' ? 1 : 0;
  return depth ? '../' + page : page;
}

window.api          = api;
window.resolveRoot  = resolveRoot;
