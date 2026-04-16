/* =========================================================
   app.js — Task Management System
   Full application logic: storage, clock, tasks, briefings,
   reports, wizard, settings, i18n, theme, navigation.
   ========================================================= */

'use strict';

// ── Utilities ────────────────────────────────────────────
const uid  = () => Math.random().toString(36).slice(2, 10);
const $ = id => document.getElementById(id);
const $$ = sel => document.querySelectorAll(sel);
const fmt2 = n => String(n).padStart(2, '0');

function fmtDate(iso) {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString(undefined, { day:'2-digit', month:'short', year:'numeric' });
}
function fmtDateTime(iso) {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    day:'2-digit', month:'short', year:'numeric',
    hour:'2-digit', minute:'2-digit'
  });
}
function isLeapYear(y) { return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0; }
function daysInYear(y) { return isLeapYear(y) ? 366 : 365; }
function dayOfYear(d) {
  const start = new Date(d.getFullYear(), 0, 0);
  const diff = d - start;
  return Math.floor(diff / 86400000);
}

// ── Storage ───────────────────────────────────────────────
const Store = {
  get(k, fallback = null) {
    try { const v = localStorage.getItem(k); return v !== null ? JSON.parse(v) : fallback; }
    catch { return fallback; }
  },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
};

// ── State ─────────────────────────────────────────────────
const State = {
  tasks:     Store.get('tms_tasks',    []),
  activity:  Store.get('tms_activity', []),
  briefings: Store.get('tms_briefings',[]),
  reports:   Store.get('tms_reports',  []),
  schedule:  Store.get('tms_schedule', { morning: 7, evening: 18 }),
  lastBriefingSlot: Store.get('tms_last_slot', { date: '', slot: '' }),
  theme:     Store.get('tms_theme',    'light'),
  lang:      Store.get('tms_lang',     'en'),
};

function save(key) {
  const map = {
    tasks: 'tms_tasks', activity: 'tms_activity',
    briefings: 'tms_briefings', reports: 'tms_reports',
    schedule: 'tms_schedule', lastBriefingSlot: 'tms_last_slot',
    theme: 'tms_theme', lang: 'tms_lang',
  };
  Store.set(map[key], State[key]);
}

// ── i18n ─────────────────────────────────────────────────
function t(key, vars = {}) {
  const dict = window.I18N[State.lang] || window.I18N.en;
  let str = dict[key] || window.I18N.en[key] || key;
  Object.entries(vars).forEach(([k, v]) => { str = str.replace(`{${k}}`, v); });
  return str;
}

function applyI18n() {
  $$('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    el.textContent = t(key);
  });
  // RTL
  const rtlLangs = ['ar'];
  const isRTL = rtlLangs.includes(State.lang);
  document.documentElement.setAttribute('dir', isRTL ? 'rtl' : 'ltr');
  document.documentElement.setAttribute('lang', State.lang);
}

// ── Theme ─────────────────────────────────────────────────
function applyTheme(theme) {
  State.theme = theme;
  save('theme');
  document.body.setAttribute('data-theme', theme);
  $('darkModeToggle').checked = (theme === 'dark');
  // Swap icon sun/moon
  const icon = $('themeIcon');
  if (theme === 'dark') {
    icon.innerHTML = '<circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>';
    icon.setAttribute('stroke', 'currentColor');
    icon.setAttribute('stroke-width', '2');
    icon.setAttribute('fill', 'none');
  } else {
    icon.innerHTML = '<path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/>';
    icon.setAttribute('fill', 'currentColor');
    icon.removeAttribute('stroke');
  }
  const statusText = $('themeStatusText');
  if (statusText) statusText.textContent =
    theme === 'dark' ? 'Currently using dark theme' : 'Currently using light theme';
}

// ── Navigation ────────────────────────────────────────────
let activePanel = 'dashboard';

function switchPanel(id) {
  $$('.panel').forEach(p => p.classList.remove('active'));
  $$('.nav-item').forEach(n => n.classList.remove('active'));
  const panel = $(`panel-${id}`);
  if (panel) panel.classList.add('active');
  const navBtn = document.querySelector(`.nav-item[data-panel="${id}"]`);
  if (navBtn) navBtn.classList.add('active');
  activePanel = id;

  // Refresh on show
  if (id === 'dashboard') refreshDashboard();
  if (id === 'briefings') renderBriefings();
  if (id === 'reports')   renderReports();
}

// ── Clock ─────────────────────────────────────────────────
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAYS   = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

function tickClock() {
  const hEl = $('clockH');
  const mEl = $('clockM');
  const sEl = $('clockS');

  if (!hEl || !mEl || !sEl) return;

  const now = new Date();
  const h = now.getHours(), m = now.getMinutes(), s = now.getSeconds();

  hEl.textContent = fmt2(h);
  mEl.textContent = fmt2(m);
  sEl.textContent = fmt2(s);

  const dateEl = $('clockDate');
  const ampmEl = $('clockAmPm');

  if (dateEl) {
    dateEl.textContent =
      `${DAYS[now.getDay()]}, ${now.getDate()} ${MONTHS[now.getMonth()]} ${now.getFullYear()}`;
  }

  if (ampmEl) {
    ampmEl.textContent = h < 12 ? 'AM' : 'PM';
  }

  checkBriefingSchedule(now);
}
// ── Year Progress ─────────────────────────────────────────
function refreshYearProgress() {
  const now  = new Date();
  const year = now.getFullYear();
  const total = daysInYear(year);
  const today = dayOfYear(now);
  const pct  = Math.round((today / total) * 100);
  const left = total - today;

  $('yearPct').textContent = `${pct}%`;
  $('yearDayCount').textContent = t('day_of', { d: today, t: total });
  $('yearDaysLeft').textContent = t('days_remaining', { n: left });

  const fill = $('yearFill');
  fill.style.width = `${pct}%`;
  fill.className = 'progress-fill';
  if (pct >= 75) fill.classList.add('late');
  else if (pct >= 45) fill.classList.add('mid');

  return pct;
}

// ── Dot Calendar ─────────────────────────────────────────
function buildCalendar() {
  const now  = new Date();
  const year = now.getFullYear();
  const total = daysInYear(year);
  const todayDOY = dayOfYear(now);
  const grid = $('dotCalendar');
  grid.innerHTML = '';

  for (let d = 1; d <= total; d++) {
    const dot = document.createElement('span');
    dot.className = 'dot';
    if (d < todayDOY)      dot.classList.add('past');
    else if (d === todayDOY) dot.classList.add('today');
    else                   dot.classList.add('future');

    // Tooltip with date
    const dotDate = new Date(year, 0, d);
    dot.title = dotDate.toLocaleDateString(undefined, { day:'numeric', month:'short' });
    grid.appendChild(dot);
  }
}

// ── Metrics ───────────────────────────────────────────────
function refreshMetrics() {
  const today = new Date().toISOString().slice(0, 10);
  const tasks = State.tasks;
  const total       = tasks.length;
  const completed   = tasks.filter(t => t.status === 'Completed').length;
  const inProgress  = tasks.filter(t => t.status === 'In Progress').length;
  const overdue     = tasks.filter(t => t.dueDate && t.dueDate < today && t.status !== 'Completed').length;

  const animate = (el, val) => {
    const start = parseInt(el.textContent) || 0;
    const step  = Math.ceil(Math.abs(val - start) / 8) || 1;
    let cur = start;
    const iv = setInterval(() => {
      cur = cur < val ? Math.min(cur + step, val) : Math.max(cur - step, val);
      el.textContent = cur;
      if (cur === val) clearInterval(iv);
    }, 30);
  };

  animate($('metricTotal'),      total);
  animate($('metricCompleted'),  completed);
  animate($('metricInProgress'), inProgress);
  animate($('metricOverdue'),    overdue);
  $('taskCountBadge').textContent = `${total} task${total !== 1 ? 's' : ''}`;
}

// ── Activity Feed ─────────────────────────────────────────
function renderActivityFeed() {
  const feed = $('activityFeed');
  const items = State.activity.slice(-20).reverse();

  if (!items.length) {
    feed.innerHTML = `<div class="activity-empty" data-i18n="activity_empty">${t('activity_empty')}</div>`;
    return;
  }

  feed.innerHTML = items.map(a => `
    <div class="activity-item">
      <div class="activity-dot ${a.action === 'added' ? 'add' : 'del'}"></div>
      <div>
        <div class="activity-text">
          <strong>${a.action === 'added' ? t('added_task') : t('deleted_task')}</strong> ${escHtml(a.taskTitle)}
          ${a.assignee ? `<span style="color:var(--text-muted)"> · ${escHtml(a.assignee)}</span>` : ''}
        </div>
        <div class="activity-time">${fmtDateTime(a.timestamp)}</div>
      </div>
    </div>
  `).join('');
}

function refreshDashboard() {
  refreshMetrics();
  refreshYearProgress();
  renderActivityFeed();
}

// ── Tasks ─────────────────────────────────────────────────
function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function priorityBadge(p) {
  const cls = { Low:'low', Medium:'medium', High:'high' }[p] || 'low';
  return `<span class="badge badge-priority-${cls}">${escHtml(p)}</span>`;
}

function statusBadge(s, isOverdue) {
  if (isOverdue) return `<span class="badge badge-overdue">⚠ Overdue</span>`;
  const cls = { Pending:'pending', 'In Progress':'inprogress', Completed:'completed' }[s] || 'pending';
  return `<span class="badge badge-status-${cls}">${escHtml(s)}</span>`;
}

function renderTasks() {
  const today = new Date().toISOString().slice(0, 10);
  const body = $('tasksBody');

  if (!State.tasks.length) {
    body.innerHTML = `<tr><td colspan="7" class="table-empty" data-i18n="no_tasks">${t('no_tasks')}</td></tr>`;
    return;
  }

  body.innerHTML = State.tasks.map(task => {
    const overdue = task.dueDate && task.dueDate < today && task.status !== 'Completed';
    return `
      <tr>
        <td class="truncate" title="${escHtml(task.title)}">${escHtml(task.title)}</td>
        <td>${escHtml(task.assignee || '—')}</td>
        <td style="font-family:var(--font-mono);font-size:12px;">${task.dueDate ? fmtDate(task.dueDate) : '—'}</td>
        <td>${priorityBadge(task.priority)}</td>
        <td>${statusBadge(task.status, overdue)}</td>
        <td style="font-family:var(--font-mono);font-size:12px;color:var(--text-muted);">${fmtDateTime(task.createdAt).slice(0,11)}</td>
        <td>
          <button class="btn btn-danger btn-sm" onclick="deleteTask('${task.id}')">
            ${t('btn_delete')}
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

function addTask() {
  const title    = $('fTitle').value.trim();
  const assignee = $('fAssignee').value.trim();
  const dueDate  = $('fDueDate').value;
  const priority = $('fPriority').value;
  const status   = $('fStatus').value;

  if (!title) { $('fTitle').focus(); return; }

  const task = { id: uid(), title, assignee, dueDate, priority, status, createdAt: new Date().toISOString() };
  State.tasks.unshift(task);
  save('tasks');

  logActivity('added', task);

  // Clear form
  $('fTitle').value = '';
  $('fAssignee').value = '';
  $('fDueDate').value = '';
  $('fPriority').value = 'Medium';
  $('fStatus').value = 'Pending';

  renderTasks();
  refreshMetrics();
  renderActivityFeed();
}

window.deleteTask = function(id) {
  const idx = State.tasks.findIndex(t => t.id === id);
  if (idx === -1) return;
  const task = State.tasks[idx];
  State.tasks.splice(idx, 1);
  save('tasks');
  logActivity('deleted', task);
  renderTasks();
  refreshMetrics();
  renderActivityFeed();
};

function logActivity(action, task) {
  State.activity.push({
    id: uid(), action,
    taskTitle: task.title,
    assignee: task.assignee || '',
    timestamp: new Date().toISOString()
  });
  if (State.activity.length > 200) State.activity.shift();
  save('activity');
}

// ── Briefings ─────────────────────────────────────────────
function getYearPct() {
  const now = new Date();
  const total = daysInYear(now.getFullYear());
  return Math.round((dayOfYear(now) / total) * 100);
}

function buildBriefingData(type) {
  const today = new Date().toISOString().slice(0, 10);
  const tasks = State.tasks;

  const lastTs = State.lastBriefingSlot.ts || 0;
  const since = new Date(lastTs);

  const added   = State.activity.filter(a => a.action === 'added'   && new Date(a.timestamp) > since);
  const deleted = State.activity.filter(a => a.action === 'deleted' && new Date(a.timestamp) > since);
  const overdue = tasks.filter(t => t.dueDate && t.dueDate < today && t.status !== 'Completed').length;
  const highPri = tasks.filter(t => t.priority === 'High').length;

  return {
    id: uid(), type,
    generatedAt: new Date().toISOString(),
    yearPct: getYearPct(),
    total: tasks.length,
    highPri, overdue,
    added:   added.map(a => ({ title: a.taskTitle, assignee: a.assignee })),
    deleted: deleted.map(a => ({ title: a.taskTitle })),
  };
}

function generateBriefing(type = 'manual') {
  const b = buildBriefingData(type);
  State.briefings.unshift(b);
  if (State.briefings.length > 50) State.briefings.pop();
  save('briefings');

  // Update last slot timestamp
  State.lastBriefingSlot = { date: new Date().toISOString().slice(0,10), slot: type, ts: Date.now() };
  save('lastBriefingSlot');

  renderBriefings();
  if (activePanel === 'dashboard') renderActivityFeed();
}

function checkBriefingSchedule(now) {
  const h = now.getHours(), m = now.getMinutes(), s = now.getSeconds();
  if (m !== 0 || s !== 0) return; // Only fire on the exact hour:00:00

  const today = now.toISOString().slice(0, 10);
  const { morning, evening } = State.schedule;
  const last = State.lastBriefingSlot;

  if (h === morning && !(last.date === today && last.slot === 'morning')) {
    generateBriefing('morning');
  }
  if (h === evening && !(last.date === today && last.slot === 'evening')) {
    generateBriefing('evening');
  }
}

function renderBriefings() {
  const list = $('briefingList');
  if (!State.briefings.length) {
    list.innerHTML = `<div class="briefing-empty-state">${t('no_briefings')}</div>`;
    return;
  }

  const typeLabel = { morning: t('briefing_morning'), evening: t('briefing_evening'), manual: t('briefing_manual') };
  const typeIcon  = { morning: '🌅', evening: '🌆', manual: '🔔' };

  list.innerHTML = State.briefings.map(b => `
    <div class="briefing-card type-${b.type}">
      <div class="briefing-header">
        <div class="briefing-type">
          <div class="briefing-type-icon">${typeIcon[b.type] || '🔔'}</div>
          ${escHtml(typeLabel[b.type] || b.type)}
        </div>
        <div class="briefing-ts">${fmtDateTime(b.generatedAt)}</div>
      </div>
      <div class="briefing-body">
        <div class="briefing-stats">
          <div class="brief-stat">
            <div class="brief-stat-value">${b.total}</div>
            <div class="brief-stat-label">${t('brief_total')}</div>
          </div>
          <div class="brief-stat">
            <div class="brief-stat-value">${b.highPri}</div>
            <div class="brief-stat-label">${t('brief_high_pri')}</div>
          </div>
          <div class="brief-stat">
            <div class="brief-stat-value">${b.overdue}</div>
            <div class="brief-stat-label">${t('brief_overdue')}</div>
          </div>
          <div class="brief-stat">
            <div class="brief-stat-value">${b.yearPct}%</div>
            <div class="brief-stat-label">${t('brief_year_pct')}</div>
          </div>
        </div>
        <div class="briefing-section">
          <div class="briefing-section-title">✅ ${t('brief_added')} (${b.added.length})</div>
          ${b.added.length
            ? b.added.map(a => `<div class="briefing-task-item">→ ${escHtml(a.title)}${a.assignee ? ` <span style="color:var(--text-muted)">· ${escHtml(a.assignee)}</span>` : ''}</div>`).join('')
            : `<div class="briefing-task-item" style="color:var(--text-muted)">${t('brief_none')}</div>`}
        </div>
        <div class="briefing-section">
          <div class="briefing-section-title">🗑 ${t('brief_deleted')} (${b.deleted.length})</div>
          ${b.deleted.length
            ? b.deleted.map(d => `<div class="briefing-task-item">→ ${escHtml(d.title)}</div>`).join('')
            : `<div class="briefing-task-item" style="color:var(--text-muted)">${t('brief_none')}</div>`}
        </div>
      </div>
    </div>
  `).join('');
}

// ── Reports ───────────────────────────────────────────────
function getWeekBounds() {
  const now = new Date();
  const day = now.getDay(); // 0=Sun
  const monday = new Date(now); monday.setDate(now.getDate() - ((day + 6) % 7)); monday.setHours(0,0,0,0);
  const sunday = new Date(monday); sunday.setDate(monday.getDate() + 6); sunday.setHours(23,59,59,999);
  return { start: monday, end: sunday };
}

function generateReport(type) {
  const now = new Date();
  const today = now.toISOString().slice(0,10);
  const tasks = State.tasks;
  let period, startDate, endDate;

  if (type === 'weekly') {
    const { start, end } = getWeekBounds();
    startDate = start; endDate = end;
    period = `Week ${getWeekNumber(now)} of ${now.getFullYear()}`;
  } else if (type === 'monthly') {
    startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    endDate   = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    period = `${MONTHS[now.getMonth()]} ${now.getFullYear()}`;
  } else {
    startDate = new Date(now.getFullYear(), 0, 1);
    endDate   = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
    period = `Year ${now.getFullYear()}`;
  }

  const inRange  = a => new Date(a.timestamp) >= startDate && new Date(a.timestamp) <= endDate;
  const created  = State.activity.filter(a => a.action === 'added'   && inRange(a)).length;
  const deleted  = State.activity.filter(a => a.action === 'deleted' && inRange(a)).length;
  const completed = tasks.filter(t => t.status === 'Completed').length;
  const highPri  = tasks.filter(t => t.priority === 'High').length;
  const overdue  = tasks.filter(t => t.dueDate && t.dueDate < today && t.status !== 'Completed').length;
  const rate     = created > 0 ? Math.round((completed / Math.max(tasks.length, 1)) * 100) : 0;

  let summary = '';
  if (type === 'annual') {
    summary = `During ${now.getFullYear()}, ${created} task${created !== 1 ? 's' : ''} were created and ${deleted} removed. ` +
      `The overall completion rate stands at ${rate}%, with ${highPri} high-priority item${highPri !== 1 ? 's' : ''} ` +
      `and ${overdue} overdue task${overdue !== 1 ? 's' : ''}. ` +
      `The year is ${getYearPct()}% complete.`;
  }

  const report = { id: uid(), type, period, generatedAt: new Date().toISOString(),
    created, completed, deleted, rate, highPri, overdue, summary };
  State.reports.unshift(report);
  if (State.reports.length > 30) State.reports.pop();
  save('reports');
  renderReports();
}

function getWeekNumber(d) {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil((((date - yearStart) / 86400000) + 1) / 7);
}

function renderReports() {
  const list = $('reportList');
  if (!State.reports.length) {
    list.innerHTML = `<div class="no-content">${t('no_reports')}</div>`;
    return;
  }

  const typeIcon = { weekly:'📅', monthly:'📆', annual:'📊' };
  const typeName = { weekly: t('rpt_weekly'), monthly: t('rpt_monthly'), annual: t('rpt_annual') };

  list.innerHTML = State.reports.map(r => `
    <div class="report-card type-${r.type}">
      <div class="report-header">
        <div class="report-title-row">
          <div class="report-icon">${typeIcon[r.type]}</div>
          <div>
            <div class="report-name">${typeName[r.type]}</div>
            <div class="report-period">${escHtml(r.period)}</div>
          </div>
        </div>
        <div class="report-ts">${fmtDateTime(r.generatedAt)}</div>
      </div>
      <div class="report-body">
        <div class="report-stats">
          <div class="report-stat">
            <span class="report-stat-value" style="color:var(--blue)">${r.created}</span>
            <span class="report-stat-label">${t('rpt_created')}</span>
          </div>
          <div class="report-stat">
            <span class="report-stat-value" style="color:var(--green)">${r.completed}</span>
            <span class="report-stat-label">${t('rpt_completed')}</span>
          </div>
          <div class="report-stat">
            <span class="report-stat-value" style="color:var(--red)">${r.deleted}</span>
            <span class="report-stat-label">${t('rpt_deleted')}</span>
          </div>
          <div class="report-stat">
            <span class="report-stat-value" style="color:var(--purple)">${r.rate}%</span>
            <span class="report-stat-label">${t('rpt_rate')}</span>
          </div>
          <div class="report-stat">
            <span class="report-stat-value" style="color:var(--amber)">${r.highPri}</span>
            <span class="report-stat-label">${t('rpt_highpri')}</span>
          </div>
          <div class="report-stat">
            <span class="report-stat-value" style="color:var(--red)">${r.overdue}</span>
            <span class="report-stat-label">${t('rpt_overdue')}</span>
          </div>
        </div>
        ${r.summary ? `<div class="report-summary">${escHtml(r.summary)}</div>` : ''}
      </div>
    </div>
  `).join('');
}

// ── Wizard ────────────────────────────────────────────────
function formatHour12(h) {
  const ampm = h < 12 ? 'AM' : 'PM';
  const h12  = h % 12 || 12;
  return `${h12}:00 ${ampm}`;
}

function updateSliderPreview(slider, preview12, preview24) {
  const h = parseInt(slider.value);
  $(preview12).textContent = formatHour12(h);
  $(preview24).textContent = `${fmt2(h)}:00`;
}

function initWizard() {
  $('morningSlider').value = State.schedule.morning;
  $('eveningSlider').value = State.schedule.evening;
  updateSliderPreview($('morningSlider'), 'morningPreview12', 'morningPreview24');
  updateSliderPreview($('eveningSlider'), 'eveningPreview12', 'eveningPreview24');

  $('morningSlider').addEventListener('input', () =>
    updateSliderPreview($('morningSlider'), 'morningPreview12', 'morningPreview24'));
  $('eveningSlider').addEventListener('input', () =>
    updateSliderPreview($('eveningSlider'), 'eveningPreview12', 'eveningPreview24'));
}

// ── Settings ──────────────────────────────────────────────
function applyLanguage(lang) {
  State.lang = lang;
  save('lang');
  applyI18n();
  renderTasks();
  renderBriefings();
  renderReports();
  renderActivityFeed();
  refreshYearProgress();
  // Sync radio
  const radio = document.querySelector(`input[name="language"][value="${lang}"]`);
  if (radio) radio.checked = true;
}

// ── Event Wiring ──────────────────────────────────────────
function wireEvents() {
  // Window controls (SAFE IPC)
  $('btnMin').addEventListener('click', () => {
    window.electronAPI.minimize();
  });

  $('btnMax').addEventListener('click', () => {
    window.electronAPI.maximize();
  });

  $('btnClose').addEventListener('click', () => {
    window.electronAPI.close();
  });

  // Window state listener
  window.electronAPI.onWinState((state) => {
    $('btnMax').innerHTML =
      state === 'maximized' ? '&#x2751;' : '&#x2610;';
  });

  // Theme toggle
  $('themeToggle').addEventListener('click', () => {
    applyTheme(State.theme === 'dark' ? 'light' : 'dark');
  });

  $('darkModeToggle').addEventListener('change', e => {
    applyTheme(e.target.checked ? 'dark' : 'light');
  });

  // Navigation
  $$('.nav-item').forEach(btn => {
    btn.addEventListener('click', () => switchPanel(btn.dataset.panel));
  });

  // Task add
  $('btnAddTask').addEventListener('click', addTask);
  $('fTitle').addEventListener('keydown', e => {
    if (e.key === 'Enter') addTask();
  });

  // Briefing
  $('btnGenerateBriefing').addEventListener('click', () => generateBriefing('manual'));

  // Reports
  $('btnWeekly').addEventListener('click', () => generateReport('weekly'));
  $('btnMonthly').addEventListener('click', () => generateReport('monthly'));
  $('btnAnnual').addEventListener('click', () => generateReport('annual'));

  // Save schedule
  $('btnSaveSchedule').addEventListener('click', () => {
    State.schedule = {
      morning: parseInt($('morningSlider').value),
      evening: parseInt($('eveningSlider').value)
    };
    save('schedule');

    const toast = $('saveToast');
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2500);
  });

  // Language
  $$('input[name="language"]').forEach(radio => {
    radio.addEventListener('change', e => applyLanguage(e.target.value));
  });
}

// ── Bootstrap ─────────────────────────────────────────────
function init() {
  // Apply saved preferences
  applyTheme(State.theme);
  applyLanguage(State.lang);

  // Sync language radio
  const langRadio = document.querySelector(`input[name="language"][value="${State.lang}"]`);
  if (langRadio) langRadio.checked = true;

  // Build calendar once
  buildCalendar();

  // Initial dashboard refresh
  refreshDashboard();

  // Render saved data
  renderTasks();
  renderBriefings();
  renderReports();

  // Init wizard sliders
  initWizard();

  // Wire all events
  wireEvents();

  // Start real-time clock (1s interval)
  tickClock();
  setInterval(tickClock, 1000);

  // Refresh calendar and year progress every minute
  setInterval(() => { buildCalendar(); refreshYearProgress(); }, 60000);
}

// Run on DOM ready
document.addEventListener('DOMContentLoaded', init);
