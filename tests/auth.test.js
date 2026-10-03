/**
 * Authentication tests: register, login, /me, token validation.
 */
const request = require("supertest");
const app = require("../app");
const { resetDb, uniqueEmail } = require("./helpers");

const api = request(app);

beforeEach(async () => {
  await resetDb();
});

describe("POST /api/auth/register", () => {
  test("first registered user becomes ADMIN and receives a token", async () => {
    const res = await api
      .post("/api/auth/register")
      .send({ name: "Salman", email: uniqueEmail("admin"), password: "secret123" });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.role).toBe("ADMIN");
    expect(res.body.data.user).not.toHaveProperty("password");
    expect(res.body.data.token).toBeDefined();
  });

  test("subsequent users are assigned MEMBER", async () => {
    await api
      .post("/api/auth/register")
      .send({ name: "Admin", email: uniqueEmail("admin"), password: "secret123" });

    const res = await api
      .post("/api/auth/register")
      .send({ name: "Member", email: uniqueEmail("member"), password: "secret123" });

    expect(res.status).toBe(201);
    expect(res.body.data.user.role).toBe("MEMBER");
  });

  test("rejects duplicate email with 409", async () => {
    const email = uniqueEmail("dup");
    await api
      .post("/api/auth/register")
      .send({ name: "First", email, password: "secret123" });

    const res = await api
      .post("/api/auth/register")
      .send({ name: "Second", email, password: "secret123" });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
  });

  test("rejects missing fields with 400", async () => {
    const res = await api.post("/api/auth/register").send({ email: uniqueEmail() });
    expect(res.status).toBe(400);
  });

  test("rejects invalid email with 400", async () => {
    const res = await api
      .post("/api/auth/register")
      .send({ name: "X", email: "not-an-email", password: "secret123" });
    expect(res.status).toBe(400);
  });

  test("rejects short password with 400", async () => {
    const res = await api
      .post("/api/auth/register")
      .send({ name: "X", email: uniqueEmail(), password: "123" });
    expect(res.status).toBe(400);
  });
});

describe("POST /api/auth/login", () => {
  test("logs in with correct credentials", async () => {
    const email = uniqueEmail("login");
    await api
      .post("/api/auth/register")
      .send({ name: "Login User", email, password: "secret123" });

    const res = await api.post("/api/auth/login").send({ email, password: "secret123" });
    expect(res.status).toBe(200);
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.user.email).toBe(email);
  });

  test("rejects wrong password with 401", async () => {
    const email = uniqueEmail("login");
    await api
      .post("/api/auth/register")
      .send({ name: "Login User", email, password: "secret123" });

    const res = await api.post("/api/auth/login").send({ email, password: "wrongpass" });
    expect(res.status).toBe(401);
  });

  test("rejects unknown email with 401", async () => {
    const res = await api
      .post("/api/auth/login")
      .send({ email: uniqueEmail("ghost"), password: "secret123" });
    expect(res.status).toBe(401);
  });
});

describe("GET /api/auth/me", () => {
  test("returns current user with a valid token", async () => {
    const email = uniqueEmail("me");
    const reg = await api
      .post("/api/auth/register")
      .send({ name: "Me User", email, password: "secret123" });

    const res = await api
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${reg.body.data.token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.email).toBe(email);
    expect(res.body.data).not.toHaveProperty("password");
  });

  test("rejects missing token with 401", async () => {
    const res = await api.get("/api/auth/me");
    expect(res.status).toBe(401);
  });

  test("rejects malformed token with 401", async () => {
    const res = await api.get("/api/auth/me").set("Authorization", "Bearer garbage.token.here");
    expect(res.status).toBe(401);
  });
});
