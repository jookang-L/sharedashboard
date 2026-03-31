/* =================================================================
   즐겨찾기 링크 (시트 연동 + 대시보드에서 편집 · localStorage)
   ================================================================= */

const LINKS_STORAGE_KEY = 'dashboard_favorites_links';

/** 현재 화면에 표시 중인 링크 목록 (편집 모달과 동기화) */
let cachedLinks = [];

let linkClickTimer = null;

function escapeLinkHtml(s) {
  const d = document.createElement('div');
  d.textContent = s == null ? '' : String(s);
  return d.innerHTML;
}

function escapeAttr(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;');
}

function normalizeLink(l, index) {
  return {
    id: l.id != null ? l.id : Date.now() + index,
    name: (l.name || '').trim(),
    url: (l.url || '').trim() || '#',
    icon: l.icon || 'fas fa-globe',
    color: l.color || LINK_COLORS[index % LINK_COLORS.length],
  };
}

function persistLinksToLocal(links) {
  const clean = links
    .map((l, i) => normalizeLink(l, i))
    .filter(l => l.name.length > 0);
  localStorage.setItem(LINKS_STORAGE_KEY, JSON.stringify(clean));
  return clean;
}

async function loadLinksFromSheet() {
  const rows = await fetchSheetData(CONFIG.SHEETS.LINKS);
  if (!rows) {
    renderLinksFallback();
    return;
  }
  const links = rows.slice(1).map((r, i) =>
    normalizeLink({
      name: r[0] || '',
      url: r[1] || '#',
      icon: r[2] || 'fas fa-globe',
    }, i)
  ).filter(l => l.name.length > 0);
  cachedLinks = links;
  renderLinks(links);
}

async function loadLinks() {
  try {
    const raw = localStorage.getItem(LINKS_STORAGE_KEY);
    if (raw !== null && raw !== '') {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        if (parsed.length === 0) {
          cachedLinks = [];
          renderLinks([]);
          return;
        }
        cachedLinks = parsed.map((l, i) => normalizeLink(l, i));
        renderLinks(cachedLinks);
        return;
      }
    }
  } catch { /* ignore */ }

  await loadLinksFromSheet();
}

function renderLinks(links) {
  const grid = document.getElementById('link-grid');
  cachedLinks = links.map((l, i) => normalizeLink(l, i));

  if (!cachedLinks.length) {
    grid.innerHTML = '<div class="link-item link-item-empty" data-url="#" data-id=""><span class="link-name" style="color:var(--text-muted)">등록된 링크가 없습니다 · 더블클릭하여 추가</span></div>';
    return;
  }

  grid.innerHTML = cachedLinks.map(l => `
    <div class="link-item" role="link" tabindex="0" data-url="${escapeAttr(l.url)}" data-id="${escapeAttr(String(l.id))}">
      <div class="link-icon" style="background:${escapeAttr(l.color)}"><i class="${escapeAttr(l.icon)}"></i></div>
      <span class="link-name">${escapeLinkHtml(l.name)}</span>
    </div>`).join('');
}

function renderLinksFallback() {
  renderLinks([
    { name: '업무포털', url: 'https://cne.eduptl.kr/', icon: 'fas fa-briefcase', color: '#f59e0b' },
    { name: 'Google Drive', url: 'https://drive.google.com', icon: 'fab fa-google-drive', color: '#22c55e' },
    { name: 'YouTube', url: 'https://www.youtube.com', icon: 'fab fa-youtube', color: '#ef4444' },
    { name: '아직미정', url: '#', icon: 'fas fa-file-alt', color: '#ec4899' },
  ]);
}

/* =================================================================
   클릭(이동) / 더블클릭(편집)
   ================================================================= */

function initLinkGridPointerHandlers() {
  const grid = document.getElementById('link-grid');
  const header = document.querySelector('.card-links .card-header');
  if (!grid) return;

  grid.addEventListener('click', (e) => {
    const item = e.target.closest('.link-item');
    if (!item || item.classList.contains('link-item-empty')) return;
    clearTimeout(linkClickTimer);
    linkClickTimer = setTimeout(() => {
      const url = item.dataset.url;
      if (url && url !== '#') window.open(url, '_blank', 'noopener');
    }, 280);
  });

  function openEditorFromDblClick(e) {
    e.preventDefault();
    e.stopPropagation();
    clearTimeout(linkClickTimer);
    openLinkEditorModal();
  }

  grid.addEventListener('dblclick', openEditorFromDblClick);

  if (header) {
    header.style.cursor = 'default';
    header.title = '더블클릭하여 링크 편집';
    header.addEventListener('dblclick', openEditorFromDblClick);
  }
}

/* =================================================================
   편집 모달 (이름 · 주소만)
   ================================================================= */

function renderEditorRows(links) {
  const body = document.getElementById('link-editor-body');
  const list = links.length ? links : [{ id: Date.now(), name: '', url: '', color: LINK_COLORS[0] }];

  body.innerHTML = list.map((l, i) => {
    const row = normalizeLink(l, i);
    return `<div class="link-editor-row" data-id="${escapeAttr(String(row.id))}">
      <div class="link-editor-row-fields">
        <input type="text" class="link-editor-name" placeholder="이름" value="${escapeLinkHtml(row.name)}">
        <input type="text" class="link-editor-url" placeholder="https://..." value="${escapeLinkHtml(row.url === '#' ? '' : row.url)}">
      </div>
      <button type="button" class="link-editor-row-delete" title="삭제"><i class="fas fa-trash-alt"></i></button>
    </div>`;
  }).join('');

  body.querySelectorAll('.link-editor-row-delete').forEach(btn => {
    btn.addEventListener('click', () => {
      const row = btn.closest('.link-editor-row');
      row.remove();
      if (!body.querySelector('.link-editor-row')) {
        renderEditorRows([]);
      }
    });
  });
}

function collectLinksFromEditor() {
  const body = document.getElementById('link-editor-body');
  const rows = body.querySelectorAll('.link-editor-row');
  const out = [];
  rows.forEach((row, i) => {
    const name = row.querySelector('.link-editor-name').value.trim();
    let url = row.querySelector('.link-editor-url').value.trim();
    const id = row.dataset.id || Date.now() + i;
    if (!url) url = '#';
    if (!name) return;
    out.push(normalizeLink({ id, name, url }, i));
  });
  return out;
}

function openLinkEditorModal() {
  const overlay = document.getElementById('link-editor-overlay');
  renderEditorRows(cachedLinks.length ? [...cachedLinks] : []);
  overlay.style.display = 'flex';
}

function closeLinkEditorModal() {
  document.getElementById('link-editor-overlay').style.display = 'none';
}

function initLinksEditor() {
  initLinkGridPointerHandlers();

  document.getElementById('link-editor-close').addEventListener('click', closeLinkEditorModal);
  document.getElementById('link-editor-cancel').addEventListener('click', closeLinkEditorModal);
  const overlay = document.getElementById('link-editor-overlay');
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeLinkEditorModal();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (overlay.style.display !== 'flex') return;
    closeLinkEditorModal();
  });

  document.getElementById('link-editor-add-row').addEventListener('click', () => {
    const body = document.getElementById('link-editor-body');
    const div = document.createElement('div');
    div.className = 'link-editor-row';
    div.dataset.id = String(Date.now());
    div.innerHTML = `<div class="link-editor-row-fields">
      <input type="text" class="link-editor-name" placeholder="이름" value="">
      <input type="text" class="link-editor-url" placeholder="https://..." value="">
    </div>
    <button type="button" class="link-editor-row-delete" title="삭제"><i class="fas fa-trash-alt"></i></button>`;
    body.appendChild(div);
    div.querySelector('.link-editor-row-delete').addEventListener('click', () => {
      div.remove();
      if (!body.querySelector('.link-editor-row')) renderEditorRows([]);
    });
    div.querySelector('.link-editor-name').focus();
  });

  document.getElementById('link-editor-save').addEventListener('click', () => {
    const links = collectLinksFromEditor();
    persistLinksToLocal(links);
    cachedLinks = links.map((l, i) => normalizeLink(l, i));
    renderLinks(cachedLinks);
    closeLinkEditorModal();
  });

  document.getElementById('link-editor-sheet').addEventListener('click', async () => {
    localStorage.removeItem(LINKS_STORAGE_KEY);
    closeLinkEditorModal();
    await loadLinksFromSheet();
  });
}
