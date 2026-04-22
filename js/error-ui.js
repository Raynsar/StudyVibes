// js/error-ui.js - Error boundaries & optimistic UI for StudyVibes
// Handles offline mode, loader hiding, retry logic

// Early loader hide (unblock UI before auth)
document.addEventListener('DOMContentLoaded', function() {
  const loader = document.querySelector('.loader-bar');
  const loadingState = document.getElementById('loadingState');
  const mainContent = document.getElementById('mainContent');
  
  if (loader) loader.style.display = 'none';
  if (loadingState) loadingState.style.display = 'none';
  if (mainContent) mainContent.style.display = 'block';
});

// Global error handler for page inits
window.safeInit = async function(initFn, pageName) {
  try {
    await initFn();
  } catch (e) {
    console.error('[' + pageName + '] Init failed:', e);
    showErrorScreen(pageName, e.message);
  }
};

// Error screen UI
window.showErrorScreen = function(page, err) {
  const content = document.querySelector('.page-content');
  if (!content) return;
  
  content.innerHTML = 
    '<div style="text-align:center;padding:60px 20px;max-width:500px;margin:0 auto;">' +
    '<div style="font-size:6rem;margin-bottom:20px;color:var(--ink-soft);">⚠️</div>' +
    '<h2 style="margin-bottom:12px;color:var(--ink);">Terjadi Kesalahan</h2>' +
    '<p style="color:var(--ink-soft);margin-bottom:24px;font-size:1.1rem;">' + (err || 'Gagal memuat data') + '</p>' +
    '<div style="background:var(--warm);border-radius:var(--radius);padding:24px;margin-bottom:24px;">' +
    '<p style="margin:0 0 12px 0;font-weight:600;">Status: ' + (window.isSupabaseOffline ? '🌐 Offline' : 'Data Error') + '</p>' +
    '<p style="margin:0;font-size:.9rem;color:var(--ink-soft);">Coba refresh atau periksa koneksi internet.</p>' +
    '</div>' +
    '<div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap;">' +
    '<button class="btn btn-primary" onclick="retryAuth()">🔄 Coba Lagi</button>' +
    '<button class="btn btn-secondary" onclick="location.reload()">⟳ Refresh</button>' +
    (window.isSupabaseOffline ? '<button class="btn btn-outline" onclick="showOfflineMode()">Lanjut Offline</button>' : '') +
    '</div></div>';
};

// Offline mode toggle
window.showOfflineMode = function() {
  if (typeof toast === 'function') toast('Offline mode aktif - fitur terbatas');
  document.querySelectorAll('[data-requires-db]').forEach(function(el) { el.style.display = 'none'; });
};

// Polyfill toast if missing
if (typeof window.toast === 'undefined') {
  window.toast = function(msg, type) {
    if (type === undefined) type = 'info';
    const t = document.getElementById('toast');
    if (t) {
      t.textContent = msg;
      t.className = 'show ' + type;
      setTimeout(function() { t.className = ''; }, 3200);
    } else {
      alert(msg);
    }
  };
}

