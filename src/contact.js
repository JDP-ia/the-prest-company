/* The endpoint is inserted by the build only after external setup. No credentials. */
(() => {
  const form = document.querySelector('#contact-form');
  const status = document.querySelector('#form-status');
  const button = form.querySelector('button');
  const configured = form.dataset.configured === 'true';
  let pending = false;
  const notify = (message, state) => {
    status.textContent = message;
    status.dataset.state = state;
    status.focus({ preventScroll: true });
  };
  // In preview, allow validation and an honest unavailable response; no request is made.
  button.disabled = false;
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (pending) return;
    for (const field of form.querySelectorAll('[required]')) {
      field.value = field.value.trim();
    }
    if (!form.reportValidity()) return;
    if (!configured) {
      notify('The form is not accepting messages yet. Please email theprestcompany@gmail.com. Your message has not been sent.', 'error');
      return;
    }
    pending = true;
    button.disabled = true;
    button.textContent = 'SENDING…';
    form.setAttribute('aria-busy', 'true');
    status.textContent = '';
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetch(form.action, {
        method: 'POST',
        body: new FormData(form),
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      });
      const result = await response.json();
      if (!response.ok || result.ok !== true) throw new Error('Submission was not accepted');
      form.reset();
      notify('Thank you. Your inquiry has been submitted.', 'success');
    } catch (error) {
      const message = error.name === 'AbortError'
        ? 'We could not confirm your submission. Please email theprestcompany@gmail.com before trying again.'
        : 'Your submission could not be confirmed. Your text is still here. Please try again or email theprestcompany@gmail.com.';
      notify(message, 'error');
    } finally {
      clearTimeout(timer);
      pending = false;
      button.disabled = false;
      button.innerHTML = 'SEND MESSAGE <span aria-hidden="true">↗</span>';
      form.removeAttribute('aria-busy');
    }
  });
})();
