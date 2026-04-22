// js/courses.js — Course listing, enrollment & lesson logic
import { supabase, addXP, toast } from './supabase.js';

let _userId = null;
let _allCourses = [];
let _enrollments = [];
let _currentFilter = 'all';

export async function initCourses(userId) {
  _userId = userId;

  const [{ data: courses }, { data: enr }] = await Promise.all([
    supabase.from('courses').select('*').eq('is_published', true).order('created_at'),
    supabase.from('enrollments').select('course_id,progress,completed').eq('user_id', userId)
  ]);

  _allCourses  = courses  || [];
  _enrollments = enr || [];

  renderCourses();
  setupFilters();
}

// ---- RENDER ----
export function renderCourses() {
  const grid = document.getElementById('coursesGrid');
  if (!grid) return;

  const list = _currentFilter === 'all'
    ? _allCourses
    : _allCourses.filter(c => c.category === _currentFilter);

  if (!list.length) {
    grid.innerHTML = `<div class="empty-state">
      <div class="es-icon">📭</div>
      <p>Belum ada kursus di kategori ini.</p>
    </div>`;
    return;
  }

  grid.innerHTML = list.map(c => {
    const enr = _enrollments.find(e => e.course_id === c.id);
    return `
      <div class="course-card" onclick="openCourse('${c.id}')">
        <div class="course-thumb" style="background:${c.color}">
          ${c.emoji}
          ${enr ? `<span class="course-enrolled-badge">✓ Diambil</span>` : ''}
        </div>
        <div class="course-body">
          <div class="course-cat">${catLabel(c.category)}</div>
          <div class="course-title">${c.title}</div>
          <div class="course-meta">
            <span>📖 ${c.total_lessons} pelajaran</span>
            <span>📊 ${c.difficulty}</span>
          </div>
          <div class="course-footer">
            <span class="badge badge-green">🎁 Gratis</span>
            ${enr
              ? `<div class="course-progress-mini">
                   <div class="cpm-bar"><div class="cpm-fill" style="width:${enr.progress}%"></div></div>
                   <span>${enr.progress}%</span>
                 </div>`
              : `<span class="course-start-btn">Mulai →</span>`
            }
          </div>
        </div>
      </div>`;
  }).join('');

  // stagger animation
  setTimeout(() => grid.classList.add('loaded'), 50);
}

function setupFilters() {
  document.getElementById('filterTabs')?.addEventListener('click', e => {
    const btn = e.target.closest('.filter-btn');
    if (!btn) return;
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    _currentFilter = btn.dataset.filter;
    renderCourses();
  });
}

// ---- COURSE DETAIL MODAL ----
export async function openCourse(courseId) {
  const course = _allCourses.find(c => c.id === courseId);
  if (!course) return;

  const enr = _enrollments.find(e => e.course_id === courseId);

  const [{ data: lessons }, { data: done }] = await Promise.all([
    supabase.from('lessons').select('*').eq('course_id', courseId).order('order_num'),
    supabase.from('lesson_completions').select('lesson_id').eq('user_id', _userId)
  ]);

  const doneIds = new Set((done || []).map(d => d.lesson_id));

  document.getElementById('modalContent').innerHTML = `
    <div class="modal-course-header">
      <span class="modal-course-emoji">${course.emoji}</span>
      <div>
        <h3>${course.title}</h3>
        <div style="display:flex;gap:6px;margin-top:6px">
          <span class="badge badge-green">🎁 Gratis</span>
          <span class="badge badge-gray">${course.difficulty}</span>
          <span class="badge badge-blue">${catLabel(course.category)}</span>
        </div>
      </div>
    </div>
    <p class="modal-course-desc">${course.description || 'Mulai belajar sekarang!'}</p>

    ${!enr
      ? `<button class="btn btn-primary btn-block" style="margin-bottom:20px"
           onclick="enrollCourse('${courseId}')">📚 Daftar Kursus Ini — Gratis!</button>`
      : `<div class="modal-progress">
           <div class="progress-label"><span>Progress kamu</span><span>${enr.progress}%</span></div>
           <div class="progress-bar"><div class="progress-fill pf-tc" style="width:${enr.progress}%"></div></div>
           ${enr.completed ? '<p style="color:var(--sage-dark);font-weight:600;margin-top:8px">🎉 Kursus selesai!</p>' : ''}
         </div>`
    }

    <h4 style="margin-bottom:12px">📋 Materi (${lessons?.length || 0} pelajaran)</h4>
    <div class="lesson-list">
      ${(lessons || []).map((l, i) => `
        <div class="lesson-item ${doneIds.has(l.id) ? 'done' : ''}"
             onclick="completeLesson('${l.id}','${courseId}',${l.xp_reward})">
          <div class="li-num ${doneIds.has(l.id) ? 'done-num' : ''}">${doneIds.has(l.id) ? '✓' : i + 1}</div>
          <div class="li-body">
            <div class="li-title">${l.title}</div>
            ${l.content ? `<div class="li-desc">${l.content.slice(0, 80)}${l.content.length > 80 ? '...' : ''}</div>` : ''}
          </div>
          <span class="li-xp">+${l.xp_reward} XP</span>
        </div>`).join('')}
    </div>`;

  document.getElementById('courseModal')?.classList.add('open');
}

export async function enrollCourse(courseId) {
  const { error } = await supabase.from('enrollments').insert({
    user_id: _userId,
    course_id: courseId
  });
  if (error) { toast('Gagal mendaftar: ' + error.message, 'error'); return; }
  _enrollments.push({ course_id: courseId, progress: 0, completed: false });
  toast('Berhasil mendaftar kursus! 🎉', 'success');
  document.getElementById('courseModal')?.classList.remove('open');
  renderCourses();
}

export async function completeLesson(lessonId, courseId, xpReward) {
  // Check already done
  const { data: ex } = await supabase.from('lesson_completions').select('id')
    .eq('user_id', _userId).eq('lesson_id', lessonId).single();
  if (ex) { toast('Pelajaran ini sudah selesai ✓', 'info'); return; }

  const enr = _enrollments.find(e => e.course_id === courseId);
  if (!enr) { toast('Daftar kursus dulu ya!', 'error'); return; }

  // Save completion
  await supabase.from('lesson_completions').insert({ user_id: _userId, lesson_id: lessonId });

  // Recalculate progress
  const { data: totalLessons } = await supabase.from('lessons').select('id').eq('course_id', courseId);
  const { data: doneInCourse } = await supabase
    .from('lesson_completions')
    .select('lesson_id, lessons!inner(course_id)')
    .eq('user_id', _userId)
    .eq('lessons.course_id', courseId);

  const total = totalLessons?.length || 1;
  const doneCount = doneInCourse?.length || 0;
  const pct = Math.round((doneCount / total) * 100);
  const completed = pct >= 100;

  await supabase.from('enrollments')
    .update({ progress: pct, completed })
    .eq('user_id', _userId).eq('course_id', courseId);

  // Add XP
  const result = await addXP(_userId, xpReward);
  const topXP = document.getElementById('topXP');
  if (topXP && result) topXP.textContent = result.newXP.toLocaleString('id');

  // Update local state
  enr.progress = pct;
  enr.completed = completed;

  toast(
    `+${xpReward} XP! Pelajaran selesai 🎉${result?.leveledUp ? ' LEVEL UP! 🚀' : ''}${completed ? ' Kursus selesai! 🏆' : ''}`,
    'success'
  );

  // Close and re-open to refresh
  document.getElementById('courseModal')?.classList.remove('open');
  renderCourses();
}

// ---- UTILS ----
export function catLabel(cat) {
  return { coding: '💻 Coding', design: '🎨 Design', data: '📊 Data', soft: '🧠 Soft Skill' }[cat] || cat;
}