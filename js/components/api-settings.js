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

function saveApiConfigToStorage() {
  const payload = {
    googleApiKey: CONFIG.GOOGLE_API_KEY || '',
    spreadsheetId: CONFIG.SPREADSHEET_ID || '',
    appsScriptUrl: CONFIG.APPS_SCRIPT_URL || '',
    neisApiKey: CONFIG.NEIS.API_KEY || '',
  };
  localStorage.setItem(API_CONFIG_STORAGE_KEY, JSON.stringify(payload));
}

function initApiSettings() {
  syncApiFormFromConfig();

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
