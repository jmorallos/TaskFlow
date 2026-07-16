/**
 * API Service Layer
 *
 * WHY AN API MODULE?
 * Without this, every component that needs data would call fetch() directly.
 * If the API URL changes, or you need to add auth headers everywhere, you'd
 * have to update dozens of files.
 *
 * Centralizing API calls means:
 * - One place to set base URL and auth headers
 * - Consistent error handling
 * - Easy to add logging, caching, or retry logic
 * - Components just call api.projects.list() — clean and readable
 *
 * DESIGN PATTERN: This is the "Repository" or "API Client" pattern.
 * The rest of your app doesn't know WHAT http library you're using.
 *
 * ERROR HANDLING STRATEGY:
 * The _request function throws for non-2xx responses.
 * This lets callers use try/catch or .catch() naturally.
 * We throw Error objects with the API's error message and code attached.
 */

import store from '../store.js';

const BASE_URL = 'http://localhost:3001/api';

/**
 * Core request function. All API calls go through here.
 * Handles: auth headers, JSON parsing, error standardization.
 *
 * @param {string} path - API path (e.g., '/projects')
 * @param {RequestInit} options - fetch options
 * @returns {Promise<any>} - Parsed response data
 * @throws {Error} - With .code and .details properties from the API
 */
async function _request(path, options = {}) {
  const token = store.getToken();

  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      // Attach JWT if available
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
    // Convert body to JSON string if it's an object
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  // 204 No Content — successful but no body to parse
  if (response.status === 204) return null;

  const data = await response.json();

  if (!response.ok) {
    // Create a rich error with API details attached
    const error = new Error(data.error || 'An error occurred');
    error.status = response.status;
    error.code = data.code;
    error.details = data.details; // Validation errors from express-validator
    throw error;
  }

  // Our API wraps everything in { data: { ... } }
  return data.data;
}

// Convenience methods
const get = (path) => _request(path, { method: 'GET' });
const post = (path, body) => _request(path, { method: 'POST', body });
const patch = (path, body) => _request(path, { method: 'PATCH', body });
const del = (path) => _request(path, { method: 'DELETE' });

// ── Organized by resource ─────────────────────────────────────

export const api = {
  auth: {
    register: (data) => post('/auth/register', data),
    login: (data) => post('/auth/login', data),
    me: () => get('/auth/me'),
    updateProfile: (data) => patch('/auth/profile', data),
    changePassword: (data) => post('/auth/change-password', data),
  },

  projects: {
    list: () => get('/projects'),
    get: (id) => get(`/projects/${id}`),
    create: (data) => post('/projects', data),
    update: (id, data) => patch(`/projects/${id}`, data),
    delete: (id) => del(`/projects/${id}`),
    addMember: (id, data) => post(`/projects/${id}/members`, data),
    removeMember: (id, userId) => del(`/projects/${id}/members/${userId}`),
  },

  tasks: {
    dashboard: () => get('/tasks/dashboard'),
    list: (projectId, params = {}) => {
      const query = new URLSearchParams(
        // Remove undefined/null values from params
        Object.fromEntries(Object.entries(params).filter(([, v]) => v != null))
      ).toString();
      return get(`/tasks/project/${projectId}${query ? `?${query}` : ''}`);
    },
    get: (id) => get(`/tasks/${id}`),
    create: (projectId, data) => post(`/tasks/project/${projectId}`, data),
    update: (id, data) => patch(`/tasks/${id}`, data),
    delete: (id) => del(`/tasks/${id}`),
    addComment: (id, content) => post(`/tasks/${id}/comments`, { content }),
  },
};

export default api;
