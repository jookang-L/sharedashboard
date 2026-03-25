/* =================================================================
   TODO + 메모 컴포넌트 (Google Sheets 양방향 연동)
   
   읽기: Google Sheets API (API 키) → localStorage 백업
   쓰기: Google Apps Script 웹 앱 → localStorage 백업
   ================================================================= */

const TODO_STORAGE_KEY = 'dashboard_todos';
const MEMO_STORAGE_KEY = 'dashboard_memo';

let todos = [];
let todoSaveTimer = null;
let memoSaveTimer = null;

/* =================================================================
   Google Apps Script 웹 앱으로 시트에 쓰기
   ================================================================= */

function postToAppsScript(payload) {
  if (!CONFIG.APPS_SCRIPT_URL) return;
  try {
    const json = JSON.stringify(payload);
    const url = CONFIG.APPS_SCRIPT_URL + '?data=' + encodeURIComponent(json);
    const img = document.createElement('img');
    img.style.display = 'none';
    document.body.appendChild(img);
    img.onload = img.onerror = () => img.remove();
    img.src = url;
    console.log('[시트 저장 전송]', payload.action);
  } catch (err) {
    console.warn('[시트 저장 실패]', err.message);
  }
}

function scheduleSaveTodosToSheet() {
  clearTimeout(todoSaveTimer);
  todoSaveTimer = setTimeout(() => {
    postToAppsScript({ action: 'saveTodos', todos });
  }, 1000);
}

function scheduleSaveMemoToSheet() {
  clearTimeout(memoSaveTimer);
  memoSaveTimer = setTimeout(() => {
    const memo = document.getElementById('memo-textarea').value;
    postToAppsScript({ action: 'saveMemo', memo });
  }, 2000);
}

/* =================================================================
   TODO 로드
   ================================================================= */

async function loadTodos() {
  const rows = await fetchSheetData(CONFIG.SHEETS.TODO);

  if (rows === null) {
    loadTodosFromLocal();
    return;
  }

  if (rows.length === 0) {
    loadTodosFromLocal();
    if (todos.length > 0) scheduleSaveTodosToSheet();
    return;
  }

  todos = rows.slice(1).map((r, i) => ({
    id: Date.now() + i,
    text: r[0] || '',
    done: (r[1] || '').toUpperCase() === 'TRUE',
  })).filter(t => t.text.trim());

  renderTodos();
  saveTodosLocal();
}

function loadTodosFromLocal() {
  try {
    const raw = localStorage.getItem(TODO_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) { todos = parsed; renderTodos(); return; }
    }
  } catch { /* ignore */ }
  todos = [];
  renderTodos();
}

/* =================================================================
   TODO 저장 (localStorage + Google Sheets)
   ================================================================= */

function saveTodosLocal() {
  localStorage.setItem(TODO_STORAGE_KEY, JSON.stringify(todos));
}

function saveTodos() {
  saveTodosLocal();
  scheduleSaveTodosToSheet();
}

/* =================================================================
   TODO CRUD
   ================================================================= */

function renderTodos() {
  const list = document.getElementById('todo-list');
  if (!todos.length) {
    list.innerHTML = '<li class="todo-item" style="color:var(--text-muted);justify-content:center;">할 일이 없습니다</li>';
    return;
  }
  list.innerHTML = todos.map(t => `
    <li class="todo-item" data-id="${t.id}">
      <div class="todo-checkbox${t.done ? ' checked' : ''}" onclick="toggleTodo(${t.id})"></div>
      <span class="todo-text${t.done ? ' completed' : ''}">${escapeTodoHtml(t.text)}</span>
      <button class="todo-delete" onclick="deleteTodo(${t.id})" title="삭제"><i class="fas fa-times"></i></button>
    </li>`).join('');
}

function escapeTodoHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function toggleTodo(id) {
  const t = todos.find(x => x.id === id);
  if (t) t.done = !t.done;
  renderTodos();
  saveTodos();
}

function deleteTodo(id) {
  todos = todos.filter(x => x.id !== id);
  renderTodos();
  saveTodos();
  if (typeof updateDayMarkersOnStrip === 'function') updateDayMarkersOnStrip();
}

function addTodo(text) {
  if (!text.trim()) return;
  todos.push({ id: Date.now(), text: text.trim(), done: false });
  renderTodos();
  saveTodos();
  if (typeof updateDayMarkersOnStrip === 'function') updateDayMarkersOnStrip();
}

function initTodoInput() {
  document.getElementById('btn-add-todo').addEventListener('click', () => {
    const list = document.getElementById('todo-list');
    if (document.querySelector('.todo-input-wrapper')) return;
    const w = document.createElement('div');
    w.className = 'todo-input-wrapper';
    w.innerHTML = '<input type="text" placeholder="할 일을 입력하세요..." autofocus><button>추가</button>';
    list.parentElement.insertBefore(w, list);
    const inp = w.querySelector('input'), btn = w.querySelector('button');
    function submit() { addTodo(inp.value); w.remove(); }
    btn.addEventListener('click', submit);
    inp.addEventListener('keydown', e => {
      if (e.key === 'Enter') submit();
      if (e.key === 'Escape') w.remove();
    });
    inp.focus();
  });
}

/* =================================================================
   메모
   ================================================================= */

async function loadMemo() {
  const ta = document.getElementById('memo-textarea');

  const rows = await fetchSheetData(CONFIG.SHEETS.MEMO);

  if (rows === null) {
    loadMemoFromLocal();
    return;
  }

  if (rows.length === 0) {
    loadMemoFromLocal();
    if (ta.value) scheduleSaveMemoToSheet();
    return;
  }

  ta.value = rows.map(r => r.join('\t')).join('\n');
  saveMemoLocal();
}

function loadMemoFromLocal() {
  try {
    const saved = localStorage.getItem(MEMO_STORAGE_KEY);
    if (saved !== null) {
      document.getElementById('memo-textarea').value = saved;
      return;
    }
  } catch { /* ignore */ }
  document.getElementById('memo-textarea').value = '';
}

function saveMemoLocal() {
  localStorage.setItem(MEMO_STORAGE_KEY, document.getElementById('memo-textarea').value);
}

function saveMemo() {
  saveMemoLocal();
  scheduleSaveMemoToSheet();
}

function initMemo() {
  let t;
  const ta = document.getElementById('memo-textarea');
  ta.addEventListener('input', () => {
    clearTimeout(t); t = setTimeout(saveMemo, 500);
  });
  ta.addEventListener('blur', saveMemo);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') saveMemo();
  });
}
