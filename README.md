# TaskFlow API — Phase 1 Demo Assignment

> Backend for a fictional project management application: JWT authentication, role-based access (ADMIN / MEMBER), full CRUD for projects and tasks, PostgreSQL (Neon) with Prisma, custom logging & error middleware, automated tests and a complete Postman collection.

**Developer:** Salman Ahmed
**Registration:** AUG26-BE24-16
**Assignment:** Phase 1 — Backend Foundations and Core API Development
**Status:** Complete

---

## 1. Tech Stack

| Layer | Choice |
| --- | --- |
| Runtime | Node.js 24 |
| Framework | Express 5 |
| Database | PostgreSQL 18 (Neon, serverless) |
| ORM | Prisma 7 (`prisma-client-js` generator) |
| Auth | `jsonwebtoken` (HS256) + `bcryptjs` |
| Tests | Jest 30 + Supertest |
| API docs | Postman collection (`TaskFlow.postman_collection.json`) |

---

## 2. Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Create .env from the template and fill in real values
copy .env.example .env

# 3. Create the tables (applies prisma/migrations)
npm run migrate

# 4. Regenerate the Prisma client (only after schema changes)
npm run generate

# 5. Start the API
npm run dev        # nodemon, or: npm start
```

Server: `http://localhost:3000`

### Environment variables (`.env`)

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Pooled Neon connection used by the app at runtime |
| `DATABASE_URL_UNPOOLED` | Direct connection used by Prisma migrations |
| `JWT_SECRET` | HS256 signing key for access tokens |
| `JWT_EXPIRES_IN` | Token lifetime (e.g. `1d`) |
| `PORT`, `NODE_ENV`, `API_VERSION` | Server settings |
| `LOG_REQUESTS` | `true`/`false` — enables the request logger |

---

## 3. Project Structure

```
├── index.js                    # Starts the HTTP server (port banner)
├── app.js                      # Express app (imported by tests)
├── prisma7.config.ts           # Prisma CLI config (unpooled URL for migrations)
├── prisma/
│   ├── schema.prisma           # Data model + enums
│   └── migrations/             # Generated SQL migrations
├── controllers/
│   ├── authController.js       # register / login / me
│   ├── userController.js       # user listing (admin)
│   ├── projectController.js    # project CRUD + members
│   └── taskController.js       # task CRUD + assignment
├── routes/
│   ├── auth.js  users.js  projects.js  tasks.js
├── middleware/
│   ├── auth.js                 # authenticate (JWT) + authorize (roles)
│   ├── logger.js               # request/response logging
│   └── errorHandler.js         # 404 + central error handler
├── utils/
│   ├── prisma.js               # shared Prisma client (pg adapter)
│   ├── ApiError.js             # operational error helper
│   └── responseHandler.js      # uniform JSON envelope
├── tests/                      # Jest + Supertest suites
└── TaskFlow.postman_collection.json
```

---

## 4. Data Model

```
User 1 ──── N Project        (owner)
User N ──── N Project        (ProjectMember join table)
Project 1 ── N Task          (cascade delete)
User 1 ──── N Task           (assignee, optional)
```

- **User** — `id, name, email (unique), password (bcrypt hash), role (ADMIN|MEMBER), timestamps`
- **Project** — `id, name, description, status (ACTIVE|ON_HOLD|ARCHIVED), ownerId, timestamps`
- **ProjectMember** — `projectId, userId, joinedAt` with unique `(projectId, userId)`
- **Task** — `id, title, description, status (TODO|IN_PROGRESS|DONE), priority (LOW|MEDIUM|HIGH|URGENT), dueDate, projectId, assigneeId`

Relationships are enforced by foreign keys with `CASCADE` (project deletion removes its members and tasks) and `SET NULL` on task assignee.

Tables are created by a real Prisma migration: `prisma/migrations/<timestamp>_init/migration.sql`.

---

## 5. Authentication & Authorization

### JWT flow
1. `POST /api/auth/register` — first account created becomes **ADMIN**, everyone after is **MEMBER** (a client-sent `role: "ADMIN"` is ignored/downgraded).
2. Passwords hashed with bcrypt (10 rounds); the password hash is never returned.
3. `POST /api/auth/login` → `{ user, token }`.
4. Protected routes require `Authorization: Bearer <token>`.
5. `authenticate` verifies the signature and loads the user from the database (revoked users stop working immediately).
6. `authorize("ADMIN")` restricts routes by role; project/task controllers add ownership checks.

### Access rules

| Action | ADMIN | Project owner | Plain member | Outsider |
| --- | --- | --- | --- | --- |
| List all users | ✅ | ❌ 403 | ❌ 403 | ❌ 403 |
| Create project | ✅ | ✅ | ✅ | ✅ |
| View project | ✅ (all) | ✅ | ✅ | ❌ 403 |
| Update / delete project | ✅ | ✅ | ❌ 403 | ❌ 403 |
| Manage members | ✅ | ✅ | ❌ 403 | ❌ 403 |
| Create / update tasks | ✅ | ✅ | ✅ | ❌ 403 |
| Delete tasks | ✅ | ✅ | ❌ 403 | ❌ 403 |

---

## 6. API Endpoints

| Method | Endpoint | Auth | Description |
| --- | --- | --- | --- |
| GET | `/` | – | Health check |
| POST | `/api/auth/register` | – | Register (first user = ADMIN) |
| POST | `/api/auth/login` | – | Login, returns JWT |
| GET | `/api/auth/me` | Bearer | Current user |
| GET | `/api/users` | ADMIN | List users with project/task counts |
| GET | `/api/users/:id` | Bearer | User profile |
| GET | `/api/projects` | Bearer | Projects I own or belong to (ADMIN: all) |
| POST | `/api/projects` | Bearer | Create project (creator becomes owner + member) |
| GET | `/api/projects/:id` | Bearer | Project incl. members and tasks |
| PUT | `/api/projects/:id` | Owner/ADMIN | Update name, description, status |
| DELETE | `/api/projects/:id` | Owner/ADMIN | Delete project (cascade) |
| POST | `/api/projects/:id/members` | Owner/ADMIN | Add member |
| DELETE | `/api/projects/:id/members/:userId` | Owner/ADMIN | Remove member (revokes access) |
| GET | `/api/projects/:id/tasks?status=` | Bearer | List tasks, optional status filter |
| POST | `/api/projects/:id/tasks` | Bearer | Create task |
| GET | `/api/tasks/:id` | Bearer | Task detail |
| PUT | `/api/tasks/:id` | Bearer | Update status/priority/assignee/... |
| DELETE | `/api/tasks/:id` | Owner/ADMIN | Delete task |

> The Phase 0 mock endpoints (`/api/products`, in-memory users) were removed — all data now lives in PostgreSQL.

---

## 7. Response Format

Every response uses the same envelope:

```json
{
  "success": true,
  "message": "Project created successfully",
  "data": { },
  "timestamp": "2026-10-03T08:45:17.495Z"
}
```

| Code | Meaning |
| --- | --- |
| 200 / 201 | Success |
| 400 | Validation error (missing fields, bad enum, bad date) |
| 401 | Missing/invalid/expired token, wrong credentials |
| 403 | Role or ownership denied |
| 404 | Route, user, project or task not found |
| 409 | Duplicate email / duplicate membership |
| 500 | Unexpected server error (details only in development) |

Errors are thrown as `ApiError` and translated by `middleware/errorHandler.js`, which also understands Prisma error codes (`P2002`, `P2025`, `P2003`) and malformed JSON bodies.

---

## 8. Logging

`middleware/logger.js` prints one line per request and one per response:

```
[2026-10-03T08:45:15.880Z] --> POST /api/projects
[2026-10-03T08:45:17.498Z] <-- POST /api/projects 201 (1618ms)
```

Set `LOG_REQUESTS=false` to silence it (tests do this automatically).

---

## 9. Testing

```bash
npm test
```

- 4 suites / **39 tests**: `auth.test.js`, `roles.test.js`, `projects.test.js`, `tasks.test.js`
- Supertest drives the real Express app (no HTTP port needed)
- The shared Neon database is truncated between tests (`tests/helpers.js`)
- `testTimeout` is raised because every query has a ~500 ms cross-region round trip

Covered: registration rules, login failures, token validation, role restrictions, project CRUD, membership add/remove, access revocation, task validation, assignment rules and delete permissions.

---

## 10. Postman Collection

Import `TaskFlow.postman_collection.json` into Postman.

- 18 requests across 5 folders (Health, Auth, Users, Projects, Tasks)
- Every request carries an example response (success + at least one error case)
- Test scripts auto-save `token`, `userId`, `projectId` and `taskId` collection variables, so the flow runs top-to-bottom without manual copying

---

## 11. Deliverables

- [x] Complete project source code
- [x] PostgreSQL schema created through Prisma migrations
- [x] JWT authentication + role-based authorization
- [x] Full CRUD for projects and tasks with defined relationships
- [x] Custom logging and error-handling middleware
- [x] Jest + Supertest test suite (39 passing)
- [x] Postman collection with example requests/responses
- [ ] 4–5 page PDF report (overview, approach, screenshots, conclusion)
- [ ] 4–6 minute MP4 demo

---

## 12. Scripts

```json
{
  "start": "node index.js",
  "dev": "nodemon index.js",
  "test": "jest --runInBand",
  "migrate": "prisma migrate dev",
  "generate": "prisma generate"
}
```

---

**Developer:** Salman Ahmed · **Registration:** AUG26-BE24-16
