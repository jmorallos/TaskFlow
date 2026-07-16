/**
 * Profile Page
 *
 * Allows users to edit their name, bio, avatar color, and password.
 *
 * OPTIMISTIC UI PATTERN (partial, for learning):
 * After updating the profile, we update the store immediately with the
 * server's response. The navbar re-renders because it subscribes to the store.
 * This is the recommended approach: trust the server response, not a local prediction.
 * True optimistic UI updates the UI BEFORE the server responds (and rolls back on error).
 */

import api from '../services/api.js';
import store from '../store.js';
import { Avatar, getInitials, showToast, showFormErrors, clearFormErrors } from '../components/ui.js';

const AVATAR_COLORS = [
  '#4F46E5', '#0891B2', '#059669', '#D97706',
  '#DC2626', '#7C3AED', '#DB2777', '#0284C7',
  '#64748B', '#0F172A',
];

function esc(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function render() {
  const user = store.getUser();

  return `
    <div class="page-container" style="max-width:680px">
      <div class="page-header">
        <h1 class="page-title">Profile Settings</h1>
      </div>

      <!-- Avatar preview -->
      <div class="card" style="margin-bottom:24px">
        <div style="display:flex;align-items:center;gap:20px">
          <span class="avatar avatar--lg" id="avatar-preview"
                style="background:${user?.avatar_color}">
            ${getInitials(user?.full_name)}
          </span>
          <div>
            <div style="font-size:18px;font-weight:700">${esc(user?.full_name)}</div>
            <div style="font-size:14px;color:var(--color-text-secondary)">${esc(user?.email)}</div>
          </div>
        </div>

        <!-- Color picker -->
        <div style="margin-top:16px">
          <label class="form-label" style="font-size:12px;margin-bottom:8px;display:block">
            Avatar color
          </label>
          <div style="display:flex;gap:8px;flex-wrap:wrap" id="avatar-color-picker">
            ${AVATAR_COLORS.map(color => `
              <button type="button"
                class="color-swatch"
                data-color="${color}"
                style="
                  width:28px;height:28px;border-radius:50%;background:${color};
                  border:${color === user?.avatar_color ? '3px solid white;outline:2px solid #4F46E5' : '2px solid transparent'};
                  cursor:pointer;
                "
              ></button>
            `).join('')}
          </div>
        </div>
      </div>

      <!-- Profile form -->
      <div class="card" style="margin-bottom:24px">
        <h2 style="font-size:16px;font-weight:600;margin-bottom:20px">Personal Information</h2>
        <form id="profile-form" novalidate>
          <div class="form-group">
            <label class="form-label" for="fullName">Full name</label>
            <input type="text" id="fullName" name="fullName" class="form-control"
                   value="${esc(user?.full_name)}" maxlength="100" required />
          </div>
          <div class="form-group">
            <label class="form-label form-label--optional" for="bio">Bio</label>
            <textarea id="bio" name="bio" class="form-control" rows="3"
                      maxlength="300"
                      placeholder="Tell your team a bit about yourself">${esc(user?.bio || '')}</textarea>
          </div>
          <div style="display:flex;justify-content:flex-end">
            <button type="submit" class="btn btn--primary" id="save-profile-btn">
              Save Changes
            </button>
          </div>
        </form>
      </div>

      <!-- Password change -->
      <div class="card">
        <h2 style="font-size:16px;font-weight:600;margin-bottom:20px">Change Password</h2>
        <form id="password-form" novalidate>
          <div class="form-group">
            <label class="form-label" for="currentPassword">Current password</label>
            <input type="password" id="currentPassword" name="currentPassword"
                   class="form-control" autocomplete="current-password" />
          </div>
          <div class="form-group">
            <label class="form-label" for="newPassword">New password</label>
            <input type="password" id="newPassword" name="newPassword"
                   class="form-control" autocomplete="new-password" />
            <span class="form-hint">Min. 8 characters with a letter and number</span>
          </div>
          <div style="display:flex;justify-content:flex-end">
            <button type="submit" class="btn btn--primary" id="save-password-btn">
              Update Password
            </button>
          </div>
        </form>
      </div>
    </div>
  `;
}

export function afterRender() {
  let selectedColor = store.getUser()?.avatar_color;

  // ── Avatar color picker ──────────────────────────────────────
  document.querySelectorAll('.color-swatch').forEach(swatch => {
    swatch.addEventListener('click', () => {
      document.querySelectorAll('.color-swatch').forEach(s => {
        s.style.border = '2px solid transparent';
        s.style.outline = '';
      });
      swatch.style.border = '3px solid white';
      swatch.style.outline = '2px solid #4F46E5';
      selectedColor = swatch.dataset.color;

      // Live preview
      const preview = document.getElementById('avatar-preview');
      if (preview) preview.style.background = selectedColor;
    });
  });

  // ── Profile form ─────────────────────────────────────────────
  const profileForm = document.getElementById('profile-form');
  profileForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearFormErrors(profileForm);

    const btn = document.getElementById('save-profile-btn');
    btn.disabled = true;
    btn.textContent = 'Saving...';

    try {
      const { user } = await api.auth.updateProfile({
        fullName: profileForm.fullName.value.trim(),
        bio: profileForm.bio.value.trim() || null,
        avatarColor: selectedColor,
      });

      // Update global store → navbar re-renders automatically
      store.setUser(user);
      showToast('Profile updated!', 'success');
    } catch (err) {
      if (err.details) showFormErrors(profileForm, err.details);
      else showToast(err.message, 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Save Changes';
    }
  });

  // ── Password form ─────────────────────────────────────────────
  const passwordForm = document.getElementById('password-form');
  passwordForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearFormErrors(passwordForm);

    const btn = document.getElementById('save-password-btn');
    btn.disabled = true;
    btn.textContent = 'Updating...';

    try {
      await api.auth.changePassword({
        currentPassword: passwordForm.currentPassword.value,
        newPassword: passwordForm.newPassword.value,
      });

      showToast('Password updated!', 'success');
      passwordForm.reset();
    } catch (err) {
      if (err.details) showFormErrors(passwordForm, err.details);
      else showToast(err.message, 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Update Password';
    }
  });
}
