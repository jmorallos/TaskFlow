/**
 * Application State Store
 *
 * WHY A STORE?
 * Without a store, you'd pass data between components via function arguments
 * or read from localStorage constantly. This gets messy fast.
 *
 * A store is a single object that holds the global state your entire app needs.
 * Things that are "global": the logged-in user, auth token.
 * Things that are "local": a modal's open/closed state, a form's current values.
 *
 * Don't put everything in the store — only what multiple unrelated parts
 * of the app need to share.
 *
 * WHY NOT LOCALSTORAGE FOR THE USER OBJECT?
 * We store the JWT in localStorage (it needs to persist across refreshes),
 * but we store the user object in memory (store) because:
 * - It's already available from the /auth/me API call on startup
 * - localStorage is synchronous and can block the main thread for large objects
 * - It keeps the source of truth as the server
 *
 * HOW TO SUBSCRIBE TO CHANGES:
 * We use a simple observer pattern. Call store.subscribe(callback) to be
 * notified when state changes. The navbar uses this to update when the user logs in.
 */

const TOKEN_KEY = 'taskflow_token';

// Private state — not directly accessible from outside
const _state = {
  user: null,
  token: localStorage.getItem(TOKEN_KEY), // Persisted across sessions
};

// Subscribers to notify on state changes
const _subscribers = new Set();

/**
 * The store — our global state manager.
 */
const store = {
  // ── Getters ──────────────────────────────────────────────────

  getUser() {
    return _state.user;
  },

  getToken() {
    return _state.token;
  },

  isAuthenticated() {
    return !!_state.token;
  },

  // ── Actions ──────────────────────────────────────────────────

  /**
   * Called after login or registration.
   * Persists the token to localStorage so the user stays logged in.
   */
  setAuth(user, token) {
    _state.user = user;
    _state.token = token;
    localStorage.setItem(TOKEN_KEY, token);
    this._notify();
  },

  /**
   * Update user data (e.g., after editing profile).
   */
  setUser(user) {
    _state.user = user;
    this._notify();
  },

  /**
   * Clear auth state and remove token from localStorage.
   */
  clearAuth() {
    _state.user = null;
    _state.token = null;
    localStorage.removeItem(TOKEN_KEY);
    this._notify();
  },

  // ── Observer Pattern ─────────────────────────────────────────

  /**
   * Subscribe to state changes.
   * Returns an unsubscribe function.
   *
   * @param {Function} callback - Called when state changes
   * @returns {Function} Unsubscribe function
   *
   * @example
   * const unsubscribe = store.subscribe(() => {
   *   updateNavbar(store.getUser());
   * });
   * // Later when component unmounts:
   * unsubscribe();
   */
  subscribe(callback) {
    _subscribers.add(callback);
    return () => _subscribers.delete(callback);
  },

  _notify() {
    _subscribers.forEach(cb => cb(_state));
  },
};

export default store;
