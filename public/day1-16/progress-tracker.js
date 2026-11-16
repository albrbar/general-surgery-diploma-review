/* GSDIPLOMAREVISION Day 1–16 progress tracker.
 * Local-first by design: progress is never lost when the network is unavailable.
 * Configure window.GSDIPLOMA_PROGRESS_CONFIG for server sync.
 */
(() => {
  'use strict';
  const STORAGE_KEY = 'gsdiploma.day16.progress.v2';
  const PROFILE_KEY = 'gsdiploma.day16.student.v1';
  const AUTH_KEY = 'gsdiploma.supabase.session.v1';
  const config = window.GSDIPLOMA_PROGRESS_CONFIG || {};
  const dayTemplate = () => ({ answered: 0, correct: 0, total: 80, lastQuestion: 0, completed: false, updatedAt: null });
  const emptyState = () => ({ version: 2, days: Object.fromEntries(Array.from({ length: 16 }, (_, i) => [String(i + 1), dayTemplate()])), lastDay: 1, lastSync: null, syncStatus: 'local-only' });
  const read = (key, fallback) => { try { return JSON.parse(localStorage.getItem(key) || 'null') || fallback; } catch { return fallback; } };
  let state = read(STORAGE_KEY, emptyState());
  let lastSnapshot = '';
  let syncTimer = null;

  const normalize = () => {
    if (!state.days || typeof state.days !== 'object') state = emptyState();
    for (let i = 1; i <= 16; i += 1) state.days[String(i)] = { ...dayTemplate(), ...(state.days[String(i)] || {}) };
    state.version = 2;
    return state;
  };
  normalize();
  const save = () => localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  const getSession = () => read(AUTH_KEY, null);
  const getProfile = () => read(PROFILE_KEY, null);
  const getStudentId = () => getSession()?.user?.id || getProfile()?.mobile || getProfile()?.name || null;
  const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  function activeDay() {
    const tab = document.querySelector('.section-tab.active .section-tab-day');
    const match = tab?.textContent?.match(/\d+/);
    return match ? Math.max(1, Math.min(16, Number(match[0]))) : Number(state.lastDay || 1);
  }

  function currentSnapshot() {
    const day = activeDay();
    const progressText = document.querySelector('.progress-panel strong')?.textContent || '';
    const match = progressText.match(/(\d+)\s+of\s+(\d+)/i);
    const answered = match ? Number(match[1]) : document.querySelectorAll('.question-card.has-answer').length;
    const total = match ? Number(match[2]) : 80;
    const scoreText = document.querySelector('.score-summary .score-number')?.textContent || '0';
    const correct = Number((scoreText.match(/\d+/) || ['0'])[0]);
    const numbers = Array.from(document.querySelectorAll('.question-card .question-number')).map((x) => Number(x.textContent) || 0);
    return { day, answered: Math.max(0, answered), correct: Math.max(0, correct), total: Math.max(1, total), lastQuestion: Math.max(0, ...numbers) };
  }

  function collect() {
    const snap = currentSnapshot();
    const key = JSON.stringify(snap);
    if (key === lastSnapshot) return;
    lastSnapshot = key;
    const item = state.days[String(snap.day)] || dayTemplate();
    state.lastDay = snap.day;
    state.days[String(snap.day)] = { ...item, ...snap, completed: snap.answered >= snap.total, updatedAt: new Date().toISOString() };
    save();
    render();
    queueSync();
  }

  function totals() {
    const days = Object.values(state.days);
    return { answered: days.reduce((n, x) => n + Number(x.answered || 0), 0), correct: days.reduce((n, x) => n + Number(x.correct || 0), 0), completed: days.filter((x) => x.completed).length };
  }

  function render() {
    const root = document.getElementById('gsdiplomaProgressWidget');
    if (!root) return;
    const t = totals();
    root.querySelector('[data-total]').textContent = `${t.completed}/16 days`;
    root.querySelector('[data-answered]').textContent = `${t.answered} answered`;
    root.querySelector('[data-correct]').textContent = `${t.correct} correct`;
    root.querySelector('[data-sync]').textContent = state.syncStatus === 'synced' ? 'Synced to server' : state.syncStatus === 'syncing' ? 'Syncing…' : state.syncStatus === 'error' ? 'Waiting to sync' : 'Saved on this device';
    root.querySelector('[data-sync]').className = `gsd-sync-status ${state.syncStatus}`;
    root.querySelector('[data-days]').innerHTML = Array.from({ length: 16 }, (_, i) => {
      const d = state.days[String(i + 1)];
      const percent = Math.min(100, Math.round((Number(d.answered || 0) / Math.max(1, Number(d.total || 80))) * 100));
      return `<button type="button" class="gsd-day-chip ${d.completed ? 'complete' : percent ? 'started' : ''}" data-day="${i + 1}" title="Day ${i + 1}: ${percent}% complete"><b>${String(i + 1).padStart(2, '0')}</b><span>${percent}%</span></button>`;
    }).join('');
    root.querySelectorAll('[data-day]').forEach((button) => button.addEventListener('click', () => {
      const target = document.querySelectorAll('.section-tab')[Number(button.dataset.day) - 1];
      target?.click();
      document.querySelector('.exam-main')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }));
  }

  function ensureWidget() {
    if (document.getElementById('gsdiplomaProgressWidget')) return;
    const style = document.createElement('style');
    style.textContent = `.gsd-progress-fab{position:fixed;right:18px;bottom:18px;z-index:80;border:0;border-radius:999px;padding:11px 15px;background:#0e5a66;color:#fff;box-shadow:0 12px 30px rgba(7,54,61,.25);font:800 12px/1.1 Inter,system-ui,sans-serif;cursor:pointer}.gsd-progress-panel{position:fixed;right:18px;bottom:68px;z-index:79;width:min(390px,calc(100vw - 36px));padding:16px;border:1px solid #cfe2df;border-radius:18px;background:#fff;color:#173f47;box-shadow:0 20px 60px rgba(7,54,61,.2);font:13px/1.35 Inter,system-ui,sans-serif}.gsd-progress-panel[hidden]{display:none}.gsd-progress-head{display:flex;align-items:flex-start;justify-content:space-between;gap:14px}.gsd-progress-head h2{margin:0;color:#0e5a66;font-size:16px}.gsd-progress-head p{margin:3px 0 0;color:#668086;font-size:11px}.gsd-progress-close{border:0;background:transparent;color:#668086;font-size:22px;cursor:pointer}.gsd-progress-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:7px;margin:13px 0}.gsd-progress-stat{padding:9px;border-radius:10px;background:#f1f8f7}.gsd-progress-stat b{display:block;color:#0e5a66;font-size:16px}.gsd-progress-stat span{color:#668086;font-size:10px}.gsd-progress-days{display:grid;grid-template-columns:repeat(8,1fr);gap:6px}.gsd-day-chip{display:grid;gap:3px;place-items:center;padding:7px 2px;border:1px solid #d4e7e4;border-radius:9px;background:#fff;color:#587278;cursor:pointer}.gsd-day-chip b{font-size:11px}.gsd-day-chip span{font-size:9px}.gsd-day-chip.started{border-color:#e5bd62;background:#fffaf0;color:#956a14}.gsd-day-chip.complete{border-color:#54ad9e;background:#eaf8f5;color:#0e6b61}.gsd-sync-status{display:block;margin-top:12px;padding:8px 10px;border-radius:9px;background:#f5f8f8;color:#61767a;font-size:11px}.gsd-sync-status.synced{background:#eaf8f5;color:#0e6b61}.gsd-sync-status.error{background:#fff5e8;color:#97601a}@media(max-width:560px){.gsd-progress-fab{right:12px;bottom:12px}.gsd-progress-panel{right:12px;bottom:61px}.gsd-progress-days{grid-template-columns:repeat(8,1fr)}}`;
    document.head.appendChild(style);
    const button = document.createElement('button'); button.className = 'gsd-progress-fab'; button.type = 'button'; button.textContent = 'Progress · 16 days'; button.setAttribute('aria-expanded', 'false');
    const panel = document.createElement('aside'); panel.className = 'gsd-progress-panel'; panel.id = 'gsdiplomaProgressWidget'; panel.hidden = true; panel.innerHTML = `<div class="gsd-progress-head"><div><h2>Student progress · 16 days</h2><p>Saved continuously as you answer</p></div><button class="gsd-progress-close" type="button" aria-label="Close">×</button></div><div class="gsd-progress-stats"><div class="gsd-progress-stat"><b data-total>0/16 days</b><span>completed</span></div><div class="gsd-progress-stat"><b data-answered>0 answered</b><span>across path</span></div><div class="gsd-progress-stat"><b data-correct>0 correct</b><span>recorded</span></div></div><div class="gsd-progress-days" data-days></div><span class="gsd-sync-status" data-sync>Saved on this device</span>`;
    button.addEventListener('click', () => { panel.hidden = !panel.hidden; button.setAttribute('aria-expanded', String(!panel.hidden)); render(); }); panel.querySelector('.gsd-progress-close').addEventListener('click', () => { panel.hidden = true; button.setAttribute('aria-expanded', 'false'); }); document.body.append(button, panel); render();
  }

  async function syncToServer() {
    const session = getSession();
    const studentId = getStudentId();
    const endpoint = config.endpoint || (config.supabaseUrl && config.table ? `${config.supabaseUrl.replace(/\/$/, '')}/rest/v1/${config.table}` : '');
    if (!endpoint || !studentId || !session?.access_token) { state.syncStatus = 'local-only'; save(); render(); return; }
    state.syncStatus = 'syncing'; save(); render();
    try {
      const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}`, Prefer: 'resolution=merge-duplicates,return=minimal' };
      if (config.publishableKey) headers.apikey = config.publishableKey;
      if (config.supabaseUrl && config.table) {
        const remoteResponse = await fetch(`${endpoint}?user_id=eq.${encodeURIComponent(session.user?.id || studentId)}`, { headers });
        if (remoteResponse.ok) {
          const remoteRows = await remoteResponse.json();
          remoteRows.forEach((row) => {
            const local = state.days[String(row.day_number)];
            if (!local || !local.updatedAt || new Date(row.updated_at).getTime() > new Date(local.updatedAt).getTime()) {
              state.days[String(row.day_number)] = { ...dayTemplate(), answered: Number(row.answered || 0), correct: Number(row.correct || 0), total: Number(row.total || 80), lastQuestion: Number(row.last_question || 0), completed: Boolean(row.completed), updatedAt: row.updated_at || null };
            }
          });
          save();
          render();
        }
      }
      const rows = Object.entries(state.days).map(([day, value]) => ({ user_id: session.user?.id || studentId, day_number: Number(day), answered: Number(value.answered || 0), correct: Number(value.correct || 0), total: Number(value.total || 80), last_question: Number(value.lastQuestion || 0), completed: Boolean(value.completed), updated_at: value.updatedAt || new Date().toISOString() }));
      const response = await fetch(endpoint, { method: 'POST', headers, body: JSON.stringify(rows) });
      if (!response.ok) throw new Error(`Sync ${response.status}`);
      state.lastSync = new Date().toISOString(); state.syncStatus = 'synced'; save(); render();
    } catch (error) { state.syncStatus = 'error'; save(); render(); console.warn('[GSDIPLOMA] Progress sync deferred:', error); }
  }
  function queueSync() { clearTimeout(syncTimer); syncTimer = setTimeout(syncToServer, 900); }

  function start() {
    ensureWidget();
    const observer = new MutationObserver(() => collect()); observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'aria-pressed'] });
    document.addEventListener('click', () => setTimeout(collect, 60), true);
    setInterval(collect, 1200);
    setInterval(() => { if (state.syncStatus !== 'synced') syncToServer(); }, 30000);
    collect();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true }); else start();
})();
