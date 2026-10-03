/**
 * Role-based access control tests (ADMIN vs MEMBER).
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

beforeEach(async () => {
  await resetDb();
});

describe("Role based access", () => {
  test("ADMIN can list all users, MEMBER cannot", async () => {
    const admin = await signup("Admin", uniqueEmail("admin"));
    const member = await signup("Member", uniqueEmail("member"));

    const allowed = await api
      .get("/api/users")
      .set("Authorization", `Bearer ${admin.token}`);
    expect(allowed.status).toBe(200);
    expect(allowed.body.data.length).toBe(2);

    const denied = await api
      .get("/api/users")
      .set("Authorization", `Bearer ${member.token}`);
    expect(denied.status).toBe(403);
    expect(denied.body.message).toMatch(/ADMIN/);
  });

  test("unauthenticated request to /api/users gets 401", async () => {
    const res = await api.get("/api/users");
    expect(res.status).toBe(401);
  });

  test("authenticated users can fetch any user profile by id", async () => {
    const admin = await signup("Admin", uniqueEmail("admin"));
    const member = await signup("Member", uniqueEmail("member"));

    const res = await api
      .get(`/api/users/${member.user.id}`)
      .set("Authorization", `Bearer ${admin.token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.email).toBe(member.user.email);
  });

  test("non-existent user id returns 404", async () => {
    const admin = await signup("Admin", uniqueEmail("admin"));
    const res = await api
      .get("/api/users/does-not-exist")
      .set("Authorization", `Bearer ${admin.token}`);
    expect(res.status).toBe(404);
  });

  test("ADMIN can open any project, MEMBER only their own", async () => {
    const admin = await signup("Admin", uniqueEmail("admin"));
    const member = await signup("Member", uniqueEmail("member"));

    const created = await api
      .post("/api/projects")
      .set("Authorization", `Bearer ${member.token}`)
      .send({ name: "Member Project" });
    const projectId = created.body.data.id;

    const adminView = await api
      .get(`/api/projects/${projectId}`)
      .set("Authorization", `Bearer ${admin.token}`);
    expect(adminView.status).toBe(200);

    const otherMember = await signup("Other", uniqueEmail("other"));
    const denied = await api
      .get(`/api/projects/${projectId}`)
      .set("Authorization", `Bearer ${otherMember.token}`);
    expect(denied.status).toBe(403);
  });
});
