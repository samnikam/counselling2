/* ============================================================
   Portal interactions — scroll reveal, counters, parallax, nav
   ============================================================ */

// ---------- Navbar scroll shadow ----------
const navbar = document.querySelector('.navbar');
window.addEventListener('scroll', () => {
  navbar.classList.toggle('scrolled', window.scrollY > 20);
}, { passive: true });

// ---------- Mobile menu ----------
const burger = document.querySelector('.hamburger');
const navLinks = document.querySelector('.nav-links');
if (burger) {
  burger.addEventListener('click', () => {
    burger.classList.toggle('open');
    navLinks.classList.toggle('open');
  });
  navLinks.querySelectorAll('a').forEach(a =>
    a.addEventListener('click', () => {
      burger.classList.remove('open');
      navLinks.classList.remove('open');
    })
  );
}

// ---------- Scroll reveal (crazy directional, replays every time — up & down, every visit) ----------
// Unlike a one-shot reveal, this toggles the 'visible' class on and off as
// elements enter/leave the viewport, so the fly-in animation plays again
// every single time the section is scrolled into view (not just on first load).
const revealSelector = '.reveal, .reveal-l, .reveal-r, .reveal-open-r, .crazy-reveal';
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    entry.target.classList.toggle('visible', entry.isIntersecting);
  });
}, { threshold: 0.15, rootMargin: '0px 0px -8% 0px' });

document.querySelectorAll(revealSelector).forEach(el => revealObserver.observe(el));

// ---------- Animated counters (re-count every time the stat re-enters view) ----------
function animateCounter(el) {
  const target = parseFloat(el.dataset.target);
  const duration = 1600;
  const start = performance.now();
  const valueEl = el.querySelector('.value');

  function tick(now) {
    const progress = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
    const value = Math.round(target * eased);
    valueEl.textContent = value;
    if (progress < 1 && el.dataset.counting === 'true') requestAnimationFrame(tick);
  }
  el.dataset.counting = 'true';
  requestAnimationFrame(tick);
}

const counterObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    const el = entry.target;
    if (entry.isIntersecting) {
      animateCounter(el);
    } else {
      el.dataset.counting = 'false';
      el.querySelector('.value').textContent = '0';
    }
  });
}, { threshold: 0.5 });

document.querySelectorAll('.num[data-target]').forEach(el => counterObserver.observe(el));

// ---------- Subtle parallax on hero image ----------
const heroImg = document.querySelector('.hero-img');
if (heroImg && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  window.addEventListener('scroll', () => {
    const y = window.scrollY;
    if (y < 900) heroImg.style.transform = `translateY(${y * 0.08}px)`;
  }, { passive: true });
}

// ---------- Active nav link ----------
const page = location.pathname.split('/').pop() || 'index.html';
document.querySelectorAll('.nav-links a').forEach(a => {
  const href = a.getAttribute('href');
  if (href === page || href.split('#')[0] === page) {
    a.classList.add('active');
  }
});

// ---------- Demo form handler ----------
document.querySelectorAll('form[data-demo]').forEach(form => {
  form.addEventListener('submit', e => {
    e.preventDefault();
    const btn = form.querySelector('button[type="submit"]');
    const original = btn.innerHTML;
    btn.innerHTML = 'Submitted <svg class="icon-inline" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>';
    btn.disabled = true;
    setTimeout(() => { btn.innerHTML = original; btn.disabled = false; form.reset(); }, 2600);
  });
});
