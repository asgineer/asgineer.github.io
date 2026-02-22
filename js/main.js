/* =============================================
   main.js  –  asgineer.github.io
   ============================================= */

/* ── Navigation ──────────────────────────────── */
(function initNav() {
  const hamburger = document.querySelector('.hamburger');
  const navMenu   = document.querySelector('.nav-menu');
  const navItems  = document.querySelectorAll('.nav-item.has-dropdown');

  if (hamburger && navMenu) {
    hamburger.addEventListener('click', () => {
      hamburger.classList.toggle('open');
      navMenu.classList.toggle('open');
    });
  }

  // Mobile: toggle dropdowns on tap
  navItems.forEach(item => {
    const link     = item.querySelector(':scope > a');
    const dropdown = item.querySelector('.dropdown');
    if (!link || !dropdown) return;

    link.addEventListener('click', e => {
      if (window.innerWidth <= 768) {
        e.preventDefault();
        dropdown.classList.toggle('mobile-open');
      }
    });
  });

  // Close menu when a regular link is clicked
  document.querySelectorAll('.dropdown a, .nav-item > a:not([data-has-dropdown])').forEach(a => {
    a.addEventListener('click', () => {
      if (navMenu) navMenu.classList.remove('open');
      if (hamburger) hamburger.classList.remove('open');
    });
  });

  // Highlight active navigation link
  const path = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-item > a').forEach(a => {
    const href = a.getAttribute('href') || '';
    if (href === path || href === './' + path) {
      a.classList.add('active');
    }
  });
})();


/* ── Scroll-triggered fade-up animations ─────── */
(function initScrollAnim() {
  const els = document.querySelectorAll('.fade-up');
  if (!els.length) return;

  const io = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });

  els.forEach(el => io.observe(el));
})();


/* ── Skill bar animation ─────────────────────── */
(function initSkillBars() {
  const bars = document.querySelectorAll('.skill-bar-fill');
  if (!bars.length) return;

  const io = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.style.width = entry.target.dataset.width;
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.3 });

  bars.forEach(bar => io.observe(bar));
})();


/* ── Blog category filter ─────────────────────── */
(function initBlogFilter() {
  const filterBtns = document.querySelectorAll('.filter-btn');
  const posts      = document.querySelectorAll('.blog-post-item');
  if (!filterBtns.length || !posts.length) return;

  // Read ?cat= param on page load
  const params      = new URLSearchParams(window.location.search);
  const initCat     = params.get('cat') || 'all';

  function applyFilter(cat) {
    filterBtns.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.filter === cat);
    });
    posts.forEach(post => {
      const postCat = post.dataset.category || 'general';
      const show    = cat === 'all' || postCat === cat;
      post.style.display = show ? '' : 'none';
    });
  }

  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const cat = btn.dataset.filter;
      applyFilter(cat);
      const url = new URL(window.location);
      if (cat === 'all') { url.searchParams.delete('cat'); }
      else               { url.searchParams.set('cat', cat); }
      history.replaceState(null, '', url);
    });
  });

  applyFilter(initCat);
})();


/* ── Smooth external anchor links (navbar dropdowns) ─ */
(function initSmoothScroll() {
  document.querySelectorAll('a[href*="#"]').forEach(a => {
    a.addEventListener('click', e => {
      const href = a.getAttribute('href');
      if (!href) return;
      const [pagePart, hash] = href.split('#');
      if (!hash) return;
      const currentPath = window.location.pathname.split('/').pop() || 'index.html';
      const targetPath  = pagePart || currentPath;
      if (targetPath === '' || targetPath === currentPath) {
        const target = document.getElementById(hash);
        if (target) {
          e.preventDefault();
          const navH = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--nav-height'));
          const top  = target.getBoundingClientRect().top + window.scrollY - navH - 20;
          window.scrollTo({ top, behavior: 'smooth' });
        }
      }
    });
  });
})();


/* ── Copy email to clipboard ─────────────────── */
(function initEmailCopy() {
  const emailLinks = document.querySelectorAll('[data-copy-email]');
  emailLinks.forEach(el => {
    el.addEventListener('click', e => {
      e.preventDefault();
      const email = el.dataset.copyEmail;
      navigator.clipboard.writeText(email).then(() => {
        const orig = el.textContent;
        el.textContent = 'Copied!';
        setTimeout(() => { el.textContent = orig; }, 1800);
      });
    });
  });
})();


/* ── Typed text effect for hero ──────────────── */
(function initTyped() {
  const el = document.getElementById('typed-role');
  if (!el) return;
  const phrases = el.dataset.phrases ? JSON.parse(el.dataset.phrases) : [];
  if (!phrases.length) return;

  let pIdx = 0, cIdx = 0, deleting = false;

  function tick() {
    const current = phrases[pIdx];
    if (deleting) {
      el.textContent = current.slice(0, --cIdx);
    } else {
      el.textContent = current.slice(0, ++cIdx);
    }

    let delay = deleting ? 60 : 110;
    if (!deleting && cIdx === current.length) { delay = 2000; deleting = true; }
    if (deleting && cIdx === 0) { deleting = false; pIdx = (pIdx + 1) % phrases.length; delay = 400; }
    setTimeout(tick, delay);
  }
  tick();
})();
