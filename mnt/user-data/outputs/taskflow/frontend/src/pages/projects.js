/**
 * Projects List Page
 *
 * Shows a grid of all projects the user is a member of.
 * Includes a "Create Project" modal form.
 *
 * STATE MANAGEMENT ON THIS PAGE:
 * We keep the projects array in a local variable (not the global store)
 * because it's only needed on this page. When you navigate away and
 * come back, we re-fetch from the API. This keeps the store lean.
 *
 * For frequently accessed, stable data (like the current user), the store
 * makes sense. For page-specific data that may change, fetch fresh each visit.
 */

import api from '../services/api.js';
import { showModal, showToast, Avatar } from '../components/ui.js';
import { navigate } from '../router.js';

// XSS protection helper
function esc(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function render() {
  return `
    <div class="page-container">
      <div class="page-header">
        <div>
          <h1 class="page-title">Projects</h1>
          <p class="text-muted">All projects you own or are a member of</p>
        </div>
        <button class="btn btn--primary" id="new-project-btn">+ New Project</button>
      </div>

      <div id="projects-container">
        <div class="projects-grid">
          ${[...Array(6)].map(() => `
            <div class="card">
              <div class="skeleton" style="height:4px;margin:-24px -24px 16px;border-radius:10px 10px 0 0"></div>
              <div class="skeleton" style="height:18px;width:70%;margin-bottom:8px"></div>
              <div class="skeleton" style="height:13px;width:90%;margin-bottom:16px"></div>
              <div class="skeleton" style="height:6px;border-radius:99px;margin-bottom:8px"></div>
              <div class="skeleton" style="height:12px;width:40%"></div>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  `;
}

export async function afterRender() {
  // Attach new project button
  document.getElementById('new-project-btn')?.addEventListener('click', openCreateModal);

  try {
    const { projects } = await api.projects.list();
    renderProjects(projects);
  } catch (err) {
    document.getElementById('projects-container').innerHTML = `
      <div class="empty-state">
        <div class="empty-state__icon">⚠️</div>
        <p class="empty-state__desc">${err.message}</p>
      </div>
    `;
  }
}

function renderProjects(projects) {
  const container = document.getElementById('projects-container');
  if (!container) return;

  if (!projects.length) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state__icon">📁</div>
        <h2 class="empty-state__title">No projects yet</h2>
        <p class="empty-state__desc">Create your first project to start tracking tasks.</p>
        <button class="btn btn--primary" onclick="document.getElementById('new-project-btn').click()">
          Create a Project
        </button>
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <div class="projects-grid">
      ${projects.map(project => renderProjectCard(project)).join('')}
    </div>
  `;

  // Attach click handlers
  container.querySelectorAll('[data-project-id]').forEach(card => {
    card.addEventListener('click', (e) => {
      // Don't navigate if clicking a button inside the card
      if (e.target.closest('button')) return;
      navigate(`/projects/${card.dataset.projectId}`);
    });
  });
}

function renderProjectCard(project) {
  const total = parseInt(project.total_tasks) || 0;
  const done = parseInt(project.done_count) || 0;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const inProgress = parseInt(project.in_progress_count) || 0;

  return `
    <div class="project-card" data-project-id="${project.id}"
         style="--project-color:${project.color};cursor:pointer">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-top:8px">
        <h3 class="project-card__name">${esc(project.name)}</h3>
        <span class="badge badge--${project.status}">${project.status}</span>
      </div>
      <p class="project-card__desc">${esc(project.description) || 'No description'}</p>
      <div class="progress" title="${pct}% complete">
        <div class="progress__bar" style="width:${pct}%;background:${project.color}"></div>
      </div>
      <div class="project-card__footer">
        <div style="display:flex;gap:8px">
          <span title="Total tasks">📋 ${total}</span>
          <span title="In progress">⚡ ${inProgress}</span>
          <span title="Done">✅ ${done}</span>
        </div>
        <span title="${project.member_count} members">
          👥 ${project.member_count}
        </span>
      </div>
    </div>
  `;
}

// ── Create Project Modal ───────────────────────────────────────

const PROJECT_COLORS = [
  '#4F46E5', '#0891B2', '#059669', '#D97706',
  '#DC2626', '#7C3AED', '#DB2777', '#0284C7',
];

function openCreateModal() {
  const colorSwatches = PROJECT_COLORS.map((color, i) => `
    <button type="button"
      class="color-swatch ${i === 0 ? 'selected' : ''}"
      data-color="${color}"
      style="
        width:28px;height:28px;border-radius:50%;background:${color};
        border:${i === 0 ? '3px solid #fff;outline:2px solid #4F46E5' : '2px solid transparent'};
        cursor:pointer;transition:transform 0.1s;
      "
    ></button>
  `).join('');

  const { el, close } = showModal({
    title: 'Create New Project',
    body: `
      <form id="create-project-form" novalidate>
        <div class="form-group">
          <label class="form-label" for="project-name">Project name</label>
          <input type="text" id="project-name" name="name" class="form-control"
                 placeholder="e.g. Website Redesign" required maxlength="100" />
        </div>
        <div class="form-group">
          <label class="form-label form-label--optional" for="project-desc">Description</label>
          <textarea id="project-desc" name="description" class="form-control"
                    placeholder="What is this project about?" rows="3" maxlength="500"></textarea>
        </div>
        <div class="form-group">
          <label class="form-label">Project color</label>
          <div style="display:flex;gap:8px;flex-wrap:wrap" id="color-picker">
            ${colorSwatches}
          </div>
          <input type="hidden" name="color" id="selected-color" value="${PROJECT_COLORS[0]}" />
        </div>
      </form>
    `,
    footer: `
      <button class="btn btn--secondary" id="cancel-project">Cancel</button>
      <button class="btn btn--primary" id="submit-project">Create Project</button>
    `,
  });

  // Color picker
  el.querySelectorAll('.color-swatch').forEach(swatch => {
    swatch.addEventListener('click', () => {
      el.querySelectorAll('.color-swatch').forEach(s => {
        s.style.border = '2px solid transparent';
        s.style.outline = '';
      });
      swatch.style.border = '3px solid #fff';
      swatch.style.outline = '2px solid #4F46E5';
      document.getElementById('selected-color').value = swatch.dataset.color;
    });
  });

  document.getElementById('cancel-project').addEventListener('click', close);

  document.getElementById('submit-project').addEventListener('click', async () => {
    const form = document.getElementById('create-project-form');
    const submitBtn = document.getElementById('submit-project');
    const name = form.name.value.trim();

    if (!name) {
      form.querySelector('[name="name"]').classList.add('error');
      form.querySelector('[name="name"]').focus();
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Creating...';

    try {
      const { project } = await api.projects.create({
        name,
        description: form.description.value.trim() || null,
        color: document.getElementById('selected-color').value,
      });

      close();
      showToast(`Project "${project.name}" created!`, 'success');
      navigate(`/projects/${project.id}`);
    } catch (err) {
      showToast(err.message, 'error');
      submitBtn.disabled = false;
      submitBtn.textContent = 'Create Project';
    }
  });

  // Auto-focus name input
  setTimeout(() => document.getElementById('project-name')?.focus(), 50);
}
