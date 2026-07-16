/**
 * Login Page
 *
 * PAGE ARCHITECTURE:
 * Each page module exports two functions:
 * - render(params): Returns the HTML string for the page.
 *   Called immediately when navigating to the route.
 * - afterRender(params): Called after the HTML is in the DOM.
 *   Attaches event listeners and fetches data.
 *
 * WHY SPLIT INTO TWO FUNCTIONS?
 * render() returns HTML quickly so the user sees something right away.
 * afterRender() runs once the DOM exists, enabling event binding.
 * If you try to call document.getElementById() before the HTML is in the DOM,
 * it returns null. Splitting render/afterRender prevents this bug.
 *
 * FORM HANDLING PATTERN:
 * 1. Prevent default form submission (we handle it with fetch)
 * 2. Disable the submit button (prevent double-submit)
 * 3. Show field-level validation errors from the API
 * 4. On success, update store and navigate
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
          <h1 class="auth-card__title">Welcome back</h1>
          <p class="auth-card__subtitle">Sign in to your TaskFlow account</p>
        </div>

        <form id="login-form" novalidate>
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
              placeholder="••••••••"
              autocomplete="current-password"
              required
            />
          </div>

          <div id="login-error" class="form-error" style="margin-bottom:12px;display:none"></div>

          <button type="submit" class="btn btn--primary w-full btn--lg" id="login-btn">
            Sign in
          </button>
        </form>

        <div class="auth-footer">
          Don't have an account? <a href="/register" data-link>Create one</a>
        </div>

        <div style="margin-top:24px;padding-top:16px;border-top:1px solid var(--color-border)">
          <p style="font-size:12px;color:var(--color-text-muted);text-align:center;margin-bottom:8px">
            Demo accounts (password: password123)
          </p>
          <div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:center">
            ${['alex@example.com', 'sam@example.com', 'jordan@example.com'].map(email => `
              <button class="btn btn--secondary btn--sm demo-login-btn" data-email="${email}">
                ${email.split('@')[0]}
              </button>
            `).join('')}
          </div>
        </div>
      </div>
    </div>
  `;
}

export function afterRender() {
  const form = document.getElementById('login-form');
  const errorEl = document.getElementById('login-error');
  const submitBtn = document.getElementById('login-btn');

  async function handleLogin(email, password) {
    clearFormErrors(form);
    errorEl.style.display = 'none';
    setButtonLoading(submitBtn, true);

    try {
      const { user, token } = await api.auth.login({ email, password });
      store.setAuth(user, token);
      showToast(`Welcome back, ${user.full_name.split(' ')[0]}!`, 'success');
      navigate('/dashboard');
    } catch (err) {
      if (err.details) {
        showFormErrors(form, err.details);
      } else {
        errorEl.textContent = err.message;
        errorEl.style.display = 'block';
      }
    } finally {
      setButtonLoading(submitBtn, false, 'Sign in');
    }
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = form.email.value.trim();
    const password = form.password.value;
    await handleLogin(email, password);
  });

  // Demo login buttons — fill in credentials and submit
  document.querySelectorAll('.demo-login-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      form.email.value = btn.dataset.email;
      form.password.value = 'password123';
      handleLogin(btn.dataset.email, 'password123');
    });
  });

  // Auto-focus email field
  document.getElementById('email')?.focus();
}
