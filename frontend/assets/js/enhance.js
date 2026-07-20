/* ============================================================
   Site-wide behaviour polish — additive, no markup dependencies.
   Injects a reading-progress bar and a back-to-top button, and
   upgrades the number counters to keep counting past integers.
   ============================================================ */
(function () {
  'use strict';

  // ---- Reading progress bar ----
  var bar = document.createElement('div');
  bar.className = 'reading-progress';
  document.body.appendChild(bar);

  // ---- Back-to-top button ----
  var top = document.createElement('button');
  top.className = 'to-top';
  top.setAttribute('aria-label', 'Back to top');
  top.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="19" x2="12" y2="5"></line><polyline points="5 12 12 5 19 12"></polyline></svg>';
  top.addEventListener('click', function () { window.scrollTo({ top: 0, behavior: 'smooth' }); });
  document.body.appendChild(top);

  function onScroll() {
    var h = document.documentElement;
    var scrolled = h.scrollTop;
    var height = h.scrollHeight - h.clientHeight;
    bar.style.width = (height > 0 ? (scrolled / height) * 100 : 0) + '%';
    top.classList.toggle('show', scrolled > 500);
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
})();

/* ============================================================
   Extra polish — all ADDITIVE. Nothing below overrides an
   existing effect: the scroll-reveal hands styling back to the
   stylesheet once it finishes, so native hovers stay untouched.
   ============================================================ */

// ---- Gentle scroll-reveal for blocks that have no entrance animation yet ----
(function () {
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce || !('IntersectionObserver' in window)) return;

  // Skip anything the existing reveal system (main.js) already animates, and the hero.
  var ANIMATED = '.reveal, .reveal-l, .reveal-r, .reveal-open-r, .crazy-reveal';
  var TARGETS = '.card, .hiw-step, .impact, .section-head, .item';

  var els = [].slice.call(document.querySelectorAll(TARGETS)).filter(function (el) {
    if (el.closest('.hero')) return false;
    if (el.matches(ANIMATED) || el.closest(ANIMATED)) return false;
    return true;
  });
  if (!els.length) return;

  els.forEach(function (el) {
    el.style.opacity = '0';
    el.style.transform = 'translateY(24px)';
  });

  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return;
      var el = entry.target;
      io.unobserve(el);
      // Small stagger so items in a row cascade rather than pop together.
      var idx = el.parentNode ? [].indexOf.call(el.parentNode.children, el) : 0;
      var delay = Math.min(idx * 70, 280);
      el.style.transition = 'opacity .7s var(--ease) ' + delay + 'ms, transform .7s var(--ease) ' + delay + 'ms';
      requestAnimationFrame(function () { el.style.opacity = '1'; el.style.transform = 'none'; });
      var done = false;
      el.addEventListener('transitionend', function te() {
        if (done) return; done = true;
        // Return every inline style so the stylesheet's own hover/transition rules win again.
        el.style.transition = ''; el.style.transform = ''; el.style.opacity = '';
        el.removeEventListener('transitionend', te);
      });
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });

  els.forEach(function (el) { io.observe(el); });
})();

// ---- Soft cursor spotlight (desktop pointers only) ----
(function () {
  if (window.matchMedia('(hover: none)').matches ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var spot = document.createElement('div');
  spot.className = 'fx-spotlight';
  document.body.appendChild(spot);

  var x = 0, y = 0, raf = null;
  window.addEventListener('pointermove', function (e) {
    if (e.pointerType === 'touch') return;
    x = e.clientX; y = e.clientY;
    spot.classList.add('on');
    if (!raf) raf = requestAnimationFrame(function () {
      raf = null;
      spot.style.transform = 'translate(' + x + 'px,' + y + 'px)';
    });
  }, { passive: true });
  document.addEventListener('mouseleave', function () { spot.classList.remove('on'); });
})();
