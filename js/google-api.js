/* =================================================================
   설정 및 Google Sheets API
   =================================================================
   기본값은 비어 있습니다. 하단 독의 주황색 톱니바퀴(연동 설정)에서 입력하거나
   localStorage(dashboard_api_config)에 저장된 값이 적용됩니다.
   ================================================================= */

const API_CONFIG_STORAGE_KEY = 'dashboard_api_config';

/** 건의하기 doPost `payload.secret` — Apps Script WEBHOOK_SECRET과 동일 (사용자 설정 없음) */
const FEEDBACK_WEBHOOK_SECRET_FIXED = 'x9Kf2LqP8sZ0mN7aB3cD4eF6gH1JkL';

/**
 * 건의하기 전용 웹앱 URL(/exec) — 배포자 시트로만 전송. 연동 설정의 APPS_SCRIPT_URL과 무관.
 */
const FEEDBACK_WEBAPP_URL = 'https://script.google.com/macros/s/AKfycbyNINxhGB0Z4ZdPu4Te3shecFT2K9ozUWtHNsf63r8KhvXb3KE5VCjBMIbnqu9dE2Vb0A/exec';

const CONFIG = {
  GOOGLE_API_KEY: '',

  SPREADSHEET_ID: '',

  // Google Apps Script 웹 앱 URL (할일/메모 시트 쓰기용)
  APPS_SCRIPT_URL: '',

  SHEETS: {
    TIMETABLE: '시트1',
    TODO: '할일',
    MEMO: '메모',
    FOLDERS: '폴더',
    LINKS: '링크',
  },

  // NEIS 교육정보 API (급식 조회용)
  NEIS: {
    API_KEY: '',
    ATPT_OFCDC_SC_CODE: 'N10',       // 충청남도교육청 (키 입력 후 학교 검색 시 덮어씀)
    SCHOOL_NAME: '',
    SD_SCHUL_CODE: null,              // 자동 조회됨
  },

  // 반복 갱신 제거됨 — 시간표·급식은 페이지 로드 시 1회만 호출
  REFRESH_INTERVAL: 0,

  PERIOD_TIMES: [
    { start: '08:40', end: '09:30' },
    { start: '09:40', end: '10:30' },
    { start: '10:40', end: '11:30' },
    { start: '11:40', end: '12:30' },
    { start: '13:40', end: '14:30' },
    { start: '14:40', end: '15:30' },
    { start: '15:40', end: '16:30' },
  ],
};

/* =================================================================
   공용 유틸리티
   ================================================================= */

const DAY_NAMES_KR = ['일', '월', '화', '수', '목', '금', '토'];
const LINK_COLORS = [
  '#4a7cff', '#ef4444', '#22c55e', '#f59e0b',
  '#8b5cf6', '#ec4899', '#0ea5e9', '#f97316',
];

function pad(n) { return n.toString().padStart(2, '0'); }
function getNow() { return new Date(); }
function getDayIndex() { return getNow().getDay(); }

function dateToStr(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function daysBetween(a, b) {
  const msDay = 86400000;
  const ua = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
  const ub = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.round((ub - ua) / msDay);
}

/* =================================================================
   Google Sheets API Fetch
   ================================================================= */

function parseSpreadsheetIdFromInput(raw) {
  const s = (raw || '').trim();
  if (!s) return '';
  const m = s.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (m) return m[1];
  return s;
}

function normalizeAppsScriptUrl(raw) {
  const s = (raw || '').trim();
  if (!s) return '';
  return s.replace(/\/$/, '');
}

/** localStorage에 저장된 연동 설정을 CONFIG에 반영 (페이지 로드 시 1회) */
function applyStoredApiConfig() {
  try {
    const saved = localStorage.getItem(API_CONFIG_STORAGE_KEY);
    if (!saved) return;
    const o = JSON.parse(saved);
    if (o.googleApiKey != null && o.googleApiKey !== '') CONFIG.GOOGLE_API_KEY = String(o.googleApiKey).trim();
    if (o.spreadsheetId != null && o.spreadsheetId !== '') {
      CONFIG.SPREADSHEET_ID = parseSpreadsheetIdFromInput(String(o.spreadsheetId));
    }
    if (o.appsScriptUrl != null && o.appsScriptUrl !== '') {
      CONFIG.APPS_SCRIPT_URL = normalizeAppsScriptUrl(String(o.appsScriptUrl));
    }
    if (o.neisApiKey != null && o.neisApiKey !== '') CONFIG.NEIS.API_KEY = String(o.neisApiKey).trim();
  } catch { /* ignore */ }
}

applyStoredApiConfig();

function getFeedbackWebhookUrl() {
  return normalizeAppsScriptUrl(FEEDBACK_WEBAPP_URL);
}

function getFeedbackWebhookSecret() {
  return FEEDBACK_WEBHOOK_SECRET_FIXED;
}

/** 시트/스프레드시트 ID 변경 시 다른 스크립트의 캐시를 비우고 데이터를 다시 불러올 때 사용 */
function invalidateDashboardCaches() {
  if (typeof resetTimetableCache === 'function') resetTimetableCache();
  if (typeof resetMealCache === 'function') resetMealCache();
}

async function fetchSheetData(sheetName, range) {
  if (!CONFIG.GOOGLE_API_KEY || !CONFIG.SPREADSHEET_ID) {
    console.warn(`[시트 로딩 생략] ${sheetName}: API 키 또는 스프레드시트 ID가 없습니다`);
    return null;
  }
  const fullRange = range ? `${sheetName}!${range}` : sheetName;
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${CONFIG.SPREADSHEET_ID}/values/${encodeURIComponent(fullRange)}?key=${CONFIG.GOOGLE_API_KEY}`;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return data.values || [];
  } catch (err) {
    console.warn(`[시트 로딩 실패] ${sheetName}:`, err.message);
    return null;
  }
}
