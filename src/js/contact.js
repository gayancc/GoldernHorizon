import { initNav, initReveals } from './ui.js';

document.documentElement.classList.add('js');

initNav();
initReveals();

/* ============================================================
   Contact form — client validation + AJAX submit via FormSubmit
   (works on static hosting, no server required).
   Change FORM_ENDPOINT to point at your own inbox; the first
   submission triggers a one-time activation email from FormSubmit.
   ============================================================ */
const FORM_ENDPOINT = 'https://formsubmit.co/ajax/programmers@paymatesoftware.com';

const form = document.getElementById('contactForm');
const status = document.getElementById('formStatus');
const submitBtn = document.getElementById('submitBtn');

const fields = {
  name: {
    el: document.getElementById('name'),
    error: document.getElementById('nameError'),
    validate: (v) => (v.trim().length >= 2 ? '' : 'Please enter your name.'),
  },
  email: {
    el: document.getElementById('email'),
    error: document.getElementById('emailError'),
    validate: (v) =>
      /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) ? '' : 'Please enter a valid email address.',
  },
  topic: {
    el: document.getElementById('topic'),
    error: document.getElementById('topicError'),
    validate: (v) => (v ? '' : 'Please choose a topic.'),
  },
  message: {
    el: document.getElementById('message'),
    error: document.getElementById('messageError'),
    validate: (v) => (v.trim().length >= 10 ? '' : 'Please write at least 10 characters.'),
  },
};

function setFieldError(field, msg) {
  field.error.textContent = msg;
  field.el.closest('.form__field').classList.toggle('is-invalid', Boolean(msg));
}

function validateField(field) {
  const msg = field.validate(field.el.value);
  setFieldError(field, msg);
  return !msg;
}

Object.values(fields).forEach((field) => {
  field.el.addEventListener('blur', () => validateField(field));
  field.el.addEventListener('input', () => {
    if (field.el.closest('.form__field').classList.contains('is-invalid')) validateField(field);
  });
});

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const allValid = Object.values(fields)
    .map((f) => validateField(f))
    .every(Boolean);
  if (!allValid) {
    status.className = 'form__status is-error';
    status.textContent = 'Please fix the highlighted fields.';
    return;
  }

  // Honeypot — bots fill it, humans never see it.
  if (document.getElementById('gotcha').value) return;

  submitBtn.disabled = true;
  submitBtn.querySelector('.form__submit-label').textContent = 'Sending…';
  status.className = 'form__status';
  status.textContent = '';

  try {
    const res = await fetch(FORM_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        name: fields.name.el.value.trim(),
        email: fields.email.el.value.trim(),
        topic: fields.topic.el.value,
        message: fields.message.el.value.trim(),
        _subject: `Golden Horizon — ${fields.topic.el.value} inquiry from ${fields.name.el.value.trim()}`,
      }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    status.className = 'form__status is-success';
    status.textContent = 'Thanks! Your message is on its way — we’ll reply within two business days.';
    form.reset();
  } catch {
    status.className = 'form__status is-error';
    status.innerHTML =
      'Something went wrong sending your message. Please email us directly at <a href="mailto:bookings@goldenhorizon.band">bookings@goldenhorizon.band</a>.';
  } finally {
    submitBtn.disabled = false;
    submitBtn.querySelector('.form__submit-label').textContent = 'Send Message';
  }
});
