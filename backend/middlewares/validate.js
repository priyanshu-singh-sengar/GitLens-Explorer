function validate(schema, source = "body") {
  return (req, res, next) => {
    try {
      const result = schema.safeParse(req[source]);

      if (!result.success) {
        return res.status(400).json({
          success: false,
          message: result.error.issues[0].message
        });
      }

      req[source] = result.data;

      next();

    } catch (err) {
      next(err); // VERY IMPORTANT
    }
  };
}

module.exports = validate;