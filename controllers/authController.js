/**
 * Auth Controller
 * Register / Login / Current user
 */
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const prisma = require("../utils/prisma");
const ApiError = require("../utils/ApiError");
const { sendSuccess } = require("../utils/responseHandler");

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const signToken = (user) =>
  jwt.sign({ sub: user.id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "1d",
  });

const publicUser = ({ password, ...user }) => user;

// POST /api/auth/register
const register = async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body || {};

    if (!name || !email || !password) {
      throw new ApiError(400, "Name, email and password are required");
    }
    if (!EMAIL_REGEX.test(email)) {
      throw new ApiError(400, "Please provide a valid email address");
    }
    if (String(password).length < 6) {
      throw new ApiError(400, "Password must be at least 6 characters");
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new ApiError(409, "Email already registered");
    }

    // The very first account becomes the administrator
    const userCount = await prisma.user.count();
    const assignedRole =
      userCount === 0 ? "ADMIN" : role === "ADMIN" ? "MEMBER" : role || "MEMBER";

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: await bcrypt.hash(password, 10),
        role: assignedRole,
      },
    });

    sendSuccess(
      res,
      "User registered successfully",
      { user: publicUser(user), token: signToken(user) },
      201
    );
  } catch (err) {
    next(err);
  }
};

// POST /api/auth/login
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body || {};

    if (!email || !password) {
      throw new ApiError(400, "Email and password are required");
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      throw new ApiError(401, "Invalid email or password");
    }

    sendSuccess(res, "Login successful", {
      user: publicUser(user),
      token: signToken(user),
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/auth/me   (requires authenticate middleware)
const me = async (req, res, next) => {
  try {
    sendSuccess(res, "Current user retrieved", req.user);
  } catch (err) {
    next(err);
  }
};

module.exports = { register, login, me };
