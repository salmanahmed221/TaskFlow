/**
 * User Routes (protected - admin only)
 */
const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
const { authenticate, authorize } = require("../middleware/auth");

router.use(authenticate);

// GET /api/users - ADMIN only
router.get("/", authorize("ADMIN"), userController.getAllUsers);

// GET /api/users/:id - any authenticated user
router.get("/:id", userController.getUserById);

module.exports = router;
