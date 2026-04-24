import { signOut } from './supabase.js';

export function setSidebarUser(profile) {
  if (!profile) return;
  const avatar = document.getElementById('sideAvatar');
  const name   = document.getElementById('sideName');
  const level  = document.getElementById('sideLevel');
  if (avatar) avatar.textContent = profile.avatar_emoji || '🐸';
  if (name)   name.textContent   = profile.full_name || profile.username || 'User';
  if (level)  level.textContent  = 'Level ' + (profile.level || 1);
}

export function setTopbarUser(profile) {
  if (!profile) return;
  const xpEl     = document.getElementById('topXP');
  const avatarEl = document.getElementById('topAvatar');
  if (xpEl)     xpEl.textContent    = (profile.xp || 0).toLocaleString('id');
  if (avatarEl) avatarEl.textContent = profile.avatar_emoji || '🐸';
}

export function initSidebar(activeHref) {
  document.querySelectorAll('.sidebar-nav a[href]').forEach(a => {
    a.classList.toggle('active', a.getAttribute('href') === activeHref);
  });
}

export function initSignOut() {
  document.querySelectorAll('[data-signout]').forEach(el => {
    el.addEventListener('click', e => {
      e.preventDefault();
      signOut();
    });
  });
}

export function staggerAnimate() {
  document.querySelectorAll('.stagger').forEach(el => el.classList.add('loaded'));
}

export function closeModal(id) {
  document.getElementById(id)?.classList.remove('open');
}

export function openModal(id) {
  document.getElementById(id)?.classList.add('open');
}

export function initNavbarScroll(id) {
  const nav = document.getElementById(id);
  if (!nav) return;
  window.addEventListener('scroll', () => {
    nav.classList.toggle('scrolled', window.scrollY > 20);
  }, { passive: true });
}

export function animateCounters() {
  document.querySelectorAll('[data-count]').forEach(el => {
    const target   = parseInt(el.dataset.count, 10);
    const suffix   = el.dataset.suffix || '';
    const duration = 1600;
    const start    = performance.now();
    function tick(now) {
      const p = Math.min((now - start) / duration, 1);
      const v = Math.round((1 - Math.pow(1 - p, 3)) * target);
      el.textContent = v.toLocaleString('id') + suffix;
      if (p < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  });
}
