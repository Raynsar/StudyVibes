# StudyVibes UI Stuck Loading Fix - TODO

Status: ✅ Plan Approved. ✅ Core auth fixes complete.

## Breakdown of Approved Plan

### 1. Core Auth Fixes (js/supabase.js) ✅
- ✅ 15s timeout + fetch AbortController.
- ✅ getSession() timeout/error handling.
- ✅ requireAuth() try-catch + offline mock user.
- ✅ getProfile() fallback profile.
- ✅ retryAuth() + isOfflineMode flag.

### 2. Optimistic UI + Error Handling (All HTML pages)
- [ ] dashboard.html
- [ ] courses.html
- [ ] leaderboard.html
- [ ] profile.html
- [ ] admin.html

### 3. UI Utils (js/ui.js)
- [ ] Add showError()

### 4. Testing & Validation
- [ ] Test pages
- [ ] Console errors

**Next Step:** Read js/ui.js → add error utils → optimistic UI in HTMLs.

**Progress:** 5/14 ✅

