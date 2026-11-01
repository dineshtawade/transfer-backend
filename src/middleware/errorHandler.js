function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  console.error('[Error]', err);

  const statusCode = err.status || err.statusCode || 500;
  const message = err.message || 'Internal server error';

  res.status(statusCode).json({
    error: message,
  });
}

module.exports = { errorHandler };
