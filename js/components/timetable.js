/* =================================================================
   시간표 컴포넌트
   ================================================================= */

/** null이면 항상 '오늘 요일(평일)' 기준, 숫자면 사용자가 탭으로 고른 요일 */
let timetableViewDayOverride = null;

function getDefaultTimetableDayIndex() {
  const d = getDayIndex();
  if (d >= 1 && d <= 5) return d;
  return 1;
}

function getTimetableDayIndex() {
  if (timetableViewDayOverride !== null && timetableViewDayOverride >= 1 && timetableViewDayOverride <= 5) {
    return timetableViewDayOverride;
  }
  return getDefaultTimetableDayIndex();
}

function setTimetableViewDay(dayIdx) {
  if (dayIdx < 1 || dayIdx > 5) return;
  timetableViewDayOverride = dayIdx;
}

function syncTimetableDayUI() {
  const d = getTimetableDayIndex();
  document.querySelectorAll('.timetable-day-tab').forEach(btn => {
    const active = parseInt(btn.dataset.day, 10) === d;
    btn.classList.toggle('active', active);
    btn.setAttribute('aria-selected', active ? 'true' : 'false');
  });
}

function updateTimetableBadge() {
  const badge = document.getElementById('today-day');
  if (!badge) return;
  const d = getTimetableDayIndex();
  badge.textContent = DAY_NAMES_KR[d] + '요일';
}

function initTimetableDayTabs() {
  timetableViewDayOverride = null;
  syncTimetableDayUI();
  updateTimetableBadge();
  document.querySelectorAll('.timetable-day-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      const day = parseInt(btn.dataset.day, 10);
      if (day < 1 || day > 5) return;
      setTimetableViewDay(day);
      syncTimetableDayUI();
      updateTimetableBadge();
      loadTimetable();
    });
  });
}

async function loadTimetable() {
  const dayIdx = getTimetableDayIndex();

  const rows = await fetchSheetData(CONFIG.SHEETS.TIMETABLE);
  if (!rows || rows.length === 0) { renderTimetableFallback(); return; }

  const headerRowIdx = rows.findIndex(r =>
    r.some(cell => cell && (String(cell).includes('교시') || String(cell).includes('시간')))
  );

  if (headerRowIdx < 0) { renderTimetableFallback(); return; }

  // 시트 컬럼: A(0)=교시, B(1)=시간, C(2)=월, D(3)=화, E(4)=수, F(5)=목, G(6)=금
  // dayIdx: 1=월→col2, 2=화→col3, … 5=금→col6
  const colIndex = dayIdx + 1;

  const periods = [];
  for (let i = headerRowIdx + 1; i < rows.length; i++) {
    const row = rows[i];
    const periodLabel = (row[0] || '').trim();
    const timeStr = (row[1] || '').trim();
    const subject = (row[colIndex] || '').trim();

    if (!periodLabel) continue;

    const periodNum = parseInt(periodLabel, 10) || (i - headerRowIdx);

    if (timeStr && timeStr.includes('~')) {
      const [start, end] = timeStr.split('~').map(s => s.trim());
      CONFIG.PERIOD_TIMES[periodNum - 1] = { start, end };
    }

    periods.push({
      period: periodNum,
      subject: subject || '',
      timeStr: timeStr
    });
  }

  renderTimetable(periods);
}

function renderTimetable(periods) {
  const list = document.getElementById('timetable-list');
  const selectedDay = getTimetableDayIndex();
  list.dataset.viewDay = String(selectedDay);

  if (periods.length === 0) {
    list.innerHTML = '<li class="timetable-item"><span class="subject" style="color:var(--text-muted)">이 날은 수업이 없습니다</span></li>';
    return;
  }

  const now = getNow();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const today = getDayIndex();
  const isTodayView = selectedDay === today && today >= 1 && today <= 5;

  list.innerHTML = periods.map(p => {
    const t = CONFIG.PERIOD_TIMES[p.period - 1];
    let cur = false;
    let ts = '';
    if (t) {
      const [sh, sm] = t.start.split(':').map(Number);
      const [eh, em] = t.end.split(':').map(Number);
      cur = isTodayView && nowMin >= sh * 60 + sm && nowMin <= eh * 60 + em;
      ts = `${t.start}~${t.end}`;
    } else if (p.timeStr) {
      ts = p.timeStr;
    }

    const subjectText = p.subject || '<span style="color:var(--text-muted)">-</span>';

    return `<li class="timetable-item${cur ? ' current' : ''}">
      <span class="period">${p.period}</span>
      <span class="subject">${subjectText}</span>
      <span class="time-range">${ts}</span>
    </li>`;
  }).join('');
}

function renderTimetableFallback() {
  document.getElementById('timetable-list').innerHTML =
    '<li class="timetable-item"><span class="subject" style="color:var(--text-muted)">시간표를 불러올 수 없습니다</span></li>';
}

function updateCurrentPeriod() {
  const list = document.getElementById('timetable-list');
  if (!list) return;
  const viewDay = parseInt(list.dataset.viewDay || '0', 10);
  const today = getDayIndex();
  const isTodayView = viewDay === today && today >= 1 && today <= 5;

  const now = getNow();
  const nowMin = now.getHours() * 60 + now.getMinutes();

  document.querySelectorAll('.timetable-item').forEach((item, idx) => {
    if (!isTodayView) {
      item.classList.remove('current');
      return;
    }
    const t = CONFIG.PERIOD_TIMES[idx];
    if (!t) return;
    const [sh, sm] = t.start.split(':').map(Number);
    const [eh, em] = t.end.split(':').map(Number);
    item.classList.toggle('current', nowMin >= sh * 60 + sm && nowMin <= eh * 60 + em);
  });
}
