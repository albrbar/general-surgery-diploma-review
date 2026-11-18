/* GS Diploma Midterm — exam, practice, rapid, review and flashcards.
 * All questions and explanations come from ./pool.json (built by scripts/build-midterm-pool.py).
 * Progress lives in localStorage through `Store`; cloud sync can plug into Store later. */
(() => {
'use strict';

const APP_VERSION = '2026.11.18-5';
const KEY = 'gsd.midterm.v2';
const DAY = 864e5;
const INTERVALS = [0, 1, 3, 7, 14, 30]; // days per spaced-repetition box
const MASTERED_BOX = 4;
const LECTURE_GROUP = { anatomy: 'anatomy', pathology: 'pathology', micro: 'microbiology-immunology', pharm: 'pharmacology', principles: 'principles-of-surgery' };
const MODES = {
  exam: { icon: '📝', label: 'Full exam', desc: '40 questions weighted like the midterm. Results at the end.' },
  practice: { icon: '🎯', label: 'Practice', desc: 'Pick sections and topics. Instant feedback, no pressure.' },
  rapid: { icon: '⚡', label: 'Rapid 10', desc: '10 quick questions, 20 s each. Beat your best.' },
  review: { icon: '🔁', label: 'Smart review', desc: 'Questions you missed or that are due today.' },
  flash: { icon: '🃏', label: 'Flashcards', desc: 'Recall the answer, flip, rate yourself.' },
};
const BADGES = [
  { id: 'first', e: '🌱', name: 'First step', desc: 'Answer your first question' },
  { id: 'exam1', e: '📝', name: 'Exam taker', desc: 'Finish a full exam' },
  { id: 'exam80', e: '🏆', name: 'Distinction', desc: 'Score 80%+ in a full exam' },
  { id: 'perfect10', e: '⚡', name: 'Lightning', desc: 'Perfect Rapid 10' },
  { id: 'combo10', e: '🔥', name: 'On fire', desc: '10 correct in a row' },
  { id: 'c100', e: '💯', name: 'Century', desc: '100 correct answers' },
  { id: 'c500', e: '🧠', name: 'Big brain', desc: '500 correct answers' },
  { id: 'streak3', e: '📅', name: '3-day streak', desc: 'Meet your daily goal 3 days running' },
  { id: 'streak7', e: '🗓️', name: 'Week warrior', desc: '7-day streak' },
  { id: 'flash50', e: '🃏', name: 'Card shark', desc: 'Review 50 flashcards' },
  { id: 'explorer', e: '🧭', name: 'Explorer', desc: 'Try all five modes' },
  { id: 'master', e: '🎓', name: 'Section master', desc: 'Master 50 questions in one section' },
];

// ---------- State & storage ----------
const fresh = () => ({
  v: 2, profile: null, guest: false,
  settings: { theme: 'auto', text: 100, examTimer: true, seconds: 35, practiceTimer: false, goal: 20, sound: false, vibrate: false, motion: true, unverified: true },
  srs: {}, xp: 0, days: {}, badges: {}, history: [], modesUsed: {}, bestCombo: 0, flashCount: 0, bestRapid: 0, session: null,
});

const Store = {
  load() {
    try {
      const s = JSON.parse(localStorage.getItem(KEY));
      if (s && s.v === 2) return Object.assign(fresh(), s, { settings: Object.assign(fresh().settings, s.settings || {}) });
    } catch (e) { /* fall through */ }
    const s = fresh();
    try { // migrate the profile from the previous midterm page
      const old = JSON.parse(localStorage.getItem('gsdiploma.midterm.student.v1'));
      if (old && old.name) s.profile = { name: old.name, mobile: old.mobile || '', createdAt: Date.now() };
    } catch (e) { /* ignore */ }
    return s;
  },
  save() {
    try { localStorage.setItem(KEY, JSON.stringify(S)); }
    catch (e) { toast('Progress could not be saved (storage blocked or full). Export a backup.'); }
    // Cloud sync (Supabase) can hook in here later: upsert S for the signed-in user.
  },
};

let S = Store.load();
let POOL = null, BYID = new Map(), LECTURES = [];
let screen = 'home', timerId = null, timeLeft = 0, practiceOpts = null;

// ---------- Helpers ----------
const $ = (sel, root = document) => root.querySelector(sel);
const main = () => $('#main');
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const today = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);
const letter = (i) => 'ABCDE'[i];
const sectionLabel = (id) => POOL.sections.find((s) => s.id === id)?.label || id;
const usable = (q) => S.settings.unverified || !q.flag;
const reduceMotion = () => !S.settings.motion || matchMedia('(prefers-reduced-motion: reduce)').matches;

function toast(msg, ms = 3200) {
  const t = document.createElement('div');
  t.className = 'toast'; t.textContent = msg;
  const box = $('#toasts'); box.appendChild(t);
  while (box.children.length > 2) box.firstElementChild.remove(); // keep the screen clear
  setTimeout(() => t.remove(), ms);
}

function beep(ok) {
  if (S.settings.vibrate && !ok && navigator.vibrate) navigator.vibrate(120);
  if (!S.settings.sound) return;
  try {
    const ctx = beep.ctx || (beep.ctx = new (window.AudioContext || window.webkitAudioContext)());
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.frequency.value = ok ? 880 : 220; o.type = ok ? 'sine' : 'square';
    g.gain.setValueAtTime(0.08, ctx.currentTime); g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.25);
    o.connect(g).connect(ctx.destination); o.start(); o.stop(ctx.currentTime + 0.25);
  } catch (e) { /* audio unavailable */ }
}

function confetti() {
  if (reduceMotion()) return;
  const c = $('#confetti'), ctx = c.getContext('2d');
  c.width = innerWidth; c.height = innerHeight;
  const colors = ['#0f766e', '#2dd4bf', '#facc15', '#fb7185', '#60a5fa', '#a78bfa'];
  const parts = Array.from({ length: 140 }, () => ({ x: Math.random() * c.width, y: -20 - Math.random() * c.height * 0.4, vx: (Math.random() - 0.5) * 4, vy: 2 + Math.random() * 4, r: 4 + Math.random() * 5, a: Math.random() * 6, col: colors[(Math.random() * colors.length) | 0] }));
  const end = performance.now() + 2600;
  (function frame(now) {
    ctx.clearRect(0, 0, c.width, c.height);
    parts.forEach((p) => { p.x += p.vx; p.y += p.vy; p.vy += 0.05; p.a += 0.1; ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.a); ctx.fillStyle = p.col; ctx.fillRect(-p.r / 2, -p.r / 2, p.r, p.r * 0.6); ctx.restore(); });
    if (now < end) requestAnimationFrame(frame); else ctx.clearRect(0, 0, c.width, c.height);
  })(performance.now());
}

// ---------- Progress: XP, levels, streaks, SRS ----------
const levelOf = (xp) => Math.floor(Math.sqrt(xp / 60)) + 1;
const levelFloor = (lv) => 60 * (lv - 1) ** 2;

function streak() {
  const goal = S.settings.goal;
  let n = 0; const d = new Date();
  if ((S.days[today(d)] || 0) < goal) d.setDate(d.getDate() - 1); // today still in progress
  while ((S.days[today(d)] || 0) >= goal) { n++; d.setDate(d.getDate() - 1); }
  return n;
}

function gainXP(n) {
  const before = levelOf(S.xp);
  S.xp += n;
  if (S.session) S.session.xp = (S.session.xp || 0) + n;
  const after = levelOf(S.xp);
  if (after > before) { toast(`⬆️ Level ${after}! Keep going.`); confetti(); }
}

function grade(q, correct, { countDay = true } = {}) {
  const now = Date.now();
  const r = S.srs[q.id] || { n: 0, c: 0, w: 0, b: 0, due: 0 };
  r.n++; r.last = now;
  if (correct) { r.c++; r.b = Math.min(5, r.b + 1); } else { r.w++; r.b = 1; }
  r.due = now + INTERVALS[r.b] * DAY;
  S.srs[q.id] = r;
  if (countDay) { const k = today(); S.days[k] = (S.days[k] || 0) + 1; }
}

function isDue(id) { const r = S.srs[id]; return !!r && r.due <= Date.now(); }
function dueList() { return POOL.questions.filter((q) => usable(q) && isDue(q.id)).sort((a, b) => S.srs[a.id].due - S.srs[b.id].due); }

function priority(q) {
  const r = S.srs[q.id], rnd = Math.random();
  if (!r) return 2 + rnd;                        // unseen
  if (r.due <= Date.now()) return 3 + rnd + (r.b <= 1 ? 0.5 : 0); // due, missed first
  if (r.b >= MASTERED_BOX) return 0.2 + rnd * 0.5; // mastered: rarely
  return 1 + rnd;
}
const pick = (list, n) => list.map((q) => [priority(q), q]).sort((a, b) => b[0] - a[0]).slice(0, n).map((x) => x[1]);

function totals() {
  let correct = 0, answered = 0;
  for (const r of Object.values(S.srs)) { correct += r.c; answered += r.n; }
  return { correct, answered };
}

function sectionStats() {
  return POOL.sections.map((s) => {
    const qs = POOL.questions.filter((q) => q.s === s.id && usable(q));
    let seen = 0, mastered = 0, c = 0, n = 0;
    qs.forEach((q) => { const r = S.srs[q.id]; if (r) { seen++; c += r.c; n += r.n; if (r.b >= MASTERED_BOX) mastered++; } });
    return { ...s, total: qs.length, seen, mastered, acc: pct(c, n), answered: n };
  });
}

function weakTopics(limit = 3) {
  const by = {};
  POOL.questions.forEach((q) => {
    const r = S.srs[q.id]; if (!r) return;
    const k = q.s + '|' + q.t; const t = by[k] || (by[k] = { s: q.s, t: q.t, c: 0, n: 0 });
    t.c += r.c; t.n += r.n;
  });
  return Object.values(by).filter((t) => t.n >= 3).map((t) => ({ ...t, acc: pct(t.c, t.n) })).filter((t) => t.acc < 75).sort((a, b) => a.acc - b.acc).slice(0, limit);
}

function award(id) {
  if (S.badges[id]) return;
  S.badges[id] = Date.now();
  const b = BADGES.find((x) => x.id === id);
  toast(`${b.e} Badge unlocked: ${b.name}`, 4200);
  confetti();
}

function checkBadges() {
  const t = totals();
  if (t.answered >= 1) award('first');
  if (t.correct >= 100) award('c100');
  if (t.correct >= 500) award('c500');
  if (S.bestCombo >= 10) award('combo10');
  const st = streak();
  if (st >= 3) award('streak3');
  if (st >= 7) award('streak7');
  if (S.flashCount >= 50) award('flash50');
  if (Object.keys(MODES).every((m) => S.modesUsed[m])) award('explorer');
  if (sectionStats().some((s) => s.mastered >= 50)) award('master');
}

// ---------- Sessions ----------
function startSession(mode, opts = {}) {
  let ids = [], timed = false, seconds = S.settings.seconds, feedback = 'instant', title = MODES[mode]?.label || 'Practice';
  const pool = POOL.questions.filter(usable);
  if (mode === 'exam') {
    POOL.sections.forEach((s) => { ids.push(...shuffle(pick(pool.filter((q) => q.s === s.id), s.examCount)).map((q) => q.id)); });
    timed = S.settings.examTimer; feedback = 'end';
  } else if (mode === 'practice') {
    let list = pool.filter((q) => opts.sections.includes(q.s) && (!opts.topic || q.t === opts.topic));
    if (opts.focus === 'unseen') list = list.filter((q) => !S.srs[q.id]);
    if (opts.focus === 'mistakes') list = list.filter((q) => S.srs[q.id]?.w > 0);
    ids = pick(list, opts.count).map((q) => q.id);
    timed = S.settings.practiceTimer;
    if (opts.topic) title = `Practice · ${opts.topic}`;
  } else if (mode === 'rapid') {
    ids = pick(pool, 10).map((q) => q.id); timed = true; seconds = 20;
  } else if (mode === 'review') {
    const due = dueList();
    const missed = pool.filter((q) => S.srs[q.id]?.b === 1 && !isDue(q.id));
    ids = [...due, ...missed].slice(0, 20).map((q) => q.id);
  } else if (mode === 'flash') {
    const due = dueList().slice(0, 20);
    ids = [...due, ...pick(pool.filter((q) => !due.includes(q)), 20 - due.length)].map((q) => q.id);
  } else if (mode === 'retry') {
    ids = opts.ids; title = 'Retry missed questions';
  }
  if (!ids.length) { toast(mode === 'review' ? 'Nothing to review yet — answer some questions first.' : 'No questions match that choice.'); return; }
  S.session = { mode, title, ids, ans: {}, idx: 0, start: Date.now(), timed, seconds, feedback, combo: 0, xp: 0, graded: {}, flipped: false, opts };
  S.modesUsed[mode === 'retry' ? 'practice' : mode] = true;
  Store.save();
  go('quiz');
}

const cur = () => BYID.get(S.session.ids[S.session.idx]);

function choose(i) {
  const s = S.session, q = cur();
  if (s.feedback === 'instant' && s.ans[q.id] !== undefined) return;
  s.ans[q.id] = i;
  if (s.feedback === 'instant') settle(q, i === q.a);
  else stopTimer();
  Store.save(); renderQuiz();
  if (s.feedback === 'instant') { const fb = $('.feedback'); if (fb) fb.scrollIntoView({ block: 'nearest', behavior: reduceMotion() ? 'auto' : 'smooth' }); }
}

function settle(q, ok) { // instant-feedback grading
  const s = S.session;
  stopTimer();
  grade(q, ok);
  s.graded[q.id] = ok;
  if (ok) {
    s.combo++; S.bestCombo = Math.max(S.bestCombo, s.combo);
    gainXP(10 + (q.d === 'hard' ? 5 : 0) + (s.mode === 'rapid' ? Math.max(0, Math.ceil(timeLeft / 4)) : 0));
    if (s.combo > 0 && s.combo % 5 === 0) { gainXP(10); toast(`🔥 Combo ×${s.combo}! +10 XP`); }
  } else { s.combo = 0; gainXP(2); }
  beep(ok);
  checkBadges();
}

function move(delta) {
  const s = S.session; stopTimer();
  s.idx = Math.max(0, Math.min(s.ids.length - 1, s.idx + delta));
  s.flipped = false; Store.save(); renderQuiz(true);
}

function jump(i) { S.session.idx = i; S.session.flipped = false; stopTimer(); Store.save(); renderQuiz(true); }

function next() {
  const s = S.session;
  if (s.idx < s.ids.length - 1) return move(1);
  finish();
}

function finish(force = false) {
  const s = S.session; stopTimer();
  if (s.feedback === 'end' && !force) {
    const open = s.ids.filter((id) => s.ans[id] === undefined || s.ans[id] === null).length;
    if (open && !confirm(`${open} question(s) are unanswered and will score 0. Finish the exam now?`)) return;
  }
  const qs = s.ids.map((id) => BYID.get(id));
  if (s.feedback === 'end') qs.forEach((q) => { const ok = s.ans[q.id] === q.a; grade(q, ok); s.graded[q.id] = ok; if (ok) gainXP(10); });
  const correct = qs.filter((q) => s.graded[q.id] ?? s.ans[q.id] === q.a).length;
  const p = pct(correct, qs.length);
  const sec = {};
  qs.forEach((q) => { const x = sec[q.s] || (sec[q.s] = [0, 0]); x[1]++; if (s.ans[q.id] === q.a) x[0]++; });
  if (s.mode === 'exam') { gainXP(25); award('exam1'); if (p >= 80) award('exam80'); }
  if (s.mode === 'rapid') { S.bestRapid = Math.max(S.bestRapid, correct); if (correct === 10) { gainXP(30); award('perfect10'); } }
  if (s.mode === 'flash') s.result = { flash: true };
  S.history.unshift({ mode: s.mode, title: s.title, at: Date.now(), score: correct, total: qs.length, pct: p, sec, secs: Math.round((Date.now() - s.start) / 1000) });
  S.history = S.history.slice(0, 50);
  s.done = true; s.result = { correct, total: qs.length, pct: p, sec };
  checkBadges();
  Store.save();
  if (p >= 80 && s.mode !== 'flash') confetti();
  go('results');
}

function flashGrade(g) { // 0 again, 1 hard, 2 good, 3 easy
  const s = S.session, q = cur(), now = Date.now();
  const r = S.srs[q.id] || { n: 0, c: 0, w: 0, b: 0, due: 0 };
  r.n++; r.last = now;
  if (g === 0) { r.w++; r.b = 1; r.due = now + 10 * 60e3; }
  else { r.c++; r.b = Math.min(5, g === 1 ? Math.max(1, r.b) : r.b + (g === 3 ? 2 : 1)); r.due = now + INTERVALS[r.b] * DAY; }
  S.srs[q.id] = r;
  const k = today(); S.days[k] = (S.days[k] || 0) + 1;
  s.ans[q.id] = g === 0 ? -1 : q.a; s.graded[q.id] = g > 0;
  S.flashCount++; gainXP(3);
  checkBadges();
  if (s.idx < s.ids.length - 1) { s.idx++; s.flipped = false; Store.save(); renderQuiz(true); }
  else { Store.save(); finish(true); }
}

// ---------- Timer ----------
function stopTimer() { clearInterval(timerId); timerId = null; }

function startTimer() {
  stopTimer();
  const s = S.session, q = cur();
  const answered = s.ans[q.id] !== undefined && s.ans[q.id] !== null;
  const el = $('#timer');
  if (!s.timed || s.mode === 'flash' || answered || (s.feedback === 'instant' && s.ans[q.id] !== undefined)) { if (el) { el.textContent = s.timed ? '—' : 'No timer'; el.className = 'timer off'; } return; }
  timeLeft = s.seconds;
  const paint = () => { if (!el) return; el.textContent = `${timeLeft}s`; el.className = 'timer' + (timeLeft <= 5 ? ' urgent' : ''); };
  paint();
  timerId = setInterval(() => {
    if (document.hidden || $('#settings').open) return; // pause while away or in settings
    timeLeft--; paint();
    if (timeLeft > 0) return;
    stopTimer();
    if (s.feedback === 'instant') { s.ans[q.id] = null; settle(q, false); Store.save(); renderQuiz(); toast('⏱️ Time up — counted as missed.'); }
    else {
      s.ans[q.id] = null; Store.save(); toast('⏱️ Time up — marked as skipped. You can come back to it.');
      const nextOpen = s.ids.findIndex((id, i) => i > s.idx && s.ans[id] === undefined);
      if (nextOpen > -1) jump(nextOpen); else renderQuiz();
    }
  }, 1000);
}

// ---------- Rendering ----------
function markScreen() {
  document.body.dataset.screen = screen;
  document.querySelectorAll('.tabbar [data-nav]').forEach((b) => b.setAttribute('aria-current', b.dataset.nav === screen || (b.dataset.nav === 'practice' && screen === 'setup') ? 'page' : 'false'));
}
function go(to) {
  screen = to; stopTimer(); markScreen();
  ({ home: renderHome, setup: renderSetup, quiz: renderQuiz, results: renderResults })[to](true);
  window.scrollTo({ top: 0, behavior: reduceMotion() ? 'auto' : 'smooth' });
}

function renderChips() {
  const lv = levelOf(S.xp);
  $('#levelChip').textContent = `Lv ${lv} · ${S.xp} XP`;
  $('#streakChip').textContent = `🔥 ${streak()}`;
}

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
}

function renderHome() {
  renderChips();
  const lv = levelOf(S.xp), lo = levelFloor(lv), hi = levelFloor(lv + 1);
  const done = S.days[today()] || 0, goal = S.settings.goal;
  const due = dueList().length, stats = sectionStats(), weak = weakTopics(), t = totals();
  const sess = S.session && !S.session.done ? S.session : null;
  const name = S.profile?.name;
  main().innerHTML = `
  ${!S.profile && !S.guest ? `
  <section class="card" aria-labelledby="welcomeT">
    <h2 id="welcomeT">Welcome 👋</h2>
    <p class="muted">Your progress is saved on this device. Add your name so reports carry it — the mobile number is optional.</p>
    <form id="profileForm" class="grid pform">
      <div><label class="field" for="pName">Name</label><input class="input" id="pName" autocomplete="name" required></div>
      <div><label class="field" for="pMobile">Mobile (optional)</label><input class="input" id="pMobile" inputmode="tel" autocomplete="tel"></div>
      <div class="btn-row"><button class="btn">Save</button><button class="btn ghost" type="button" id="guestBtn">Skip</button></div>
    </form>
  </section>` : ''}
  <section class="card install" data-install hidden><div><b>📲 Install the app</b><br><small class="muted">Full screen, home-screen icon, works offline.</small></div><button class="btn">Install</button></section>
  <section class="card hero" aria-label="Your progress">
    <div class="hero-row">
      <div style="flex:1;min-width:220px">
        <p class="muted" style="margin:0">${greeting()}${name ? ', ' + esc(name) : ''}</p>
        <h1>Level ${lv} · ${S.xp} XP</h1>
        <div class="xpbar" role="progressbar" aria-label="XP to next level" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct(S.xp - lo, hi - lo)}"><span style="width:${pct(S.xp - lo, hi - lo)}%"></span></div>
        <p class="muted" style="font-size:.85rem">${hi - S.xp} XP to level ${lv + 1} · 🔥 ${streak()}-day streak · ${t.correct} correct answers</p>
      </div>
      <div class="ring" style="--p:${Math.min(100, pct(done, goal))}" role="img" aria-label="Today ${done} of ${goal} questions"><b>${done}/${goal}<br>today</b></div>
    </div>
  </section>
  ${sess ? `<section class="card" style="border-color:var(--brand)"><div class="hero-row"><div><h2>${MODES[sess.mode]?.icon || '🎯'} Resume: ${esc(sess.title)}</h2><p class="muted">Question ${sess.idx + 1} of ${sess.ids.length} · ${Object.keys(sess.ans).length} answered</p></div><div class="btn-row"><button class="btn" data-act="resume">Resume</button><button class="btn ghost" data-act="discard">Discard</button></div></div></section>` : ''}
  <div class="section-head"><h2>Choose a mode</h2><span class="muted">${POOL.total.toLocaleString()} questions</span></div>
  <div class="grid modes">
    ${Object.entries(MODES).map(([k, m]) => `<button class="mode mode-${k}" data-mode="${k}"><span class="ico" aria-hidden="true">${m.icon}</span><strong>${m.label}</strong><small>${m.desc}</small>${k === 'review' && due ? `<span class="badge-n">${due} due</span>` : ''}${k === 'rapid' && S.bestRapid ? `<span class="badge-n">Best ${S.bestRapid}/10</span>` : ''}</button>`).join('')}
  </div>
  <div class="section-head"><h2>Coach</h2></div>
  <section class="card coach">
    ${t.answered < 10 ? '<p>Start with a <b>Full exam</b> or a <b>Rapid 10</b> — after a few answers I will point out your weak topics here.</p>' : `
    <ul style="padding-left:18px;margin:0">
      ${due ? `<li><b>${due}</b> question(s) are due for review today. <button class="btn ghost" data-mode="review">Review now</button></li>` : '<li>Nothing is due — great time to learn new questions.</li>'}
      ${weak.map((w) => `<li>Weak spot: <b>${esc(w.t)}</b> (${esc(sectionLabel(w.s))}) — ${w.acc}% correct. <button class="btn ghost" data-topic="${esc(w.s)}|${esc(w.t)}">Practise</button></li>`).join('')}
      ${done < goal ? `<li>${goal - done} more question(s) to reach today's goal${streak() ? ' and keep your streak' : ''}.</li>` : '<li>Daily goal reached ✅</li>'}
    </ul>`}
  </section>
  <div class="section-head"><h2>Sections</h2><span class="legend"><span><i style="background:var(--brand)"></i>mastered</span><span><i style="background:color-mix(in srgb,var(--brand) 40%,transparent)"></i>seen</span></span></div>
  <section class="card">
    ${stats.map((s) => `<div class="stat-row"><strong>${esc(s.label)}</strong><span class="muted" style="font-size:.85rem">${s.mastered} mastered · ${s.seen}/${s.total} seen${s.answered ? ` · ${s.acc}%` : ''}</span>
      <div class="meter" aria-hidden="true"><i class="m1" style="width:${(s.mastered / s.total) * 100}%"></i><i class="m2" style="width:${((s.seen - s.mastered) / s.total) * 100}%"></i></div></div>`).join('')}
  </section>
  <div class="section-head"><h2>Badges</h2><span class="muted">${Object.keys(S.badges).length}/${BADGES.length}</span></div>
  <div class="grid badges">${BADGES.map((b) => `<div class="bdg ${S.badges[b.id] ? '' : 'locked'}"><span class="e" aria-hidden="true">${b.e}</span><b>${b.name}</b><small>${b.desc}</small></div>`).join('')}</div>
  ${S.history.length ? `<div class="section-head"><h2>Recent sessions</h2></div><section class="card">${S.history.slice(0, 6).map((h) => `<div class="stat-row"><span>${MODES[h.mode]?.icon || '🎯'} ${esc(h.title)}<br><small class="muted">${new Date(h.at).toLocaleString()}</small></span><strong>${h.score}/${h.total} · ${h.pct}%</strong></div>`).join('')}</section>` : ''}
  ${LECTURES.length ? `<div class="section-head"><h2>Lecture sources</h2></div><section class="card">${LECTURES.map((g) => `<details><summary><b>${esc(g.label)}</b> <span class="muted">(${g.links.length})</span></summary><p class="muted">${esc(g.note)}</p><div class="pills">${g.links.map((l) => `<a class="pill" href="./lecture.html?group=${encodeURIComponent(g.id)}&lecture=${encodeURIComponent(l.label)}" target="_blank" rel="noopener">${esc(l.label)} ↗</a>`).join('')}</div></details>`).join('')}</section>` : ''}
  <div class="section-head"><h2>Your data</h2></div>
  <section class="card">
    <p class="muted">Progress is stored in this browser${S.profile ? ` for <b>${esc(S.profile.name)}</b>` : ''}. Export a backup to move it to another device.</p>
    <div class="btn-row"><button class="btn subtle" data-act="export">⬇️ Export backup</button><label class="btn subtle" for="importFile">⬆️ Import backup</label><input type="file" id="importFile" accept="application/json" hidden>${S.profile ? '<button class="btn subtle" data-act="profile">✏️ Edit name</button>' : ''}<button class="btn danger" data-act="reset">Reset progress</button></div>
  </section>
  <p class="foot">App version ${APP_VERSION}. Questions and explanations come only from the course banks (lecture banks, GS diploma Drive banks, Day 1–16) and Telegram GS group 2. Telegram answers were inferred from the explanation posted with each question and are marked <b>Unverified</b>. ${POOL.withExplanation.toLocaleString()} of ${POOL.total.toLocaleString()} questions have a source explanation.</p>`;

  const f = $('#profileForm');
  if (f) {
    f.onsubmit = (e) => { e.preventDefault(); S.profile = { name: $('#pName').value.trim(), mobile: $('#pMobile').value.trim(), createdAt: Date.now() }; Store.save(); toast('Saved. Good luck!'); renderHome(); };
    $('#guestBtn').onclick = () => { S.guest = true; Store.save(); renderHome(); };
  }
  $('#importFile').onchange = importBackup;
  paintInstall();
}

function renderSetup() {
  const o = practiceOpts || (practiceOpts = { sections: POOL.sections.map((s) => s.id), topic: '', count: 20, focus: 'smart' });
  const topics = [...new Set(POOL.questions.filter((q) => o.sections.includes(q.s) && usable(q)).map((q) => q.t))].sort();
  if (o.topic && !topics.includes(o.topic)) o.topic = '';
  const available = POOL.questions.filter((q) => usable(q) && o.sections.includes(q.s) && (!o.topic || q.t === o.topic)).length;
  main().innerHTML = `
  <section class="card">
    <h1>🎯 Practice</h1>
    <p class="muted">Instant feedback with the source explanation after every answer. Questions you miss come back in Smart review.</p>
    <label class="field" id="secL">Sections</label>
    <div class="pills" role="group" aria-labelledby="secL">${POOL.sections.map((s) => `<button class="pill" data-sec="${s.id}" aria-pressed="${o.sections.includes(s.id)}">${esc(s.label)} · ${s.count}</button>`).join('')}</div>
    <label class="field" for="topicSel">Topic</label>
    <select id="topicSel" class="input"><option value="">All topics (${topics.length})</option>${topics.map((t) => `<option ${t === o.topic ? 'selected' : ''}>${esc(t)}</option>`).join('')}</select>
    <label class="field" id="cntL">Number of questions</label>
    <div class="pills" role="group" aria-labelledby="cntL">${[10, 20, 40, 80].map((n) => `<button class="pill" data-count="${n}" aria-pressed="${o.count === n}">${n}</button>`).join('')}</div>
    <label class="field" id="focL">Focus</label>
    <div class="pills" role="group" aria-labelledby="focL">${[['smart', 'Smart mix'], ['unseen', 'Only new'], ['mistakes', 'My mistakes']].map(([k, l]) => `<button class="pill" data-focus="${k}" aria-pressed="${o.focus === k}">${l}</button>`).join('')}</div>
    <p class="muted" style="margin-top:14px">${available.toLocaleString()} question(s) available.</p>
    <div class="btn-row"><button class="btn" id="startPractice" ${o.sections.length ? '' : 'disabled'}>Start practice</button><button class="btn ghost" data-act="home">Back</button></div>
  </section>`;
  main().querySelectorAll('[data-sec]').forEach((b) => b.onclick = () => { const id = b.dataset.sec; o.sections = o.sections.includes(id) ? o.sections.filter((x) => x !== id) : [...o.sections, id]; renderSetup(); });
  main().querySelectorAll('[data-count]').forEach((b) => b.onclick = () => { o.count = +b.dataset.count; renderSetup(); });
  main().querySelectorAll('[data-focus]').forEach((b) => b.onclick = () => { o.focus = b.dataset.focus; renderSetup(); });
  $('#topicSel').onchange = (e) => { o.topic = e.target.value; renderSetup(); };
  $('#startPractice').onclick = () => startSession('practice', { ...o });
}

function explanationBlock(q, ok, chosen) {
  const link = q.url || `./lecture.html?group=${LECTURE_GROUP[q.s]}`;
  const head = ok ? '✅ Correct!' : chosen === null || chosen === undefined ? `⏱️ Not answered — the answer is ${letter(q.a)}.` : `❌ Not quite — the answer is ${letter(q.a)}.`;
  return `<div class="feedback ${ok ? 'ok' : 'bad'}"><strong>${head}</strong>
    ${q.e ? `<p style="margin:0">${esc(q.e)}</p>` : '<p class="muted" style="margin:0">No written explanation in the source file for this question — open the lecture below.</p>'}
    ${q.flag ? '<p class="muted" style="margin:8px 0 0">⚠️ Unverified: this answer was inferred from the explanation posted in the Telegram group.</p>' : ''}
    <div class="src">Source: ${esc(q.src || 'Course question bank')} · <a href="${esc(link)}" target="_blank" rel="noopener">Open lecture ↗</a></div></div>`;
}

function renderQuiz(focus) {
  const s = S.session;
  if (!s) return go('home');
  if (s.done) return go('results');
  renderChips();
  const q = cur(), a = s.ans[q.id], n = s.ids.length;
  const answeredCount = s.ids.filter((id) => s.ans[id] !== undefined && s.ans[id] !== null).length;
  const meta = `<div class="qmeta"><span class="tag sec sec-${q.s}">${esc(sectionLabel(q.s))}</span><span class="tag">${esc(q.t)}</span><span class="tag ${q.d === 'hard' ? 'hard' : q.d === 'easy' ? 'easy' : ''}">${q.d}</span>${q.flag ? '<span class="tag flag" title="Answer inferred from the Telegram explanation">Unverified</span>' : ''}</div>`;
  const bar = `<div class="quizbar"><div class="qb-top"><strong>${MODES[s.mode]?.icon || '🎯'} ${esc(s.title)} · ${s.idx + 1}/${n}</strong>
    ${s.feedback === 'instant' && s.combo >= 2 ? `<span class="combo" aria-label="Combo ${s.combo}">🔥×${s.combo}</span>` : ''}
    <span id="timer" class="timer off" aria-live="off">—</span>
    <button class="btn ghost" style="min-height:36px;padding:4px 12px" data-act="quit">Exit</button></div>
    <div class="progress" aria-hidden="true"><span style="width:${pct(s.mode === 'exam' ? answeredCount : s.idx + (a !== undefined ? 1 : 0), n)}%"></span></div></div>`;

  if (s.mode === 'flash') {
    main().innerHTML = `${bar}<article class="card flash">${meta}<h2 class="stem" id="stem" tabindex="-1">${esc(q.q)}</h2>
      ${s.flipped ? `<div class="answer"><strong>${letter(q.a)}. ${esc(q.o[q.a])}</strong>${q.e ? `<p style="margin:8px 0 0">${esc(q.e)}</p>` : ''}${q.flag ? '<p class="muted" style="margin:6px 0 0">⚠️ Unverified Telegram answer</p>' : ''}<div class="src muted" style="font-size:.8rem;margin-top:6px">Source: ${esc(q.src)}</div></div>
      </article><div class="actionbar"><div class="grades" role="group" aria-label="How well did you know it?">
        <button class="btn danger" data-g="0">Again<small>10 min · 1</small></button><button class="btn subtle" data-g="1">Hard<small>${INTERVALS[Math.max(1, S.srs[q.id]?.b || 1)]} d · 2</small></button>
        <button class="btn subtle" data-g="2">Good<small>${INTERVALS[Math.min(5, (S.srs[q.id]?.b || 0) + 1)]} d · 3</small></button><button class="btn" data-g="3">Easy<small>${INTERVALS[Math.min(5, (S.srs[q.id]?.b || 0) + 2)]} d · 4</small></button></div></div>`
      : `<p class="muted">Think of the answer, then flip the card.</p><details><summary class="muted">Show the options</summary><ol type="A">${q.o.map((o) => `<li>${esc(o)}</li>`).join('')}</ol></details></article><div class="actionbar"><button class="btn" data-act="flip" style="flex:1">Flip card</button></div>`}`;
    main().querySelectorAll('[data-g]').forEach((b) => b.onclick = () => flashGrade(+b.dataset.g));
    if (focus) $('#stem').focus();
    return;
  }

  const reveal = s.feedback === 'instant' && a !== undefined;
  const opts = q.o.map((o, i) => {
    let cls = 'opt', mark = '';
    if (reveal) { if (i === q.a) { cls += ' ok'; mark = '✓'; } else if (i === a) { cls += ' bad'; mark = '✗'; } }
    else if (a === i) cls += ' sel';
    return `<button class="${cls}" data-opt="${i}" ${reveal ? 'disabled' : ''} aria-pressed="${a === i}"><span class="l">${letter(i)}</span><span class="tx">${esc(o)}</span><span class="mark" aria-hidden="true">${mark}</span></button>`;
  }).join('');
  const last = s.idx === n - 1;
  main().innerHTML = `${bar}<article class="card">${meta}<h2 class="stem" id="stem" tabindex="-1">${esc(q.q)}</h2>
    <div class="options" role="group" aria-label="Answer options">${opts}</div>
    <div aria-live="polite">${reveal ? explanationBlock(q, a === q.a, a) : ''}${s.feedback === 'end' && a === null ? '<p class="muted" style="margin-top:12px">⏱️ Time ran out on this one — you can still answer it.</p>' : ''}</div>
    <p class="kbd">Keys: <kbd>1</kbd>–<kbd>${q.o.length}</kbd> answer · <kbd>Enter</kbd> next · <kbd>←</kbd> back</p>
  </article>
  <div class="actionbar"><button class="btn subtle" data-act="prev" ${s.idx === 0 ? 'disabled' : ''} aria-label="Previous question">←</button>
    ${s.feedback === 'end' ? `<button class="btn ghost" data-act="finish">Finish</button>` : ''}
    <button class="btn next" style="flex:1" data-act="next" ${s.feedback === 'instant' && !reveal ? 'disabled' : ''}>${last ? 'See results' : 'Next →'}</button></div>
  ${s.feedback === 'end' ? `<section class="card"><details><summary><b>Question map</b> <span class="muted">· ${answeredCount}/${n} answered</span></summary>
    <div class="nums">${s.ids.map((id, i) => `<button class="num ${s.ans[id] === null ? 'skipped' : s.ans[id] !== undefined ? 'answered' : ''} ${i === s.idx ? 'cur' : ''}" data-jump="${i}" aria-label="Question ${i + 1}${s.ans[id] === null ? ', skipped' : s.ans[id] !== undefined ? ', answered' : ''}">${i + 1}</button>`).join('')}</div></details></section>` : ''}`;
  main().querySelectorAll('[data-opt]').forEach((b) => b.onclick = () => choose(+b.dataset.opt));
  main().querySelectorAll('[data-jump]').forEach((b) => b.onclick = () => jump(+b.dataset.jump));
  startTimer();
  if (focus) $('#stem').focus({ preventScroll: true });
}

function renderResults() {
  const s = S.session;
  if (!s || !s.result) return go('home');
  renderChips();
  const r = s.result, qs = s.ids.map((id) => BYID.get(id));
  const missed = qs.filter((q) => !s.graded[q.id]);
  const rating = s.mode === 'flash' ? 'Deck complete' : r.pct >= 85 ? 'Excellent readiness 🌟' : r.pct >= 70 ? 'Good progress 👍' : r.pct >= 50 ? 'Needs targeted revision' : 'Priority revision recommended';
  const mins = Math.round((Date.now() - s.start) / 60000);
  main().innerHTML = `
  <section class="card">
    <div class="score-big"><div class="ring" style="--p:${r.pct}"><b>${r.pct}%</b></div>
      <div><p class="muted" style="margin:0">${MODES[s.mode]?.icon || '🎯'} ${esc(s.title)}${S.profile ? ' · ' + esc(S.profile.name) : ''}</p><h1>${r.correct} / ${r.total} — ${rating}</h1>
      <p class="muted">+${s.xp || 0} XP · ${mins || '<1'} min · ${new Date().toLocaleString()}</p></div></div>
    <div class="btn-row" style="margin-top:12px">
      ${missed.length && s.mode !== 'flash' ? `<button class="btn" data-act="retry">Retry ${missed.length} missed</button>` : ''}
      <button class="btn ${missed.length ? 'ghost' : ''}" data-mode="${s.mode === 'retry' ? 'review' : s.mode}">${s.mode === 'exam' ? 'New exam' : 'Go again'}</button>
      <button class="btn subtle" data-act="print">🖨️ Print / PDF</button><button class="btn subtle" data-act="home">Home</button></div>
  </section>
  ${s.mode !== 'flash' ? `<section class="card"><h2>By section</h2>${Object.entries(r.sec).map(([id, [c, t]]) => `<div class="stat-row"><strong>${esc(sectionLabel(id))}</strong><span>${c}/${t} · ${pct(c, t)}%</span><div class="meter"><i class="m1" style="width:${pct(c, t)}%;background:${pct(c, t) >= 70 ? 'var(--ok)' : pct(c, t) >= 50 ? 'var(--gold)' : 'var(--bad)'}"></i></div></div>`).join('')}</section>` : ''}
  ${missed.length && s.mode !== 'flash' ? `<section class="card"><h2>Review your mistakes</h2><p class="muted">These are scheduled to come back in Smart review tomorrow.</p>
    ${missed.map((q) => { const a = s.ans[q.id]; return `<details class="review"><summary>${esc(q.q)}</summary>
      <p class="ans-line bad">Your answer: ${a === undefined || a === null ? 'not answered' : `${letter(a)}. ${esc(q.o[a])}`}</p>
      <p class="ans-line ok">Correct: ${letter(q.a)}. ${esc(q.o[q.a])}</p>${explanationBlock(q, false, a).replace(/<strong>.*?<\/strong>/, '')}</details>`; }).join('')}</section>` : ''}`;
}

// ---------- Settings dialog ----------
function openSettings() {
  const d = $('#settings'), st = S.settings;
  d.innerHTML = `<form method="dialog">
    <h2 id="settingsTitle">Settings</h2>
    <label class="field" for="sTheme">Theme</label>
    <select id="sTheme" class="input">${[['auto', 'Match device'], ['light', 'Light'], ['dark', 'Dark']].map(([v, l]) => `<option value="${v}" ${st.theme === v ? 'selected' : ''}>${l}</option>`).join('')}</select>
    <label class="field" for="sText">Text size: <span id="sTextV">${st.text}%</span></label>
    <input id="sText" type="range" min="85" max="150" step="5" value="${st.text}" style="width:100%">
    <label class="field" for="sSec">Exam time per question</label>
    <select id="sSec" class="input">${[20, 35, 60, 90].map((v) => `<option value="${v}" ${st.seconds === v ? 'selected' : ''}>${v} seconds</option>`).join('')}</select>
    <label class="field" for="sGoal">Daily goal</label>
    <select id="sGoal" class="input">${[10, 20, 40, 80].map((v) => `<option value="${v}" ${st.goal === v ? 'selected' : ''}>${v} questions</option>`).join('')}</select>
    <label class="check"><input type="checkbox" id="sExamT" ${st.examTimer ? 'checked' : ''}> Timer in Full exam</label>
    <label class="check"><input type="checkbox" id="sPracT" ${st.practiceTimer ? 'checked' : ''}> Timer in Practice</label>
    <label class="check"><input type="checkbox" id="sUnv" ${st.unverified ? 'checked' : ''}> Include Telegram questions with unverified answers</label>
    <label class="check"><input type="checkbox" id="sSound" ${st.sound ? 'checked' : ''}> Sound effects</label>
    <label class="check"><input type="checkbox" id="sVib" ${st.vibrate ? 'checked' : ''}> Vibrate on wrong answer</label>
    <label class="check"><input type="checkbox" id="sMotion" ${st.motion ? 'checked' : ''}> Animations and confetti</label>
    <div class="btn-row" style="margin-top:14px"><button class="btn">Done</button><button class="btn subtle" type="button" id="forceUpdate">Update app</button></div><p class="muted" style="font-size:.8rem;margin:10px 0 0">Version ${APP_VERSION}</p></form>`;
  const apply = () => {
    st.theme = $('#sTheme').value; st.text = +$('#sText').value; st.seconds = +$('#sSec').value; st.goal = +$('#sGoal').value;
    st.examTimer = $('#sExamT').checked; st.practiceTimer = $('#sPracT').checked; st.unverified = $('#sUnv').checked;
    st.sound = $('#sSound').checked; st.vibrate = $('#sVib').checked; st.motion = $('#sMotion').checked;
    $('#sTextV').textContent = st.text + '%';
    applyLook(); Store.save();
  };
  d.querySelectorAll('select,input').forEach((el) => el.addEventListener('input', apply));
  $('#forceUpdate').onclick = async () => { // clear offline copies and reload the newest version (progress is kept)
    try { const regs = await navigator.serviceWorker?.getRegistrations?.() || []; await Promise.all(regs.map((r) => r.unregister())); const keys = await caches.keys(); await Promise.all(keys.filter((k) => k.startsWith('gs-midterm-') || k.startsWith('gsdiploma-')).map((k) => caches.delete(k))); } catch (e) { /* ignore */ }
    location.replace('./?v=' + Date.now());
  };
  d.onclose = () => { if (screen === 'home' || screen === 'setup') go(screen); else renderChips(); };
  d.showModal();
}

function applyLook() {
  const root = document.documentElement;
  if (S.settings.theme === 'auto') delete root.dataset.theme; else root.dataset.theme = S.settings.theme;
  root.style.setProperty('--scale', S.settings.text / 100);
}

// ---------- Backup ----------
function exportBackup() {
  const { session, ...data } = S;
  const blob = new Blob([JSON.stringify({ app: 'gsd-midterm', exportedAt: new Date().toISOString(), data }, null, 1)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = `gs-midterm-backup-${today()}.json`; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  toast('Backup downloaded.');
}

function importBackup(e) {
  const file = e.target.files[0]; if (!file) return;
  file.text().then((txt) => {
    const j = JSON.parse(txt);
    if (j.app !== 'gsd-midterm' || !j.data || j.data.v !== 2) throw new Error('not a backup');
    if (!confirm('Replace the progress on this device with the backup?')) return;
    S = Object.assign(fresh(), j.data, { settings: Object.assign(fresh().settings, j.data.settings || {}), session: null });
    Store.save(); applyLook(); toast('Backup restored.'); go('home');
  }).catch(() => toast('That file is not a valid GS Midterm backup.'));
}

// ---------- Events ----------
document.addEventListener('click', (e) => {
  const t = e.target.closest('[data-mode],[data-act],[data-topic]');
  if (!t) return;
  if (t.dataset.mode) { const m = t.dataset.mode; if (S.session && !S.session.done && !confirm('Start a new session? Your unfinished one will be discarded.')) return; if (m === 'practice') return go('setup'); return startSession(m); }
  if (t.dataset.topic) { const cut = t.dataset.topic.indexOf('|'), sec = t.dataset.topic.slice(0, cut), topic = t.dataset.topic.slice(cut + 1); return startSession('practice', { sections: [sec], topic, count: 20, focus: 'smart' }); }
  const act = t.dataset.act;
  if (act === 'resume') go('quiz');
  else if (act === 'discard') { S.session = null; Store.save(); renderHome(); }
  else if (act === 'home') go('home');
  else if (act === 'prev') move(-1);
  else if (act === 'next') next();
  else if (act === 'finish') finish();
  else if (act === 'flip') { S.session.flipped = true; renderQuiz(); }
  else if (act === 'quit') { Store.save(); go('home'); toast('Saved — resume any time from Home.'); }
  else if (act === 'retry') startSession('retry', { ids: S.session.ids.filter((id) => !S.session.graded[id]) });
  else if (act === 'print') window.print();
  else if (act === 'export') exportBackup();
  else if (act === 'profile') { const n = prompt('Your name', S.profile.name); if (n && n.trim()) { S.profile.name = n.trim(); Store.save(); renderHome(); } }
  else if (act === 'reset') { if (confirm('Erase all progress, XP and badges on this device? Export a backup first if unsure.')) { const keep = { settings: S.settings, profile: S.profile }; S = Object.assign(fresh(), keep); Store.save(); go('home'); } }
});

document.addEventListener('keydown', (e) => {
  if (screen !== 'quiz' || !S.session || $('#settings').open || /INPUT|SELECT|TEXTAREA/.test(e.target.tagName) || e.ctrlKey || e.metaKey || e.altKey) return;
  const s = S.session, q = cur(), k = e.key.toLowerCase();
  if (s.mode === 'flash') {
    if (!s.flipped && (k === ' ' || k === 'f' || k === 'enter')) { e.preventDefault(); s.flipped = true; renderQuiz(); }
    else if (s.flipped && /^[1-4]$/.test(k)) flashGrade(+k - 1);
    return;
  }
  const idx = /^[1-5]$/.test(k) ? +k - 1 : 'abcde'.indexOf(k);
  if (idx >= 0 && idx < q.o.length && k.length === 1) { e.preventDefault(); if (!(s.feedback === 'instant' && s.ans[q.id] !== undefined)) choose(idx); }
  else if ((k === 'enter' || k === 'arrowright') && !e.target.closest('button')) { if (s.feedback === 'end' || s.ans[q.id] !== undefined) { e.preventDefault(); next(); } }
  else if (k === 'arrowright') { if (s.feedback === 'end' || s.ans[q.id] !== undefined) next(); }
  else if (k === 'arrowleft' && s.idx > 0) move(-1);
});

$('#homeBtn').onclick = () => go('home');
document.querySelectorAll('.tabbar [data-nav]').forEach((b) => b.onclick = () => {
  const n = b.dataset.nav;
  if (n === 'settings') return openSettings();
  if (n === 'home') return go('home');
  if (S.session && !S.session.done && !confirm('Start a new session? Your unfinished one will be discarded.')) return;
  if (n === 'practice') return go('setup');
  startSession(n);
});

// ---------- Install as an app (Android / desktop Chrome, iOS instructions) ----------
let installEvt = null;
const standalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
function paintInstall() {
  const show = !standalone() && (installEvt || isIOS);
  document.querySelectorAll('[data-install]').forEach((el) => { el.hidden = !show; });
}
window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); installEvt = e; paintInstall(); });
window.addEventListener('appinstalled', () => { installEvt = null; paintInstall(); toast('📲 Installed! Open GS Midterm from your home screen.'); });
document.addEventListener('click', (e) => {
  if (!e.target.closest('[data-install]')) return;
  if (installEvt) { installEvt.prompt(); installEvt.userChoice.finally(() => { installEvt = null; paintInstall(); }); }
  else if (isIOS) alert('To install: tap the Share button in Safari, then “Add to Home Screen”.');
});
document.addEventListener('visibilitychange', () => { if (!document.hidden && screen === 'home') renderChips(); });

// ---------- Boot ----------
applyLook();
Promise.all([
  fetch('./pool.json').then((r) => { if (!r.ok) throw new Error('pool'); return r.json(); }),
  fetch('./lecture-links.json').then((r) => (r.ok ? r.json() : { groups: [] })).catch(() => ({ groups: [] })),
]).then(([pool, lectures]) => {
  POOL = pool; POOL.questions.forEach((q) => BYID.set(q.id, q));
  LECTURES = lectures.groups || [];
  if (S.session && S.session.ids.some((id) => !BYID.has(id))) S.session = null; // bank changed
  go('home');
  const shortcut = new URLSearchParams(location.search).get('go'); // home-screen shortcuts
  if (shortcut && MODES[shortcut] && !(S.session && !S.session.done)) { history.replaceState(null, '', './'); shortcut === 'practice' ? go('setup') : startSession(shortcut); }
}).catch(() => { main().innerHTML = '<div class="card empty"><h2>Could not load the question bank</h2><p class="muted">Check your connection and reload. Once loaded, it works offline.</p><button class="btn" onclick="location.reload()">Reload</button></div>'; });

if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
  let reloaded = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => { // new version took over: reload once
    if (reloaded || (S.session && !S.session.done && screen === 'quiz')) return;
    reloaded = true; location.reload();
  });
  navigator.serviceWorker.register('./sw.js', { scope: './', updateViaCache: 'none' })
    .then((reg) => { reg.update(); document.addEventListener('visibilitychange', () => { if (!document.hidden) reg.update(); }); })
    .catch(() => {});
}
})();
