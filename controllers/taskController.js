/**
 * Task Controller
 * Tasks live inside projects.
 * Any member with project access can read/create/update tasks,
 * only the project owner or an admin can delete them.
 */
const prisma = require("../utils/prisma");
const ApiError = require("../utils/ApiError");
const { sendSuccess } = require("../utils/responseHandler");

const TASK_STATUSES = ["TODO", "IN_PROGRESS", "DONE"];
const TASK_PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"];

const userSelect = { select: { id: true, name: true, email: true, role: true } };

const canAccess = (user, project) =>
  user.role === "ADMIN" ||
  project.ownerId === user.id ||
  project.members.some((m) => m.userId === user.id);

const loadProject = async (id, user) => {
  const project = await prisma.project.findUnique({
    where: { id },
    include: { members: true },
  });
  if (!project) throw new ApiError(404, "Project not found");
  if (!canAccess(user, project)) throw new ApiError(403, "You do not have access to this project");
  return project;
};

const loadTask = async (id, user) => {
  const task = await prisma.task.findUnique({
    where: { id },
    include: { project: { include: { members: true } }, assignee: userSelect },
  });
  if (!task) throw new ApiError(404, "Task not found");
  if (!canAccess(user, task.project)) {
    throw new ApiError(403, "You do not have access to this task");
  }
  return task;
};

const validateTaskInput = (body, partial = false) => {
  const { title, status, priority, dueDate } = body || {};
  const errors = [];

  if (!partial && (!title || !String(title).trim())) errors.push("title is required");
  if (title !== undefined && !String(title).trim()) errors.push("title cannot be empty");
  if (status !== undefined && !TASK_STATUSES.includes(status)) {
    errors.push(`status must be one of: ${TASK_STATUSES.join(", ")}`);
  }
  if (priority !== undefined && !TASK_PRIORITIES.includes(priority)) {
    errors.push(`priority must be one of: ${TASK_PRIORITIES.join(", ")}`);
  }
  if (dueDate !== undefined && dueDate !== null && isNaN(Date.parse(dueDate))) {
    errors.push("dueDate must be a valid date");
  }

  if (errors.length) throw new ApiError(400, errors.join("; "));
};

// GET /api/projects/:projectId/tasks
const getTasksByProject = async (req, res, next) => {
  try {
    const project = await loadProject(req.params.projectId, req.user);
    const { status } = req.query;

    const tasks = await prisma.task.findMany({
      where: {
        projectId: project.id,
        ...(status ? { status } : {}),
      },
      include: { assignee: userSelect },
      orderBy: [{ createdAt: "asc" }],
    });

    sendSuccess(res, "Tasks retrieved successfully", tasks);
  } catch (err) {
    next(err);
  }
};

// POST /api/projects/:projectId/tasks
const createTask = async (req, res, next) => {
  try {
    const project = await loadProject(req.params.projectId, req.user);
    const { title, description, status, priority, dueDate, assigneeId } = req.body || {};

    validateTaskInput(req.body);

    if (assigneeId) {
      const assignee = await prisma.user.findUnique({
        where: { id: assigneeId },
        include: { memberships: true },
      });
      if (!assignee) throw new ApiError(404, "Assignee user not found");

      const isParticipant =
        project.ownerId === assigneeId ||
        project.members.some((m) => m.userId === assigneeId);
      if (!isParticipant) {
        throw new ApiError(400, "Assignee must be the project owner or a project member");
      }
    }

    const task = await prisma.task.create({
      data: {
        title: String(title).trim(),
        description: description || null,
        status: status || "TODO",
        priority: priority || "MEDIUM",
        dueDate: dueDate ? new Date(dueDate) : null,
        projectId: project.id,
        assigneeId: assigneeId || null,
      },
      include: { assignee: userSelect },
    });

    sendSuccess(res, "Task created successfully", task, 201);
  } catch (err) {
    next(err);
  }
};

// GET /api/tasks/:id
const getTaskById = async (req, res, next) => {
  try {
    const task = await loadTask(req.params.id, req.user);
    sendSuccess(res, "Task retrieved successfully", task);
  } catch (err) {
    next(err);
  }
};

// PUT /api/tasks/:id
const updateTask = async (req, res, next) => {
  try {
    const task = await loadTask(req.params.id, req.user);
    validateTaskInput(req.body, true);

    const { title, description, status, priority, dueDate, assigneeId } = req.body || {};

    if (assigneeId) {
      const isParticipant =
        task.project.ownerId === assigneeId ||
        task.project.members.some((m) => m.userId === assigneeId);
      if (!isParticipant) {
        throw new ApiError(400, "Assignee must be the project owner or a project member");
      }
    }

    const updated = await prisma.task.update({
      where: { id: task.id },
      data: {
        ...(title !== undefined ? { title: String(title).trim() } : {}),
        ...(description !== undefined ? { description } : {}),
        ...(status !== undefined ? { status } : {}),
        ...(priority !== undefined ? { priority } : {}),
        ...(dueDate !== undefined ? { dueDate: dueDate ? new Date(dueDate) : null } : {}),
        ...(assigneeId !== undefined ? { assigneeId } : {}),
      },
      include: { assignee: userSelect },
    });

    sendSuccess(res, "Task updated successfully", updated);
  } catch (err) {
    next(err);
  }
};

// DELETE /api/tasks/:id
const deleteTask = async (req, res, next) => {
  try {
    const task = await loadTask(req.params.id, req.user);

    const isOwnerOrAdmin =
      req.user.role === "ADMIN" || task.project.ownerId === req.user.id;
    if (!isOwnerOrAdmin) {
      throw new ApiError(403, "Only the project owner or an admin can delete tasks");
    }

    await prisma.task.delete({ where: { id: task.id } });
    sendSuccess(res, "Task deleted successfully", { id: task.id });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getTasksByProject,
  createTask,
  getTaskById,
  updateTask,
  deleteTask,
};
