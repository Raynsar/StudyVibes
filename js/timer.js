// js/timer.js — Pomodoro Timer Logic
import { supabase, addXP, toast } from './supabase.js';

const CIRC = 2 * Math.PI * 86; // r=86

export const timerState = {
  total: 1500,
  rem: 1500,
  running: false,
  iv: null,
  mode: 'focus',
  sessions: 0,
  currentTrack: 'lofi'
};

const STATUS = {
  focus: ['Gaskeun! 🚀', 'You got this! 🔥', 'Fokus! 💪', 'Deep work mode 🧠'],
  short: ['Minum air dulu 💧', 'Regang punggung! 🧘', 'Napas dulu ☕'],
  long:  ['Istirahat panjang! 🛌', 'Makan dulu boleh 🍱', 'Rebahan sebentar 😌']
};

export function initTimer(userId) {
  updateRing();

  // Mode buttons
  document.querySelectorAll('.mode-btn').forEach(b => {
    b.addEventListener('click', () => {
      document.querySelectorAll('.mode-btn').forEach(x => x.classList.remove('active'));
      b.classList.add('active');
      timerState.mode  = b.dataset.mode;
      timerState.total = parseInt(b.dataset.time);
      timerState.rem   = timerState.total;
      clearInterval(timerState.iv);
      timerState.running = false;
      setDisplay(fmt(timerState.rem));
      setStatus('Siap fokus? 💪');
      setBtn('▶ Mulai');
      updateRing();
      stopViz();
    });
  });

  // Track buttons
  document.querySelectorAll('.track-btn').forEach(b => {
    b.addEventListener('click', () => {
      document.querySelectorAll('.track-btn').forEach(x => x.classList.remove('active'));
      b.classList.add('active');
      timerState.currentTrack = b.dataset.track;
      const names = { lofi:'Lo-fi Chill 🌙', nature:'Forest Rain 🌿', cafe:'Cafe Noise ☕', focus:'Deep Focus 🌊' };
      toast(`Suasana: ${names[b.dataset.track]}`, 'info');
      if (timerState.running) { stopViz(); setTimeout(startViz, 150); }
    });
  });

  // Start/pause button
  document.getElementById('timerStartBtn')?.addEventListener('click', () => timerAction(userId));
  // Reset button
  document.getElementById('timerResetBtn')?.addEventListener('click', () => timerReset());
}

export function timerAction(userId) {
  if (timerState.running) {
    clearInterval(timerState.iv);
    timerState.running = false;
    setBtn('▶ Lanjut');
    setStatus('Dijeda ⏸');
    stopViz();
  } else {
    timerState.iv = setInterval(() => tick(userId), 1000);
    timerState.running = true;
    setBtn('⏸ Jeda');
    const msgs = STATUS[timerState.mode];
    setStatus(msgs[Math.floor(Math.random() * msgs.length)]);
    startViz();
  }
}

async function tick(userId) {
  if (timerState.rem <= 0) {
    clearInterval(timerState.iv);
    timerState.running = false;
    timerState.sessions++;
    setBtn('▶ Mulai');
    stopViz();

    if (timerState.mode === 'focus' && userId) {
      const durMin = Math.floor(timerState.total / 60);
      const xpEarned = durMin * 2;
      try {
        await supabase.from('study_sessions').insert({
          user_id: userId,
          duration_minutes: durMin,
          mode: 'focus',
          xp_earned: xpEarned
        });
        const result = await addXP(userId, xpEarned);
        // update XP display in topbar if present
        const topXP = document.getElementById('topXP');
        if (topXP && result) topXP.textContent = result.newXP.toLocaleString('id');
        toast(`Sesi selesai! +${xpEarned} XP 🎉${result?.leveledUp ? ' LEVEL UP! 🚀' : ''}`, 'success');
        setStatus(`Sesi ke-${timerState.sessions} selesai! 🎉`);
      } catch (e) {
        console.error('Session save error:', e);
      }
    } else {
      setStatus('Break selesai! Lanjut fokus? 💪');
      toast('☕ Break selesai — siap belajar lagi?', 'info');
    }
    return;
  }
  timerState.rem--;
  setDisplay(fmt(timerState.rem));
  updateRing();
}

export function timerReset() {
  clearInterval(timerState.iv);
  timerState.running = false;
  timerState.rem = timerState.total;
  setDisplay(fmt(timerState.rem));
  setBtn('▶ Mulai');
  setStatus('Siap fokus? 💪');
  updateRing();
  stopViz();
}

// ---- HELPERS ----
function fmt(s) {
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}
function setDisplay(t) { const el = document.getElementById('timerDisplay'); if (el) el.textContent = t; }
function setStatus(t)  { const el = document.getElementById('timerStatus');  if (el) el.textContent = t; }
function setBtn(t)     { const el = document.getElementById('timerStartBtn'); if (el) el.textContent = t; }

function updateRing() {
  const ring = document.getElementById('timerRing'); if (!ring) return;
  const pct = timerState.rem / timerState.total;
  ring.style.strokeDashoffset = CIRC * (1 - pct);
  ring.style.stroke = pct > .5 ? 'var(--terracotta)' : pct > .2 ? 'var(--butter)' : 'var(--rose)';
}
function startViz() { document.getElementById('visualizer')?.classList.add('playing'); }
function stopViz()  { document.getElementById('visualizer')?.classList.remove('playing'); }