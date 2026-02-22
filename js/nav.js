/* nav.js – injects shared navigation & footer, auth-aware */
(function () {
  // Detect if we're one level deep (e.g., inside posts/)
  const isSubdir = document.currentScript
    ? document.currentScript.src.includes('posts/')
    : window.location.pathname.split('/').slice(-2, -1)[0] === 'posts';
  const base = isSubdir ? '../' : '';

  // Read auth state directly from localStorage so nav.js has no dependency on api.js
  function getNavUser() {
    try { return JSON.parse(localStorage.getItem('user')); } catch { return null; }
  }
  function navClearSession() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }

  const user = getNavUser();

  // Build auth nav items
  function buildAuthItems() {
    if (!user) {
      return `
        <li class="nav-item"><a href="${base}login.html">Login</a></li>
        <li class="nav-item"><a href="${base}signup.html" class="btn btn-primary" style="padding:.35rem .9rem">Sign Up</a></li>`;
    }
    const isAuthor = user.role === 'author' || user.role === 'admin';
    const isAdmin  = user.role === 'admin';
    return `
      ${isAuthor ? `<li class="nav-item"><a href="${base}new-post.html">✍️ New Post</a></li>` : ''}
      ${isAdmin  ? `<li class="nav-item"><a href="${base}admin.html">⚙️ Admin</a></li>` : ''}
      <li class="nav-item has-dropdown">
        <a href="#">👤 ${escHtml(user.username)} <span class="caret">▼</span></a>
        <ul class="dropdown">
          ${isAdmin ? `<li><a href="${base}admin.html">Admin Panel</a></li>` : ''}
          <li><a href="#" id="nav-logout-btn">Logout</a></li>
        </ul>
      </li>`;
  }

  function escHtml(s) {
    return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  const NAV_HTML = `
<nav class="navbar">
  <div class="container">
    <a href="${base}index.html" class="nav-brand">as<span>gineer</span></a>
    <ul class="nav-menu">
      <li class="nav-item has-dropdown">
        <a href="${base}index.html">Home <span class="caret">▼</span></a>
        <ul class="dropdown">
          <li><a href="${base}index.html#about">About Me</a></li>
          <li><a href="${base}resume.html">Resume</a></li>
          <li><a href="${base}portfolio.html">Portfolio</a></li>
        </ul>
      </li>
      <li class="nav-item has-dropdown">
        <a href="${base}blog.html">Blog <span class="caret">▼</span></a>
        <ul class="dropdown">
          <li><a href="${base}blog.html">All Posts</a></li>
          <li><a href="${base}blog.html?cat=technical">Technical</a></li>
          <li><a href="${base}blog.html?cat=travel">Travel</a></li>
          <li><a href="${base}blog.html?cat=diy">DIY</a></li>
        </ul>
      </li>
      ${buildAuthItems()}
    </ul>
    <button class="hamburger" aria-label="Toggle menu">
      <span></span><span></span><span></span>
    </button>
  </div>
</nav>`;

  const FOOTER_HTML = `
<footer>
  <div class="container">
    <div class="footer-grid">
      <div>
        <div class="footer-brand">as<span>gineer</span></div>
        <p class="footer-desc">Engineer, maker &amp; explorer. Writing about technology, adventures, and hands-on projects.</p>
        <div class="social-row">
          <a href="https://github.com/asgineer" target="_blank" rel="noopener" title="GitHub">GH</a>
          <a href="https://linkedin.com/in/asgineer" target="_blank" rel="noopener" title="LinkedIn">in</a>
          <a href="mailto:hello@asgineer.dev" title="Email">@</a>
        </div>
      </div>
      <div>
        <div class="footer-heading">Navigation</div>
        <ul>
          <li><a href="${base}index.html#about">About Me</a></li>
          <li><a href="${base}resume.html">Resume</a></li>
          <li><a href="${base}portfolio.html">Portfolio</a></li>
          <li><a href="${base}blog.html">Blog</a></li>
        </ul>
      </div>
      <div>
        <div class="footer-heading">Blog</div>
        <ul>
          <li><a href="${base}blog.html">All Posts</a></li>
          <li><a href="${base}blog.html?cat=technical">Technical</a></li>
          <li><a href="${base}blog.html?cat=travel">Travel</a></li>
          <li><a href="${base}blog.html?cat=diy">DIY</a></li>
        </ul>
      </div>
    </div>
    <div class="footer-bottom">
      &copy; <span id="footer-year"></span> asgineer &mdash; Built with curiosity &amp; coffee.
    </div>
  </div>
</footer>`;

  // Inject nav
  const placeholder = document.getElementById('nav-placeholder');
  if (placeholder) placeholder.outerHTML = NAV_HTML;

  // Inject footer
  const footerPH = document.getElementById('footer-placeholder');
  if (footerPH) footerPH.outerHTML = FOOTER_HTML;

  // Set year
  const yearEl = document.getElementById('footer-year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // Logout button
  document.addEventListener('click', function (e) {
    if (e.target && e.target.id === 'nav-logout-btn') {
      e.preventDefault();
      navClearSession();
      window.location.href = base + 'index.html';
    }
  });
})();
