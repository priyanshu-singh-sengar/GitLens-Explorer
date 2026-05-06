const crypto = require("crypto");

function requestId(req, res, next) {
  req.id = crypto.randomUUID();
  next();
}

module.exports = requestId;