/**
 * Project Detail Page
 *
 * This is the most complex page — it shows:
 * - Project info and members
 * - A Kanban board with tasks organized by status
 * - Filter bar (search, status, priority, assignee)
 * - Create task modal
 * - Task click → navigate to task detail
 *
 * STATE ON THIS PAGE:
 * We maintain a local `state` object for this page's data.
 * This is a common pattern: page-scoped state object that gets
 * mutated as the user interacts (applies filters, creates tasks).
 *
 * When filters change, we re-fetch tasks from the API with the new
 * filter params. This is simpler than client-side filtering
 * (which would require keeping all tasks in memory).
 */

import api from '../services/api.js';
import { showModal, showToast, Avatar, StatusBadge, PriorityBadge,
         formatDate, isOverdue } from '../components/ui.js';
import { navigate } from '../router.js';
import store from '../store.js';

function esc(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Page-level state
let state = {
  project: null,
  tasks: [],
  filters: { status: '', priority: '', assigneeId: '', search: '' },
};

const COLUMNS = [
  { key: 'todo',        label: 'To Do' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'in_review',   label: 'In Review' },
  { key: 'done',        label: 'Done' },
];

export function render() {
  return `
    <div class="page-container">
      <!-- Project header skeleton -->
      <div id="project-header">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:24px">
          <div class="skeleton" style="width:16px;height:16px;border-radius:50%"></div>
          <div class="skeleton" style="height:24px;width:200px"></div>
          <div class="skeleton" style="height:22px;width:60px;border-radius:99px;margin-left:8px"></div>
        </div>
      </div>

      <!-- Filter bar -->
      <div class="filter-bar" id="filter-bar">
        <div class="search-input" style="max-width:300px">
          <span class="search-input__icon">🔍</span>
          <input type="text" class="form-control" id="search-input"
                 placeholder="Search tasks..." style="padding-left:36px" />
        </div>
        <select class="form-control" id="filter-status" style="width:auto">
          <option value="">All statuses</option>
          <option value="todo">To Do</option>
          <option value="in_progress">In Progress</option>
          <option value="in_review">In Review</option>
          <option value="done">Done</option>
        </select>
        <select class="form-control" id="filter-priority" style="width:auto">
          <option value="">All priorities</option>
          <option value="urgent">Urgent</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
        <button class="btn btn--primary" id="add-task-btn" style="margin-left:auto">
          + Add Task
        </button>
      </div>

      <!-- Kanban board -->
      <div class="kanban-board" id="kanban-board">
        ${COLUMNS.map(col => `
          <div class="kanban-column" data-status="${col.key}">
            <div class="kanban-column__header">
              <span class="kanban-column__title">${col.label}</span>
              <span class="kanban-column__count" id="count-${col.key}">0</span>
            </div>
            <div class="kanban-tasks" id="tasks-${col.key}">
              <div class="skeleton" style="height:80px;border-radius:8px;margin-bottom:8px"></div>
              <div class="skeleton" style="height:80px;border-radius:8px;margin-bottom:8px"></div>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

export async function afterRender({ id: projectId }) {
  // Reset state for this page visit
  state = { project: null, tasks: [], filters: {} };

  // Set up filter listeners
  setupFilters(projectId);
  document.getElementById('add-task-btn')?.addEventListener('click', () => {
    openCreateTaskModal(projectId);
  });

  try {
    const [projectData, tasksData] = await Promise.all([
      api.projects.get(projectId),
      api.tasks.list(projectId),
    ]);

    state.project = projectData.project;
    state.tasks = tasksData.tasks;

    renderProjectHeader(state.project);
    renderBoard(state.tasks);
  } catch (err) {
    if (err.status === 404) {
      document.getElementById('project-header').innerHTML = `
        <div class="empty-state">
          <div class="empty-state__icon">🔒</div>
          <h2 class="empty-state__title">Project not found</h2>
          <p class="empty-state__desc">This project doesn't exist or you don't have access.</p>
          <a href="/projects" class="btn btn--primary" data-link>Back to Projects</a>
        </div>
      `;
    } else {
      showToast(err.message, 'error');
    }
  }
}

function renderProjectHeader(project) {
  const el = document.getElementById('project-header');
  if (!el) return;

  el.innerHTML = `
    <div style="margin-bottom:24px">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:4px;flex-wrap:wrap">
        <a href="/projects" data-link style="color:var(--color-text-muted);font-size:13px">
          ← Projects
        </a>
        <span style="color:var(--color-text-muted)">/</span>
        <div style="display:flex;align-items:center;gap:8px">
          <span class="color-dot" style="width:14px;height:14px;background:${project.color}"></span>
          <h1 style="font-size:22px;font-weight:700">${esc(project.name)}</h1>
          <span class="badge badge--${project.status}">${project.status}</span>
        </div>
      </div>
      ${project.description ? `
        <p style="font-size:14px;color:var(--color-text-secondary);margin-left:100px">
          ${esc(project.description)}
        </p>
      ` : ''}
      <div style="display:flex;align-items:center;gap:8px;margin-top:12px;margin-left:100px">
        <span style="font-size:13px;color:var(--color-text-muted)">Members:</span>
        <div style="display:flex;gap:4px">
          ${project.members?.map(m =>
            `<span title="${m.full_name}" style="cursor:default">
               ${Avatar({ name: m.full_name, color: m.avatar_color, size: 'sm' })}
             </span>`
          ).join('') || ''}
        </div>
      </div>
    </div>
  `;
}

function renderBoard(tasks) {
  COLUMNS.forEach(({ key }) => {
    const columnTasks = tasks.filter(t => t.status === key);
    const columnEl = document.getElementById(`tasks-${key}`);
    const countEl = document.getElementById(`count-${key}`);
    if (!columnEl || !countEl) return;

    countEl.textContent = columnTasks.length;

    if (!columnTasks.length) {
      columnEl.innerHTML = `
        <div style="text-align:center;padding:24px 0;color:var(--color-text-muted);font-size:13px">
          No tasks
        </div>
      `;
      return;
    }

    columnEl.innerHTML = columnTasks.map(task => renderTaskCard(task)).join('');

    // Click to view task detail
    columnEl.querySelectorAll('.task-card').forEach(card => {
      card.addEventListener('click', () => navigate(`/tasks/${card.dataset.taskId}`));
    });
  });
}

function renderTaskCard(task) {
  const overdue = isOverdue(task.due_date) && task.status !== 'done';
  const tags = task.tags || [];

  return `
    <div class="task-card" data-task-id="${task.id}" style="cursor:pointer">
      <div class="task-card__title">${esc(task.title)}</div>
      ${tags.length ? `
        <div style="display:flex;gap:4px;flex-wrap:wrap;margin-bottom:6px">
          ${tags.map(tag => `
            <span style="
              font-size:10px;font-weight:600;padding:2px 6px;border-radius:99px;
              background:${tag.color}22;color:${tag.color};
            ">${esc(tag.name)}</span>
          `).join('')}
        </div>
      ` : ''}
      <div class="task-card__meta">
        ${PriorityBadge(task.priority)}
        ${task.due_date ? `
          <span style="font-size:11px;color:${overdue ? 'var(--color-danger)' : 'var(--color-text-muted)'}">
            ${overdue ? '⚠ ' : '📅 '}${formatDate(task.due_date)}
          </span>
        ` : ''}
        <span style="margin-left:auto;display:flex;align-items:center;gap:4px">
          ${task.comment_count > 0 ? `
            <span style="font-size:11px;color:var(--color-text-muted)">💬 ${task.comment_count}</span>
          ` : ''}
          ${task.assignee_id ? `
            ${Avatar({ name: task.assignee_name, color: task.assignee_avatar_color, size: 'sm' })}
          ` : '<span style="font-size:11px;color:var(--color-text-muted)">Unassigned</span>'}
        </span>
      </div>
    </div>
  `;
}

// ── Filters ────────────────────────────────────────────────────

function setupFilters(projectId) {
  let searchTimeout;

  document.getElementById('search-input')?.addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    // Debounce search — wait 300ms after typing stops before fetching
    searchTimeout = setTimeout(() => {
      state.filters.search = e.target.value;
      fetchAndRenderTasks(projectId);
    }, 300);
  });

  document.getElementById('filter-status')?.addEventListener('change', (e) => {
    state.filters.status = e.target.value;
    fetchAndRenderTasks(projectId);
  });

  document.getElementById('filter-priority')?.addEventListener('change', (e) => {
    state.filters.priority = e.target.value;
    fetchAndRenderTasks(projectId);
  });
}

async function fetchAndRenderTasks(projectId) {
  // Show loading state in columns
  COLUMNS.forEach(({ key }) => {
    const el = document.getElementById(`tasks-${key}`);
    if (el) el.innerHTML = `<div class="skeleton" style="height:80px;border-radius:8px"></div>`;
  });

  try {
    const { tasks } = await api.tasks.list(projectId, state.filters);
    state.tasks = tasks;
    renderBoard(tasks);
  } catch (err) {
    showToast('Failed to load tasks', 'error');
  }
}

// ── Create Task Modal ──────────────────────────────────────────

function openCreateTaskModal(projectId) {
  const members = state.project?.members || [];

  const { close } = showModal({
    title: 'Add Task',
    body: `
      <form id="create-task-form" novalidate>
        <div class="form-group">
          <label class="form-label" for="task-title">Title</label>
          <input type="text" id="task-title" name="title" class="form-control"
                 placeholder="What needs to be done?" required maxlength="200" />
        </div>
        <div class="form-group">
          <label class="form-label form-label--optional" for="task-desc">Description</label>
          <textarea id="task-desc" name="description" class="form-control" rows="3"
                    placeholder="Add more context..."></textarea>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
          <div class="form-group">
            <label class="form-label" for="task-priority">Priority</label>
            <select id="task-priority" name="priority" class="form-control">
              <option value="low">Low</option>
              <option value="medium" selected>Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label form-label--optional" for="task-due">Due date</label>
            <input type="date" id="task-due" name="dueDate" class="form-control" />
          </div>
        </div>
        <div class="form-group">
          <label class="form-label form-label--optional" for="task-assignee">Assign to</label>
          <select id="task-assignee" name="assigneeId" class="form-control">
            <option value="">Unassigned</option>
            ${members.map(m =>
              `<option value="${m.id}">${esc(m.full_name)}</option>`
            ).join('')}
          </select>
        </div>
      </form>
    `,
    footer: `
      <button class="btn btn--secondary" id="cancel-task">Cancel</button>
      <button class="btn btn--primary" id="submit-task">Add Task</button>
    `,
  });

  document.getElementById('cancel-task').addEventListener('click', close);

  document.getElementById('submit-task').addEventListener('click', async () => {
    const form = document.getElementById('create-task-form');
    const submitBtn = document.getElementById('submit-task');
    const title = form.title.value.trim();

    if (!title) {
      form.querySelector('[name="title"]').classList.add('error');
      form.querySelector('[name="title"]').focus();
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Adding...';

    try {
      const { task } = await api.tasks.create(projectId, {
        title,
        description: form.description.value.trim() || null,
        priority: form.priority.value,
        dueDate: form.dueDate.value || null,
        assigneeId: form.assigneeId.value ? parseInt(form.assigneeId.value) : null,
      });

      state.tasks.unshift(task);
      renderBoard(state.tasks);
      close();
      showToast('Task added!', 'success');
    } catch (err) {
      showToast(err.message, 'error');
      submitBtn.disabled = false;
      submitBtn.textContent = 'Add Task';
    }
  });

  setTimeout(() => document.getElementById('task-title')?.focus(), 50);
}
