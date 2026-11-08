const express = require("express");
const mongoose = require("mongoose");
const Product = require("../models/Product");

const router = express.Router();

// 1. CREATE PRODUCT
router.post("/", async (req, res, next) => {
  try {
    const product = await Product.create(req.body);

    res.status(201).json({
      success: true,
      message: "Product created successfully",
      product
    });
  } catch (error) {
    next(error);
  }
});

// 2. GET ALL PRODUCTS
// Filtering, searching, sorting and pagination
router.get("/", async (req, res, next) => {
  try {
    const {
      search,
      category,
      sort = "createdAt",
      order = "desc"
    } = req.query;

    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(
      100,
      Math.max(1, parseInt(req.query.limit) || 10)
    );

    const filter = {};

    if (category) {
      filter.category = category;
    }

    if (search) {
      const safeSearch = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

      filter.$or = [
        { name: { $regex: safeSearch, $options: "i" } },
        { sku: { $regex: safeSearch, $options: "i" } },
        { supplier: { $regex: safeSearch, $options: "i" } }
      ];
    }

    const allowedSortFields = [
      "name",
      "price",
      "quantity",
      "createdAt"
    ];

    const sortField = allowedSortFields.includes(sort)
      ? sort
      : "createdAt";

    const sortOrder = order.toLowerCase() === "asc" ? 1 : -1;

    const total = await Product.countDocuments(filter);

    const products = await Product.find(filter)
      .sort({ [sortField]: sortOrder })
      .skip((page - 1) * limit)
      .limit(limit);

    res.status(200).json({
      success: true,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      products
    });
  } catch (error) {
    next(error);
  }
});

// 3. LOW STOCK REPORT
router.get("/low-stock", async (req, res, next) => {
  try {
    const products = await Product.find({
      $expr: {
        $lte: ["$quantity", "$reorderLevel"]
      }
    }).sort({ quantity: 1 });

    res.status(200).json({
      success: true,
      count: products.length,
      lowStockItems: products
    });
  } catch (error) {
    next(error);
  }
});

// 4. CATEGORY-WISE INVENTORY SUMMARY
router.get("/summary", async (req, res, next) => {
  try {
    const summary = await Product.aggregate([
      {
        $group: {
          _id: "$category",

          totalItems: {
            $sum: 1
          },

          totalQuantity: {
            $sum: "$quantity"
          },

          totalStockValue: {
            $sum: {
              $multiply: ["$price", "$quantity"]
            }
          },

          avgPrice: {
            $avg: "$price"
          }
        }
      },
      {
        $sort: {
          _id: 1
        }
      }
    ]);

    res.status(200).json({
      success: true,
      categories: summary.length,
      summary
    });
  } catch (error) {
    next(error);
  }
});

// 5. GET SINGLE PRODUCT BY ID
router.get("/:id", async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found"
      });
    }

    res.status(200).json({
      success: true,
      product
    });
  } catch (error) {
    next(error);
  }
});

// 6. UPDATE PRODUCT
router.put("/:id", async (req, res, next) => {
  try {
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true
      }
    );

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found"
      });
    }

    res.status(200).json({
      success: true,
      message: "Product updated successfully",
      product
    });
  } catch (error) {
    next(error);
  }
});

// 7. DELETE PRODUCT
router.delete("/:id", async (req, res, next) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found"
      });
    }

    res.status(200).json({
      success: true,
      message: "Product deleted",
      id: product._id
    });
  } catch (error) {
    next(error);
  }
});

// 8. INCREASE / DECREASE STOCK
router.patch("/:id/stock", async (req, res, next) => {
  try {
    const change = Number(req.body.change);

    if (!Number.isSafeInteger(change) || change === 0) {
      return res.status(400).json({
        success: false,
        message: "Change must be a non-zero whole number"
      });
    }

    const filter = {
      _id: req.params.id
    };

    // Prevent stock from becoming negative
    if (change < 0) {
      filter.quantity = {
        $gte: Math.abs(change)
      };
    }

    const product = await Product.findOneAndUpdate(
      filter,
      {
        $inc: {
          quantity: change
        }
      },
      {
        new: true
      }
    );

    if (!product) {
      const exists = await Product.exists({
        _id: req.params.id
      });

      return res.status(exists ? 400 : 404).json({
        success: false,
        message: exists
          ? "Insufficient stock"
          : "Product not found"
      });
    }

    res.status(200).json({
      success: true,
      message: "Stock updated successfully",
      product
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;