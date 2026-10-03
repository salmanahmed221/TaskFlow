/**
 * Error handling middleware
 * Converts operational errors (ApiError), Prisma errors and JWT errors
 * into the standard API response envelope.
 */
const ApiError = require("../utils/ApiError");

const notFound = (req, res, next) => {
  next(new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`));
};

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || "Internal server error";

  // Prisma known errors
  if (err.code && typeof err.code === "string" && err.code.startsWith("P")) {
    switch (err.code) {
      case "P2002":
        statusCode = 409;
        message = `Unique constraint failed on ${err.meta?.target || "field"}`;
        break;
      case "P2025":
        statusCode = 404;
        message = "Resource not found";
        break;
      case "P2003":
        statusCode = 400;
        message = "Related resource does not exist";
        break;
      default:
        statusCode = 400;
        message = "Database validation error";
    }
  }

  // Malformed JSON body
  if (err.type === "entity.parse.failed") {
    statusCode = 400;
    message = "Malformed JSON in request body";
  }

  if (statusCode >= 500) {
    console.error(`[${new Date().toISOString()}] ERROR`, err);
  }

  res.status(statusCode).json({
    success: false,
    message,
    data: null,
    timestamp: new Date().toISOString(),
  });
};

module.exports = { notFound, errorHandler, ApiError };
