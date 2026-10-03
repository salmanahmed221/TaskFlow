/**
 * Response Handler Utility
 * Standardizes all API responses
 */

const sendResponse = (res, statusCode, success, message, data = null) => {
  res.status(statusCode).json({
    success: success,
    message: message,
    data: data,
    timestamp: new Date().toISOString(),
  });
};

const sendSuccess = (res, message, data = null, statusCode = 200) => {
  sendResponse(res, statusCode, true, message, data);
};

const sendError = (res, message, statusCode = 500) => {
  sendResponse(res, statusCode, false, message, null);
};

module.exports = {
  sendSuccess,
  sendError,
  sendResponse,
};
