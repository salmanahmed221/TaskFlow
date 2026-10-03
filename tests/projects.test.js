/**
 * Project CRUD + membership tests.
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

const createProject = async (token, body = { name: "Test Project" }) =>
  api.post("/api/projects").set("Authorization", `Bearer ${token}`).send(body);

let admin;
let owner;
let member;
let outsider;

beforeEach(async () => {
  await resetDb();
  // Registered first, so this account becomes the ADMIN.
  admin = await signup("Admin", uniqueEmail("admin"));
  owner = await signup("Owner", uniqueEmail("owner"));
  member = await signup("Member", uniqueEmail("member"));
  outsider = await signup("Outsider", uniqueEmail("outsider"));
});

describe("Project CRUD", () => {
  test("creates a project and adds the creator as a member", async () => {
    const res = await createProject(owner.token, {
      name: "TaskFlow",
      description: "Demo project",
    });

    expect(res.status).toBe(201);
    expect(res.body.data.name).toBe("TaskFlow");
    expect(res.body.data.ownerId).toBe(owner.user.id);
    expect(res.body.data.status).toBe("ACTIVE");
    expect(res.body.data.members).toHaveLength(1);
    expect(res.body.data.members[0].userId).toBe(owner.user.id);
  });

  test("rejects project without a name", async () => {
    const res = await createProject(owner.token, { description: "no name" });
    expect(res.status).toBe(400);
  });

  test("rejects invalid status", async () => {
    const res = await createProject(owner.token, { name: "P", status: "BROKEN" });
    expect(res.status).toBe(400);
  });

  test("lists only projects the user can access", async () => {
    await createProject(owner.token, { name: "Owner Project" });
    await createProject(outsider.token, { name: "Outsider Project" });

    const mine = await api
      .get("/api/projects")
      .set("Authorization", `Bearer ${owner.token}`);
    expect(mine.status).toBe(200);
    expect(mine.body.data).toHaveLength(1);
    expect(mine.body.data[0].name).toBe("Owner Project");

    const all = await api.get("/api/projects").set("Authorization", `Bearer ${admin.token}`);
    expect(all.body.data).toHaveLength(2);
  });

  test("owner can update, outsiders get 403, unknown id gets 404", async () => {
    const created = await createProject(owner.token);
    const id = created.body.data.id;

    const updated = await api
      .put(`/api/projects/${id}`)
      .set("Authorization", `Bearer ${owner.token}`)
      .send({ name: "Renamed", status: "ARCHIVED" });
    expect(updated.status).toBe(200);
    expect(updated.body.data.name).toBe("Renamed");
    expect(updated.body.data.status).toBe("ARCHIVED");

    const denied = await api
      .put(`/api/projects/${id}`)
      .set("Authorization", `Bearer ${outsider.token}`)
      .send({ name: "Hacked" });
    expect(denied.status).toBe(403);

    const missing = await api
      .get("/api/projects/not-a-real-id")
      .set("Authorization", `Bearer ${owner.token}`);
    expect(missing.status).toBe(404);
  });

  test("only the owner can delete a project", async () => {
    const created = await createProject(owner.token);
    const id = created.body.data.id;

    const denied = await api
      .delete(`/api/projects/${id}`)
      .set("Authorization", `Bearer ${member.token}`);
    expect(denied.status).toBe(403);

    const deleted = await api
      .delete(`/api/projects/${id}`)
      .set("Authorization", `Bearer ${owner.token}`);
    expect(deleted.status).toBe(200);

    const gone = await api
      .get(`/api/projects/${id}`)
      .set("Authorization", `Bearer ${owner.token}`);
    expect(gone.status).toBe(404);
  });
});

describe("Project membership", () => {
  test("owner adds a member who then gains access", async () => {
    const created = await createProject(owner.token);
    const id = created.body.data.id;

    const before = await api
      .get(`/api/projects/${id}`)
      .set("Authorization", `Bearer ${member.token}`);
    expect(before.status).toBe(403);

    const added = await api
      .post(`/api/projects/${id}/members`)
      .set("Authorization", `Bearer ${owner.token}`)
      .send({ userId: member.user.id });
    expect(added.status).toBe(201);

    const after = await api
      .get(`/api/projects/${id}`)
      .set("Authorization", `Bearer ${member.token}`);
    expect(after.status).toBe(200);
  });

  test("rejects duplicate membership with 409", async () => {
    const created = await createProject(owner.token);
    const id = created.body.data.id;

    await api
      .post(`/api/projects/${id}/members`)
      .set("Authorization", `Bearer ${owner.token}`)
      .send({ userId: member.user.id });

    const dup = await api
      .post(`/api/projects/${id}/members`)
      .set("Authorization", `Bearer ${owner.token}`)
      .send({ userId: member.user.id });
    expect(dup.status).toBe(409);
  });

  test("plain member cannot manage members", async () => {
    const created = await createProject(owner.token);
    const id = created.body.data.id;

    const res = await api
      .post(`/api/projects/${id}/members`)
      .set("Authorization", `Bearer ${member.token}`)
      .send({ userId: outsider.user.id });
    expect(res.status).toBe(403);
  });

  test("removing a member revokes access", async () => {
    const created = await createProject(owner.token);
    const id = created.body.data.id;

    await api
      .post(`/api/projects/${id}/members`)
      .set("Authorization", `Bearer ${owner.token}`)
      .send({ userId: member.user.id });

    const removed = await api
      .delete(`/api/projects/${id}/members/${member.user.id}`)
      .set("Authorization", `Bearer ${owner.token}`);
    expect(removed.status).toBe(200);

    const after = await api
      .get(`/api/projects/${id}`)
      .set("Authorization", `Bearer ${member.token}`);
    expect(after.status).toBe(403);
  });

  test("rejects unknown user with 404", async () => {
    const created = await createProject(owner.token);
    const res = await api
      .post(`/api/projects/${created.body.data.id}/members`)
      .set("Authorization", `Bearer ${owner.token}`)
      .send({ userId: "no-such-user" });
    expect(res.status).toBe(404);
  });
});
