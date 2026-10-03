/**
 * Project Controller
 * CRUD for projects plus member management.
 * Access rules: ADMIN sees everything, otherwise owner or project member.
 */
const prisma = require("../utils/prisma");
const ApiError = require("../utils/ApiError");
const { sendSuccess } = require("../utils/responseHandler");

const PROJECT_STATUSES = ["ACTIVE", "ON_HOLD", "ARCHIVED"];
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const userSelect = { select: { id: true, name: true, email: true, role: true } };

const canAccess = (user, project) =>
  user.role === "ADMIN" ||
  project.ownerId === user.id ||
  project.members.some((m) => m.userId === user.id);

const isOwnerOrAdmin = (user, project) =>
  user.role === "ADMIN" || project.ownerId === user.id;

const loadProject = async (id, user) => {
  const project = await prisma.project.findUnique({
    where: { id },
    include: { members: { include: { user: userSelect } }, owner: userSelect },
  });

  if (!project) throw new ApiError(404, "Project not found");
  if (!canAccess(user, project)) throw new ApiError(403, "You do not have access to this project");

  return project;
};

// GET /api/projects
const getAllProjects = async (req, res, next) => {
  try {
    const where =
      req.user.role === "ADMIN"
        ? {}
        : { OR: [{ ownerId: req.user.id }, { members: { some: { userId: req.user.id } } }] };

    const projects = await prisma.project.findMany({
      where,
      include: {
        owner: userSelect,
        members: { include: { user: userSelect } },
        _count: { select: { tasks: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    sendSuccess(res, "Projects retrieved successfully", projects);
  } catch (err) {
    next(err);
  }
};

// GET /api/projects/:id
const getProjectById = async (req, res, next) => {
  try {
    const project = await loadProject(req.params.id, req.user);
    const tasks = await prisma.task.findMany({
      where: { projectId: project.id },
      include: { assignee: userSelect },
      orderBy: { createdAt: "asc" },
    });

    sendSuccess(res, "Project retrieved successfully", { ...project, tasks });
  } catch (err) {
    next(err);
  }
};

// POST /api/projects
const createProject = async (req, res, next) => {
  try {
    const { name, description, status } = req.body || {};

    if (!name || !String(name).trim()) {
      throw new ApiError(400, "Project name is required");
    }
    if (status && !PROJECT_STATUSES.includes(status)) {
      throw new ApiError(400, `Status must be one of: ${PROJECT_STATUSES.join(", ")}`);
    }

    const project = await prisma.project.create({
      data: {
        name: String(name).trim(),
        description: description || null,
        status: status || "ACTIVE",
        ownerId: req.user.id,
        members: { create: { userId: req.user.id } },
      },
      include: { owner: userSelect, members: { include: { user: userSelect } } },
    });

    sendSuccess(res, "Project created successfully", project, 201);
  } catch (err) {
    next(err);
  }
};

// PUT /api/projects/:id
const updateProject = async (req, res, next) => {
  try {
    const project = await loadProject(req.params.id, req.user);
    if (!isOwnerOrAdmin(req.user, project)) {
      throw new ApiError(403, "Only the project owner or an admin can update this project");
    }

    const { name, description, status } = req.body || {};
    if (status && !PROJECT_STATUSES.includes(status)) {
      throw new ApiError(400, `Status must be one of: ${PROJECT_STATUSES.join(", ")}`);
    }

    const updated = await prisma.project.update({
      where: { id: project.id },
      data: {
        ...(name !== undefined ? { name: String(name).trim() } : {}),
        ...(description !== undefined ? { description } : {}),
        ...(status !== undefined ? { status } : {}),
      },
      include: { owner: userSelect, members: { include: { user: userSelect } } },
    });

    sendSuccess(res, "Project updated successfully", updated);
  } catch (err) {
    next(err);
  }
};

// DELETE /api/projects/:id
const deleteProject = async (req, res, next) => {
  try {
    const project = await loadProject(req.params.id, req.user);
    if (!isOwnerOrAdmin(req.user, project)) {
      throw new ApiError(403, "Only the project owner or an admin can delete this project");
    }

    await prisma.project.delete({ where: { id: project.id } });
    sendSuccess(res, "Project deleted successfully", { id: project.id });
  } catch (err) {
    next(err);
  }
};

// POST /api/projects/:id/members
const addMember = async (req, res, next) => {
  try {
    const project = await loadProject(req.params.id, req.user);
    if (!isOwnerOrAdmin(req.user, project)) {
      throw new ApiError(403, "Only the project owner or an admin can manage members");
    }

    const { userId, email } = req.body || {};
    if (!userId && !email) {
      throw new ApiError(400, "userId or email is required");
    }
    if (email && !EMAIL_REGEX.test(email)) {
      throw new ApiError(400, "Please provide a valid email address");
    }

    const target = userId
      ? await prisma.user.findUnique({ where: { id: userId } })
      : await prisma.user.findUnique({ where: { email } });
    if (!target) throw new ApiError(404, "User not found");

    const targetId = target.id;
    if (project.ownerId === targetId) {
      throw new ApiError(400, "The project owner is already part of the project");
    }
    if (project.members.some((m) => m.userId === targetId)) {
      throw new ApiError(409, "User is already a member of this project");
    }

    await prisma.projectMember.create({ data: { projectId: project.id, userId: targetId } });

    const members = await prisma.projectMember.findMany({
      where: { projectId: project.id },
      include: { user: userSelect },
    });

    sendSuccess(res, "Member added successfully", members, 201);
  } catch (err) {
    next(err);
  }
};

// DELETE /api/projects/:id/members/:userId
const removeMember = async (req, res, next) => {
  try {
    const project = await loadProject(req.params.id, req.user);
    if (!isOwnerOrAdmin(req.user, project)) {
      throw new ApiError(403, "Only the project owner or an admin can manage members");
    }

    const { userId } = req.params;
    if (project.ownerId === userId) {
      throw new ApiError(400, "The project owner cannot be removed");
    }

    const existing = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId: project.id, userId } },
    });
    if (!existing) throw new ApiError(404, "Member not found in this project");

    await prisma.projectMember.delete({ where: { id: existing.id } });
    sendSuccess(res, "Member removed successfully", { projectId: project.id, userId });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getAllProjects,
  getProjectById,
  createProject,
  updateProject,
  deleteProject,
  addMember,
  removeMember,
};
