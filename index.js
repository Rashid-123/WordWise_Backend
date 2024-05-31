const express = require("express");
const cors = require("cors");
const { connect } = require("mongoose");
const upload = require("express-fileupload");
require("dotenv").config();
const userRoutes = require("./routes/userRoutes");
const postRoutes = require("./routes/postRoutes");
const adminRoutes = require("./routes/adminRoutes");
const { notFound, errorHandler } = require("./middleware/errorMiddleware");

// Require statements at the top
const app = express();

const allowedOrigins = [
  "http://localhost:3000", // Development environment
  "https://word-wise-frontend.vercel.app", // Vercel domain
];

const corsOptions = {
  origin: allowedOrigins,
  credentials: true, // Allow cookies to be sent with requests
};

app.use(cors(corsOptions));

app.use(express.json({ extended: true }));
app.use(express.urlencoded({ extended: true }));
app.use(upload());
app.use("/uploads", express.static(__dirname + "/uploads"));
// API routes
app.use("/api/users", userRoutes);
app.use("/api/posts", postRoutes);
// app.use("/api/bookmarks", bookmarkRoutes);
app.use("/api/admin", adminRoutes);
// Error handling middleware
app.use(notFound);
app.use(errorHandler);

// Database connection and server listening
connect(process.env.MONGO_URI)
  .then(() => {
    app.listen(5000, () => {
      console.log(`Server started on port ${process.env.PORT || 5000}`);
    });
  })
  .catch((error) => {
    console.error("Database connection error:", error);
  });
