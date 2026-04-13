/* =================================================================
   설정 컴포넌트 (배경/카드 색상, 폰트, 폰트 크기·색상, 추천·사용자 테마)
   ================================================================= */

const SETTINGS_STORAGE_KEY = 'dashboard_settings';
const CUSTOM_THEMES_KEY = 'dashboard_custom_themes';

const DEFAULT_SETTINGS = {
  bgColor: '#ffffff',
  bgOpacity: 96,
  cardColor: '#ffffff',
  cardOpacity: 90,
  font: "'Noto Sans KR', sans-serif",
  fontSize: 16,
  fontColor: '#1f2937',
  accentColor: '#4a7cff',
  themePreset: 'default',
};

/**
 * 추천 테마 — 첫 번째 `기본`은 흰 바탕 기본값
 */
const THEME_PRESETS = [
  {
    id: 'default',
    label: '기본',
    bgColor: '#ffffff',
    bgOpacity: 96,
    cardColor: '#ffffff',
    cardOpacity: 92,
    font: "'Noto Sans KR', sans-serif",
    fontSize: 16,
    fontColor: '#1f2937',
    accentColor: '#4a7cff',
  },
  {
    id: 'spring',
    label: '봄',
    bgColor: '#d8f3dc',
    bgOpacity: 62,
    cardColor: '#fefffa',
    cardOpacity: 90,
    font: "'Pretendard', sans-serif",
    fontSize: 16,
    fontColor: '#1b4332',
    accentColor: '#52b788',
  },
  {
    id: 'summer',
    label: '여름',
    bgColor: '#0b7189',
    bgOpacity: 82,
    cardColor: '#e3fcff',
    cardOpacity: 84,
    font: "'Noto Sans KR', sans-serif",
    fontSize: 16,
    fontColor: '#023047',
    accentColor: '#22d3ee',
  },
  {
    id: 'autumn',
    label: '가을',
    bgColor: '#5c4033',
    bgOpacity: 76,
    cardColor: '#fff4e6',
    cardOpacity: 88,
    font: "'Nanum Myeongjo', serif",
    fontSize: 16,
    fontColor: '#3e2723',
    accentColor: '#f57c00',
  },
  {
    id: 'winter',
    label: '겨울',
    bgColor: '#37474f',
    bgOpacity: 86,
    cardColor: '#eceff1',
    cardOpacity: 82,
    font: "'IBM Plex Sans KR', sans-serif",
    fontSize: 16,
    fontColor: '#263238',
    accentColor: '#4fc3f7',
  },
  {
    id: 'sakura',
    label: '벚꽃',
    bgColor: '#fce7ef',
    bgOpacity: 68,
    cardColor: '#fffafd',
    cardOpacity: 92,
    font: "'Pretendard', sans-serif",
    fontSize: 16,
    fontColor: '#880e4f',
    accentColor: '#ec407a',
  },
  {
    id: 'maple',
    label: '단풍',
    bgColor: '#3e2723',
    bgOpacity: 84,
    cardColor: '#fff5f0',
    cardOpacity: 86,
    font: "'Gothic A1', sans-serif",
    fontSize: 16,
    fontColor: '#3e2723',
    accentColor: '#ff6e40',
  },
  {
    id: 'school',
    label: '학교',
    bgColor: '#1a237e',
    bgOpacity: 88,
    cardColor: '#f5f7ff',
    cardOpacity: 93,
    font: "'Noto Sans KR', sans-serif",
    fontSize: 16,
    fontColor: '#1a237e',
    accentColor: '#5c6bc0',
  },
];

function loadCustomThemes() {
  try {
    const raw = localStorage.getItem(CUSTOM_THEMES_KEY);
    const a = raw ? JSON.parse(raw) : [];
    return Array.isArray(a) ? a : [];
  } catch {
    return [];
  }
}

function saveCustomThemes(list) {
  localStorage.setItem(CUSTOM_THEMES_KEY, JSON.stringify(list));
}

function loadSettings() {
  try {
    const saved = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!saved) return { ...DEFAULT_SETTINGS };
    const parsed = JSON.parse(saved);
    const merged = { ...DEFAULT_SETTINGS, ...parsed };
    if (!Object.prototype.hasOwnProperty.call(parsed, 'themePreset')) {
      merged.themePreset = null;
    }
    const fs = Number(merged.fontSize);
    merged.fontSize = Number.isFinite(fs) ? Math.min(24, Math.max(12, Math.round(fs))) : DEFAULT_SETTINGS.fontSize;
    return merged;
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

function saveSettings(settings) {
  localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
}

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return { r, g, b };
}

function applyAccentColor(hex) {
  const { r, g, b } = hexToRgb(hex);
  const root = document.documentElement;
  root.style.setProperty('--accent', hex);
  root.style.setProperty('--accent-r', String(r));
  root.style.setProperty('--accent-g', String(g));
  root.style.setProperty('--accent-b', String(b));
  root.style.setProperty('--accent-glow', `rgba(${r}, ${g}, ${b}, 0.25)`);
}

function applySettings(settings) {
  const root = document.documentElement;

  const bg = hexToRgb(settings.bgColor);
  root.style.setProperty('--settings-bg',
    `rgba(${bg.r}, ${bg.g}, ${bg.b}, ${settings.bgOpacity / 100})`);
  document.querySelector('.background-overlay').style.background =
    `rgba(${bg.r}, ${bg.g}, ${bg.b}, ${settings.bgOpacity / 100})`;

  const card = hexToRgb(settings.cardColor);
  root.style.setProperty('--glass-bg',
    `rgba(${card.r}, ${card.g}, ${card.b}, ${settings.cardOpacity / 100})`);

  root.style.setProperty('--font-family', settings.font);
  document.body.style.fontFamily = settings.font;

  const fs = Math.min(24, Math.max(12, Number(settings.fontSize) || DEFAULT_SETTINGS.fontSize));
  root.style.setProperty('--font-size-base', `${fs}px`);

  root.style.setProperty('--text-primary', settings.fontColor);

  applyAccentColor(settings.accentColor || DEFAULT_SETTINGS.accentColor);

  const cardBrightness = (card.r * 299 + card.g * 587 + card.b * 114) / 1000;

  if (cardBrightness < 128) {
    root.style.setProperty('--text-secondary', lighten(settings.fontColor, 30));
    root.style.setProperty('--text-muted', lighten(settings.fontColor, 60));
  } else {
    root.style.setProperty('--text-secondary', settings.fontColor);
    root.style.setProperty('--text-muted', '#888888');
  }
}

function lighten(hex, amount) {
  const { r, g, b } = hexToRgb(hex);
  const nr = Math.min(255, r + amount);
  const ng = Math.min(255, g + amount);
  const nb = Math.min(255, b + amount);
  return `rgb(${nr}, ${ng}, ${nb})`;
}

function setFontSelectValue(selectEl, fontValue) {
  const v = fontValue || DEFAULT_SETTINGS.font;
  const opt = Array.from(selectEl.options).find((o) => o.value === v);
  if (opt) {
    selectEl.value = v;
    return;
  }
  let fb = document.getElementById('setting-font-fallback');
  if (!fb) {
    fb = document.createElement('option');
    fb.id = 'setting-font-fallback';
    selectEl.appendChild(fb);
  }
  fb.value = v;
  fb.textContent = '(현재 폰트)';
  selectEl.value = v;
}

function syncUI(settings) {
  document.getElementById('setting-bg-color').value = settings.bgColor;
  document.getElementById('setting-bg-label').textContent = settings.bgColor;
  document.getElementById('setting-bg-opacity').value = settings.bgOpacity;
  document.getElementById('setting-bg-opacity-label').textContent = settings.bgOpacity + '%';

  document.getElementById('setting-card-color').value = settings.cardColor;
  document.getElementById('setting-card-label').textContent = settings.cardColor;
  document.getElementById('setting-card-opacity').value = settings.cardOpacity;
  document.getElementById('setting-card-opacity-label').textContent = settings.cardOpacity + '%';

  setFontSelectValue(document.getElementById('setting-font'), settings.font);

  const fsUi = Math.min(24, Math.max(12, Number(settings.fontSize) || DEFAULT_SETTINGS.fontSize));
  const fsEl = document.getElementById('setting-font-size');
  if (fsEl) {
    fsEl.value = String(fsUi);
    document.getElementById('setting-font-size-label').textContent = `${fsUi}px`;
  }

  document.getElementById('setting-font-color').value = settings.fontColor;
  document.getElementById('setting-font-label').textContent = settings.fontColor;

  const ac = settings.accentColor || DEFAULT_SETTINGS.accentColor;
  document.getElementById('setting-accent-color').value = ac;
  document.getElementById('setting-accent-label').textContent = ac;

  syncThemeChips(settings);
}

function syncThemeChips(settings) {
  const active = settings.themePreset || null;
  document.querySelectorAll('.settings-theme-chip[data-theme]').forEach((btn) => {
    btn.classList.toggle('is-active', btn.dataset.theme === active);
  });
}

function resolveThemePreset(themeId) {
  const built = THEME_PRESETS.find((t) => t.id === themeId);
  if (built) return built;
  return loadCustomThemes().find((t) => t.id === themeId);
}

function presetToSettings(preset) {
  if (!preset) return null;
  return {
    bgColor: preset.bgColor,
    bgOpacity: preset.bgOpacity,
    cardColor: preset.cardColor,
    cardOpacity: preset.cardOpacity,
    font: preset.font,
    fontSize: preset.fontSize != null ? preset.fontSize : DEFAULT_SETTINGS.fontSize,
    fontColor: preset.fontColor,
    accentColor: preset.accentColor,
    themePreset: preset.id,
  };
}

function applyThemePreset(themeId) {
  const preset = resolveThemePreset(themeId);
  return presetToSettings(preset);
}

function escapeHtml(s) {
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

function renderBuiltinThemeChips() {
  const el = document.getElementById('settings-theme-chips');
  if (!el) return;
  el.innerHTML = THEME_PRESETS.map((t) => `
    <button type="button" class="settings-theme-chip" data-theme="${escapeHtml(t.id)}" title="${escapeHtml(t.label)}">
      <span class="settings-theme-swatch" aria-hidden="true"></span>
      <span class="settings-theme-label">${escapeHtml(t.label)}</span>
    </button>`).join('');
}

function customGradient(p) {
  return `linear-gradient(90deg, ${p.bgColor} 0%, ${p.cardColor} 34%, ${p.fontColor} 66%, ${p.accentColor} 100%)`;
}

function renderCustomThemeChips() {
  const el = document.getElementById('settings-theme-chips-custom');
  if (!el) return;
  const list = loadCustomThemes();
  if (list.length === 0) {
    el.innerHTML = '<span class="settings-custom-themes-empty">저장된 내 테마가 없습니다.</span>';
    return;
  }
  el.innerHTML = list.map((t) => `
    <div class="settings-theme-chip-wrap">
      <button type="button" class="settings-theme-chip settings-theme-chip--custom" data-theme="${escapeHtml(t.id)}" title="${escapeHtml(t.label)}">
        <span class="settings-theme-swatch" style="background:${customGradient(t)}" aria-hidden="true"></span>
        <span class="settings-theme-label">${escapeHtml(t.label)}</span>
      </button>
      <button type="button" class="settings-theme-chip-delete" data-delete-theme="${escapeHtml(t.id)}" title="삭제" aria-label="${escapeHtml(t.label)} 삭제">×</button>
    </div>`).join('');
}

function renderAllThemeChips() {
  renderBuiltinThemeChips();
  renderCustomThemeChips();
}

function initSettings() {
  let settings = loadSettings();
  applySettings(settings);
  syncUI(settings);
  renderAllThemeChips();

  function update(key, val) {
    settings[key] = val;
    if (key !== 'themePreset') settings.themePreset = null;
    applySettings(settings);
    saveSettings(settings);
    syncUI(settings);
  }

  document.getElementById('setting-bg-color').addEventListener('input', (e) => {
    update('bgColor', e.target.value);
  });
  document.getElementById('setting-bg-opacity').addEventListener('input', (e) => {
    update('bgOpacity', parseInt(e.target.value, 10));
  });

  document.getElementById('setting-card-color').addEventListener('input', (e) => {
    update('cardColor', e.target.value);
  });
  document.getElementById('setting-card-opacity').addEventListener('input', (e) => {
    update('cardOpacity', parseInt(e.target.value, 10));
  });

  document.getElementById('setting-font').addEventListener('change', (e) => {
    update('font', e.target.value);
  });

  document.getElementById('setting-font-color').addEventListener('input', (e) => {
    update('fontColor', e.target.value);
  });

  document.getElementById('setting-font-size')?.addEventListener('input', (e) => {
    update('fontSize', parseInt(e.target.value, 10));
  });

  document.getElementById('setting-accent-color').addEventListener('input', (e) => {
    update('accentColor', e.target.value);
  });

  document.getElementById('settings-reset').addEventListener('click', () => {
    settings = { ...DEFAULT_SETTINGS };
    applySettings(settings);
    saveSettings(settings);
    syncUI(settings);
  });

  const themeGroup = document.getElementById('settings-theme-group');
  if (themeGroup) {
    themeGroup.addEventListener('click', (e) => {
      const delBtn = e.target.closest('[data-delete-theme]');
      if (delBtn) {
        e.preventDefault();
        e.stopPropagation();
        const id = delBtn.getAttribute('data-delete-theme');
        const next = loadCustomThemes().filter((t) => t.id !== id);
        saveCustomThemes(next);
        if (settings.themePreset === id) {
          settings.themePreset = null;
          saveSettings(settings);
        }
        renderCustomThemeChips();
        syncThemeChips(settings);
        return;
      }

      const btn = e.target.closest('.settings-theme-chip');
      if (!btn || !btn.dataset.theme) return;
      const next = applyThemePreset(btn.dataset.theme);
      if (!next) return;
      settings = { ...settings, ...next };
      applySettings(settings);
      saveSettings(settings);
      syncUI(settings);
    });
  }

  document.getElementById('custom-theme-save')?.addEventListener('click', () => {
    const inp = document.getElementById('custom-theme-name');
    const raw = (inp && inp.value) ? inp.value.trim() : '';
    if (!raw) {
      alert('테마 이름을 입력하세요.');
      return;
    }
    if (raw.length > 28) {
      alert('이름은 28자 이내로 해 주세요.');
      return;
    }
    const id = `u_${Date.now()}`;
    const entry = {
      id,
      label: raw,
      bgColor: settings.bgColor,
      bgOpacity: settings.bgOpacity,
      cardColor: settings.cardColor,
      cardOpacity: settings.cardOpacity,
      font: settings.font,
      fontSize: settings.fontSize != null ? settings.fontSize : DEFAULT_SETTINGS.fontSize,
      fontColor: settings.fontColor,
      accentColor: settings.accentColor || DEFAULT_SETTINGS.accentColor,
    };
    const list = loadCustomThemes();
    list.push(entry);
    saveCustomThemes(list);
    settings = { ...settings, ...presetToSettings(entry) };
    applySettings(settings);
    saveSettings(settings);
    inp.value = '';
    renderCustomThemeChips();
    syncUI(settings);
  });

  const panel = document.getElementById('settings-panel');
  const btn = document.getElementById('settings-btn');

  btn.addEventListener('click', () => {
    panel.classList.toggle('pinned');
  });
}
