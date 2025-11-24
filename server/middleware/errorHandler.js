const logger = require('../utils/logger');

const errorHandler = (err, req, res, next) => {
  const status = err.status || 500;
  const message = err.message || 'Internal Server Error';

  logger.error({
    status,
    message,
    path: req.path,
    method: req.method,
    stack: err.stack
  });

  const isDevelopment = process.env.NODE_ENV === 'development';

  res.status(status).json({
    success: false,
    message: isDevelopment ? message : 'An error occurred',
    ...(isDevelopment && { stack: err.stack })
  });
};

module.exports = errorHandler;
