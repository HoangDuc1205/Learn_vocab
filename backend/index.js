require("dotenv").config();
const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");

const authRoutes = require("./routes/authRoutes");
const vocabularyRoutes = require("./routes/vocabularyRoutes");

const app = express();
const PORT = process.env.PORT || 5000;

// Connect to Database
connectDB();

// Middleware
app.use(cors());
app.use(express.json({ limit: "50mb" })); // Support large JSON payload for bulk vocab sync
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/vocabulary", vocabularyRoutes);

// Root Endpoint
app.get("/", (req, res) => {
  res.send("QuizLearn API Server is running...");
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: "Lỗi máy chủ nội bộ" });
});

// Start Server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});