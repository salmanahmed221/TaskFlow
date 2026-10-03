/**
 * Express application setup.
 * Kept separate from index.js so tests can import the app without listening.
 * Also serves the built React frontend so the whole app runs on one URL.
 */
require("dotenv").config();
const path = require("path");
const fs = require("fs");
const express = require("express");
const cors = require("cors");
const requestLogger = require("./middleware/logger");
const { notFound, errorHandler } = require("./middleware/errorHandler");

const authRoutes = require("./routes/auth");
const userRoutes = require("./routes/users");
const projectRoutes = require("./routes/projects");
const taskRoutes = require("./routes/tasks");

const app = express();
const NODE_ENV = process.env.NODE_ENV || "development";

// ==================== MIDDLEWARE ====================
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "http://localhost:5173",
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(requestLogger);

// ==================== API ROUTES ====================

// Health check
app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "TaskFlow API is running",
    version: process.env.API_VERSION || "v1",
    environment: NODE_ENV,
    timestamp: new Date().toISOString(),
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/tasks", taskRoutes);

// ==================== FRONTEND (single URL deployment) ====================
const distPath = path.join(__dirname, "frontend", "dist");

if (fs.existsSync(distPath)) {
  // Static assets (JS/CSS/images) - Express 5 route patterns
  app.use(express.static(distPath));

  // SPA fallback: every non-API GET request returns index.html
  // so React Router can handle client-side routes like /projects/abc.
  app.get(/^\/(?!api\/).*/, (req, res) => {
    res.sendFile(path.join(distPath, "index.html"));
  });
} else {
  // Frontend not built yet - keep the JSON health check at the root.
  app.get("/", (req, res) => {
    res.json({
      success: true,
      message: "TaskFlow API is running",
      version: process.env.API_VERSION || "v1",
      environment: NODE_ENV,
      timestamp: new Date().toISOString(),
    });
  });
}

// ==================== ERRORS ====================
app.use(notFound);
app.use(errorHandler);

module.exports = app;
