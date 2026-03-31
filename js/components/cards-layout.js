/* =================================================================
   카드 레이아웃: 숨기기·자유 메모 카드 추가·순서 저장
   ================================================================= */

const HIDDEN_CARD_KEY = 'dashboard_hidden_card_ids';
const CUSTOM_CARDS_KEY = 'dashboard_custom_cards';
const CARD_ORDER_KEY = 'dashboard_card_order';

function loadHiddenIds() {
  try {
    const raw = localStorage.getItem(HIDDEN_CARD_KEY);
    const a = raw ? JSON.parse(raw) : [];
    return Array.isArray(a) ? a : [];
  } catch {
    return [];
  }
}

function saveHiddenIds(ids) {
  localStorage.setItem(HIDDEN_CARD_KEY, JSON.stringify(ids));
}

function loadCustomCards() {
  try {
    const raw = localStorage.getItem(CUSTOM_CARDS_KEY);
    const a = raw ? JSON.parse(raw) : [];
    return Array.isArray(a) ? a : [];
  } catch {
    return [];
  }
}

function saveCustomCards(list) {
  localStorage.setItem(CUSTOM_CARDS_KEY, JSON.stringify(list));
}

function cardLabel(id) {
  const map = {
    timetable: '오늘의 시간표',
    lunch: '오늘의 급식',
    todo: 'TO DO',
    memo: 'MEMO',
    folders: '작업 중 폴더',
    links: '즐겨찾기 링크',
  };
  return map[id] || id;
}

function applyHiddenCards() {
  loadHiddenIds().forEach((id) => {
    const el = document.querySelector(`[data-card-id="${CSS.escape(id)}"]`);
    if (el) el.style.display = 'none';
  });
}

function showCardById(id) {
  const el = document.querySelector(`[data-card-id="${CSS.escape(id)}"]`);
  if (el) el.style.display = '';
}

function saveCardLayoutOrder() {
  const order = { left: [], center: [], right: [] };
  document.querySelectorAll('.column-left > .card[data-card-id]').forEach((c) => {
    order.left.push(c.dataset.cardId);
  });
  document.querySelectorAll('.center-cards > .card[data-card-id]').forEach((c) => {
    order.center.push(c.dataset.cardId);
  });
  document.querySelectorAll('.column-right > .card[data-card-id]').forEach((c) => {
    order.right.push(c.dataset.cardId);
  });
  try {
    localStorage.setItem(CARD_ORDER_KEY, JSON.stringify(order));
  } catch { /* ignore */ }
}

function applyCardOrderFromStorage() {
  let order;
  try {
    const raw = localStorage.getItem(CARD_ORDER_KEY);
    order = raw ? JSON.parse(raw) : null;
  } catch {
    return;
  }
  if (!order) return;

  function reorder(container, ids) {
    if (!container || !ids || !ids.length) return;
    ids.forEach((id) => {
      const el = container.querySelector(`[data-card-id="${CSS.escape(id)}"]`);
      if (el && el.parentNode === container) container.appendChild(el);
    });
  }

  reorder(document.querySelector('.column-left'), order.left);
  reorder(document.querySelector('.center-cards'), order.center);
  reorder(document.querySelector('.column-right'), order.right);
}

function createCustomCardElement(item) {
  const div = document.createElement('div');
  div.className = 'card card-custom';
  div.dataset.cardId = item.id;
  div.dataset.cardRole = 'custom';
  div.draggable = true;
  div.innerHTML = `
    <div class="card-header">
      <i class="fas fa-sticky-note"></i>
      <input type="text" class="card-custom-title-input" maxlength="40" value="" spellcheck="false" draggable="false">
      <button type="button" class="card-header-dismiss" title="카드 삭제"><i class="fas fa-times"></i></button>
    </div>
    <div class="card-body">
      <textarea class="memo-textarea card-custom-body" placeholder="내용을 입력하세요..." draggable="false" spellcheck="false"></textarea>
    </div>`;
  div.querySelector('.card-custom-title-input').value = item.title || '메모 카드';
  div.querySelector('.card-custom-body').value = item.body || '';

  const titleInp = div.querySelector('.card-custom-title-input');
  const bodyTa = div.querySelector('.card-custom-body');
  let t;
  function persist() {
    clearTimeout(t);
    t = setTimeout(() => {
      const list = loadCustomCards();
      const i = list.findIndex((x) => x.id === item.id);
      if (i < 0) return;
      list[i] = {
        id: item.id,
        title: titleInp.value.trim() || '메모 카드',
        body: bodyTa.value,
      };
      saveCustomCards(list);
    }, 400);
  }
  titleInp.addEventListener('input', persist);
  titleInp.addEventListener('blur', persist);
  bodyTa.addEventListener('input', persist);
  bodyTa.addEventListener('blur', persist);

  const dismiss = div.querySelector('.card-header-dismiss');
  dismiss.addEventListener('mousedown', (e) => e.stopPropagation());
  dismiss.addEventListener('click', (e) => {
    e.stopPropagation();
    removeCustomCard(item.id);
  });

  return div;
}

function renderCustomCardsFromStorage() {
  const container = document.querySelector('.center-cards');
  if (!container) return;
  loadCustomCards().forEach((item) => {
    if (document.querySelector(`[data-card-id="${CSS.escape(item.id)}"]`)) return;
    container.appendChild(createCustomCardElement(item));
  });
}

function hideBuiltInCard(id) {
  if (!window.confirm('이 카드를 대시보드에서 숨길까요?\n(대시보드 설정에서 다시 표시할 수 있습니다.)')) return;
  const ids = loadHiddenIds();
  if (!ids.includes(id)) ids.push(id);
  saveHiddenIds(ids);
  const el = document.querySelector(`[data-card-id="${CSS.escape(id)}"]`);
  if (el) el.style.display = 'none';
  syncHiddenRestoreUI();
}

function removeCustomCard(id) {
  if (!window.confirm('이 카드를 삭제할까요? 내용은 복구할 수 없습니다.')) return;
  saveCustomCards(loadCustomCards().filter((c) => c.id !== id));
  const el = document.querySelector(`[data-card-id="${CSS.escape(id)}"]`);
  if (el) el.remove();
  syncHiddenRestoreUI();
  saveCardLayoutOrder();
}

function attachDismissToCard(card) {
  if (card.querySelector('.card-header-dismiss')) return;
  const header = card.querySelector('.card-header');
  if (!header) return;

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'card-header-dismiss';
  btn.title = card.classList.contains('card-custom') ? '카드 삭제' : '대시보드에서 숨기기';
  btn.innerHTML = '<i class="fas fa-times"></i>';
  btn.addEventListener('mousedown', (e) => e.stopPropagation());
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    const id = card.dataset.cardId;
    if (!id) return;
    if (card.classList.contains('card-custom') || id.startsWith('custom_')) {
      removeCustomCard(id);
    } else {
      hideBuiltInCard(id);
    }
  });
  header.appendChild(btn);
}

function syncHiddenRestoreUI() {
  const wrap = document.getElementById('card-hidden-restore');
  if (!wrap) return;
  const ids = loadHiddenIds();
  if (!ids.length) {
    wrap.innerHTML = '';
    return;
  }
  wrap.innerHTML =
    '<p class="settings-subhint">숨긴 카드</p>' +
    ids
      .map(
        (id) =>
          `<div class="card-restore-row"><span>${cardLabel(id)}</span><button type="button" class="card-restore-btn" data-restore="${id}">다시 표시</button></div>`
      )
      .join('');
  wrap.querySelectorAll('.card-restore-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const rid = btn.dataset.restore;
      saveHiddenIds(loadHiddenIds().filter((x) => x !== rid));
      showCardById(rid);
      syncHiddenRestoreUI();
    });
  });
}

function addCustomMemoCard() {
  const id = `custom_${Date.now()}`;
  const item = { id, title: '새 메모 카드', body: '' };
  const list = loadCustomCards();
  list.push(item);
  saveCustomCards(list);
  const container = document.querySelector('.center-cards');
  if (!container) return;
  container.appendChild(createCustomCardElement(item));
  saveCardLayoutOrder();
  syncHiddenRestoreUI();
}

function initCardLayout() {
  renderCustomCardsFromStorage();
  applyCardOrderFromStorage();
  applyHiddenCards();
  document.querySelectorAll('.card[data-card-id]').forEach(attachDismissToCard);

  const addBtn = document.getElementById('settings-add-memo-card');
  if (addBtn) {
    addBtn.addEventListener('click', () => {
      addCustomMemoCard();
    });
  }
  syncHiddenRestoreUI();
}
