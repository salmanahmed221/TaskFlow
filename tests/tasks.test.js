/**
 * Task CRUD, assignment and authorization tests.
 */
const request = require("supertest");
const app = require("../app");
const { resetDb, uniqueEmail } = require("./helpers");

const api = request(app);

const signup = async (name, email) => {
  const res = await api
    .post("/api/auth/register")
    .send({ name, email, password: "secret123" });
  return { user: res.body.data.user, token: res.body.data.token };
};

let owner;
let member;
let outsider;
let projectId;

const createTask = (token, body) =>
  api
    .post(`/api/projects/${projectId}/tasks`)
    .set("Authorization", `Bearer ${token}`)
    .send(body);

beforeEach(async () => {
  await resetDb();
  owner = await signup("Owner", uniqueEmail("owner"));
  member = await signup("Member", uniqueEmail("member"));
  outsider = await signup("Outsider", uniqueEmail("outsider"));

  const created = await createProject(owner.token);
  projectId = created.body.data.id;

  await api
    .post(`/api/projects/${projectId}/members`)
    .set("Authorization", `Bearer ${owner.token}`)
    .send({ userId: member.user.id });
});

async function createProject(token) {
  return api
    .post("/api/projects")
    .set("Authorization", `Bearer ${token}`)
    .send({ name: "TaskFlow Demo" });
}

describe("Task CRUD", () => {
  test("creates a task with sensible defaults", async () => {
    const res = await createTask(owner.token, { title: "Write report" });

    expect(res.status).toBe(201);
    expect(res.body.data.title).toBe("Write report");
    expect(res.body.data.status).toBe("TODO");
    expect(res.body.data.priority).toBe("MEDIUM");
    expect(res.body.data.dueDate).toBeNull();
  });

  test("rejects task without title", async () => {
    const res = await createTask(owner.token, { description: "no title" });
    expect(res.status).toBe(400);
  });

  test("rejects invalid status and priority", async () => {
    const res = await createTask(owner.token, { title: "X", status: "NOPE" });
    expect(res.status).toBe(400);

    const res2 = await createTask(owner.token, { title: "X", priority: "SUPER" });
    expect(res2.status).toBe(400);
  });

  test("lists tasks for project members only", async () => {
    await createTask(owner.token, { title: "Task A" });

    const allowed = await api
      .get(`/api/projects/${projectId}/tasks`)
      .set("Authorization", `Bearer ${member.token}`);
    expect(allowed.status).toBe(200);
    expect(allowed.body.data).toHaveLength(1);

    const denied = await api
      .get(`/api/projects/${projectId}/tasks`)
      .set("Authorization", `Bearer ${outsider.token}`);
    expect(denied.status).toBe(403);
  });

  test("filters tasks by status", async () => {
    const t = await createTask(owner.token, { title: "Done task" });
    await api
      .put(`/api/tasks/${t.body.data.id}`)
      .set("Authorization", `Bearer ${owner.token}`)
      .send({ status: "DONE" });
    await createTask(owner.token, { title: "Open task" });

    const done = await api
      .get(`/api/projects/${projectId}/tasks?status=DONE`)
      .set("Authorization", `Bearer ${owner.token}`);
    expect(done.body.data).toHaveLength(1);
    expect(done.body.data[0].title).toBe("Done task");
  });

  test("updates task status", async () => {
    const created = await createTask(owner.token, { title: "Move me" });
    const res = await api
      .put(`/api/tasks/${created.body.data.id}`)
      .set("Authorization", `Bearer ${member.token}`)
      .send({ status: "IN_PROGRESS", priority: "HIGH" });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe("IN_PROGRESS");
    expect(res.body.data.priority).toBe("HIGH");
  });

  test("unknown task id returns 404", async () => {
    const res = await api
      .get("/api/tasks/not-a-real-task")
      .set("Authorization", `Bearer ${owner.token}`);
    expect(res.status).toBe(404);
  });
});

describe("Task assignment", () => {
  test("assigns a task to a project member", async () => {
    const created = await createTask(owner.token, { title: "Assign me" });
    const res = await api
      .put(`/api/tasks/${created.body.data.id}`)
      .set("Authorization", `Bearer ${owner.token}`)
      .send({ assigneeId: member.user.id });

    expect(res.status).toBe(200);
    expect(res.body.data.assignee.email).toBe(member.user.email);
  });

  test("rejects assignee outside the project", async () => {
    const created = await createTask(owner.token, { title: "Assign me" });
    const res = await api
      .put(`/api/tasks/${created.body.data.id}`)
      .set("Authorization", `Bearer ${owner.token}`)
      .send({ assigneeId: outsider.user.id });

    expect(res.status).toBe(400);
  });
});

describe("Task deletion", () => {
  test("project member who is not the owner cannot delete", async () => {
    const created = await createTask(owner.token, { title: "Delete me" });
    const res = await api
      .delete(`/api/tasks/${created.body.data.id}`)
      .set("Authorization", `Bearer ${member.token}`);
    expect(res.status).toBe(403);
  });

  test("owner can delete a task", async () => {
    const created = await createTask(owner.token, { title: "Delete me" });
    const res = await api
      .delete(`/api/tasks/${created.body.data.id}`)
      .set("Authorization", `Bearer ${owner.token}`);
    expect(res.status).toBe(200);

    const gone = await api
      .get(`/api/tasks/${created.body.data.id}`)
      .set("Authorization", `Bearer ${owner.token}`);
    expect(gone.status).toBe(404);
  });
});
