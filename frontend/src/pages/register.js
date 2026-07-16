/**
 * Register Page
 */

import api from '../services/api.js';
import store from '../store.js';
import { navigate } from '../router.js';
import { showFormErrors, clearFormErrors, setButtonLoading, showToast } from '../components/ui.js';

export function render() {
  return `
    <div class="auth-page">
      <div class="auth-card">
        <div class="auth-card__header">
          <div class="auth-card__logo">⚡</div>
          <h1 class="auth-card__title">Create your account</h1>
          <p class="auth-card__subtitle">Start managing projects with your team</p>
        </div>

        <form id="register-form" novalidate>
          <div class="form-group">
            <label class="form-label" for="fullName">Full name</label>
            <input
              type="text"
              id="fullName"
              name="fullName"
              class="form-control"
              placeholder="Alex Chen"
              autocomplete="name"
              required
            />
          </div>

          <div class="form-group">
            <label class="form-label" for="email">Email address</label>
            <input
              type="email"
              id="email"
              name="email"
              class="form-control"
              placeholder="you@example.com"
              autocomplete="email"
              required
            />
          </div>

          <div class="form-group">
            <label class="form-label" for="password">Password</label>
            <input
              type="password"
              id="password"
              name="password"
              class="form-control"
              placeholder="Min. 8 characters with letters and numbers"
              autocomplete="new-password"
              required
            />
            <span class="form-hint">Must be at least 8 characters with a letter and number</span>
          </div>

          <div id="register-error" class="form-error" style="margin-bottom:12px;display:none"></div>

          <button type="submit" class="btn btn--primary w-full btn--lg" id="register-btn">
            Create account
          </button>
        </form>

        <div class="auth-footer">
          Already have an account? <a href="/login" data-link>Sign in</a>
        </div>
      </div>
    </div>
  `;
}

export function afterRender() {
  const form = document.getElementById('register-form');
  const errorEl = document.getElementById('register-error');
  const submitBtn = document.getElementById('register-btn');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearFormErrors(form);
    errorEl.style.display = 'none';
    setButtonLoading(submitBtn, true);

    const { fullName, email, password } = Object.fromEntries(new FormData(form));

    try {
      const { user, token } = await api.auth.register({
        fullName: fullName.trim(),
        email: email.trim(),
        password,
      });
      store.setAuth(user, token);
      showToast(`Welcome to TaskFlow, ${user.full_name.split(' ')[0]}!`, 'success');
      navigate('/dashboard');
    } catch (err) {
      if (err.details) {
        showFormErrors(form, err.details);
      } else {
        errorEl.textContent = err.message;
        errorEl.style.display = 'block';
      }
    } finally {
      setButtonLoading(submitBtn, false, 'Create account');
    }
  });

  document.getElementById('fullName')?.focus();
}
