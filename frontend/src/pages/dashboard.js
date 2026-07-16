/**
 * Dashboard Page
 *
 * The dashboard shows:
 * - Task stats (todo, in progress, done, overdue)
 * - Recent task activity
 * - Quick links to projects
 *
 * DATA FETCHING PATTERN:
 * We kick off multiple API requests in parallel using Promise.all().
 * This is faster than awaiting them sequentially.
 *
 * Example:
 * Sequential (slow): await stats(); await projects(); → 400ms total
 * Parallel (fast): await Promise.all([stats(), projects()]) → 200ms total
 */

import api from '../services/api.js';
import store from '../store.js';
import { Avatar, StatusBadge, PriorityBadge, formatRelativeTime, formatDate, isOverdue } from '../components/ui.js';
import { navigate } from '../router.js';

export function render() {
  const user = store.getUser();
  const firstName = user?.full_name?.split(' ')[0] || 'there';
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  // Return skeleton HTML immediately, data fills in via afterRender
  return `
    <div class="page-container">
      <div class="page-header">
        <div>
          <h1 class="page-title">${greeting}, ${firstName} 👋</h1>
          <p class="text-muted">Here's what's happening with your tasks today.</p>
        </div>
        <a href="/projects/new" class="btn btn--primary" data-link>
          + New Project
        </a>
      </div>

      <!-- Stats row — populated by afterRender -->
      <div class="stats-grid" id="stats-grid">
        ${[...Array(5)].map(() => `
          <div class="stat-card">
            <div class="skeleton" style="height:32px;width:60px;margin-bottom:8px"></div>
            <div class="skeleton" style="height:14px;width:80px"></div>
          </div>
        `).join('')}
      </div>

      <!-- Two-column layout: recent tasks + projects -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;align-items:start">
        <div>
          <div class="flex justify-between items-center mb-4">
            <h2 style="font-size:18px;font-weight:600">My Recent Tasks</h2>
            <a href="/projects" class="btn btn--ghost btn--sm" data-link>View all →</a>
          </div>
          <div id="recent-tasks">
            ${[...Array(4)].map(() => `
              <div class="task-card">
                <div class="skeleton" style="height:14px;width:80%;margin-bottom:8px"></div>
                <div class="skeleton" style="height:12px;width:40%"></div>
              </div>
            `).join('')}
          </div>
        </div>

        <div>
          <div class="flex justify-between items-center mb-4">
            <h2 style="font-size:18px;font-weight:600">My Projects</h2>
            <a href="/projects" class="btn btn--ghost btn--sm" data-link>View all →</a>
          </div>
          <div id="dashboard-projects">
            ${[...Array(3)].map(() => `
              <div class="card" style="margin-bottom:12px">
                <div class="skeleton" style="height:16px;width:60%;margin-bottom:8px"></div>
                <div class="skeleton" style="height:6px;border-radius:99px"></div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    </div>
  `;
}

export async function afterRender() {
  try {
    // Fetch both in parallel — faster than sequential awaits
    const [dashboardData, projectsData] = await Promise.all([
      api.tasks.dashboard(),
      api.projects.list(),
    ]);

    renderStats(dashboardData.stats);
    renderRecentTasks(dashboardData.recentTasks);
    renderProjects(projectsData.projects.slice(0, 4)); // Show max 4 on dashboard
  } catch (err) {
    console.error('Dashboard load error:', err);
  }
}

function renderStats(stats) {
  const statsEl = document.getElementById('stats-grid');
  if (!stats || !statsEl) return;

  const cards = [
    { value: stats.todo,        label: 'To Do',      color: 'var(--color-text-secondary)' },
    { value: stats.in_progress, label: 'In Progress', color: '#1D4ED8' },
    { value: stats.in_review,   label: 'In Review',   color: '#C2410C' },
    { value: stats.done,        label: 'Done',        color: 'var(--color-success)' },
    { value: stats.overdue,     label: 'Overdue',     color: 'var(--color-danger)' },
  ];

  statsEl.innerHTML = cards.map(({ value, label, color }) => `
    <div class="stat-card">
      <div class="stat-card__value" style="color:${color}">${value}</div>
      <div class="stat-card__label">${label}</div>
    </div>
  `).join('');
}

function renderRecentTasks(tasks) {
  const el = document.getElementById('recent-tasks');
  if (!el) return;

  if (!tasks?.length) {
    el.innerHTML = `
      <div class="empty-state" style="padding:32px 0">
        <div class="empty-state__icon">✅</div>
        <p class="empty-state__desc">No tasks assigned to you yet.</p>
      </div>
    `;
    return;
  }

  el.innerHTML = tasks.map(task => `
    <div class="task-card" data-task-id="${task.id}">
      <div class="task-card__title">${escapeHtml(task.title)}</div>
      <div class="task-card__meta">
        ${StatusBadge(task.status)}
        ${PriorityBadge(task.priority)}
        <span style="font-size:11px;color:var(--color-text-muted);margin-left:auto">
          <span class="color-dot" style="background:${task.project_color}"></span>
          ${escapeHtml(task.project_name)}
        </span>
        ${task.due_date ? `
          <span style="font-size:11px;color:${isOverdue(task.due_date) ? 'var(--color-danger)' : 'var(--color-text-muted)'}">
            ${isOverdue(task.due_date) ? '⚠ ' : ''}${formatDate(task.due_date)}
          </span>
        ` : ''}
      </div>
    </div>
  `).join('');

  // Make task cards clickable
  el.querySelectorAll('.task-card').forEach(card => {
    card.addEventListener('click', () => {
      navigate(`/tasks/${card.dataset.taskId}`);
    });
  });
}

function renderProjects(projects) {
  const el = document.getElementById('dashboard-projects');
  if (!el) return;

  if (!projects?.length) {
    el.innerHTML = `
      <div class="empty-state" style="padding:32px 0">
        <div class="empty-state__icon">📁</div>
        <p class="empty-state__desc">No projects yet.</p>
        <a href="/projects/new" class="btn btn--primary btn--sm" data-link>Create your first project</a>
      </div>
    `;
    return;
  }

  el.innerHTML = projects.map(project => {
    const total = parseInt(project.total_tasks) || 0;
    const done  = parseInt(project.done_count) || 0;
    const pct   = total > 0 ? Math.round((done / total) * 100) : 0;

    return `
      <a href="/projects/${project.id}" data-link
         class="card"
         style="margin-bottom:12px;display:block;text-decoration:none;cursor:pointer;border-left:4px solid ${project.color}">
        <div class="flex justify-between items-center mb-2">
          <span style="font-weight:600;font-size:15px">${escapeHtml(project.name)}</span>
          <span class="badge badge--${project.status}">${project.status}</span>
        </div>
        <div class="progress">
          <div class="progress__bar" style="width:${pct}%;background:${project.color}"></div>
        </div>
        <div class="flex justify-between" style="font-size:12px;color:var(--color-text-muted)">
          <span>${done}/${total} tasks done</span>
          <span>${pct}%</span>
        </div>
      </a>
    `;
  }).join('');
}

// Security: always escape user-provided content before inserting as HTML
function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
