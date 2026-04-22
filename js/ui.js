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
      fetch: (url, options = {}) =>
        Promise.race([
          fetch(url, options),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Request timeout')), 8000)
          )
        ])
    }
  }
);

// ---- Session cache (hindari bolak-balik request) ----
let _session = null;
let _sessionLoaded = false;

supabase.auth.onAuthStateChange((_, session) => {
  _session       = session;
  _sessionLoaded = true;
});

export async function getSession() {
  if (_sessionLoaded) return _session;
  const { data: { session } } = await supabase.auth.getSession();
  _session       = session;
  _sessionLoaded = true;
  return session;
}

export async function getUser() {
  const s = await getSession();
  return s?.user ?? null;
}

export async function getProfile(uid) {
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', uid)
    .single();
  return data;
}

export async function requireAuth(r = 'login.html') {
  const u = await getUser();
  if (!u) { location.href = r; return null; }
  return u;
}

export async function requireAdmin() {
  const u = await requireAuth();
  if (!u) return null;
  const p = await getProfile(u.id);
  if (!p || p.role !== 'admin') { location.href = 'dashboard.html'; return null; }
  return { user: u, profile: p };
}

export async function signOut() {
  _session       = null;
  _sessionLoaded = false;
  await supabase.auth.signOut();
  location.href = 'login.html';
}

export function calcLevel(xp)  { return Math.floor(Math.sqrt(xp / 100)) + 1; }
export function xpToNext(lvl)  { return Math.pow(lvl, 2) * 100; }
export function xpAtLevel(lvl) { return Math.pow(lvl - 1, 2) * 100; }

export async function addXP(uid, amt) {
  const p = await getProfile(uid);
  if (!p) return;
  const nx = p.xp + amt, nl = calcLevel(nx);
  await supabase.from('profiles')
    .update({ xp: nx, level: nl, last_active: new Date().toISOString().split('T')[0] })
    .eq('id', uid);
  return { newXP: nx, newLevel: nl, leveledUp: nl > p.level };
}

export function toast(msg, type = 'info') {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.className   = `show ${type}`;
  clearTimeout(t._t);
  t._t = setTimeout(() => t.className = '', 3200);
}

export const AVATARS = ['🐸','🦁','🦊','🐯','🐼','🦅','🦋','🐬','🦄','🐉','🌟','🎯','🚀','🌈','🔥','🎨'];