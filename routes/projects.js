/**
 * Project Routes (protected)
 */
const express = require("express");
const router = express.Router();
const projectController = require("../controllers/projectController");
const taskController = require("../controllers/taskController");
const { authenticate } = require("../middleware/auth");

router.use(authenticate);

// GET /api/projects - list accessible projects
router.get("/", projectController.getAllProjects);

// POST /api/projects - create (any authenticated user)
router.post("/", projectController.createProject);

// GET /api/projects/:id
router.get("/:id", projectController.getProjectById);

// PUT /api/projects/:id (owner/admin)
router.put("/:id", projectController.updateProject);

// DELETE /api/projects/:id (owner/admin)
router.delete("/:id", projectController.deleteProject);

// POST /api/projects/:id/members (owner/admin)
router.post("/:id/members", projectController.addMember);

// DELETE /api/projects/:id/members/:userId (owner/admin)
router.delete("/:id/members/:userId", projectController.removeMember);

// Nested tasks
// GET /api/projects/:projectId/tasks
router.get("/:projectId/tasks", taskController.getTasksByProject);

// POST /api/projects/:projectId/tasks
router.post("/:projectId/tasks", taskController.createTask);

module.exports = router;
