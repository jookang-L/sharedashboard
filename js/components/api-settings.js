/* =================================================================
   연동 설정 (Google API · 스프레드시트 · Apps Script · NEIS)
   ================================================================= */

function syncApiFormFromConfig() {
  const k = document.getElementById('api-input-google-key');
  const s = document.getElementById('api-input-sheet');
  const a = document.getElementById('api-input-apps-script');
  const n = document.getElementById('api-input-neis-key');
  if (k) k.value = CONFIG.GOOGLE_API_KEY || '';
  if (s) s.value = CONFIG.SPREADSHEET_ID || '';
  if (a) a.value = CONFIG.APPS_SCRIPT_URL || '';
  if (n) n.value = CONFIG.NEIS.API_KEY || '';
}

function openGoogleSheetsApiHelpModal() {
  const ov = document.getElementById('google-sheets-api-help-overlay');
  if (!ov) return;
  ov.style.display = 'flex';
  ov.setAttribute('aria-hidden', 'false');
}

function closeGoogleSheetsApiHelpModal() {
  const ov = document.getElementById('google-sheets-api-help-overlay');
  if (!ov) return;
  ov.style.display = 'none';
  ov.setAttribute('aria-hidden', 'true');
}

function openSpreadsheetTabsNoticeModal() {
  const ov = document.getElementById('spreadsheet-tabs-notice-overlay');
  if (!ov) return;
  ov.style.display = 'flex';
  ov.setAttribute('aria-hidden', 'false');
}

function closeSpreadsheetTabsNoticeModal() {
  const ov = document.getElementById('spreadsheet-tabs-notice-overlay');
  if (!ov) return;
  ov.style.display = 'none';
  ov.setAttribute('aria-hidden', 'true');
}

function initSpreadsheetTabsNoticeModal() {
  document.querySelectorAll('[data-open-spreadsheet-tabs-notice]').forEach((el) => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      openSpreadsheetTabsNoticeModal();
    });
  });
  document.getElementById('spreadsheet-tabs-notice-close')?.addEventListener('click', closeSpreadsheetTabsNoticeModal);
  document.getElementById('spreadsheet-tabs-notice-ok')?.addEventListener('click', closeSpreadsheetTabsNoticeModal);
  document.getElementById('spreadsheet-tabs-notice-overlay')?.addEventListener('click', (e) => {
    if (e.target.id === 'spreadsheet-tabs-notice-overlay') closeSpreadsheetTabsNoticeModal();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    const ov = document.getElementById('spreadsheet-tabs-notice-overlay');
    if (ov && ov.style.display !== 'none') closeSpreadsheetTabsNoticeModal();
  });
}

const NEIS_KEY_HELP_URL = 'https://open.neis.go.kr/portal/guide/actKeyPage.do';

/** Apps Script 예시 — 할일·메모 저장. 스프레드시트에 바인딩된 프로젝트에 붙여 넣습니다. */
const APPS_SCRIPT_SAMPLE_GS = [
  '/**',
  ' * Jook Board 대시보드 — 할일·메모 시트 저장용',
  ' * 스프레드시트 [확장 프로그램] > [Apps Script]에 붙여 넣고,',
  ' * [배포] > [새 배포] > 유형: 웹 앱, 실행 사용자: 나, 액세스: 누구나,',
  ' * GET·POST 허용 후 나온 /exec URL을 대시보드에 입력합니다.',
  ' */',
  'function doGet(e) {',
  '  if (e.parameter && e.parameter.data) {',
  '    return processData(JSON.parse(e.parameter.data));',
  '  }',
  '  return ContentService.createTextOutput(JSON.stringify({ok: true}))',
  '    .setMimeType(ContentService.MimeType.JSON);',
  '}',
  '',
  'function doPost(e) {',
  '  var raw = \'\';',
  '  if (e.postData && e.postData.contents) {',
  '    raw = e.postData.contents;',
  '  } else if (e.parameter && e.parameter.data) {',
  '    raw = e.parameter.data;',
  '  }',
  '  if (!raw) {',
  '    return ContentService.createTextOutput(JSON.stringify({error: \'no data\'}))',
  '      .setMimeType(ContentService.MimeType.JSON);',
  '  }',
  '  return processData(JSON.parse(raw));',
  '}',
  '',
  'function processData(data) {',
  '  var lock = LockService.getScriptLock();',
  '  lock.waitLock(30000);',
  '  try {',
  '    var ss = SpreadsheetApp.getActiveSpreadsheet();',
  '',
  '    if (data.action === \'saveTodos\') {',
  '      var sheet = ss.getSheetByName(\'할일\');',
  '      if (!sheet) throw new Error(\'할일 시트가 없습니다.\');',
  '      sheet.clearContents();',
  '      sheet.getRange(1, 1, 1, 2).setValues([[\'내용\', \'완료\']]);',
  '      if (data.todos && data.todos.length > 0) {',
  '        var values = data.todos.map(function(t) {',
  '          return [t.text, t.done ? \'TRUE\' : \'FALSE\'];',
  '        });',
  '        sheet.getRange(2, 1, 1 + values.length, 2).setValues(values);',
  '      }',
  '    }',
  '',
  '    if (data.action === \'saveMemo\') {',
  '      var memoSheet = ss.getSheetByName(\'메모\');',
  '      if (!memoSheet) throw new Error(\'메모 시트가 없습니다.\');',
  '      memoSheet.clearContents();',
  '      if (data.memo) {',
  '        memoSheet.getRange(1, 1).setValue(data.memo);',
  '      }',
  '    }',
  '',
  '    return ContentService.createTextOutput(JSON.stringify({ok: true}))',
  '      .setMimeType(ContentService.MimeType.JSON);',
  '  } catch(err) {',
  '    return ContentService.createTextOutput(JSON.stringify({error: err.toString()}))',
  '      .setMimeType(ContentService.MimeType.JSON);',
  '  } finally {',
  '    lock.releaseLock();',
  '  }',
  '}',
].join('\n');

function ensureAppsScriptSampleInTextarea() {
  const ta = document.getElementById('apps-script-sample-code');
  if (!ta || ta.dataset.loaded === '1') return;
  ta.value = APPS_SCRIPT_SAMPLE_GS;
  ta.dataset.loaded = '1';
}

function openAppsScriptNoticeModal() {
  ensureAppsScriptSampleInTextarea();
  const ov = document.getElementById('apps-script-notice-overlay');
  if (!ov) return;
  ov.style.display = 'flex';
  ov.setAttribute('aria-hidden', 'false');
}

function closeAppsScriptNoticeModal() {
  const ov = document.getElementById('apps-script-notice-overlay');
  if (!ov) return;
  ov.style.display = 'none';
  ov.setAttribute('aria-hidden', 'true');
}

function initAppsScriptNoticeModal() {
  document.querySelectorAll('[data-open-apps-script-notice]').forEach((el) => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      openAppsScriptNoticeModal();
    });
  });
  document.getElementById('apps-script-notice-close')?.addEventListener('click', closeAppsScriptNoticeModal);
  document.getElementById('apps-script-notice-ok')?.addEventListener('click', closeAppsScriptNoticeModal);
  document.getElementById('apps-script-notice-overlay')?.addEventListener('click', (e) => {
    if (e.target.id === 'apps-script-notice-overlay') closeAppsScriptNoticeModal();
  });
  document.getElementById('apps-script-sample-copy')?.addEventListener('click', async () => {
    ensureAppsScriptSampleInTextarea();
    const ta = document.getElementById('apps-script-sample-code');
    if (!ta) return;
    try {
      await navigator.clipboard.writeText(ta.value);
      alert('클립보드에 복사했습니다.');
    } catch {
      ta.select();
      document.execCommand('copy');
      alert('클립보드에 복사했습니다.');
    }
  });
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    const ov = document.getElementById('apps-script-notice-overlay');
    if (ov && ov.style.display !== 'none') closeAppsScriptNoticeModal();
  });
}

function openNeisKeyHelpInBrowser() {
  window.open(NEIS_KEY_HELP_URL, '_blank', 'noopener,noreferrer');
}

function initNeisKeyHelpButtons() {
  document.querySelectorAll('[data-open-neis-key-help]').forEach((el) => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      openNeisKeyHelpInBrowser();
    });
  });
}

function initGoogleSheetsApiHelpModal() {
  document.querySelectorAll('[data-open-google-sheets-api-help]').forEach((el) => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      openGoogleSheetsApiHelpModal();
    });
  });
  document.getElementById('google-sheets-api-help-close')?.addEventListener('click', closeGoogleSheetsApiHelpModal);
  document.getElementById('google-sheets-api-help-ok')?.addEventListener('click', closeGoogleSheetsApiHelpModal);
  document.getElementById('google-sheets-api-help-overlay')?.addEventListener('click', (e) => {
    if (e.target.id === 'google-sheets-api-help-overlay') closeGoogleSheetsApiHelpModal();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    const ov = document.getElementById('google-sheets-api-help-overlay');
    if (ov && ov.style.display !== 'none') closeGoogleSheetsApiHelpModal();
  });
}

function initApiSettings() {
  syncApiFormFromConfig();
  initNeisKeyHelpButtons();
  initSpreadsheetTabsNoticeModal();
  initAppsScriptNoticeModal();
  initGoogleSheetsApiHelpModal();

  const panel = document.getElementById('api-settings-panel');
  const btn = document.getElementById('api-settings-btn');

  btn.addEventListener('click', () => {
    panel.classList.toggle('pinned');
  });

  document.getElementById('api-settings-save').addEventListener('click', () => {
    const googleApiKey = document.getElementById('api-input-google-key').value.trim();
    const spreadsheetId = parseSpreadsheetIdFromInput(document.getElementById('api-input-sheet').value);
    const appsScriptUrl = normalizeAppsScriptUrl(document.getElementById('api-input-apps-script').value);
    const neisApiKey = document.getElementById('api-input-neis-key').value.trim();

    CONFIG.GOOGLE_API_KEY = googleApiKey;
    CONFIG.SPREADSHEET_ID = spreadsheetId;
    CONFIG.APPS_SCRIPT_URL = appsScriptUrl;
    CONFIG.NEIS.API_KEY = neisApiKey;

    saveApiConfigToStorage();
    invalidateDashboardCaches();
    const p = typeof loadAllData === 'function' ? loadAllData() : Promise.resolve();
    p.then(() => {
      if (typeof updateSchoolDisplayFromConfig === 'function') updateSchoolDisplayFromConfig();
    });
    panel.classList.remove('pinned');
  });

  document.getElementById('api-settings-reset').addEventListener('click', () => {
    localStorage.removeItem(API_CONFIG_STORAGE_KEY);
    CONFIG.GOOGLE_API_KEY = '';
    CONFIG.SPREADSHEET_ID = '';
    CONFIG.APPS_SCRIPT_URL = '';
    CONFIG.NEIS.API_KEY = '';
    syncApiFormFromConfig();
    invalidateDashboardCaches();
    const p = typeof loadAllData === 'function' ? loadAllData() : Promise.resolve();
    p.then(() => {
      if (typeof updateSchoolDisplayFromConfig === 'function') updateSchoolDisplayFromConfig();
    });
    panel.classList.remove('pinned');
  });
}
