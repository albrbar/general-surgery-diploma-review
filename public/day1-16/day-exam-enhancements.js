(() => {
  'use strict';

  const PROGRESS_KEY = 'gsdiploma.day16.progress.v2';
  let focusMode = false;
  let paused = false;
  let seconds = 35;
  let timerId = null;
  let autoNextId = null;
  let noticeTimer = null;
  let activeCard = null;
  let scheduled = false;

  const readProgress = () => {
    try { return JSON.parse(localStorage.getItem(PROGRESS_KEY) || 'null'); } catch { return null; }
  };

  const dayNumber = () => {
    const text = document.querySelector('.section-tab.active .section-tab-day')?.textContent || '1';
    return Math.max(1, Math.min(16, Number((text.match(/\d+/) || ['1'])[0])));
  };

  const cards = () => Array.from(document.querySelectorAll('.question-card'));
  const currentPage = () => document.querySelector('.page-number.current')?.textContent || '1';
  const nextPage = () => Array.from(document.querySelectorAll('.page-navigation .nav-arrow.next, .bottom-navigation .nav-arrow.next')).find((button) => !button.disabled);

  const updateTimer = () => {
    const timer = document.getElementById('gsdExamTimer');
    if (!timer) return;
    timer.textContent = focusMode ? `${seconds}s` : 'Focus mode off';
    timer.classList.toggle('urgent', focusMode && seconds <= 10);
    timer.classList.toggle('paused', paused);
  };

  const stopTimer = () => { clearInterval(timerId); timerId = null; };
  const stopAutoNext = () => { clearTimeout(autoNextId); autoNextId = null; };

  const showNotice = (text, kind = '') => {
    const notice = document.getElementById('gsdExamNotice');
    if (!notice) return;
    notice.textContent = text;
    notice.className = `gsd-exam-notice ${kind}`;
    clearTimeout(noticeTimer);
    noticeTimer = setTimeout(() => { notice.textContent = ''; notice.className = 'gsd-exam-notice'; }, 5200);
  };

  const startTimer = () => {
    stopTimer();
    if (!focusMode || paused) return;
    seconds = 35;
    updateTimer();
    timerId = setInterval(() => {
      if (paused) return;
      seconds -= 1;
      updateTimer();
      if (seconds <= 0) {
        stopTimer();
        showNotice('Time expired. This question receives 0; moving on in 7 seconds.', 'warning');
        queueNext(7000);
      }
    }, 1000);
  };

  const firstUnanswered = (list) => list.find((card) => !card.classList.contains('has-answer')) || list[0];

  const applyFocus = () => {
    const list = cards();
    if (!focusMode || !list.length) {
      list.forEach((card) => { card.hidden = false; card.classList.remove('focus-active'); });
      activeCard = null;
      return;
    }
    if (!activeCard || !list.includes(activeCard) || (activeCard.classList.contains('has-answer') && !autoNextId)) activeCard = firstUnanswered(list);
    list.forEach((card) => {
      const visible = card === activeCard;
      card.hidden = !visible;
      card.classList.toggle('focus-active', visible);
    });
    if (activeCard && !activeCard.classList.contains('has-answer') && !paused && !timerId) startTimer();
    updateTimer();
  };

  const moveToNextQuestion = () => {
    stopAutoNext();
    const list = cards();
    const index = Math.max(0, list.indexOf(activeCard));
    const next = list.slice(index + 1).find((card) => !card.classList.contains('has-answer'));
    if (next) {
      activeCard = next;
      startTimer();
      applyFocus();
      return;
    }
    const pageButton = nextPage();
    if (pageButton) {
      pageButton.click();
      showNotice('Page complete. Loading the next page…', 'success');
      setTimeout(() => { activeCard = firstUnanswered(cards()); applyFocus(); startTimer(); }, 160);
    } else {
      showNotice('This day page is complete. Use Finish day to review your score.', 'success');
      stopTimer();
    }
  };

  const queueNext = (delay = 7000) => {
    stopAutoNext();
    paused = false;
    updateTimer();
    autoNextId = setTimeout(moveToNextQuestion, delay);
  };

  const updateScore = () => {
    const progress = readProgress();
    const day = progress?.days?.[String(dayNumber())] || { answered: 0, correct: 0, total: 80 };
    const total = Math.max(1, Number(day.total || 80));
    const answered = Number(day.answered || 0);
    const correct = Number(day.correct || 0);
    const score = document.getElementById('gsdExamScore');
    const progressText = document.getElementById('gsdExamProgress');
    if (score) score.textContent = `${correct} / ${total}`;
    if (progressText) progressText.textContent = `${answered} answered · ${Math.round((correct / total) * 100)}% correct`;
  };

  const finishDay = () => {
    const progress = readProgress();
    const day = progress?.days?.[String(dayNumber())] || { answered: 0, correct: 0, total: 80 };
    const total = Number(day.total || 80);
    const answered = Number(day.answered || 0);
    const correct = Number(day.correct || 0);
    const remaining = Math.max(0, total - answered);
    const percent = Math.round((correct / Math.max(1, total)) * 100);
    const message = remaining
      ? `Day ${String(dayNumber()).padStart(2, '0')}: ${correct}/${total} correct (${percent}%). ${remaining} question(s) remain unanswered.`
      : `Day ${String(dayNumber()).padStart(2, '0')} complete: ${correct}/${total} correct (${percent}%). Excellent work—review the highlighted explanations before moving on.`;
    showNotice(message, remaining ? 'warning' : 'success');
    document.getElementById('gsdExamPanel')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const setFocusMode = (enabled) => {
    focusMode = enabled;
    paused = false;
    stopAutoNext();
    stopTimer();
    activeCard = enabled ? firstUnanswered(cards()) : null;
    const toggle = document.getElementById('gsdFocusToggle');
    const pause = document.getElementById('gsdPauseTimer');
    if (toggle) { toggle.textContent = enabled ? 'Exit focus mode' : 'Focus exam mode'; toggle.classList.toggle('active', enabled); }
    if (pause) { pause.disabled = !enabled; pause.textContent = 'Pause timer'; }
    document.body.classList.toggle('gsd-focus-enabled', enabled);
    applyFocus();
    if (enabled) showNotice('Focus mode: one question, 35 seconds, then 7-second auto-next.', 'success');
    updateTimer();
  };

  const scheduleSync = () => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => { scheduled = false; updateScore(); if (focusMode) applyFocus(); });
  };

  const install = () => {
    if (document.getElementById('gsdExamPanel')) return;
    const root = document.getElementById('root');
    if (!root || !root.parentNode) return;
    const style = document.createElement('style');
    style.textContent = `.gsd-exam-panel{max-width:1180px;margin:12px auto 0;padding:0 clamp(16px,4vw,48px);font:13px/1.4 Inter,ui-sans-serif,system-ui,sans-serif}.gsd-exam-card{display:flex;align-items:center;gap:10px;flex-wrap:wrap;padding:11px 13px;border:1px solid #cfe3df;border-radius:15px;background:#fff;box-shadow:0 5px 18px rgba(18,60,66,.06)}.gsd-exam-label{font-weight:850;color:#0e5a66;margin-right:auto}.gsd-exam-timer{min-width:88px;text-align:center;padding:7px 10px;border-radius:999px;background:#fff7df;border:1px solid #efc66f;color:#8b5b0a;font-weight:900}.gsd-exam-timer.urgent{background:#fff0ed;border-color:#edaaa0;color:#a3382e}.gsd-exam-timer.paused{background:#eef2f3;color:#5c7175}.gsd-exam-btn{border:1px solid #8fc6bf;border-radius:9px;padding:8px 10px;background:#fff;color:#0e5a66;font:750 12px inherit;cursor:pointer}.gsd-exam-btn.primary,.gsd-exam-btn.active{background:#0e5a66;color:#fff;border-color:#0e5a66}.gsd-exam-btn:disabled{opacity:.45;cursor:not-allowed}.gsd-exam-score{padding:0 8px;color:#335c63;white-space:nowrap}.gsd-exam-score b{color:#0e5a66}.gsd-exam-notice{min-height:18px;margin:7px 3px 0;color:#627a7e;font-size:12px}.gsd-exam-notice.warning{color:#9a5e0c}.gsd-exam-notice.success{color:#0e6b61}.question-card.focus-active{border-color:#0e766e;box-shadow:0 0 0 3px rgba(14,118,110,.12),0 10px 30px rgba(18,60,66,.1)}.gsd-focus-enabled .question-list{min-height:120px}@media(max-width:600px){.gsd-exam-panel{padding:0 12px}.gsd-exam-label{width:100%;margin-right:0}.gsd-exam-score{padding:0;margin-right:auto}}`;
    document.head.appendChild(style);
    const panel = document.createElement('section');
    panel.className = 'gsd-exam-panel';
    panel.id = 'gsdExamPanel';
    panel.innerHTML = `<div class="gsd-exam-card"><span class="gsd-exam-label">Day exam controls</span><span class="gsd-exam-score"><b id="gsdExamScore">0 / 80</b> <span id="gsdExamProgress">0 answered · 0% correct</span></span><span class="gsd-exam-timer" id="gsdExamTimer">Focus mode off</span><button class="gsd-exam-btn primary" id="gsdFocusToggle" type="button">Focus exam mode</button><button class="gsd-exam-btn" id="gsdPauseTimer" type="button" disabled>Pause timer</button><button class="gsd-exam-btn" id="gsdFinishDay" type="button">Finish day</button></div><p class="gsd-exam-notice" id="gsdExamNotice" aria-live="polite"></p>`;
    root.parentNode.insertBefore(panel, root);

    document.getElementById('gsdFocusToggle').onclick = () => setFocusMode(!focusMode);
    document.getElementById('gsdPauseTimer').onclick = () => {
      if (!focusMode) return;
      paused = !paused;
      if (paused) { stopTimer(); showNotice('Timer paused. Resume when you are ready.', 'warning'); }
      else { showNotice('Timer resumed.', 'success'); startTimer(); }
      document.getElementById('gsdPauseTimer').textContent = paused ? 'Resume timer' : 'Pause timer';
      updateTimer();
    };
    document.getElementById('gsdFinishDay').onclick = finishDay;
    document.addEventListener('click', (event) => {
      if (!focusMode || !event.target.closest('.answer-option')) return;
      setTimeout(() => {
        if (activeCard?.classList.contains('has-answer')) {
          stopTimer();
          showNotice('Answer saved. Next question in 7 seconds.', 'success');
          queueNext(7000);
        }
      }, 80);
    }, true);

    const observer = new MutationObserver(scheduleSync);
    observer.observe(root, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'aria-pressed', 'hidden'] });
    document.addEventListener('click', () => setTimeout(scheduleSync, 80), true);
    setInterval(updateScore, 1000);
    updateScore();
  };

  const start = () => { install(); setTimeout(install, 700); setTimeout(install, 1800); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true }); else start();
})();
