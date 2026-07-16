/**
 * Navbar Component
 *
 * The navbar is a persistent UI element — it doesn't re-render when the page
 * changes, only when the user's auth state changes.
 *
 * It listens to the store and updates when:
 * - User logs in (show user avatar)
 * - User logs out (hide nav links)
 * - User updates their profile (update avatar)
 *
 * This is the observer pattern in action.
 */

import store from '../store.js';
import { navigate } from '../router.js';
import { Avatar, getInitials, showToast } from './ui.js';
import api from '../services/api.js';

export function initNavbar() {
  const navbar = document.getElementById('navbar');
  const navAvatar = document.getElementById('nav-avatar');
  const dropdownUserInfo = document.getElementById('dropdown-user-info');
  const userDropdown = document.getElementById('user-dropdown');
  const userAvatarBtn = document.getElementById('user-avatar-btn');
  const logoutBtn = document.getElementById('logout-btn');

  // Update navbar based on auth state
  function updateNavbar() {
    const user = store.getUser();
    const isAuth = store.isAuthenticated();

    navbar.classList.toggle('hidden', !isAuth);

    if (user && isAuth) {
      // Update avatar
      navAvatar.textContent = getInitials(user.full_name);
      navAvatar.style.background = user.avatar_color;

      // Update dropdown header
      dropdownUserInfo.innerHTML = `
        <strong>${user.full_name}</strong>
        <span>${user.email}</span>
      `;
    }
  }

  // Toggle dropdown on avatar click
  userAvatarBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    userDropdown.classList.toggle('hidden');
  });

  // Close dropdown when clicking outside
  document.addEventListener('click', (e) => {
    if (!userAvatarBtn.contains(e.target)) {
      userDropdown.classList.add('hidden');
    }
  });

  // Logout
  logoutBtn.addEventListener('click', async () => {
    store.clearAuth();
    userDropdown.classList.add('hidden');
    showToast('Signed out successfully', 'success');
    navigate('/login');
  });

  // Subscribe to store changes
  store.subscribe(updateNavbar);

  // Initial render
  updateNavbar();
}
