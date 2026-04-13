/* =================================================================
   메모 요약 뷰 (render 샘플) — todo.js의 MEMO와 동일 키 사용
   ================================================================= */

const MEMO_VIEW_STORAGE_KEY = 'dashboard_memo';

function truncateText(s, maxLen) {
  const t = (s || '').trim();
  if (t.length <= maxLen) return t;
  return `${t.slice(0, Math.max(0, maxLen - 1))}…`;
}

function escapeHtml(s) {
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

function getMemoPreviewText(maxLen) {
  const n = maxLen == null ? 120 : maxLen;
  const ta = document.getElementById('memo-textarea');
  if (ta && ta.value) return truncateText(ta.value, n);
  try {
    const raw = localStorage.getItem(MEMO_VIEW_STORAGE_KEY);
    if (raw) return truncateText(raw, n);
  } catch {
    /* ignore */
  }
  return '';
}

function renderMemoPreview(container, options) {
  if (!container) return;
  const maxLen = (options && options.maxLen) || 120;
  const text = getMemoPreviewText(maxLen);
  if (text) {
    container.innerHTML = `<span class="memo-preview-text">${escapeHtml(text)}</span>`;
  } else {
    container.innerHTML = '<span class="memo-preview-empty">메모 없음</span>';
  }
}

function refreshMemoPreview(container, options) {
  renderMemoPreview(container, options);
}

if (typeof window !== 'undefined') {
  window.MemoView = {
    renderMemoPreview,
    refreshMemoPreview,
    getMemoPreviewText,
    MEMO_VIEW_STORAGE_KEY,
  };
  window.addEventListener('dashboard:memo-updated', () => {
    const el = document.getElementById('memo-preview');
    if (el && window.MemoView) window.MemoView.refreshMemoPreview(el);
  });
  document.addEventListener('DOMContentLoaded', () => {
    const el = document.getElementById('memo-preview');
    if (el && window.MemoView) window.MemoView.renderMemoPreview(el);
  });
}
