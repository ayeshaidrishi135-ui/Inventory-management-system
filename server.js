require("dotenv").config();

const express = require("express");
const connectDB = require("./config/db");
const productRoutes = require("./routes/productRoutes");
const errorMiddleware = require("./middleware/errorMiddleware");

const app = express();

// Middleware
app.use(express.json());

// Home route
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Inventory Management System API is running"
  });
});

// Product routes
app.use("/api/products", productRoutes);

// Unknown route
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found"
  });
});

// Error handling
app.use(errorMiddleware);

// Start server after database connection
const startServer = async () => {
  try {
    await connectDB();

    const PORT = process.env.PORT || 5000;

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Server startup failed:", error.message);
    process.exit(1);
  }
};

startServer();