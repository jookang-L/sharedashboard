/* =================================================================
   첫 실행 마법사 — 연동 정보·시간표·사용자명 (타이틀바 「OO Board」)
   시간표 3단계 입력은 브라우저(localStorage)에만 저장되며 시트에는 올리지 않습니다.
   ================================================================= */

let onboardingBound = false;
let onboardingStep = 1;
const ONBOARDING_TOTAL = 6;

function onboardingRefreshData() {
  if (typeof loadAllData === 'function') loadAllData();
}

function collectOnboardingTimetableRows() {
  const header = ['교시', '시간', '월', '화', '수', '목', '금'];
  const rows = [header];
  for (let p = 1; p <= 7; p++) {
    const pt = CONFIG.PERIOD_TIMES && CONFIG.PERIOD_TIMES[p - 1];
    const timeStr = pt && pt.start && pt.end ? `${pt.start}~${pt.end}` : '';
    const row = [String(p), timeStr];
    for (let d = 1; d <= 5; d++) {
      const inp = document.getElementById(`onboarding-tt-d${d}-p${p}`);
      row.push(inp && inp.value ? inp.value.trim() : '');
    }
    rows.push(row);
  }
  return rows;
}

/** 저장된 로컬 시간표로 3단계 그리드 채우기 */
function onboardingPrefillTimetableGrid() {
  const rows = typeof loadTimetableLocalRows === 'function' ? loadTimetableLocalRows() : null;
  if (!rows || rows.length < 2) return;
  const headerRowIdx = rows.findIndex((r) =>
    r.some((cell) => cell && (String(cell).includes('교시') || String(cell).includes('시간')))
  );
  if (headerRowIdx < 0) return;
  for (let i = headerRowIdx + 1; i < rows.length; i++) {
    const row = rows[i];
    const periodLabel = (row[0] || '').trim();
    const periodNum = parseInt(periodLabel, 10) || (i - headerRowIdx);
    if (periodNum < 1 || periodNum > 7) continue;
    for (let d = 1; d <= 5; d++) {
      const inp = document.getElementById(`onboarding-tt-d${d}-p${periodNum}`);
      if (inp) inp.value = (row[d + 1] || '').trim();
    }
  }
}

function renderOnboardingSchoolResults(results) {
  const ul = document.getElementById('onboarding-school-results');
  if (!ul) return;
  ul.innerHTML = '';
  if (!results || !results.length) {
    const li = document.createElement('li');
    li.className = 'onboarding-school-empty';
    li.textContent = '검색 결과가 없습니다. 학교명을 바꿔 보세요.';
    ul.appendChild(li);
    return;
  }
  results.forEach((r) => {
    const li = document.createElement('li');
    li.className = 'onboarding-school-item';
    const nm = document.createElement('span');
    nm.className = 'onboarding-school-name';
    nm.textContent = r.schoolName;
    li.appendChild(nm);
    if (r.address) {
      const ad = document.createElement('span');
      ad.className = 'onboarding-school-sub';
      ad.textContent = r.address;
      li.appendChild(ad);
    }
    li.addEventListener('click', () => {
      if (typeof window.dashboardSelectSchoolFromSearch === 'function') {
        window.dashboardSelectSchoolFromSearch(r);
      }
      ul.innerHTML = '';
      const done = document.createElement('li');
      done.className = 'onboarding-school-picked';
      done.textContent = `선택됨: ${r.schoolName}`;
      ul.appendChild(done);
    });
    ul.appendChild(li);
  });
}

async function onboardingDoSchoolSearch() {
  const input = document.getElementById('onboarding-school-name');
  const btn = document.getElementById('onboarding-school-search');
  const name = input && input.value ? input.value.trim() : '';
  if (!name) return;
  if (!CONFIG.NEIS.API_KEY || !String(CONFIG.NEIS.API_KEY).trim()) {
    alert('먼저 NEIS API 키를 입력해 주세요.');
    return;
  }
  btn.disabled = true;
  try {
    const fn = window.dashboardSearchSchool;
    if (typeof fn !== 'function') throw new Error('학교 검색을 불러올 수 없습니다.');
    const results = await fn(name);
    renderOnboardingSchoolResults(results);
  } catch (e) {
    console.warn('[온보딩 학교 검색]', e);
    renderOnboardingSchoolResults([]);
  } finally {
    btn.disabled = false;
  }
}

function onboardingShowStep(n) {
  const prevStep = onboardingStep;
  onboardingStep = Math.min(ONBOARDING_TOTAL, Math.max(1, n));
  for (let i = 1; i <= ONBOARDING_TOTAL; i++) {
    const el = document.getElementById(`onboarding-step-${i}`);
    if (el) el.hidden = i !== onboardingStep;
  }
  const root = document.getElementById('onboarding-modal-root');
  if (root) root.classList.toggle('onboarding-modal--wide', onboardingStep === 3);

  const num = document.getElementById('onboarding-step-num');
  if (num) num.textContent = String(onboardingStep);
  const nextBtn = document.getElementById('onboarding-next');
  if (nextBtn) nextBtn.textContent = onboardingStep === ONBOARDING_TOTAL ? '완료' : '다음';
  const prevBtn = document.getElementById('onboarding-prev');
  if (prevBtn) prevBtn.hidden = onboardingStep === 1;

  /* 2→3으로만 미리 채움 (4→뒤로 가면 DOM 입력 유지) */
  if (onboardingStep === 3 && prevStep === 2) onboardingPrefillTimetableGrid();
}

function onboardingPrefillFromConfig() {
  const neis = document.getElementById('onboarding-neis');
  if (neis) neis.value = CONFIG.NEIS.API_KEY || '';
  const g = document.getElementById('onboarding-google-key');
  if (g) g.value = CONFIG.GOOGLE_API_KEY || '';
  const s = document.getElementById('onboarding-sheet');
  if (s) s.value = CONFIG.SPREADSHEET_ID || '';
  const a = document.getElementById('onboarding-apps-script');
  if (a) a.value = CONFIG.APPS_SCRIPT_URL || '';
  const u = document.getElementById('onboarding-username');
  if (u) u.value = getUserDisplayName() || '';
}

function onboardingClose() {
  const ov = document.getElementById('onboarding-overlay');
  if (ov) {
    ov.style.display = 'none';
    ov.setAttribute('aria-hidden', 'true');
  }
  const root = document.getElementById('onboarding-modal-root');
  if (root) root.classList.remove('onboarding-modal--wide');
  markOnboardingFinished();
  if (typeof syncApiFormFromConfig === 'function') syncApiFormFromConfig();
  onboardingRefreshData();
  if (typeof updateSchoolDisplayFromConfig === 'function') updateSchoolDisplayFromConfig();
}

function onboardingOpen() {
  onboardingPrefillFromConfig();
  onboardingShowStep(1);
  const ul = document.getElementById('onboarding-school-results');
  if (ul) ul.innerHTML = '';
  const ov = document.getElementById('onboarding-overlay');
  if (ov) {
    ov.style.display = 'flex';
    ov.setAttribute('aria-hidden', 'false');
  }
  document.getElementById('onboarding-neis')?.focus();
}

async function handleOnboardingNext() {
  if (onboardingStep === ONBOARDING_TOTAL) {
    onboardingClose();
    return;
  }
  if (onboardingStep === 3) {
    if (typeof saveTimetableRowsToLocal === 'function') {
      saveTimetableRowsToLocal(collectOnboardingTimetableRows());
    }
    if (typeof resetTimetableCache === 'function') resetTimetableCache();
    if (typeof loadTimetable === 'function') await loadTimetable();
  }
  onboardingShowStep(onboardingStep + 1);
  const focusMap = {
    2: 'onboarding-google-key',
    3: 'onboarding-tt-d1-p1',
    4: 'onboarding-sheet',
    5: 'onboarding-apps-script',
    6: 'onboarding-username',
  };
  document.getElementById(focusMap[onboardingStep])?.focus();
}

function bindOnboarding() {
  if (onboardingBound) return;
  onboardingBound = true;

  document.getElementById('onboarding-neis')?.addEventListener('input', (e) => {
    CONFIG.NEIS.API_KEY = e.target.value.trim();
    saveApiConfigToStorage();
  });

  document.getElementById('onboarding-google-key')?.addEventListener('input', (e) => {
    CONFIG.GOOGLE_API_KEY = e.target.value.trim();
    saveApiConfigToStorage();
    if (typeof invalidateDashboardCaches === 'function') invalidateDashboardCaches();
    onboardingRefreshData();
  });

  document.getElementById('onboarding-sheet')?.addEventListener('input', (e) => {
    CONFIG.SPREADSHEET_ID = parseSpreadsheetIdFromInput(e.target.value);
    saveApiConfigToStorage();
    if (typeof invalidateDashboardCaches === 'function') invalidateDashboardCaches();
    onboardingRefreshData();
  });

  document.getElementById('onboarding-apps-script')?.addEventListener('input', (e) => {
    CONFIG.APPS_SCRIPT_URL = normalizeAppsScriptUrl(e.target.value);
    saveApiConfigToStorage();
    onboardingRefreshData();
  });

  document.getElementById('onboarding-username')?.addEventListener('input', (e) => {
    setUserDisplayName(e.target.value);
  });

  document.getElementById('onboarding-school-search')?.addEventListener('click', () => {
    onboardingDoSchoolSearch();
  });
  document.getElementById('onboarding-school-name')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') onboardingDoSchoolSearch();
  });

  document.getElementById('onboarding-next')?.addEventListener('click', () => {
    handleOnboardingNext();
  });

  document.getElementById('onboarding-prev')?.addEventListener('click', () => {
    if (onboardingStep > 1) onboardingShowStep(onboardingStep - 1);
  });

  document.getElementById('onboarding-skip')?.addEventListener('click', () => {
    onboardingClose();
  });

  document.getElementById('onboarding-overlay')?.addEventListener('click', (e) => {
    if (e.target.id === 'onboarding-overlay') {
      /* 바깥 클릭으로 닫지 않음 */
    }
  });
}

/** 개발·재설정용: 주소에 #onboarding 또는 ?onboarding=1 이 있으면 완료 여부와 관계없이 마법사를 연다 */
function shouldForceOpenOnboardingWizard() {
  try {
    if (location.hash === '#onboarding') return true;
    if (new URLSearchParams(location.search).get('onboarding') === '1') return true;
  } catch { /* ignore */ }
  return false;
}

/** Electron 앱 버전이 바뀌면(설치 업그레이드) 온보딩을 다시 띄우기 위해 완료 플래그 제거 */
async function resetOnboardingIfAppVersionChanged() {
  try {
    const api = typeof window !== 'undefined' ? window.electronAPI : null;
    if (!api || typeof api.getAppVersion !== 'function') return;
    const ver = await api.getAppVersion();
    if (!ver) return;
    const key = 'dashboard_seen_app_version';
    const prev = localStorage.getItem(key);
    if (prev && prev !== ver) {
      localStorage.removeItem('dashboard_onboarding_done');
      try {
        localStorage.setItem('dashboard_onboarding_skip_migrate_once', '1');
      } catch { /* ignore */ }
    }
    localStorage.setItem(key, ver);
  } catch { /* ignore */ }
}

async function initOnboarding() {
  await resetOnboardingIfAppVersionChanged();
  migrateOnboardingDoneFlag();
  applyTitlebarBrand();
  const force = shouldForceOpenOnboardingWizard();
  if (!force && !shouldShowOnboardingWizard()) return;
  bindOnboarding();
  onboardingOpen();
}
