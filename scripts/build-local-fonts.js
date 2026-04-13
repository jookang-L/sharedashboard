const fs = require('fs');
const path = require('path');
const raw = fs.readFileSync(path.join(__dirname, '../public/fonts/font-files.json'), 'utf8').replace(/^\uFEFF/, '');
const a = JSON.parse(raw);

const labelsPath = path.join(__dirname, '../public/fonts/font-labels.json');
let labels = {};
if (fs.existsSync(labelsPath)) {
  try {
    labels = JSON.parse(fs.readFileSync(labelsPath, 'utf8'));
  } catch (e) {
    console.warn('font-labels.json 파싱 실패:', e.message);
  }
}

const out = [];
out.push('/* 자동 생성: npm run build:fonts 또는 scripts/build-local-fonts.js */');
out.push(`const LOCAL_FONT_FILES = ${JSON.stringify(a)};`);
out.push(`const LOCAL_FONT_LABELS = ${JSON.stringify(labels)};`);
out.push(`
function localFontId(file) {
  return 'Local_' + file.replace(/\\.ttf$/i, '').replace(/[^a-zA-Z0-9]/g, '_');
}

function injectLocalFonts() {
  if (document.getElementById('dashboard-local-fonts-css')) return;
  const css = LOCAL_FONT_FILES.map((f) => {
    const id = localFontId(f);
    const u = 'public/fonts/' + encodeURIComponent(f);
    return '@font-face{font-family:\\'' + id + '\\';src:url(\\'' + u + '\\') format(\\'truetype\\');font-display:swap;}';
  }).join('\\n');
  const s = document.createElement('style');
  s.id = 'dashboard-local-fonts-css';
  s.textContent = css;
  document.head.appendChild(s);
}

function localFontSelectValue(file) {
  return '\\'' + localFontId(file) + '\\', sans-serif';
}

function formatFontLabel(file) {
  if (LOCAL_FONT_LABELS && LOCAL_FONT_LABELS[file]) return LOCAL_FONT_LABELS[file];
  return file.replace(/\\.ttf$/i, '').replace(/\\s*TTF\\s*[BRL]?$/i, '').trim();
}

function populateLocalFontSelect() {
  const g = document.getElementById('setting-font-local-group');
  if (!g) return;
  g.innerHTML = '';
  LOCAL_FONT_FILES.forEach((f) => {
    const o = document.createElement('option');
    o.value = localFontSelectValue(f);
    o.textContent = formatFontLabel(f);
    g.appendChild(o);
  });
}

document.addEventListener('DOMContentLoaded', () => {
  injectLocalFonts();
  populateLocalFontSelect();
});
`);

fs.writeFileSync(path.join(__dirname, '../js/local-fonts.js'), out.join('\n'), 'utf8');
console.log('Wrote js/local-fonts.js');
