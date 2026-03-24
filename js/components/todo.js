/* =================================================================
   TODO + 메모 컴포넌트 (localStorage 우선 저장)
   ================================================================= */

const TODO_STORAGE_KEY = 'dashboard_todos';
const MEMO_STORAGE_KEY = 'dashboard_memo';

let todos = [];
let todosLoaded = false;

async function loadTodos() {
  /* 이미 한 번 로드했으면 메모리의 todos를 유지 (5분마다 호출에도 안전) */
  if (todosLoaded) return;

  /* 1) localStorage에 저장된 할 일이 있으면 그대로 사용 */
  try {
    const raw = localStorage.getItem(TODO_STORAGE_KEY);
    if (raw !== null) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        todos = parsed;
        todosLoaded = true;
        renderTodos();
        return;
      }
    }
  } catch { /* localStorage 파싱 실패 시 아래로 진행 */ }

  /* 2) 최초 실행 & localStorage 없음: 시트에서 한 번만 가져옴 */
  const rows = await fetchSheetData(CONFIG.SHEETS.TODO);
  if (rows && rows.length > 1) {
    todos = rows.slice(1).map((r, i) => ({
      id: i, text: r[0] || '', done: (r[1] || '').toUpperCase() === 'TRUE',
    })).filter(t => t.text.trim());
  } else {
    todos = [];
  }
  todosLoaded = true;
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

let memoLoaded = false;

async function loadMemo() {
  if (memoLoaded) return;

  const ta = document.getElementById('memo-textarea');

  /* 1) localStorage에 저장된 메모가 있으면 그대로 사용 */
  try {
    const saved = localStorage.getItem(MEMO_STORAGE_KEY);
    if (saved !== null) {
      ta.value = saved;
      memoLoaded = true;
      return;
    }
  } catch { /* ignore */ }

  /* 2) 최초 실행 & localStorage 없음: 시트에서 한 번만 가져옴 */
  const rows = await fetchSheetData(CONFIG.SHEETS.MEMO);
  if (rows && rows.length > 0) {
    ta.value = rows.map(r => r.join('\t')).join('\n');
  } else {
    ta.value = '';
  }
  memoLoaded = true;
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
