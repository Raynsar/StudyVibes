// js/profile.js — Profile page logic
import { supabase, getProfile, toast, AVATARS, calcLevel, xpToNext, xpAtLevel } from './supabase.js';

let _userId  = null;
let _profile = null;

export async function initProfile(userId) {
  _userId  = userId;
  _profile = await getProfile(userId);
  if (!_profile) return;
  renderPage();
}

function renderPage() {
  const p   = _profile;
  const lvl = p.level, xp = p.xp;
  const atLvl = xpAtLevel(lvl), toNext = xpToNext(lvl);
  const pct = Math.min(((xp - atLvl) / (toNext - atLvl)) * 100, 100);

  // Sidebar & topbar
  document.getElementById('sideAvatar').textContent  = p.avatar_emoji;
  document.getElementById('sideName').textContent    = p.full_name || p.username;
  document.getElementById('sideLevel').textContent   = `Level ${lvl}`;
  document.getElementById('topXP').textContent       = xp.toLocaleString('id');
  document.getElementById('topAvatar').textContent   = p.avatar_emoji;

  document.getElementById('pageContent').innerHTML = `
    <!-- PROFILE HERO -->
    <div class="profile-hero fade-up">
      <div class="ph-avatar">${p.avatar_emoji}</div>
      <div style="flex:1">
        <div class="ph-name">${p.full_name || p.username}</div>
        <div class="ph-sub">@${p.username} · Bergabung ${new Date(p.created_at).toLocaleDateString('id',{month:'long',year:'numeric'})}</div>
        <div class="ph-badges">
          <span class="badge" style="background:rgba(255,255,255,.12);color:rgba(255,255,255,.85)">⭐ Level ${lvl}</span>
          <span class="badge" style="background:rgba(245,200,66,.2);color:var(--butter)">🔥 ${p.streak||0} Hari Streak</span>
          <span class="badge" style="background:rgba(127,168,122,.2);color:var(--sage-light)">${xp.toLocaleString('id')} XP</span>
        </div>
        <div class="xp-bar-wrap" style="margin-top:14px">
          <div class="xp-info" style="display:flex;justify-content:space-between;font-size:.76rem;color:rgba(255,255,255,.5);margin-bottom:6px">
            <span>${xp.toLocaleString('id')} XP</span>
            <span>Level ${lvl+1}: ${toNext.toLocaleString('id')} XP</span>
          </div>
          <div class="progress-bar"><div class="progress-fill pf-tc" style="width:${pct}%"></div></div>
        </div>
      </div>
      <button class="btn btn-sm" style="background:rgba(255,255,255,.12);color:white;border:1px solid rgba(255,255,255,.2)" onclick="openEditModal()">✏️ Edit Profil</button>
    </div>

    <div class="grid-2" style="margin-bottom:22px">
      <div class="card-flat">
        <h3 style="margin-bottom:16px">📊 Statistik Belajar</h3>
        <div id="statsContent"><div class="spinner" style="margin:20px auto"></div></div>
      </div>
      <div class="card-flat">
        <h3 style="margin-bottom:16px">🏅 Pencapaian</h3>
        <div id="achieveContent"><div class="spinner" style="margin:20px auto"></div></div>
      </div>
    </div>

    <div class="card-flat fade-up" style="margin-bottom:22px">
      <h3 style="margin-bottom:4px">📅 Aktivitas Belajar (52 minggu)</h3>
      <p style="font-size:.76rem;color:var(--ink-soft);margin-bottom:16px">Warna makin gelap = makin rajin 💪</p>
      <div class="activity-grid" id="heatmap"></div>
      <div style="display:flex;align-items:center;gap:8px;margin-top:12px;font-size:.72rem;color:var(--ink-soft)">
        <span>Jarang</span>
        <div style="width:14px;height:14px;background:var(--warm);border-radius:3px"></div>
        <div style="width:14px;height:14px;background:#d4edda;border-radius:3px"></div>
        <div style="width:14px;height:14px;background:var(--sage);border-radius:3px"></div>
        <div style="width:14px;height:14px;background:var(--sage-dark);border-radius:3px"></div>
        <span>Sering</span>
      </div>
    </div>

    <div class="card-flat fade-up">
      <h3 style="margin-bottom:16px">🔐 Ganti Password</h3>
      <div style="display:flex;gap:12px;flex-wrap:wrap">
        <input id="newPassInput" type="password" class="form-input" placeholder="Password baru (min. 8 karakter)" style="flex:1;min-width:240px">
        <button class="btn btn-dark" onclick="changePassword()">Ganti Password</button>
      </div>
    </div>`;

  loadStats();
  loadAchievements();
  renderHeatmap();
}

async function loadStats() {
  const [{ data: sess }, { data: enr }, { data: ranks }] = await Promise.all([
    supabase.from('study_sessions').select('duration_minutes,xp_earned').eq('user_id', _userId),
    supabase.from('enrollments').select('course_id,completed').eq('user_id', _userId),
    supabase.from('leaderboard_view').select('id,rank')
  ]);

  const totalMin = sess?.reduce((a, s) => a + s.duration_minutes, 0) || 0;
  const totalXPsess = sess?.reduce((a, s) => a + s.xp_earned, 0) || 0;
  const myRank = ranks?.find(r => r.id === _userId);

  document.getElementById('statsContent').innerHTML = `
    <div class="stat-row"><span>⏱️ Total Waktu Belajar</span><strong>${Math.floor(totalMin/60)}h ${totalMin%60}m</strong></div>
    <div class="stat-row"><span>🍅 Sesi Pomodoro</span><strong>${sess?.length||0} sesi</strong></div>
    <div class="stat-row"><span>📚 Kursus Diambil</span><strong>${enr?.length||0} kursus</strong></div>
    <div class="stat-row"><span>✅ Kursus Selesai</span><strong>${enr?.filter(e=>e.completed)?.length||0} kursus</strong></div>
    <div class="stat-row"><span>🏆 Peringkat Global</span><strong>${myRank?'#'+myRank.rank:'-'}</strong></div>
    <div class="stat-row"><span>⭐ XP dari Sesi</span><strong>${totalXPsess.toLocaleString('id')} XP</strong></div>`;
}

function loadAchievements() {
  const p = _profile;
  const achievements = [
    { icon:'🌱', name:'Pemula Bersemangat', desc:'Daftar pertama kali', earned: true },
    { icon:'📚', name:'Kutu Buku',          desc:'Daftar 3+ kursus',   earned: p.xp > 150 },
    { icon:'🔥', name:'On Fire!',            desc:'Streak 7 hari',      earned: (p.streak||0) >= 7 },
    { icon:'⭐', name:'XP Hunter',           desc:'Kumpulkan 500 XP',   earned: p.xp >= 500 },
    { icon:'💎', name:'XP Master',           desc:'Kumpulkan 2000 XP',  earned: p.xp >= 2000 },
    { icon:'🚀', name:'Level 5',             desc:'Capai level 5',      earned: p.level >= 5 },
    { icon:'👑', name:'Level 10',            desc:'Capai level 10',     earned: p.level >= 10 },
    { icon:'🏆', name:'Top 10',              desc:'Masuk 10 besar',     earned: false },
  ];

  document.getElementById('achieveContent').innerHTML = achievements.map(a => `
    <div style="display:flex;align-items:center;gap:12px;padding:9px 0;border-bottom:1px solid var(--border);opacity:${a.earned?1:.38}">
      <span style="font-size:1.4rem;width:28px;text-align:center">${a.icon}</span>
      <div style="flex:1">
        <div style="font-weight:600;font-size:.85rem">${a.name}</div>
        <div style="font-size:.72rem;color:var(--ink-soft)">${a.desc}</div>
      </div>
      ${a.earned ? '<span class="badge badge-green">✓ Diraih</span>' : '<span class="badge badge-gray">Terkunci</span>'}
    </div>`).join('');
}

async function renderHeatmap() {
  const { data: sessions } = await supabase
    .from('study_sessions').select('created_at,duration_minutes').eq('user_id', _userId);

  const map = {};
  (sessions || []).forEach(s => {
    const d = s.created_at.split('T')[0];
    map[d] = (map[d] || 0) + s.duration_minutes;
  });

  const cells = [];
  for (let i = 364; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const key = d.toISOString().split('T')[0];
    const min = map[key] || 0;
    const lvl = min === 0 ? '' : min < 25 ? 'l1' : min < 50 ? 'l2' : min < 100 ? 'l3' : 'l4';
    cells.push(`<div class="activity-cell ${lvl}" title="${key}: ${min} menit"></div>`);
  }

  const hm = document.getElementById('heatmap');
  if (hm) hm.innerHTML = cells.join('');
}

// ---- EDIT MODAL ----
export function openEditModal() {
  const p = _profile;
  document.getElementById('e-name').value  = p.full_name  || '';
  document.getElementById('e-user').value  = p.username   || '';
  document.getElementById('e-avatar').value = p.avatar_emoji;

  const grid = document.getElementById('editAvatarGrid');
  grid.innerHTML = '';
  AVATARS.forEach(a => {
    const d = document.createElement('div');
    d.className = 'av-opt' + (a === p.avatar_emoji ? ' selected' : '');
    d.textContent = a;
    d.onclick = () => {
      document.querySelectorAll('.av-opt').forEach(x => x.classList.remove('selected'));
      d.classList.add('selected');
      document.getElementById('e-avatar').value = a;
    };
    grid.appendChild(d);
  });

  document.getElementById('editModal')?.classList.add('open');
}

export async function saveProfile() {
  const name   = document.getElementById('e-name').value.trim();
  const uname  = document.getElementById('e-user').value.trim();
  const avatar = document.getElementById('e-avatar').value;

  if (!name || !uname) { toast('Isi semua field!', 'error'); return; }

  const { error } = await supabase.from('profiles')
    .update({ full_name: name, username: uname, avatar_emoji: avatar })
    .eq('id', _userId);

  if (error) { toast('Gagal: ' + error.message, 'error'); return; }

  _profile = { ..._profile, full_name: name, username: uname, avatar_emoji: avatar };
  toast('Profil berhasil diperbarui! 🎉', 'success');
  document.getElementById('editModal')?.classList.remove('open');
  renderPage();
}

export async function changePassword() {
  const p = document.getElementById('newPassInput')?.value;
  if (!p || p.length < 8) { toast('Password minimal 8 karakter!', 'error'); return; }
  const { error } = await supabase.auth.updateUser({ password: p });
  if (error) { toast('Gagal ganti password: ' + error.message, 'error'); return; }
  toast('Password berhasil diubah! 🔐', 'success');
  document.getElementById('newPassInput').value = '';
}