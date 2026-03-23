/* =================================================================
   TODO + 메모 컴포넌트 (localStorage 우선 저장)
   ================================================================= */

const TODO_STORAGE_KEY = 'dashboard_todos';
const MEMO_STORAGE_KEY = 'dashboard_memo';

let todos = [];

async function loadTodos() {
  /* 1) 이미 저장된 할 일이 있으면 시트로 덮어쓰지 않음 */
  try {
    const raw = localStorage.getItem(TODO_STORAGE_KEY);
    if (raw !== null) {
      todos = JSON.parse(raw);
      if (!Array.isArray(todos)) todos = [];
      renderTodos();
      return;
    }
  } catch { todos = []; }

  /* 2) 최초 실행: 시트에 데이터가 있으면 가져와 로컬에 한 번 저장 */
  const rows = await fetchSheetData(CONFIG.SHEETS.TODO);
  if (rows && rows.length > 1) {
    todos = rows.slice(1).map((r, i) => ({
      id: i, text: r[0] || '', done: (r[1] || '').toUpperCase() === 'TRUE',
    })).filter(t => t.text.trim());
  } else {
    todos = [];
  }
  renderTodos();
  saveTodosLocal();
}

function loadTodosLocal() {
  try {
    const s = localStorage.getItem(TODO_STORAGE_KEY);
    todos = s ? JSON.parse(s) : [];
    if (!Array.isArray(todos)) todos = [];
  } catch { todos = []; }
  renderTodos();
}

function saveTodosLocal() {
  localStorage.setItem(TODO_STORAGE_KEY, JSON.stringify(todos));
}

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
  renderTodos(); saveTodosLocal();
}

function deleteTodo(id) {
  todos = todos.filter(x => x.id !== id);
  renderTodos(); saveTodosLocal();
  if (typeof updateDayMarkersOnStrip === 'function') updateDayMarkersOnStrip();
}

function addTodo(text) {
  if (!text.trim()) return;
  const maxId = todos.reduce((m, t) => Math.max(m, t.id), -1);
  todos.push({ id: maxId + 1, text: text.trim(), done: false });
  renderTodos(); saveTodosLocal();
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

  /* 1) 한 번이라도 저장된 적이 있으면(localStorage 키 존재) 시트로 덮어쓰지 않음 */
  try {
    if (localStorage.getItem(MEMO_STORAGE_KEY) !== null) {
      ta.value = localStorage.getItem(MEMO_STORAGE_KEY);
      return;
    }
  } catch { /* ignore */ }

  /* 2) 최초 실행: 시트에서 불러와 로컬에 저장 */
  const rows = await fetchSheetData(CONFIG.SHEETS.MEMO);
  if (rows && rows.length > 0) {
    ta.value = rows.map(r => r.join('\t')).join('\n');
  } else {
    ta.value = '';
  }
  saveMemoLocal();
}

function saveMemoLocal() {
  localStorage.setItem(MEMO_STORAGE_KEY, document.getElementById('memo-textarea').value);
}

function initMemo() {
  let t;
  const ta = document.getElementById('memo-textarea');
  ta.addEventListener('input', () => {
    clearTimeout(t); t = setTimeout(saveMemoLocal, 500);
  });
  ta.addEventListener('blur', saveMemoLocal);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') saveMemoLocal();
  });
}
