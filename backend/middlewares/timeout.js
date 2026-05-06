function timeout(ms) {
  return (req, res, next) => {

    const timer = setTimeout(() => {

      res.status(503).json({
        success: false,
        message: "Request timed out"
      });

    }, ms);

    res.on("finish", () => clearTimeout(timer));

    next();
  };
}

module.exports = timeout;