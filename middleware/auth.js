/**
 * Authentication & Authorization middleware
 * - authenticate: validates the JWT and loads the current user
 * - authorize:    restricts a route to one or more roles
 */
const jwt = require("jsonwebtoken");
const prisma = require("../utils/prisma");
const ApiError = require("../utils/ApiError");

const authenticate = async (req, res, next) => {
  try {
    const header = req.headers.authorization || "";
    if (!header.startsWith("Bearer ")) {
      throw new ApiError(401, "Authentication required. Provide a Bearer token.");
    }

    const token = header.slice(7);
    let payload;
    try {
      payload = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      throw new ApiError(401, "Invalid or expired token");
    }

    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) {
      throw new ApiError(401, "Token belongs to a user that no longer exists");
    }

    const { password, ...safeUser } = user;
    req.user = safeUser;
    next();
  } catch (err) {
    next(err);
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new ApiError(401, "Authentication required"));
    }
    if (!roles.includes(req.user.role)) {
      return next(
        new ApiError(403, `Access denied. Requires role: ${roles.join(" or ")}`)
      );
    }
    next();
  };
};

module.exports = { authenticate, authorize };
