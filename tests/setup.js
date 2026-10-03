/**
 * Runs before each test file is loaded.
 * Keeps the test output readable by disabling the request logger.
 */
process.env.LOG_REQUESTS = "false";
process.env.NODE_ENV = "test";
