/**
 * Task Detail Page
 *
 * Shows full task info, allows inline editing of status/priority,
 * and displays the comment thread.
 *
 * INLINE EDITING PATTERN:
 * Instead of a separate edit page or modal for every field,
 * we use inline editing: clicking a field shows an input,
 * saving sends a PATCH request, then re-renders just that field.
 *
 * This pattern is common in productivity apps (Notion, Linear, Jira).
 * It reduces navigation friction for common changes like status updates.
 */

import api from '../services/api.js';
import { showToast, Avatar, StatusBadge, PriorityBadge,
         formatRelativeTime, formatDate, isOverdue } from '../components/ui.js';
import { navigate } from '../router.js';
import store from '../store.js';

function esc(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

let currentTask = null;

export function render() {
  return `
    <div class="page-container">
      <div class="task-detail" id="task-detail">
        <div class="skeleton" style="height:28px;width:60%;margin-bottom:16px"></div>
        <div class="skeleton" style="height:16px;width:40%;margin-bottom:32px"></div>
        <div class="skeleton" style="height:120px;margin-bottom:24px"></div>
        <div class="skeleton" style="height:200px"></div>
      </div>
    </div>
  `;
}

export async function afterRender({ id: taskId }) {
  try {
    const { task } = await api.tasks.get(taskId);
    currentTask = task;
    renderTask(task);
  } catch (err) {
    document.getElementById('task-detail').innerHTML = `
      <div class="empty-state">
        <div class="empty-state__icon">🔍</div>
        <h2 class="empty-state__title">Task not found</h2>
        <p class="empty-state__desc">${err.message}</p>
        <a href="/projects" class="btn btn--primary" data-link>Back to Projects</a>
      </div>
    `;
  }
}

function renderTask(task) {
  const el = document.getElementById('task-detail');
  if (!el) return;

  const overdue = isOverdue(task.due_date) && task.status !== 'done';
  const currentUser = store.getUser();

  el.innerHTML = `
    <!-- Breadcrumb -->
    <nav style="display:flex;align-items:center;gap:8px;margin-bottom:20px;font-size:13px;color:var(--color-text-muted)">
      <a href="/projects" data-link style="color:var(--color-text-muted)">Projects</a>
      <span>/</span>
      <a href="/projects/${task.project_id}" data-link style="color:var(--color-text-muted)">Project</a>
      <span>/</span>
      <span style="color:var(--color-text-primary)">${esc(task.title).substring(0, 40)}${task.title.length > 40 ? '...' : ''}</span>
    </nav>

    <div style="display:grid;grid-template-columns:1fr 280px;gap:32px;align-items:start">

      <!-- Main content -->
      <div>
        <h1 style="font-size:24px;font-weight:700;margin-bottom:8px;line-height:1.3">
          ${esc(task.title)}
        </h1>

        <div style="display:flex;align-items:center;gap:12px;margin-bottom:24px;font-size:13px;color:var(--color-text-muted)">
          <span>Created by ${esc(task.creator_name)}</span>
          <span>·</span>
          <span>${formatRelativeTime(task.created_at)}</span>
          ${task.updated_at !== task.created_at ? `
            <span>·</span>
            <span>Updated ${formatRelativeTime(task.updated_at)}</span>
          ` : ''}
        </div>

        <!-- Description -->
        <div id="description-section" style="margin-bottom:32px">
          ${task.description ? `
            <p style="font-size:15px;color:var(--color-text-primary);white-space:pre-wrap;line-height:1.7">
              ${esc(task.description)}
            </p>
          ` : `
            <p style="font-size:14px;color:var(--color-text-muted);font-style:italic">
              No description. Click to add one.
            </p>
          `}
        </div>

        <!-- Comments -->
        <div>
          <h2 style="font-size:16px;font-weight:600;margin-bottom:16px">
            Comments ${task.comments?.length ? `(${task.comments.length})` : ''}
          </h2>

          <div id="comments-list">
            ${renderCommentsList(task.comments || [])}
          </div>

          <!-- Add comment form -->
          <div style="display:flex;gap:12px;margin-top:16px">
            ${Avatar({ name: currentUser?.full_name, color: currentUser?.avatar_color, size: 'md' })}
            <div style="flex:1">
              <textarea id="comment-input" class="form-control"
                        placeholder="Add a comment..."
                        rows="3"
                        style="resize:vertical"></textarea>
              <button class="btn btn--primary btn--sm" id="add-comment-btn" style="margin-top:8px">
                Add Comment
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Sidebar: task properties -->
      <div>
        <div class="card" style="position:sticky;top:80px">
          <h3 style="font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;color:var(--color-text-muted);margin-bottom:16px">
            Task Details
          </h3>

          <!-- Status -->
          <div style="margin-bottom:16px">
            <label class="form-label" style="font-size:12px">Status</label>
            <select class="form-control" id="status-select" style="font-size:13px">
              <option value="todo"        ${task.status === 'todo'        ? 'selected' : ''}>To Do</option>
              <option value="in_progress" ${task.status === 'in_progress' ? 'selected' : ''}>In Progress</option>
              <option value="in_review"   ${task.status === 'in_review'   ? 'selected' : ''}>In Review</option>
              <option value="done"        ${task.status === 'done'        ? 'selected' : ''}>Done</option>
            </select>
          </div>

          <!-- Priority -->
          <div style="margin-bottom:16px">
            <label class="form-label" style="font-size:12px">Priority</label>
            <select class="form-control" id="priority-select" style="font-size:13px">
              <option value="low"    ${task.priority === 'low'    ? 'selected' : ''}>Low</option>
              <option value="medium" ${task.priority === 'medium' ? 'selected' : ''}>Medium</option>
              <option value="high"   ${task.priority === 'high'   ? 'selected' : ''}>High</option>
              <option value="urgent" ${task.priority === 'urgent' ? 'selected' : ''}>Urgent</option>
            </select>
          </div>

          <!-- Assignee -->
          <div style="margin-bottom:16px">
            <label class="form-label" style="font-size:12px">Assignee</label>
            <div style="display:flex;align-items:center;gap:8px">
              ${task.assignee_id
                ? `${Avatar({ name: task.assignee_name, color: task.assignee_avatar_color, size: 'sm' })}
                   <span style="font-size:13px">${esc(task.assignee_name)}</span>`
                : `<span style="font-size:13px;color:var(--color-text-muted)">Unassigned</span>`
              }
            </div>
          </div>

          <!-- Due date -->
          <div style="margin-bottom:16px">
            <label class="form-label" style="font-size:12px">Due Date</label>
            <div style="font-size:13px;color:${overdue ? 'var(--color-danger)' : 'var(--color-text-primary)'}">
              ${task.due_date
                ? `${overdue ? '⚠ ' : ''}${formatDate(task.due_date)}`
                : '<span style="color:var(--color-text-muted)">No due date</span>'
              }
            </div>
          </div>

          <!-- Tags -->
          ${task.tags?.length ? `
            <div style="margin-bottom:16px">
              <label class="form-label" style="font-size:12px">Tags</label>
              <div style="display:flex;gap:4px;flex-wrap:wrap">
                ${task.tags.map(tag => `
                  <span style="
                    font-size:11px;font-weight:600;padding:2px 8px;border-radius:99px;
                    background:${tag.color}22;color:${tag.color};
                  ">${esc(tag.name)}</span>
                `).join('')}
              </div>
            </div>
          ` : ''}

          <!-- Delete task -->
          <div style="margin-top:24px;padding-top:16px;border-top:1px solid var(--color-border)">
            <button class="btn btn--ghost btn--sm" id="delete-task-btn"
                    style="color:var(--color-danger);width:100%">
              Delete Task
            </button>
          </div>
        </div>
      </div>
    </div>
  `;

  // Attach event listeners
  attachTaskListeners(task);
}

function renderCommentsList(comments) {
  if (!comments.length) {
    return `<p style="color:var(--color-text-muted);font-size:14px">No comments yet. Be the first to comment.</p>`;
  }

  return comments.map(comment => `
    <div class="comment">
      ${Avatar({ name: comment.author_name, color: comment.author_avatar_color, size: 'sm' })}
      <div class="comment__body">
        <div class="comment__header">
          <span class="comment__author">${esc(comment.author_name)}</span>
          <span class="comment__time">${formatRelativeTime(comment.created_at)}</span>
        </div>
        <p class="comment__content">${esc(comment.content)}</p>
      </div>
    </div>
  `).join('');
}

function attachTaskListeners(task) {
  // Status change — saves immediately
  document.getElementById('status-select')?.addEventListener('change', async (e) => {
    try {
      await api.tasks.update(task.id, { status: e.target.value });
      showToast('Status updated', 'success');
    } catch (err) {
      showToast('Failed to update status', 'error');
      e.target.value = task.status; // Revert
    }
  });

  // Priority change
  document.getElementById('priority-select')?.addEventListener('change', async (e) => {
    try {
      await api.tasks.update(task.id, { priority: e.target.value });
      showToast('Priority updated', 'success');
    } catch (err) {
      showToast('Failed to update priority', 'error');
      e.target.value = task.priority;
    }
  });

  // Add comment
  document.getElementById('add-comment-btn')?.addEventListener('click', async () => {
    const input = document.getElementById('comment-input');
    const content = input.value.trim();
    if (!content) {
      input.focus();
      return;
    }

    const btn = document.getElementById('add-comment-btn');
    btn.disabled = true;
    btn.textContent = 'Posting...';

    try {
      const { comment } = await api.tasks.addComment(task.id, content);

      // Add comment to the current task's comment list
      if (!task.comments) task.comments = [];
      task.comments.push({
        ...comment,
        author_name: store.getUser()?.full_name,
        author_avatar_color: store.getUser()?.avatar_color,
      });

      // Re-render just the comments section
      document.getElementById('comments-list').innerHTML =
        renderCommentsList(task.comments);

      input.value = '';
    } catch (err) {
      showToast('Failed to post comment', 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Add Comment';
    }
  });

  // Allow Ctrl+Enter to submit comment
  document.getElementById('comment-input')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      document.getElementById('add-comment-btn')?.click();
    }
  });

  // Delete task
  document.getElementById('delete-task-btn')?.addEventListener('click', async () => {
    if (!confirm('Delete this task? This cannot be undone.')) return;

    try {
      await api.tasks.delete(task.id);
      showToast('Task deleted', 'success');
      navigate(`/projects/${task.project_id}`);
    } catch (err) {
      showToast(err.message, 'error');
    }
  });
}
