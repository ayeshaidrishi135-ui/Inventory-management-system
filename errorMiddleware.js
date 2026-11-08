const errorMiddleware = (err, req, res, next) => {
  console.error(err);

  let statusCode = err.statusCode || 500;
  let message = err.message || "Internal Server Error";

  // Duplicate SKU error
  if (err.code === 11000) {
    statusCode = 400;
    message = "SKU already exists";
  }

  // Mongoose validation error
  if (err.name === "ValidationError") {
    statusCode = 400;
    message = Object.values(err.errors)
      .map((error) => error.message)
      .join(", ");
  }

  // Invalid MongoDB ID
  if (err.name === "CastError") {
    statusCode = 400;
    message = "Invalid product ID";
  }

  res.status(statusCode).json({
    success: false,
    message
  });
};

module.exports = errorMiddleware;