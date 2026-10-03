/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: "node",
  testMatch: ["**/tests/**/*.test.js"],
  verbose: true,
  // Requests go to a remote Neon database (~500ms round trip),
  // so the default 5s timeout is far too low.
  testTimeout: 60000,
  setupFiles: ["<rootDir>/tests/setup.js"],
  // Prisma keeps a connection pool open after the run.
  forceExit: true,
  // Tests share one database and truncate between runs.
  maxWorkers: 1,
};
