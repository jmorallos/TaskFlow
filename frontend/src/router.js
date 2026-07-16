/**
 * Client-Side Router
 *
 * HOW THE HISTORY API WORKS:
 * The browser provides history.pushState(state, title, url) which changes
 * the URL in the address bar WITHOUT triggering a page reload.
 * When the user presses the Back button, the browser fires a 'popstate' event.
 *
 * OUR ROUTER:
 * 1. Maps URL patterns to page modules
 * 2. Listens for link clicks and back/forward navigation
 * 3. Extracts URL parameters (/projects/42 → { id: '42' })
 * 4. Checks auth state before rendering protected pages
 * 5. Calls a page's render() function with the matched params
 *
 * ROUTE GUARDS:
 * Some routes require auth (protected). Others require no auth (public, like login).
 * The router checks store.isAuthenticated() and redirects appropriately.
 *
 * [data-link] ATTRIBUTE:
 * Instead of intercepting ALL link clicks (which would break external links),
 * we only intercept clicks on elements with [data-link]. Our HTML uses this
 * on internal navigation links.
 */

import store from './store.js';

// Routes: ordered from most specific to least specific
// Dynamic segments start with : (e.g., :id)
const routes = [];

/**
 * Register a route.
 * @param {string} path - URL pattern (e.g., '/projects/:id')
 * @param {Function} pageModule - Async function returning a page object
 * @param {object} options - { auth: true/false/null (null = no requirement) }
 */
export function addRoute(path, pageModule, options = {}) {
  routes.push({ path, pageModule, options });
}

/**
 * Navigate to a URL programmatically.
 * Same as clicking a [data-link] link.
 */
export function navigate(path) {
  history.pushState(null, '', path);
  handleRoute(path);
}

/**
 * Convert a route pattern to a regex and extract param names.
 * '/projects/:id/tasks/:taskId' →
 *   regex: /^\/projects\/([^/]+)\/tasks\/([^/]+)$/
 *   params: ['id', 'taskId']
 */
function parseRoute(pattern) {
  const paramNames = [];
  const regexStr = pattern
    .replace(/:([^/]+)/g, (_, name) => {
      paramNames.push(name);
      return '([^/]+)';
    })
    .replace(/\//g, '\\/');
  return { regex: new RegExp(`^${regexStr}$`), paramNames };
}

/**
 * Match a URL path against registered routes.
 * Returns the matched route and extracted params, or null.
 */
function matchRoute(path) {
  // Remove query string for matching
  const pathWithoutQuery = path.split('?')[0];

  for (const route of routes) {
    const { regex, paramNames } = parseRoute(route.path);
    const match = pathWithoutQuery.match(regex);
    if (match) {
      const params = {};
      paramNames.forEach((name, i) => {
        params[name] = match[i + 1];
      });
      return { route, params };
    }
  }
  return null;
}

/**
 * Main routing function — called on every navigation.
 */
async function handleRoute(path = window.location.pathname) {
  const appEl = document.getElementById('app');
  const matched = matchRoute(path);

  // 404 handling
  if (!matched) {
    appEl.innerHTML = `
      <div class="page-container">
        <div class="empty-state">
          <div class="empty-state__icon">🔍</div>
          <h2 class="empty-state__title">Page not found</h2>
          <p class="empty-state__desc">The page you're looking for doesn't exist.</p>
          <a href="/dashboard" data-link class="btn btn--primary">Go to Dashboard</a>
        </div>
      </div>
    `;
    return;
  }

  const { route, params } = matched;

  // Route guard: protected route with no auth
  if (route.options.auth === true && !store.isAuthenticated()) {
    navigate('/login');
    return;
  }

  // Route guard: auth-only routes (login/register) when already logged in
  if (route.options.auth === false && store.isAuthenticated()) {
    navigate('/dashboard');
    return;
  }

  // Show loading while the page module loads
  appEl.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:center;height:60vh;">
      <div class="loading-spinner"></div>
    </div>
  `;

  try {
    // Dynamic import — page modules load on demand (code splitting)
    const page = await route.pageModule();

    // Each page exports a render(params) function
    // It returns an HTML string or a DOM element
    const content = await page.render(params);

    if (typeof content === 'string') {
      appEl.innerHTML = content;
    } else if (content instanceof HTMLElement) {
      appEl.replaceChildren(content);
    }

    // Run page's initialization after DOM is ready
    if (page.afterRender) {
      await page.afterRender(params);
    }

    // Update active nav links
    updateActiveNavLinks(path);
  } catch (err) {
    console.error('Route error:', err);
    appEl.innerHTML = `
      <div class="page-container">
        <div class="empty-state">
          <div class="empty-state__icon">⚠️</div>
          <h2 class="empty-state__title">Something went wrong</h2>
          <p class="empty-state__desc">${err.message}</p>
        </div>
      </div>
    `;
  }
}

function updateActiveNavLinks(path) {
  document.querySelectorAll('.nav-link[data-link]').forEach(link => {
    const href = link.getAttribute('href');
    const isActive = href === path || (href !== '/' && path.startsWith(href));
    link.classList.toggle('active', isActive);
  });
}

/**
 * Initialize the router.
 * Call this once when the app starts.
 */
export function initRouter() {
  // Handle [data-link] clicks via event delegation
  // One listener on document instead of one per link — more efficient
  document.addEventListener('click', (e) => {
    // Find the closest ancestor that is a [data-link]
    const link = e.target.closest('[data-link]');
    if (!link) return;

    e.preventDefault();
    const path = link.getAttribute('href');
    if (path !== window.location.pathname) {
      navigate(path);
    }
  });

  // Handle browser back/forward buttons
  window.addEventListener('popstate', () => {
    handleRoute(window.location.pathname);
  });

  // Handle initial page load
  handleRoute(window.location.pathname);
}

export { handleRoute };
