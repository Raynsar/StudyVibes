// js/supabase.js
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

export const supabase = createClient(
  'https://clqabolfmbksgfqzdaoo.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNscWFib2xmbWJrc2dmcXpkYW9vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY3NjIwNjcsImV4cCI6MjA5MjMzODA2N30.efTSGEg8TbTkoqyR0meDVgpalkJ7M3Pn22WHd79bJ8o',
  {
    auth: {
      persistSession:     true,
      autoRefreshToken:   true,
      detectSessionInUrl: false,
      storageKey:         'studyvibes-auth'
    },
    global: {
      fetch: async (url, options = {}) => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);
        try {
          const res = await fetch(url, { ...options, signal: controller.signal });
          clearTimeout(timeoutId);
          return res;
        } catch (e) {
          clearTimeout(timeoutId);
          console.error('Supabase fetch failed:', e.message);
          throw e;
        }
      }
    }
  }
);

// ---- Session cache ----
let _session       = null;
let _sessionLoaded = false;

supabase.auth.onAuthStateChange((_, session) => {
  _session       = session;
  _sessionLoaded = true;
});

export async function getSession() {
  if (_sessionLoaded) return _session;
  try {
    const { data: { session } } = await Promise.race([
      supabase.auth.getSession(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Auth timeout')), 10000))
    ]);
    _session = session;
    _sessionLoaded = true;
    return session;
  } catch (e) {
    console.error('Auth session failed:', e);
    _sessionLoaded = true;
    return null;
  }
}

export async function getUser() {
  const s = await getSession();
  return s?.user ?? null;
}

export async function getProfile(uid) {
  try {
    const { data, error } = await supabase
      .from('profiles').select('*').eq('id', uid).single();
    if (error) throw error;
    return data;
  } catch (e) {
    console.error('Profile load failed:', e);
    return { full_name: 'Guest User', username: 'guest', avatar_emoji: '👤', xp: 0, level: 1, streak: 0 };
  }
}

export async function requireAuth(r = 'login.html') {
  try {
    const u = await getUser();
    if (!u) { 
      toast('Session expired, redirecting...', 'warning');
      setTimeout(() => location.href = r, 1500); 
      return null; 
    }
    return u;
  } catch (e) {
    console.error('Auth required failed:', e);
    window.isOfflineMode = true;
    toast('Offline mode enabled - limited features', 'warning');
    return { id: 'offline-user', email: 'guest@offline', isOffline: true };
  }
}

export async function requireAdmin() {
  const u = await requireAuth();
  if (!u) return null;
  const p = await getProfile(u.id);
  if (!p || p.role !== 'admin') { location.href = 'dashboard.html'; return null; }
  return { user: u, profile: p };
}

export async function signOut() {
  _session = null; _sessionLoaded = false;
  await supabase.auth.signOut();
  location.href = 'login.html';
}

export function calcLevel(xp)  { return Math.floor(Math.sqrt(xp / 100)) + 1; }
export function xpToNext(lvl)  { return Math.pow(lvl, 2) * 100; }
export function xpAtLevel(lvl) { return Math.pow(lvl - 1, 2) * 100; }

export async function addXP(uid, amt) {
  const p = await getProfile(uid); if (!p) return;
  const nx = p.xp + amt, nl = calcLevel(nx);
  await supabase.from('profiles')
    .update({ xp: nx, level: nl, last_active: new Date().toISOString().split('T')[0] })
    .eq('id', uid);
  return { newXP: nx, newLevel: nl, leveledUp: nl > p.level };
}

export function toast(msg, type = 'info') {
  const t = document.getElementById('toast'); if (!t) return;
  t.textContent = msg; t.className = `show ${type}`;
  clearTimeout(t._t); t._t = setTimeout(() => t.className = '', 3200);
}

export const AVATARS = ['🐸','🦁','🦊','🐯','🐼','🦅','🦋','🐬','🦄','🐉','🌟','🎯','🚀','🌈','🔥','🎨'];

// Offline retry utils
window.retryAuth = async () => {
  _session = null; _sessionLoaded = false;
  window.isOfflineMode = false;
  toast('Retrying connection...');
  setTimeout(() => location.reload(), 1000);
};

window.isSupabaseOffline = () => !!window.isOfflineMode;
