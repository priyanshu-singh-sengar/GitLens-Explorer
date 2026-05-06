function errorHandler(err, req, res, next) {

  console.error(`[${req.id}]`, err.message);

  res.status(err.status || 500).json({
    success: false,
    requestId: req.id,
    message: err.message || "Internal Server Error"
  });
}

module.exports = errorHandler;