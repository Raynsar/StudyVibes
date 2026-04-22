// js/admin.js — Admin Panel Logic
import { supabase, toast, calcLevel } from './supabase.js';

export let allUsers   = [];
export let allCourses = [];

// ---- OVERVIEW ----
export async function loadOverview() {
  // Query satu per satu, tidak pakai Promise.all
  const { count: uc } = await supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'user');
  const { count: cc } = await supabase.from('courses').select('id', { count: 'exact', head: true });
  const { count: sc } = await supabase.from('study_sessions').select('id', { count: 'exact', head: true });
  const { data: xpData } = await supabase.from('study_sessions').select('xp_earned');

  const totalXP = xpData?.reduce((a, s) => a + s.xp_earned, 0) || 0;

  const el = document.getElementById('overviewStats');
  if (!el) return;
  el.innerHTML = `
    <div class="stat-card"><div class="sc-icon">👥</div><div class="sc-val">${uc||0}</div><div class="sc-label">Total Pengguna</div></div>
    <div class="stat-card"><div class="sc-icon">📚</div><div class="sc-val">${cc||0}</div><div class="sc-label">Total Kursus</div></div>
    <div class="stat-card"><div class="sc-icon">⏱️</div><div class="sc-val">${sc||0}</div><div class="sc-label">Total Sesi</div></div>
    <div class="stat-card"><div class="sc-icon">⭐</div><div class="sc-val">${(totalXP/1000).toFixed(1)}K</div><div class="sc-label">XP Diberikan</div></div>`;
  el.classList.add('loaded');

  // Load charts di background
  loadCharts();
}

async function loadCharts() {
  // Top users
  const { data: topU } = await supabase.from('profiles')
    .select('full_name,username,xp').eq('role','user').order('xp',{ascending:false}).limit(10);
  const maxU = topU?.[0]?.xp || 1;
  const topUsersEl = document.getElementById('topUsersChart');
  if (topUsersEl) topUsersEl.innerHTML =
    `<div class="chart-bar-wrap">${(topU||[]).map(u=>`
      <div class="chart-row">
        <div class="chart-label">${u.full_name||u.username}</div>
        <div class="chart-bar-bg"><div class="chart-bar-fill" style="width:${(u.xp/maxU)*100}%"></div></div>
        <div class="chart-val">${u.xp.toLocaleString('id')}</div>
      </div>`).join('')}</div>`;

  // Top courses
  const { data: enrData } = await supabase.from('enrollments').select('course_id,courses(title)');
  const cCount = {};
  (enrData||[]).forEach(e=>{ const t=e.courses?.title||'Unknown'; cCount[t]=(cCount[t]||0)+1; });
  const sorted = Object.entries(cCount).sort((a,b)=>b[1]-a[1]).slice(0,8);
  const maxC = sorted[0]?.[1]||1;
  const topCoursesEl = document.getElementById('topCoursesChart');
  if (topCoursesEl) topCoursesEl.innerHTML =
    `<div class="chart-bar-wrap">${sorted.map(([t,c])=>`
      <div class="chart-row">
        <div class="chart-label">${t}</div>
        <div class="chart-bar-bg"><div class="chart-bar-fill" style="width:${(c/maxC)*100}%;background:linear-gradient(90deg,var(--sage-dark),var(--sage))"></div></div>
        <div class="chart-val">${c}</div>
      </div>`).join('')}</div>`;

  // Sessions per day
  const { data: sSess } = await supabase.from('study_sessions')
    .select('created_at,duration_minutes')
    .gte('created_at', new Date(Date.now()-7*86400000).toISOString());
  const dayMap = {};
  for (let i=6;i>=0;i--){ const d=new Date(); d.setDate(d.getDate()-i); dayMap[d.toISOString().split('T')[0]]=0; }
  (sSess||[]).forEach(s=>{ const d=s.created_at.split('T')[0]; if(dayMap[d]!==undefined) dayMap[d]+=s.duration_minutes; });
  const maxDay = Math.max(...Object.values(dayMap))||1;
  const sessionChartEl = document.getElementById('sessionChart');
  if (sessionChartEl) sessionChartEl.innerHTML =
    `<div class="chart-bar-wrap">${Object.entries(dayMap).map(([d,m])=>`
      <div class="chart-row">
        <div class="chart-label">${new Date(d).toLocaleDateString('id',{weekday:'short',day:'numeric',month:'short'})}</div>
        <div class="chart-bar-bg"><div class="chart-bar-fill" style="width:${(m/maxDay)*100}%;background:linear-gradient(90deg,var(--lavender),#c8b4e8)"></div></div>
        <div class="chart-val">${m}m</div>
      </div>`).join('')}</div>`;
}

// ---- USERS ----
export async function loadUsers() {
  const { data } = await supabase.from('profiles').select('*').order('xp',{ascending:false});
  allUsers = data || [];
  renderUsers(allUsers);
}

export function renderUsers(users) {
  const el = document.getElementById('usersTable');
  if (!el) return;
  el.innerHTML = users.map(u => `
    <tr>
      <td><div class="user-avatar-cell"><div class="ua-emoji">${u.avatar_emoji}</div><div><div class="ua-name">${u.full_name||'-'}</div><div class="ua-email">@${u.username}</div></div></div></td>
      <td><span class="badge badge-blue">Lvl ${u.level}</span></td>
      <td>${u.xp.toLocaleString('id')}</td>
      <td>${u.streak||0} 🔥</td>
      <td><span class="badge ${u.role==='admin'?'badge-orange':'badge-gray'}">${u.role}</span></td>
      <td style="display:flex;gap:6px;align-items:center">
        <button class="btn btn-xs btn-dark"    onclick="editUser('${u.id}')">✏️ Edit</button>
        ${u.role!=='admin'
          ? `<button class="btn btn-xs" style="background:var(--butter);color:var(--ink)" onclick="toggleAdmin('${u.id}','${u.role}')">👑 Admin</button>`
          : `<button class="btn btn-xs btn-secondary" onclick="toggleAdmin('${u.id}','${u.role}')">👤 User</button>`}
        <button class="btn btn-xs btn-danger"  onclick="deleteUser('${u.id}')">🗑️</button>
      </td>
    </tr>`).join('') || '<tr><td colspan="6" style="text-align:center;padding:30px;color:var(--ink-soft)">Tidak ada pengguna</td></tr>';
}

export function filterUsers() {
  const q = document.getElementById('userSearch')?.value.toLowerCase()||'';
  renderUsers(allUsers.filter(u =>
    (u.full_name||'').toLowerCase().includes(q) || u.username.toLowerCase().includes(q)
  ));
}

export function openEditUser(id) {
  const u = allUsers.find(x=>x.id===id); if(!u) return;
  document.getElementById('userModalContent').innerHTML = `
    <h3 style="margin-bottom:20px">✏️ Edit Pengguna</h3>
    <div class="form-group"><label class="form-label">Nama Lengkap</label><input id="eu-name" class="form-input" value="${u.full_name||''}"></div>
    <div class="form-group"><label class="form-label">Username</label><input id="eu-user" class="form-input" value="${u.username}"></div>
    <div class="form-group"><label class="form-label">XP</label><input id="eu-xp" type="number" class="form-input" value="${u.xp}" min="0"></div>
    <div class="form-group"><label class="form-label">Streak (hari)</label><input id="eu-streak" type="number" class="form-input" value="${u.streak||0}" min="0"></div>
    <button class="btn btn-primary btn-block" onclick="saveUser('${id}')">💾 Simpan</button>`;
  document.getElementById('userModal')?.classList.add('open');
}

export async function saveUser(id) {
  const name   = document.getElementById('eu-name').value.trim();
  const uname  = document.getElementById('eu-user').value.trim();
  const xp     = parseInt(document.getElementById('eu-xp').value)||0;
  const streak = parseInt(document.getElementById('eu-streak').value)||0;
  const level  = calcLevel(xp);
  const { error } = await supabase.from('profiles').update({full_name:name,username:uname,xp,streak,level}).eq('id',id);
  if (error) { toast('Gagal: '+error.message,'error'); return; }
  toast('User berhasil diupdate ✓','success');
  document.getElementById('userModal')?.classList.remove('open');
  await loadUsers();
}

export async function toggleAdmin(id, role) {
  const newRole = role==='admin' ? 'user' : 'admin';
  await supabase.from('profiles').update({role:newRole}).eq('id',id);
  toast(`Role diubah ke ${newRole} ✓`,'success');
  await loadUsers();
}

export async function deleteUser(id) {
  if(!confirm('Yakin hapus pengguna ini?')) return;
  await supabase.from('profiles').delete().eq('id',id);
  toast('Pengguna dihapus','info');
  await loadUsers();
}

export function openAddUser() {
  document.getElementById('userModalContent').innerHTML = `
    <h3 style="margin-bottom:20px">+ Tambah Pengguna</h3>
    <div class="form-group"><label class="form-label">Nama Lengkap</label><input id="nu-name" class="form-input" placeholder="Nama lengkap"></div>
    <div class="form-group"><label class="form-label">Username</label><input id="nu-user" class="form-input" placeholder="username_unik"></div>
    <div class="form-group"><label class="form-label">Email</label><input id="nu-email" type="email" class="form-input" placeholder="email@example.com"></div>
    <div class="form-group"><label class="form-label">Password</label><input id="nu-pass" type="password" class="form-input" placeholder="Min. 8 karakter"></div>
    <button class="btn btn-primary btn-block" onclick="createUser()">✅ Buat Akun</button>`;
  document.getElementById('userModal')?.classList.add('open');
}

export async function createUser() {
  const name  = document.getElementById('nu-name').value.trim();
  const uname = document.getElementById('nu-user').value.trim();
  const email = document.getElementById('nu-email').value.trim();
  const pass  = document.getElementById('nu-pass').value;
  if (!name||!uname||!email||!pass) { toast('Isi semua field!','error'); return; }
  const {error} = await supabase.auth.signUp({email,password:pass,options:{data:{full_name:name,username:uname,avatar_emoji:'🐸'}}});
  if (error) { toast('Gagal: '+error.message,'error'); return; }
  toast('Akun berhasil dibuat! 🎉','success');
  document.getElementById('userModal')?.classList.remove('open');
  setTimeout(()=>loadUsers(), 1500);
}

// ---- COURSES ----
export async function loadAdminCourses() {
  const { data } = await supabase.from('courses').select('*').order('created_at');
  allCourses = data || [];
  renderAdminCourses();
  const sel = document.getElementById('lessonCourseFilter');
  if (sel) sel.innerHTML = '<option value="">Pilih Kursus...</option>' +
    allCourses.map(c=>`<option value="${c.id}">${c.emoji} ${c.title}</option>`).join('');
}

export function renderAdminCourses() {
  const el = document.getElementById('coursesTable');
  if (!el) return;
  el.innerHTML = allCourses.map(c=>`
    <tr>
      <td><div style="display:flex;align-items:center;gap:10px"><span style="font-size:1.4rem">${c.emoji}</span><div><div style="font-weight:600;font-size:.88rem">${c.title}</div><div style="font-size:.7rem;color:var(--ink-soft)">${(c.description||'').slice(0,50)}...</div></div></div></td>
      <td><span class="badge badge-blue">${c.category}</span></td>
      <td>${c.difficulty}</td>
      <td>${c.total_lessons}</td>
      <td><span class="badge ${c.is_published?'badge-green':'badge-gray'}">${c.is_published?'✓ Aktif':'✗ Draft'}</span></td>
      <td style="display:flex;gap:6px">
        <button class="btn btn-xs btn-dark"    onclick="editCourse('${c.id}')">✏️</button>
        <button class="btn btn-xs ${c.is_published?'btn-secondary':'btn-success'}" onclick="toggleCourse('${c.id}',${c.is_published})">${c.is_published?'⏸':'▶'}</button>
        <button class="btn btn-xs btn-danger"  onclick="deleteCourse('${c.id}')">🗑️</button>
      </td>
    </tr>`).join('');
}

export function openAddCourse() {
  document.getElementById('courseModalContent').innerHTML = `
    <h3 style="margin-bottom:20px">+ Tambah Kursus Baru</h3>
    <div class="form-group"><label class="form-label">Judul Kursus</label><input id="nc-title" class="form-input" placeholder="Judul kursus"></div>
    <div class="form-group"><label class="form-label">Deskripsi</label><textarea id="nc-desc" class="form-input" rows="3" placeholder="Deskripsi singkat"></textarea></div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
      <div class="form-group"><label class="form-label">Kategori</label>
        <select id="nc-cat" class="form-input form-select">
          <option value="coding">💻 Coding</option><option value="design">🎨 Design</option>
          <option value="data">📊 Data</option><option value="soft">🧠 Soft Skill</option>
        </select></div>
      <div class="form-group"><label class="form-label">Emoji</label><input id="nc-emoji" class="form-input" value="📚"></div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
      <div class="form-group"><label class="form-label">Level</label>
        <select id="nc-diff" class="form-input form-select">
          <option>Pemula</option><option>Menengah</option><option>Lanjutan</option><option>Semua Level</option>
        </select></div>
      <div class="form-group"><label class="form-label">Warna (hex)</label><input id="nc-color" class="form-input" value="#f0e6d3"></div>
    </div>
    <button class="btn btn-primary btn-block" onclick="saveCourse()">✅ Tambah Kursus</button>`;
  document.getElementById('courseModal')?.classList.add('open');
}

export function editCourse(id) {
  const c = allCourses.find(x=>x.id===id); if(!c) return;
  document.getElementById('courseModalContent').innerHTML = `
    <h3 style="margin-bottom:20px">✏️ Edit Kursus</h3>
    <div class="form-group"><label class="form-label">Judul</label><input id="nc-title" class="form-input" value="${c.title}"></div>
    <div class="form-group"><label class="form-label">Deskripsi</label><textarea id="nc-desc" class="form-input" rows="3">${c.description||''}</textarea></div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
      <div class="form-group"><label class="form-label">Kategori</label>
        <select id="nc-cat" class="form-input form-select">
          <option value="coding" ${c.category==='coding'?'selected':''}>💻 Coding</option>
          <option value="design" ${c.category==='design'?'selected':''}>🎨 Design</option>
          <option value="data"   ${c.category==='data'  ?'selected':''}>📊 Data</option>
          <option value="soft"   ${c.category==='soft'  ?'selected':''}>🧠 Soft Skill</option>
        </select></div>
      <div class="form-group"><label class="form-label">Emoji</label><input id="nc-emoji" class="form-input" value="${c.emoji}"></div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
      <div class="form-group"><label class="form-label">Level</label>
        <select id="nc-diff" class="form-input form-select">
          <option ${c.difficulty==='Pemula'    ?'selected':''}>Pemula</option>
          <option ${c.difficulty==='Menengah'  ?'selected':''}>Menengah</option>
          <option ${c.difficulty==='Lanjutan'  ?'selected':''}>Lanjutan</option>
          <option ${c.difficulty==='Semua Level'?'selected':''}>Semua Level</option>
        </select></div>
      <div class="form-group"><label class="form-label">Warna</label><input id="nc-color" class="form-input" value="${c.color}"></div>
    </div>
    <button class="btn btn-primary btn-block" onclick="saveCourse('${id}')">💾 Simpan Perubahan</button>`;
  document.getElementById('courseModal')?.classList.add('open');
}

export async function saveCourse(id=null) {
  const title = document.getElementById('nc-title').value.trim();
  const desc  = document.getElementById('nc-desc').value.trim();
  const cat   = document.getElementById('nc-cat').value;
  const emoji = document.getElementById('nc-emoji').value.trim();
  const diff  = document.getElementById('nc-diff').value;
  const color = document.getElementById('nc-color').value.trim();
  if (!title) { toast('Judul wajib diisi!','error'); return; }
  const payload = {title,description:desc,category:cat,emoji,difficulty:diff,color};
  const {error} = id
    ? await supabase.from('courses').update(payload).eq('id',id)
    : await supabase.from('courses').insert(payload);
  if (error) { toast('Gagal: '+error.message,'error'); return; }
  toast(`Kursus berhasil ${id?'diperbarui':'ditambahkan'}! 🎉`,'success');
  document.getElementById('courseModal')?.classList.remove('open');
  await loadAdminCourses();
}

export async function toggleCourse(id,pub) {
  await supabase.from('courses').update({is_published:!pub}).eq('id',id);
  toast(`Kursus ${pub?'disembunyikan':'dipublikasi'} ✓`,'success');
  await loadAdminCourses();
}

export async function deleteCourse(id) {
  if(!confirm('Hapus kursus ini beserta semua materi?')) return;
  await supabase.from('courses').delete().eq('id',id);
  toast('Kursus dihapus','info');
  await loadAdminCourses();
}

// ---- LESSONS ----
export async function loadLessons() {
  const cid = document.getElementById('lessonCourseFilter')?.value;
  if (!cid) return;
  const {data} = await supabase.from('lessons').select('*').eq('course_id',cid).order('order_num');
  const el = document.getElementById('lessonsTable');
  if (!el) return;
  el.innerHTML = (data||[]).map(l=>`
    <tr>
      <td>${l.order_num}</td>
      <td>${l.title}</td>
      <td><span class="badge badge-green">+${l.xp_reward} XP</span></td>
      <td>${allCourses.find(c=>c.id===l.course_id)?.title||'-'}</td>
      <td style="display:flex;gap:6px">
        <button class="btn btn-xs btn-dark"   onclick="editLesson('${l.id}')">✏️</button>
        <button class="btn btn-xs btn-danger" onclick="deleteLesson('${l.id}')">🗑️</button>
      </td>
    </tr>`).join('') ||
    '<tr><td colspan="5" style="text-align:center;padding:30px;color:var(--ink-soft)">Belum ada materi</td></tr>';
}

export function openAddLesson() {
  const cid = document.getElementById('lessonCourseFilter')?.value||'';
  document.getElementById('lessonModalContent').innerHTML = `
    <h3 style="margin-bottom:20px">+ Tambah Materi</h3>
    <div class="form-group"><label class="form-label">Kursus</label>
      <select id="nl-course" class="form-input form-select">
        ${allCourses.map(c=>`<option value="${c.id}" ${c.id===cid?'selected':''}>${c.emoji} ${c.title}</option>`).join('')}
      </select></div>
    <div class="form-group"><label class="form-label">Judul Materi</label><input id="nl-title" class="form-input" placeholder="Judul pelajaran"></div>
    <div class="form-group"><label class="form-label">Konten / Deskripsi</label><textarea id="nl-content" class="form-input" rows="4" placeholder="Isi materi..."></textarea></div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
      <div class="form-group"><label class="form-label">Urutan</label><input id="nl-order" type="number" class="form-input" value="1" min="1"></div>
      <div class="form-group"><label class="form-label">XP Reward</label><input id="nl-xp" type="number" class="form-input" value="50" min="10"></div>
    </div>
    <button class="btn btn-primary btn-block" onclick="saveLesson()">✅ Tambah Materi</button>`;
  document.getElementById('lessonModal')?.classList.add('open');
}

export async function editLesson(id) {
  const {data:l} = await supabase.from('lessons').select('*').eq('id',id).single();
  if(!l) return;
  document.getElementById('lessonModalContent').innerHTML = `
    <h3 style="margin-bottom:20px">✏️ Edit Materi</h3>
    <div class="form-group"><label class="form-label">Kursus</label>
      <select id="nl-course" class="form-input form-select">
        ${allCourses.map(c=>`<option value="${c.id}" ${c.id===l.course_id?'selected':''}>${c.emoji} ${c.title}</option>`).join('')}
      </select></div>
    <div class="form-group"><label class="form-label">Judul Materi</label><input id="nl-title" class="form-input" value="${l.title}"></div>
    <div class="form-group"><label class="form-label">Konten</label><textarea id="nl-content" class="form-input" rows="4">${l.content||''}</textarea></div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
      <div class="form-group"><label class="form-label">Urutan</label><input id="nl-order" type="number" class="form-input" value="${l.order_num}"></div>
      <div class="form-group"><label class="form-label">XP Reward</label><input id="nl-xp" type="number" class="form-input" value="${l.xp_reward}"></div>
    </div>
    <button class="btn btn-primary btn-block" onclick="saveLesson('${id}')">💾 Simpan</button>`;
  document.getElementById('lessonModal')?.classList.add('open');
}

export async function saveLesson(id=null) {
  const course_id = document.getElementById('nl-course').value;
  const title     = document.getElementById('nl-title').value.trim();
  const content   = document.getElementById('nl-content').value.trim();
  const order_num = parseInt(document.getElementById('nl-order').value)||1;
  const xp_reward = parseInt(document.getElementById('nl-xp').value)||50;
  if (!title||!course_id) { toast('Isi semua field!','error'); return; }
  const payload = {course_id,title,content,order_num,xp_reward};
  const {error} = id
    ? await supabase.from('lessons').update(payload).eq('id',id)
    : await supabase.from('lessons').insert(payload);
  if (error) { toast('Gagal: '+error.message,'error'); return; }
  const {count} = await supabase.from('lessons').select('id',{count:'exact',head:true}).eq('course_id',course_id);
  await supabase.from('courses').update({total_lessons:count}).eq('id',course_id);
  toast(`Materi berhasil ${id?'diperbarui':'ditambahkan'}! 🎉`,'success');
  document.getElementById('lessonModal')?.classList.remove('open');
  await loadLessons();
  await loadAdminCourses();
}

export async function deleteLesson(id) {
  if(!confirm('Hapus materi ini?')) return;
  const {data:l} = await supabase.from('lessons').select('course_id').eq('id',id).single();
  await supabase.from('lessons').delete().eq('id',id);
  if(l?.course_id){
    const {count} = await supabase.from('lessons').select('id',{count:'exact',head:true}).eq('course_id',l.course_id);
    await supabase.from('courses').update({total_lessons:count}).eq('id',l.course_id);
  }
  toast('Materi dihapus','info');
  await loadLessons();
}

// ---- SESSIONS ----
export async function loadSessions() {
  const {data} = await supabase.from('study_sessions')
    .select('*,profiles(full_name,username,avatar_emoji)')
    .order('created_at',{ascending:false}).limit(100);
  const countEl = document.getElementById('sessionCount');
  if (countEl) countEl.textContent = `${data?.length||0} sesi terakhir`;
  const el = document.getElementById('sessionsTable');
  if (!el) return;
  el.innerHTML = (data||[]).map(s=>`
    <tr>
      <td><div class="user-avatar-cell"><div class="ua-emoji">${s.profiles?.avatar_emoji||'🐸'}</div><div class="ua-name">${s.profiles?.full_name||s.profiles?.username||'-'}</div></div></td>
      <td>${s.duration_minutes} menit</td>
      <td><span class="badge ${s.mode==='focus'?'badge-orange':'badge-blue'}">${s.mode==='focus'?'🧠 Fokus':'☕ Break'}</span></td>
      <td><strong>+${s.xp_earned} XP</strong></td>
      <td>${new Date(s.created_at).toLocaleDateString('id',{day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'})}</td>
    </tr>`).join('');
}