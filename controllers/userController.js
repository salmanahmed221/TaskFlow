/**
 * User Controller
 * Admin-only listing of registered users.
 */
const prisma = require("../utils/prisma");
const { sendSuccess, sendError } = require("../utils/responseHandler");

// GET /api/users  (ADMIN only)
const getAllUsers = async (req, res, next) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        _count: { select: { ownedProjects: true, assignedTasks: true } },
      },
      orderBy: { createdAt: "asc" },
    });

    sendSuccess(res, "Users retrieved successfully", users);
  } catch (err) {
    next(err);
  }
};

// GET /api/users/:id
const getUserById = async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });

    if (!user) {
      return sendError(res, "User not found", 404);
    }

    sendSuccess(res, "User retrieved successfully", user);
  } catch (err) {
    next(err);
  }
};

module.exports = { getAllUsers, getUserById };
