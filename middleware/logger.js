/**
 * Request Logging Middleware
 * Logs incoming requests with method, URL, status and response time.
 * Controlled by the LOG_REQUESTS environment variable.
 */

const requestLogger = (req, res, next) => {
  if (String(process.env.LOG_REQUESTS).toLowerCase() !== "true") {
    return next();
  }

  const startTime = Date.now();
  const timestamp = new Date().toISOString();

  console.log(`[${timestamp}] --> ${req.method} ${req.originalUrl}`);

  const originalSend = res.send;
  res.send = function (data) {
    const responseTime = Date.now() - startTime;
    console.log(
      `[${new Date().toISOString()}] <-- ${req.method} ${req.originalUrl} ${res.statusCode} (${responseTime}ms)`
    );
    res.send = originalSend;
    return res.send(data);
  };

  next();
};

module.exports = requestLogger;
