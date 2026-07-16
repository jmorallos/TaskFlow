/**
 * UI Components
 *
 * These are pure functions that return HTML strings or DOM elements.
 * They're the building blocks used across all pages.
 *
 * WHY FUNCTIONS INSTEAD OF CLASSES?
 * For simple components that just render markup, functions are simpler.
 * A function that returns an HTML string is easy to compose, test, and read.
 * We use classes only when a component needs to manage its own state or
 * has complex lifecycle needs.
 *
 * PATTERN: Every component function takes a data object and returns HTML.
 * This is the same mental model as React/Vue components, just without a framework.
 */

// ── Avatar ────────────────────────────────────────────────────

/**
 * Generate initials from a full name.
 * 'Alex Chen' → 'AC', 'Jordan' → 'J'
 */
export function getInitials(name) {
  if (!name) return '?';
  return name
    .split(' ')
    .slice(0, 2)
    .map(word => word[0].toUpperCase())
    .join('');
}

/**
 * Renders an avatar element as an HTML string.
 * @param {{ name: string, color: string, size?: 'sm'|'md'|'lg' }} props
 */
export function Avatar({ name, color, size = 'md' }) {
  const sizeClass = size === 'sm' ? 'avatar--sm' : size === 'lg' ? 'avatar--lg' : '';
  return `<span class="avatar ${sizeClass}" style="background:${color}" title="${name}">${getInitials(name)}</span>`;
}

// ── Badge ─────────────────────────────────────────────────────

const STATUS_LABELS = {
  todo: 'To Do',
  in_progress: 'In Progress',
  in_review: 'In Review',
  done: 'Done',
};

const PRIORITY_LABELS = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  urgent: 'Urgent',
};

export function StatusBadge(status) {
  return `<span class="badge badge--${status}">${STATUS_LABELS[status] || status}</span>`;
}

export function PriorityBadge(priority) {
  return `<span class="badge badge--${priority}">${PRIORITY_LABELS[priority] || priority}</span>`;
}

// ── Toast Notifications ───────────────────────────────────────

/**
 * Show a toast notification.
 * Automatically removes itself after `duration` ms.
 *
 * @param {string} message - Text to display
 * @param {'success'|'error'|'warning'|'info'} type
 * @param {number} duration - ms before auto-dismiss
 */
export function showToast(message, type = 'info', duration = 4000) {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const icons = { success: '✓', error: '✕', warning: '⚠', info: 'ℹ' };

  const toast = document.createElement('div');
  toast.className = `toast toast--${type}`;
  toast.innerHTML = `
    <span style="font-size:16px;flex-shrink:0">${icons[type]}</span>
    <span>${message}</span>
  `;

  container.appendChild(toast);

  // Fade out and remove
  setTimeout(() => {
    toast.style.animation = 'toast-exit 0.3s ease forwards';
    toast.addEventListener('animationend', () => toast.remove());
  }, duration);
}

// Add toast exit animation to the stylesheet dynamically
const toastExitStyle = document.createElement('style');
toastExitStyle.textContent = `
  @keyframes toast-exit {
    to { opacity: 0; transform: translateX(100%); }
  }
`;
document.head.appendChild(toastExitStyle);

// ── Modal ─────────────────────────────────────────────────────

/**
 * Create and show a modal dialog.
 *
 * @param {{ title: string, body: string, footer?: string }} options
 * @returns {{ el: HTMLElement, close: Function }}
 *
 * @example
 * const { close } = showModal({
 *   title: 'Create Project',
 *   body: '<form>...</form>',
 *   footer: '<button class="btn btn--primary" id="submit">Create</button>'
 * });
 * document.getElementById('submit').addEventListener('click', () => {
 *   // handle submit
 *   close();
 * });
 */
export function showModal({ title, body, footer = '' }) {
  // Remove any existing modal
  document.querySelector('.modal-overlay')?.remove();

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <div class="modal__header">
        <h2 class="modal__title" id="modal-title">${title}</h2>
        <button class="modal__close" aria-label="Close modal">✕</button>
      </div>
      <div class="modal__body">${body}</div>
      ${footer ? `<div class="modal__footer">${footer}</div>` : ''}
    </div>
  `;

  document.body.appendChild(overlay);

  const close = () => {
    overlay.style.animation = 'fade-out 0.15s ease forwards';
    overlay.addEventListener('animationend', () => overlay.remove());
  };

  // Close on overlay click (outside modal)
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close();
  });

  // Close button
  overlay.querySelector('.modal__close').addEventListener('click', close);

  // Close on Escape key
  const handleEscape = (e) => {
    if (e.key === 'Escape') {
      close();
      document.removeEventListener('keydown', handleEscape);
    }
  };
  document.addEventListener('keydown', handleEscape);

  // Add fade-out animation
  if (!document.querySelector('#fade-out-style')) {
    const style = document.createElement('style');
    style.id = 'fade-out-style';
    style.textContent = `@keyframes fade-out { to { opacity: 0; } }`;
    document.head.appendChild(style);
  }

  // Focus the modal for keyboard accessibility
  overlay.querySelector('.modal').focus?.();

  return { el: overlay, close };
}

// ── Form Helpers ──────────────────────────────────────────────

/**
 * Display validation errors on a form.
 * Expects the API's { field: 'message' } format from express-validator.
 *
 * @param {HTMLFormElement} form
 * @param {object} errors - { fieldName: 'error message' }
 */
export function showFormErrors(form, errors) {
  // Clear previous errors
  clearFormErrors(form);

  Object.entries(errors).forEach(([field, message]) => {
    const input = form.querySelector(`[name="${field}"]`);
    if (input) {
      input.classList.add('error');
      const errorEl = document.createElement('span');
      errorEl.className = 'form-error';
      errorEl.textContent = message;
      input.parentNode.appendChild(errorEl);
    }
  });
}

export function clearFormErrors(form) {
  form.querySelectorAll('.form-error').forEach(el => el.remove());
  form.querySelectorAll('.error').forEach(el => el.classList.remove('error'));
}

/**
 * Serialize a form's inputs into a plain object.
 * Handles: text, email, password, select, textarea, checkboxes.
 *
 * @param {HTMLFormElement} form
 * @returns {object}
 */
export function serializeForm(form) {
  const data = {};
  const formData = new FormData(form);
  for (const [key, value] of formData.entries()) {
    data[key] = value;
  }
  return data;
}

/**
 * Set a button's loading state.
 * Prevents double-submit and shows a spinner.
 */
export function setButtonLoading(button, loading, originalText) {
  if (loading) {
    button.disabled = true;
    button.dataset.originalText = button.textContent;
    button.textContent = 'Loading...';
  } else {
    button.disabled = false;
    button.textContent = originalText || button.dataset.originalText || button.textContent;
  }
}

// ── Date Formatting ───────────────────────────────────────────

/**
 * Format a date relative to now: "2 days ago", "in 3 hours", etc.
 * Uses the Intl.RelativeTimeFormat API for localization.
 */
export function formatRelativeTime(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = date - now;
  const diffSecs = Math.round(diffMs / 1000);
  const diffMins = Math.round(diffSecs / 60);
  const diffHours = Math.round(diffMins / 60);
  const diffDays = Math.round(diffHours / 24);

  const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

  if (Math.abs(diffSecs) < 60) return 'just now';
  if (Math.abs(diffMins) < 60) return rtf.format(diffMins, 'minute');
  if (Math.abs(diffHours) < 24) return rtf.format(diffHours, 'hour');
  if (Math.abs(diffDays) < 30) return rtf.format(diffDays, 'day');
  return date.toLocaleDateString();
}

/**
 * Format a date as a readable string: "Jul 16, 2026"
 */
export function formatDate(dateString) {
  if (!dateString) return '';
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Check if a date is in the past (overdue).
 */
export function isOverdue(dateString) {
  return dateString && new Date(dateString) < new Date();
}
