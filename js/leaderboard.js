// js/leaderboard.js — Realtime Leaderboard
import { supabase, toast } from './supabase.js';

let _userId = null;
let _data   = [];

export async function initLeaderboard(userId) {
  _userId = userId;
  await load();
  subscribeRealtime();
}

async function load() {
  const { data, error } = await supabase
    .from('leaderboard_view')
    .select('*')
    .limit(50);

  if (error) { toast('Gagal memuat leaderboard', 'error'); return; }
  _data = data || [];
  render();
}

function render() {
  renderPodium();
  renderMyRank();
  renderList();
}

function renderPodium() {
  const el = document.getElementById('podium');
  if (!el) return;

  const top3 = _data.slice(0, 3);
  // display order: 2nd, 1st, 3rd
  const order   = [top3[1], top3[0], top3[2]].filter(Boolean);
  const classes = ['p2', 'p1', 'p3'];
  const medals  = ['🥈', '🥇', '🥉'];
  const heights = ['60px', '80px', '44px'];

  el.innerHTML = order.map((u, i) => `
    <div class="podium-item ${classes[i]}">
      <div class="podium-avatar ${u.id === _userId ? 'podium-me' : ''}">${u.avatar_emoji}</div>
      <div class="podium-name">${u.full_name || u.username}</div>
      <div class="podium-xp">${u.xp.toLocaleString('id')} XP</div>
      <div class="podium-bar" style="height:${heights[i]}">${medals[i]}</div>
    </div>`).join('');
}

function renderMyRank() {
  const el = document.getElementById('myRankCard');
  if (!el) return;

  const me = _data.find(u => u.id === _userId);
  if (!me) { el.style.display = 'none'; return; }

  el.style.display = 'block';
  el.innerHTML = `
    <div class="my-rank-card fade-up">
      <div class="mrc-rank">#${me.rank}</div>
      <div class="mrc-info">
        <h4>Posisi kamu saat ini 🔥</h4>
        <p>${me.xp.toLocaleString('id')} XP · Level ${me.level} · ${me.streak || 0} hari streak</p>
      </div>
      <a href="courses.html" class="btn btn-sm" style="background:rgba(255,255,255,.18);color:white;border:1px solid rgba(255,255,255,.3)">
        Tambah XP →
      </a>
    </div>`;
}

function renderList() {
  const el = document.getElementById('lbList');
  if (!el) return;

  const total = document.getElementById('totalUsers');
  if (total) total.textContent = `${_data.length} pengguna terdaftar`;

  const maxXP = _data[0]?.xp || 1;

  el.innerHTML = _data.map(u => {
    const isMe = u.id === _userId;
    const rankClass = { 1: 'gold', 2: 'silver', 3: 'bronze' }[u.rank] || '';
    const rankLabel = { 1: '🥇', 2: '🥈', 3: '🥉' }[u.rank] || u.rank;
    return `
      <div class="lb-row ${isMe ? 'me' : ''}">
        <div class="lb-rank ${rankClass}">${rankLabel}</div>
        <div class="lb-avatar">${u.avatar_emoji}</div>
        <div class="lb-info">
          <div class="lb-name">
            ${u.full_name || u.username}
            ${isMe ? '<span class="badge badge-orange" style="font-size:.6rem;padding:2px 7px">Kamu</span>' : ''}
          </div>
          <div class="lb-sub">Level ${u.level} · ${u.streak || 0} hari streak</div>
        </div>
        <div class="lb-xp-wrap">
          <div class="lb-xp">${u.xp.toLocaleString('id')} XP</div>
          <div class="lb-bar-mini">
            <div class="lb-bar-fill" style="width:${(u.xp / maxXP) * 100}%"></div>
          </div>
        </div>
      </div>`;
  }).join('');
}

function subscribeRealtime() {
  supabase.channel('lb-realtime')
    .on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'profiles'
    }, async () => {
      await load();
      toast('🔄 Leaderboard diperbarui!', 'info');
    })
    .subscribe();
}