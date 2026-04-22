// js/ui.js — Shared UI helpers
import { signOut } from './supabase.js';

// ---- SIDEBAR ----
export function initSidebar(activeHref) {
  // toggle mobile
  document.getElementById('menuToggle')?.addEventListener('click', toggleSidebar);
  document.getElementById('sidebarOverlay')?.addEventListener('click', toggleSidebar);

  // mark active link
  if (activeHref) {
    document.querySelectorAll('.sidebar-nav a').forEach(a => {
      if (a.getAttribute('href') === activeHref) a.classList.add('active');
      else a.classList.remove('active');
    });
  }
}

export function toggleSidebar() {
  document.getElementById('sidebar')?.classList.toggle('open');
  document.getElementById('sidebarOverlay')?.classList.toggle('show');
}

// Sidebar overlay (mobile backdrop)
export function injectOverlay() {
  if (document.getElementById('sidebarOverlay')) return;
  const div = document.createElement('div');
  div.id = 'sidebarOverlay';
  div.style.cssText = 'display:none;position:fixed;inset:0;background:rgba(42,31,20,.4);z-index:199;';
  div.classList.add = div.classList.add;
  document.body.appendChild(div);
  div.addEventListener('click', toggleSidebar);
  // show/hide via class
  const style = document.createElement('style');
  style.textContent = '#sidebarOverlay.show{display:block}';
  document.head.appendChild(style);
}

// ---- TOPBAR USER ----
export function setTopbarUser(profile) {
  const el = document.getElementById('topXP');
  if (el) el.textContent = (profile.xp||0).toLocaleString('id');
  const av = document.getElementById('topAvatar');
  if (av) av.textContent = profile.avatar_emoji || '🐸';
}

// ---- SIDEBAR USER ----
export function setSidebarUser(profile) {
  const av   = document.getElementById('sideAvatar');
  const name = document.getElementById('sideName');
  const lvl  = document.getElementById('sideLevel');
  if (av)   av.textContent   = profile.avatar_emoji || '🐸';
  if (name) name.textContent = profile.full_name || profile.username || 'User';
  if (lvl)  lvl.textContent  = `Level ${profile.level||1} · ${(profile.xp||0).toLocaleString('id')} XP`;
}

// ---- SCROLL REVEAL ----
export function initScrollReveal() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('visible');
        observer.unobserve(e.target);
      }
    });
  }, { threshold: 0.1 });

  document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
}

// ---- STAGGER ANIMATE ----
export function staggerAnimate(selector = '.stagger') {
  setTimeout(() => {
    document.querySelectorAll(selector).forEach(el => el.classList.add('loaded'));
  }, 80);
}

// ---- COUNTER ANIMATION ----
export function animateCounters() {
  document.querySelectorAll('[data-count]').forEach(el => {
    const target = parseInt(el.dataset.count);
    const suffix = el.dataset.suffix || '+';
    let current  = 0;
    const step   = Math.ceil(target / 60);
    const timer  = setInterval(() => {
      current = Math.min(current + step, target);
      el.textContent = current.toLocaleString('id') + suffix;
      if (current >= target) clearInterval(timer);
    }, 20);
  });
}

// ---- NAVBAR SCROLL ----
export function initNavbarScroll(navId = 'navbar') {
  window.addEventListener('scroll', () => {
    document.getElementById(navId)?.classList.toggle('scrolled', window.scrollY > 40);
  });
}

// ---- MODAL HELPERS ----
export function openModal(id)  { document.getElementById(id)?.classList.add('open'); }
export function closeModal(id) { document.getElementById(id)?.classList.remove('open'); }

export function closeOnOverlay(modalId) {
  const overlay = document.getElementById(modalId);
  overlay?.addEventListener('click', e => {
    if (e.target === overlay) overlay.classList.remove('open');
  });
}

// ---- SIGN OUT ----
export function initSignOut() {
  document.querySelectorAll('[data-signout]').forEach(el => {
    el.addEventListener('click', () => signOut());
  });
}