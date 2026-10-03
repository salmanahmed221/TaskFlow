/**
 * TaskFlow API - Phase 1 Demo Assignment
 * Authentication, Authorization and Middleware
 *
 * Developer: Salman Ahmed
 * Registration: AUG26-BE24-16
 */

const app = require("./app");

const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || "development";

app.listen(PORT, () => {
  console.log("\n" + "=".repeat(60));
  console.log("🚀 TaskFlow API Started");
  console.log("=".repeat(60));
  console.log(`📌 Server running on: http://localhost:${PORT}`);
  console.log(`📝 Environment: ${NODE_ENV}`);
  console.log(`📋 API Version: ${process.env.API_VERSION || "v1"}`);
  console.log("=".repeat(60));
  console.log("\n📚 Available Routes:");
  console.log("  GET    /                          - Health check");
  console.log("  POST   /api/auth/register         - Register a new user");
  console.log("  POST   /api/auth/login            - Login");
  console.log("  GET    /api/auth/me               - Current user");
  console.log("  GET    /api/users                 - List users (ADMIN)");
  console.log("  GET    /api/users/:id             - Get user");
  console.log("  GET    /api/projects              - List my projects");
  console.log("  POST   /api/projects              - Create project");
  console.log("  GET    /api/projects/:id          - Get project");
  console.log("  PUT    /api/projects/:id          - Update project");
  console.log("  DELETE /api/projects/:id          - Delete project");
  console.log("  POST   /api/projects/:id/members  - Add member");
  console.log("  DELETE /api/projects/:id/members/:userId - Remove member");
  console.log("  GET    /api/projects/:id/tasks    - List tasks");
  console.log("  POST   /api/projects/:id/tasks    - Create task");
  console.log("  GET    /api/tasks/:id             - Get task");
  console.log("  PUT    /api/tasks/:id             - Update task");
  console.log("  DELETE /api/tasks/:id             - Delete task");
  console.log("=".repeat(60) + "\n");
});
