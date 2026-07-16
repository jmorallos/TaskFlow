/**
 * Application Entry Point — main.js
 *
 * This is where the SPA boots. It runs once when the browser loads index.html.
 *
 * STARTUP SEQUENCE:
 * 1. Check if we have a stored JWT token
 * 2. If yes, verify it with the server (GET /auth/me)
 *    - Token might be expired or invalid
 *    - If valid, populate store with user data
 *    - If invalid, clear it
 * 3. Initialize the navbar (subscribes to store changes)
 * 4. Register all routes
 * 5. Initialize the router (handles the current URL)
 * 6. Hide the loading screen
 *
 * WHY VERIFY THE TOKEN ON STARTUP?
 * The JWT in localStorage might be expired. We can't know without checking.
 * We call /auth/me which the server validates. If it fails, we clear the token
 * so the user gets redirected to login instead of seeing a broken state.
 *
 * ES MODULES:
 * This file uses dynamic import() for page modules.
 * Dynamic imports are lazy — they download the module only when needed.
 * This makes the initial page load faster (you don't download all pages upfront).
 * Modern bundlers (Vite, webpack) call this "code splitting".
 */

import store from './store.js';
import api from './services/api.js';
import { initNavbar } from './components/navbar.js';
import { addRoute, initRouter } from './router.js';

async function init() {
  // ── Step 1: Restore auth state ────────────────────────────────
  if (store.isAuthenticated()) {
    try {
      // Verify the token is still valid and get fresh user data
      const { user } = await api.auth.me();
      store.setUser(user);
    } catch (err) {
      // Token is invalid/expired — clear it
      // The router will redirect to /login for protected routes
      console.warn('Stored token invalid, clearing auth state:', err.code);
      store.clearAuth();
    }
  }

  // ── Step 2: Initialize navbar ─────────────────────────────────
  initNavbar();

  // ── Step 3: Register routes ───────────────────────────────────
  //
  // Route format: addRoute(path, pageLoader, options)
  //
  // pageLoader uses dynamic import() — returns a Promise that resolves
  // to the module. The router awaits this when the route is matched.
  //
  // options.auth:
  //   true  = requires authentication (redirect to /login if not authed)
  //   false = public only (redirect to /dashboard if already authed)
  //   (omitted) = no restriction

  // Public routes (redirect to dashboard if logged in)
  addRoute('/login',    () => import('./pages/login.js'),    { auth: false });
  addRoute('/register', () => import('./pages/register.js'), { auth: false });

  // Protected routes (redirect to login if not authenticated)
  addRoute('/dashboard',        () => import('./pages/dashboard.js'),     { auth: true });
  addRoute('/projects',         () => import('./pages/projects.js'),      { auth: true });
  addRoute('/projects/new',     () => import('./pages/projects.js'),      { auth: true });
  addRoute('/projects/:id',     () => import('./pages/projectDetail.js'), { auth: true });
  addRoute('/tasks/:id',        () => import('./pages/taskDetail.js'),    { auth: true });
  addRoute('/profile',          () => import('./pages/profile.js'),       { auth: true });

  // Root redirect
  addRoute('/', () => import('./router.js').then(router => ({
    render: () => '',
    afterRender: () => router.navigate(store.isAuthenticated() ? '/dashboard' : '/login'),
  })));

  // ── Step 4: Start the router ──────────────────────────────────
  initRouter();

  // ── Step 5: Hide loading screen ───────────────────────────────
  document.getElementById('app-loading').style.display = 'none';
}

// Catch any uncaught errors during initialization
init().catch(err => {
  console.error('App initialization failed:', err);
  document.getElementById('app-loading').innerHTML = `
    <div style="text-align:center;padding:40px;color:#DC2626">
      <div style="font-size:40px;margin-bottom:16px">⚠️</div>
      <h2>Failed to start TaskFlow</h2>
      <p style="margin-top:8px;color:#64748B">${err.message}</p>
      <button onclick="location.reload()" style="
        margin-top:16px;padding:8px 16px;background:#4F46E5;color:white;
        border:none;border-radius:6px;cursor:pointer;font-size:14px
      ">Reload</button>
    </div>
  `;
});
