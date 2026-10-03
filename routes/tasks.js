/**
 * Task Routes (protected)
 */
const express = require("express");
const router = express.Router();
const taskController = require("../controllers/taskController");
const { authenticate } = require("../middleware/auth");

router.use(authenticate);

// GET /api/tasks/:id
router.get("/:id", taskController.getTaskById);

// PUT /api/tasks/:id
router.put("/:id", taskController.updateTask);

// DELETE /api/tasks/:id (project owner/admin)
router.delete("/:id", taskController.deleteTask);

module.exports = router;
