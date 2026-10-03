/**
 * Shared test helpers: database truncation and request builders.
 */
const prisma = require("../utils/prisma");

// Empty all TaskFlow tables (FK-safe order) so every test starts clean.
const resetDb = async () => {
  await prisma.task.deleteMany();
  await prisma.projectMember.deleteMany();
  await prisma.project.deleteMany();
  await prisma.user.deleteMany();
};

let counter = 0;
const uniqueEmail = (prefix = "user") =>
  `${prefix}.${Date.now()}.${counter++}@taskflow.test`;

// api === request(app) from supertest
const register = async (api, overrides = {}) => {
  const payload = {
    name: "Test User",
    email: uniqueEmail(),
    password: "secret123",
    ...overrides,
  };
  return api.post("/api/auth/register").send(payload);
};

const login = async (api, email, password) =>
  api.post("/api/auth/login").send({ email, password });

module.exports = { resetDb, uniqueEmail, register, login, prisma };
