/* =================================================================
   건의하기 — Apps Script doPost → 스프레드시트 '피드백' 탭 append
   ================================================================= */

function openFeedbackModal() {
  const overlay = document.getElementById('feedback-modal-overlay');
  if (!overlay) return;
  overlay.style.display = 'flex';
  const title = document.getElementById('feedback-input-title');
  if (title) title.focus();
}

function closeFeedbackModal() {
  const overlay = document.getElementById('feedback-modal-overlay');
  if (!overlay) return;
  overlay.style.display = 'none';
}

function initFeedback() {
  const btn = document.getElementById('titlebar-feedback-btn');
  const overlay = document.getElementById('feedback-modal-overlay');
  if (!btn || !overlay) return;

  btn.addEventListener('click', () => openFeedbackModal());

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeFeedbackModal();
  });

  document.getElementById('feedback-modal-close')?.addEventListener('click', closeFeedbackModal);
  document.getElementById('feedback-modal-cancel')?.addEventListener('click', closeFeedbackModal);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && overlay.style.display === 'flex') closeFeedbackModal();
  });

  document.getElementById('feedback-modal-submit')?.addEventListener('click', submitFeedback);
}

async function submitFeedback() {
  const url = typeof getFeedbackWebhookUrl === 'function' ? getFeedbackWebhookUrl() : '';
  if (!url) {
    alert('건의하기는 배포자 시트로만 전송됩니다.\ngoogle-api.js에서 FEEDBACK_WEBAPP_URL에 본인 웹앱(/exec) URL을 넣은 뒤 배포해 주세요.\n(연동 설정의 Apps Script URL은 할일·메모용이며 건의와 무관합니다.)');
    return;
  }

  const title = document.getElementById('feedback-input-title')?.value.trim() || '';
  const feature = document.getElementById('feedback-input-feature')?.value.trim() || '';
  const body = document.getElementById('feedback-input-body')?.value.trim() || '';
  const email = document.getElementById('feedback-input-email')?.value.trim() || '';

  if (!title) {
    alert('제목을 입력해 주세요.');
    return;
  }
  if (!body) {
    alert('내용을 입력해 주세요.');
    return;
  }

  const secret = typeof getFeedbackWebhookSecret === 'function' ? getFeedbackWebhookSecret() : '';
  const payload = {
    secret,
    name: title,
    email: email || '—',
    category: feature || '—',
    message: body,
  };

  const submitBtn = document.getElementById('feedback-modal-submit');
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = '보내는 중…';
  }

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const text = await res.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }

    if (data && data.ok) {
      alert('접수되었습니다. 감사합니다.');
      document.getElementById('feedback-input-title').value = '';
      document.getElementById('feedback-input-feature').value = '';
      document.getElementById('feedback-input-body').value = '';
      document.getElementById('feedback-input-email').value = '';
      closeFeedbackModal();
    } else {
      const err = data && data.error ? data.error : text.slice(0, 200);
      alert('전송에 실패했습니다.\n' + err);
    }
  } catch (e) {
    alert('네트워크 오류: ' + (e && e.message ? e.message : String(e)));
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = '보내기';
    }
  }
}

document.addEventListener('DOMContentLoaded', initFeedback);
