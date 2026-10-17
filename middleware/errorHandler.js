/**
 * Centralized API error handling middleware
 * Ensures secrets, tokens, and stack traces are not leaked to clients
 */
function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode || (res.statusCode !== 200 ? res.statusCode : 500);

  // Filter sensitive messages
  let clientMessage = err.message || 'An unexpected internal error occurred';
  if (clientMessage.includes('key=') || clientMessage.includes('token=')) {
    clientMessage = 'An external authentication error occurred. Please verify your API configurations.';
  }

  // Safe logging on server side
  console.error(`[Error] ${req.method} ${req.originalUrl}:`, err.message);

  res.status(statusCode).json({
    success: false,
    error: clientMessage,
    timestamp: new Date().toISOString()
  });
}

module.exports = errorHandler;
