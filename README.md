# TaskFlow — Full-Stack Learning Project

A production-quality project management SPA built with **Vanilla JavaScript**, **Node.js/Express**, and **PostgreSQL**. Designed as a mentorship codebase you can read, run, and learn from.

---

## What You're Building

TaskFlow lets teams create projects, assign tasks, track progress on a Kanban board, and comment on work. Every feature demonstrates a real professional pattern.

**Features:**
- User registration and JWT authentication
- Create and manage projects with teams
- Kanban board (To Do / In Progress / In Review / Done)
- Task creation with priority, due dates, and assignees
- Comment threads on tasks
- Search and filter tasks
- Dashboard with personal task stats
- Profile management with avatar colors

---

## Architecture Overview

Before diving into code, understand the **why** behind the structure.

### Backend: 4-Layer Architecture

```
HTTP Request
     ↓
  Routes        — URL mapping only. No logic.
     ↓
Controllers     — HTTP: read req → call service → write res. No SQL.
     ↓
  Services      — Business logic: "can this user do this?", side effects.
     ↓
  DB Layer      — SQL queries only. Returns plain JS objects.
     ↓
 PostgreSQL
```

**Why four layers?**

If you change your database from PostgreSQL to MySQL, you only touch `db/*.js`. If you add GraphQL alongside REST, you only add new resolvers that call the same services. Each layer has one job and can be tested independently.

**Never put SQL in controllers.** Never put business logic in route files.

### Frontend: Feature-Based SPA Modules

```
main.js          — App boot, auth verification, route registration
router.js        — URL → page matching, history API, route guards
store.js         — Global state (auth user, token)
services/api.js  — All fetch() calls, one place
pages/*.js       — One file per route: render() + afterRender()
components/      — Reusable UI pieces: Avatar, Toast, Modal
```

**How vanilla JS mimics a framework:**

React/Vue aren't magic — they're just patterns with a library wrapper. TaskFlow implements the same patterns manually:

| Framework Concept | TaskFlow Equivalent |
|---|---|
| Component | Function returning HTML string |
| State | `store.js` + local page variables |
| Reactivity | `store.subscribe()` observer pattern |
| Router | `router.js` with History API |
| Code splitting | `import()` dynamic imports |
| Lifecycle hooks | `render()` + `afterRender()` |

---

## Project Structure

```
taskflow/
├── backend/
│   ├── src/
│   │   ├── app.js                  # Express app + server start
│   │   ├── config/
│   │   │   └── index.js            # All environment variables, validated at startup
│   │   ├── db/
│   │   │   ├── pool.js             # PostgreSQL connection pool (singleton)
│   │   │   ├── migrate.js          # Migration runner script
│   │   │   ├── seed.js             # Development sample data
│   │   │   ├── reset.js            # Drop + re-migrate + re-seed
│   │   │   ├── userQueries.js      # All SQL for users
│   │   │   ├── projectQueries.js   # All SQL for projects + members
│   │   │   └── taskQueries.js      # All SQL for tasks + comments (includes dynamic filtering)
│   │   ├── middleware/
│   │   │   ├── auth.js             # JWT verification, attaches req.user
│   │   │   ├── errorHandler.js     # Global error handler + createError helper
│   │   │   └── validate.js         # express-validator rule sets + validate() runner
│   │   ├── services/
│   │   │   ├── authService.js      # bcrypt hashing, JWT creation, login/register logic
│   │   │   ├── projectService.js   # Authorization (role checks), project business rules
│   │   │   └── taskService.js      # Task access control, dashboard aggregation
│   │   ├── controllers/
│   │   │   ├── authController.js   # Thin: extract req → call service → return res
│   │   │   ├── projectController.js
│   │   │   └── taskController.js
│   │   └── routes/
│   │       ├── auth.js             # POST /register, POST /login, GET /me
│   │       ├── projects.js         # CRUD /projects + member management
│   │       └── tasks.js            # CRUD /tasks + comments + dashboard
│   ├── .env.example
│   └── package.json
│
└── frontend/
    ├── index.html                  # Single HTML file — the "shell"
    ├── css/
    │   └── main.css                # Design tokens + all component styles
    └── src/
        ├── main.js                 # App boot: auth check → routes → router init
        ├── store.js                # Global state: user, token, observer pattern
        ├── router.js               # History API routing: addRoute, navigate, guards
        ├── services/
        │   └── api.js              # All fetch() calls organized by resource
        ├── components/
        │   ├── ui.js               # Shared: Avatar, Badge, Toast, Modal, form helpers
        │   └── navbar.js           # Persistent nav, subscribes to store
        └── pages/
            ├── login.js            # render() + afterRender() pattern
            ├── register.js
            ├── dashboard.js        # Promise.all parallel fetching, stat cards
            ├── projects.js         # Project grid + create modal
            ├── projectDetail.js    # Kanban board + filters + add task modal
            ├── taskDetail.js       # Inline editing, comment thread
            └── profile.js          # Edit profile + change password
```

---

## Database Schema

```
users
  id, email (CITEXT, unique), password_hash, full_name, avatar_color, bio

projects
  id, owner_id → users, name, description, color, status (active|archived|completed)

project_members        ← join table (many-to-many)
  project_id → projects, user_id → users, role (admin|member|viewer)

tasks
  id, project_id → projects, creator_id → users, assignee_id → users (nullable)
  title, description, status, priority, due_date, position

task_comments
  id, task_id → tasks, author_id → users, content

tags
  id, project_id → projects, name, color

task_tags              ← join table (many-to-many)
  task_id → tasks, tag_id → tags
```

**Key design decisions:**
- `CITEXT` on email: case-insensitive uniqueness — `User@Example.com` = `user@example.com`
- `ON DELETE CASCADE`: deleting a project deletes all its tasks and members
- `ON DELETE SET NULL`: deleting a user unassigns their tasks (tasks aren't deleted)
- DB-level `CHECK` constraints on `status` and `priority` — defense in depth
- Composite `INDEX` on `(project_id, status)` — optimizes the Kanban board query
- `TIMESTAMPTZ` everywhere — stores timezone, avoids DST bugs

---

## Setup

### Prerequisites

- Node.js 18+
- PostgreSQL 14+

### 1. Clone and Install

```bash
git clone <your-repo>
cd taskflow
npm run install:all
```

### 2. Configure Environment

```bash
cd backend
cp .env.example .env
```

Edit `.env` with your PostgreSQL credentials:

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=taskflow_dev
DB_USER=postgres
DB_PASSWORD=your_password

# Generate with: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
JWT_SECRET=your_64_char_random_string_here
```

### 3. Create Database

```bash
# In PostgreSQL:
CREATE DATABASE taskflow_dev;
```

### 4. Run Migrations and Seed

```bash
npm run db:migrate   # Creates tables
npm run db:seed      # Adds sample data
```

### 5. Start the Backend

```bash
npm run dev          # Starts on http://localhost:3001 with nodemon
```

### 6. Serve the Frontend

Use VS Code Live Server, or any static file server:

```bash
# Option A: VS Code extension "Live Server" → right-click index.html → Open
# Option B: Python
cd frontend && python3 -m http.server 5500
# Option C: npx
cd frontend && npx serve -p 5500
```

Open http://localhost:5500 and log in with:
- `alex@example.com` / `password123`
- `sam@example.com` / `password123`
- `jordan@example.com` / `password123`

---

## API Reference

All responses follow this shape:
```json
// Success
{ "data": { ... } }

// Error
{ "error": "Human message", "code": "MACHINE_CODE", "details": {} }
```

### Auth

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/auth/register` | — | Register new user |
| POST | `/api/auth/login` | — | Login, returns JWT |
| GET | `/api/auth/me` | ✓ | Get current user |
| PATCH | `/api/auth/profile` | ✓ | Update profile |
| POST | `/api/auth/change-password` | ✓ | Change password |

### Projects

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/projects` | ✓ | List user's projects |
| POST | `/api/projects` | ✓ | Create project |
| GET | `/api/projects/:id` | ✓ | Get project with members |
| PATCH | `/api/projects/:id` | ✓ (admin) | Update project |
| DELETE | `/api/projects/:id` | ✓ (owner) | Delete project |
| POST | `/api/projects/:id/members` | ✓ (admin) | Add member |
| DELETE | `/api/projects/:id/members/:userId` | ✓ (admin) | Remove member |

### Tasks

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/tasks/dashboard` | ✓ | Stats + recent tasks |
| GET | `/api/tasks/project/:id` | ✓ | List tasks (filterable) |
| POST | `/api/tasks/project/:id` | ✓ | Create task |
| GET | `/api/tasks/:id` | ✓ | Get task with comments |
| PATCH | `/api/tasks/:id` | ✓ | Update task |
| DELETE | `/api/tasks/:id` | ✓ | Delete task |
| POST | `/api/tasks/:id/comments` | ✓ | Add comment |

**Task filters** (query params): `status`, `priority`, `assigneeId`, `search`, `page`, `limit`

---

## How to Study This Codebase

Follow this reading order for maximum learning:

### Week 1: Backend Foundation

1. **`backend/src/config/index.js`** — How to handle environment variables safely
2. **`backend/src/db/pool.js`** — PostgreSQL connection, why pools matter
3. **`backend/src/db/migrations/*.sql`** — Database design decisions (read the comments)
4. **`backend/src/db/userQueries.js`** — Parameterized queries, RETURNING clauses
5. **`backend/src/middleware/auth.js`** — How JWT verification works
6. **`backend/src/middleware/errorHandler.js`** — Centralized error handling

### Week 2: Request Lifecycle

Follow a single request through all layers. Try **POST /api/auth/login**:

```
auth.js (route)
  → authController.login()
    → authService.login()
      → userQueries.findUserByEmail() → SQL
      ← user row
    ← bcrypt.compare() → jwt.sign()
  ← { user, token }
← res.json({ data: { user, token } })
```

Trace this yourself with `console.log` at each layer.

### Week 3: Frontend Architecture

1. **`frontend/src/main.js`** — How the app boots
2. **`frontend/src/store.js`** — Global state and the observer pattern
3. **`frontend/src/router.js`** — How client-side routing works (History API)
4. **`frontend/src/services/api.js`** — The API client abstraction
5. **`frontend/src/pages/login.js`** — render() + afterRender() pattern

### Week 4: Complex Patterns

- **`taskQueries.js` — `getTasksForProject()`**: Dynamic query building with filters
- **`projectQueries.js` — `getProjectsForUser()`**: JOINs + aggregations in one query
- **`pages/projectDetail.js`**: Debounced search, kanban board state management
- **`pages/taskDetail.js`**: Inline editing pattern

---

## Key Learning Moments

### 1. Why does the DB layer not know about HTTP?
```js
// WRONG — DB layer shouldn't know about HTTP codes
export async function findUser(email) {
  const user = await query('...');
  if (!user) throw { status: 404, message: 'Not found' }; // ← BAD
}

// RIGHT — return null, let the service/controller decide
export async function findUser(email) {
  const { rows } = await query('...');
  return rows[0] || null; // ← GOOD
}
```

### 2. Why do services handle authorization, not controllers?
Controllers don't know about business rules. Services do. If you later add a CLI command, a cron job, or a WebSocket handler — they all call the same service layer and get the same authorization checks for free.

### 3. Why does the frontend use escapeHtml everywhere?
```js
// VULNERABLE to XSS — user content directly in innerHTML
el.innerHTML = `<div>${task.title}</div>`;

// SAFE — user content is escaped
el.innerHTML = `<div>${esc(task.title)}</div>`;
```
Never put user-provided content directly into innerHTML. The `esc()` function in each page converts `<`, `>`, `"`, `&` to their HTML entities so they render as text, not code.

### 4. Why parallel fetching with Promise.all?
```js
// Sequential — 400ms total (200ms + 200ms)
const stats    = await api.tasks.dashboard();
const projects = await api.projects.list();

// Parallel — 200ms total (both run simultaneously)
const [stats, projects] = await Promise.all([
  api.tasks.dashboard(),
  api.projects.list(),
]);
```

---

## Future Improvements

Once you understand the codebase, try extending it:

**Beginner:**
- Add a "completed at" timestamp to tasks when status changes to "done"
- Add task count badges to the nav
- Add an "unassign myself" button on tasks

**Intermediate:**
- Add email notifications (nodemailer) when a task is assigned
- Implement task drag-and-drop between Kanban columns (HTML5 Drag API)
- Add a "dark mode" using CSS custom properties
- Implement pagination on the projects list

**Advanced:**
- Add WebSockets (Socket.io) for real-time task updates
- Write integration tests with a test database
- Add full-text search using PostgreSQL `tsvector`
- Implement refresh tokens alongside JWTs
- Add file attachment support (multer + S3)
- Deploy to Railway/Render + Vercel with CI/CD

---

## Common Mistakes This Codebase Avoids

| Mistake | What We Do Instead |
|---|---|
| SQL in controllers | DB queries isolated in `db/*.js` |
| Business logic in routes | Services handle "who can do what" |
| `SELECT *` everywhere | Select only needed columns |
| String concatenation in SQL | Parameterized queries (`$1`, `$2`) |
| Storing passwords | Store bcrypt hashes only |
| Single error message for wrong email/password | Timing-attack resistant: same message regardless |
| `localStorage` for user object | Memory (store.js); only token in localStorage |
| Direct innerHTML with user data | `esc()` on all user content |
| Creating new DB connections per request | Connection pool (pg Pool) |
| Checking auth in route files | Middleware handles it; controllers are clean |
