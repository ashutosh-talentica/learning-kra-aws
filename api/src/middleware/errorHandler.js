function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode || 500;
  const errorCode = err.code || (statusCode === 404 ? 'NOT_FOUND' : statusCode === 400 ? 'VALIDATION_ERROR' : 'INTERNAL_SERVER_ERROR');

  const logPayload = {
    level: 'error',
    timestamp: new Date().toISOString(),
    service: 'task-api',
    requestId: req.id,
    statusCode,
    errorCode,
    message: err.message,
  };

  console.error(JSON.stringify(logPayload));

  res.status(statusCode).json({
    error: {
      code: errorCode,
      message: statusCode === 500 ? 'An unexpected internal error occurred' : err.message,
      requestId: req.id,
    },
  });
}

module.exports = errorHandler;
