import { Router } from "express";
import mongoose from "mongoose";
import catchAsyncErrors from "../middleware/catchAsyncErrors.js";
import ErrorHandler from "../utils/ErrorHandler.js";
import { Product } from "../models/product.model.js";
import axios from "axios";
const router = Router();

router.get(
  "/init_db",
  catchAsyncErrors(async (req, res, next) => {
    try {
      const { data } = await axios.get(
        "https://s3.amazonaws.com/roxiler.com/product_transaction.json"
      );
      if (!data) {
        return next(new ErrorHandler("No product available", 400));
      }

      // Attempt to insert the data into MongoDB
      await Product.insertMany(data);

      res.status(200).json({
        success: true,
        message: "Data successfully inserted",
      });
    } catch (error) {
      console.error("Error during data insertion:", error);
      return next(new ErrorHandler("Failed to insert data into database", 500));
    }
  })
);

//get product
router.get(
  "/getProduct",
  catchAsyncErrors(async (req, res, next) => {
    const { search = "", page = 1, per_page = 10, month } = req.query;

    const pageNum = parseInt(page, 10);
    const limit = parseInt(per_page, 10);
    const skip = (pageNum - 1) * limit;

    let query = {};

    if (month) {
      const monthNum = parseInt(month, 10);
      if (isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
        return next(
          new ErrorHandler(
            "Invalid month parameter. Please provide a value between 1 and 12.",
            400
          )
        );
      }

      query.$expr = { $eq: [{ $month: "$dateOfSale" }, monthNum] };
    }

    if (search) {
      const searchRegex = new RegExp(search, "i"); // Case-insensitive regex for matching
      const parsedPrice = parseFloat(search);

      query.$or = [
        { title: { $regex: searchRegex } },
        { description: { $regex: searchRegex } },
      ];

      if (!isNaN(parsedPrice)) {
        query.$or.push({ price: parsedPrice });
      }
    }

    try {
      const products = await Product.find(query).skip(skip).limit(limit);

      const totalProducts = await Product.countDocuments(query);
      const totalPages = Math.ceil(totalProducts / limit);

      if (!products || products.length === 0) {
        return next(new ErrorHandler("No products available", 404));
      }

      res.status(200).json({
        success: true,
        page: pageNum,
        per_page: limit,
        total_pages: totalPages,
        total_products: totalProducts,
        products,
      });
    } catch (error) {
      return next(
        new ErrorHandler("Failed to fetch products from database", 500)
      );
    }
  })
);
//statistics
router.get(
  "/statistics",
  catchAsyncErrors(async (req, res, next) => {
    console.log(req.query);
    const { month } = req.query;

    // Validate the month parameter
    const monthNum = parseInt(month, 10);
    if (isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
      return next(
        new ErrorHandler(
          "Invalid month parameter. Please provide a value between 1 and 12.",
          400
        )
      );
    }

    try {
      const salesStats = await Product.aggregate([
        {
          $match: {
            $expr: {
              $eq: [{ $month: "$dateOfSale" }, monthNum],
            },
          },
        },
        {
          $group: {
            _id: null,
            totalSales: { $sum: "$price" },
            totalSoldItems: { $sum: 1 },
          },
        },
      ]);

      const totalSoldItems =
        salesStats.length > 0 ? salesStats[0].totalSoldItems : 0;
      const totalSalesAmount =
        salesStats.length > 0 ? salesStats[0].totalSales : 0;

      const totalItems = await Product.countDocuments({});
      const totalNotSoldItems = totalItems - totalSoldItems;
      res.status(200).json({
        success: true,
        totalSales: totalSalesAmount,
        totalSoldItems: totalSoldItems,
        totalNotSoldItems: totalNotSoldItems,
      });
    } catch (error) {
      return next(
        new ErrorHandler("Failed to fetch statistics from the database", 500)
      );
    }
  })
);
//bar chart
router.get(
  "/sales-statistics",
  catchAsyncErrors(async (req, res, next) => {
    const { month } = req.query;

    // Validate month parameter
    const monthNum = parseInt(month, 10);
    if (isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
      return next(
        new ErrorHandler(
          "Invalid month parameter. Please provide a value between 1 and 12.",
          400
        )
      );
    }

    try {
      const priceRanges = [
        { min: 0, max: 100 },
        { min: 101, max: 200 },
        { min: 201, max: 300 },
        { min: 301, max: 400 },
        { min: 401, max: 500 },
        { min: 501, max: 600 },
        { min: 601, max: 700 },
        { min: 701, max: 800 },
        { min: 801, max: 900 },
        { min: 901, max: Infinity },
      ];

      const matchStage = {
        $expr: {
          $eq: [{ $month: "$dateOfSale" }, monthNum],
        },
      };

      const groupStage = {
        $group: {
          _id: {
            $cond: [
              { $lte: ["$price", 100] },
              "0 - 100",
              {
                $cond: [
                  { $lte: ["$price", 200] },
                  "101 - 200",
                  {
                    $cond: [
                      { $lte: ["$price", 300] },
                      "201 - 300",
                      {
                        $cond: [
                          { $lte: ["$price", 400] },
                          "301 - 400",
                          {
                            $cond: [
                              { $lte: ["$price", 500] },
                              "401 - 500",
                              {
                                $cond: [
                                  { $lte: ["$price", 600] },
                                  "501 - 600",
                                  {
                                    $cond: [
                                      { $lte: ["$price", 700] },
                                      "601 - 700",
                                      {
                                        $cond: [
                                          { $lte: ["$price", 800] },
                                          "701 - 800",
                                          {
                                            $cond: [
                                              { $lte: ["$price", 900] },
                                              "801 - 900",
                                              "901 - above",
                                            ],
                                          },
                                        ],
                                      },
                                    ],
                                  },
                                ],
                              },
                            ],
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
            ],
          },
          totalSoldItems: { $sum: 1 },
        },
      };

      const results = await Product.aggregate([
        { $match: matchStage },
        groupStage,
        {
          $project: {
            _id: 0,
            priceRange: "$_id",
            totalSoldItems: "$totalSoldItems",
          },
        },
      ]);

      const response = priceRanges.map((range) => {
        const rangeLabel = `${range.min} - ${
          range.max === Infinity ? "above" : range.max
        }`;
        const foundRange = results.find(
          (result) => result.priceRange === rangeLabel
        );
        return {
          priceRange: rangeLabel,
          totalSoldItems: foundRange ? foundRange.totalSoldItems : 0,
        };
      });

      res.status(200).json({
        success: true,
        statistics: response,
      });
    } catch (error) {
      return next(new ErrorHandler("Failed to fetch sales statistics", 500));
    }
  })
);
//api for pie chart
router.get(
  "/pie_chart",
  catchAsyncErrors(async (req, res, next) => {
    const { month } = req.query;

    if (!month) {
      return next(new ErrorHandler("Month parameter is required", 400));
    }

    const monthNum = parseInt(month, 10);
    if (isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
      return next(new ErrorHandler("Invalid month parameter", 400));
    }

    try {
      const categoryStats = await Product.aggregate([
        {
          $match: {
            $expr: { $eq: [{ $month: "$dateOfSale" }, monthNum] },
          },
        },
        {
          $group: {
            _id: "$category",
            itemCount: { $sum: 1 },
          },
        },
        {
          $project: {
            _id: 0,
            category: "$_id",
            itemCount: 1,
          },
        },
      ]);

      if (categoryStats.length === 0) {
        return next(
          new ErrorHandler("No items found for the selected month", 404)
        );
      }

      res.status(200).json({
        success: true,
        statistics: categoryStats,
      });
    } catch (error) {
      return next(new ErrorHandler("Failed to fetch category statistics", 500));
    }
  })
);
// Function to fetch total sales statistics
const getTotalSalesStats = async (monthNum) => {
  const salesStats = await Product.aggregate([
    {
      $match: {
        $expr: {
          $eq: [{ $month: "$dateOfSale" }, monthNum],
        },
      },
    },
    {
      $group: {
        _id: null,
        totalSales: { $sum: "$price" },
        totalSoldItems: { $sum: 1 },
      },
    },
  ]);

  const totalSalesAmount = salesStats.length > 0 ? salesStats[0].totalSales : 0;
  const totalSoldItems =
    salesStats.length > 0 ? salesStats[0].totalSoldItems : 0;

  const totalNotSoldItems = await Product.countDocuments({
    $expr: {
      $ne: [{ $month: "$dateOfSale" }, monthNum],
    },
  });

  return { totalSalesAmount, totalSoldItems, totalNotSoldItems };
};
// Function to fetch sales by price range
const getSalesbarchart = async (monthNum) => {
  const priceRanges = [
    { min: 0, max: 100 },
    { min: 101, max: 200 },
    { min: 201, max: 300 },
    { min: 301, max: 400 },
    { min: 401, max: 500 },
    { min: 501, max: 600 },
    { min: 601, max: 700 },
    { min: 701, max: 800 },
    { min: 801, max: 900 },
    { min: 901, max: Infinity },
  ];

  const matchStage = {
    $expr: {
      $eq: [{ $month: "$dateOfSale" }, monthNum],
    },
  };

  const groupStage = {
    $group: {
      _id: {
        $cond: [
          { $lte: ["$price", 100] },
          "0 - 100",
          {
            $cond: [
              { $lte: ["$price", 200] },
              "101 - 200",
              {
                $cond: [
                  { $lte: ["$price", 300] },
                  "201 - 300",
                  {
                    $cond: [
                      { $lte: ["$price", 400] },
                      "301 - 400",
                      {
                        $cond: [
                          { $lte: ["$price", 500] },
                          "401 - 500",
                          {
                            $cond: [
                              { $lte: ["$price", 600] },
                              "501 - 600",
                              {
                                $cond: [
                                  { $lte: ["$price", 700] },
                                  "601 - 700",
                                  {
                                    $cond: [
                                      { $lte: ["$price", 800] },
                                      "701 - 800",
                                      {
                                        $cond: [
                                          { $lte: ["$price", 900] },
                                          "801 - 900",
                                          "901 - above",
                                        ],
                                      },
                                    ],
                                  },
                                ],
                              },
                            ],
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
      totalSoldItems: { $sum: 1 },
    },
  };

  const results = await Product.aggregate([
    { $match: matchStage },
    groupStage,
    {
      $project: {
        _id: 0,
        priceRange: "$_id",
        totalSoldItems: "$totalSoldItems",
      },
    },
  ]);

  const response = priceRanges.map((range) => {
    const rangeLabel = `${range.min} - ${
      range.max === Infinity ? "above" : range.max
    }`;
    const foundRange = results.find(
      (result) => result.priceRange === rangeLabel
    );
    return {
      priceRange: rangeLabel,
      totalSoldItems: foundRange ? foundRange.totalSoldItems : 0,
    };
  });

  return response;
};
// Function to fetch category statistics
const getCategoryStats = async (monthNum) => {
  return await Product.aggregate([
    {
      $match: {
        $expr: { $eq: [{ $month: "$dateOfSale" }, monthNum] },
      },
    },
    {
      $group: {
        _id: "$category",
        itemCount: { $sum: 1 },
      },
    },
    {
      $project: {
        _id: 0,
        category: "$_id",
        itemCount: 1,
      },
    },
  ]);
};
//combine Api
router.get(
  "/combined-stats",
  catchAsyncErrors(async (req, res, next) => {
    const { month } = req.query;

    if (!month) {
      return next(new ErrorHandler("Month parameter is required", 400));
    }

    const monthNum = parseInt(month, 10);
    if (isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
      return next(new ErrorHandler("Invalid month parameter", 400));
    }

    try {
      // Fetch data from all 3 APIs
      const totalSalesStats = await getTotalSalesStats(monthNum);
      const priceRangeStats = await getSalesbarchart(monthNum);
      const categoryStats = await getCategoryStats(monthNum);

      const combinedStats = {
        totalSalesStats,
        priceRangeStats,
        categoryStats,
      };

      res.status(200).json({
        success: true,
        combinedStats,
      });
    } catch (error) {
      return next(new ErrorHandler("Failed to fetch combined statistics", 500));
    }
  })
);
export default router;
