const express = require("express");
const cors = require("cors");
const { connect } = require("mongoose");
const upload = require("express-fileupload");
require("dotenv").config();
const userRoutes = require("./routes/userRoutes");
const postRoutes = require("./routes/postRoutes");
const bookmarkRoutes = require("./routes/bookmarkRoutes");
const { notFound, errorHandler } = require("./middleware/errorMiddleware");

// Require statements at the top
const app = express();

app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true,
  })
);

app.use(express.json({ extended: true }));
app.use(express.urlencoded({ extended: true }));
app.use(upload());
app.use("/uploads", express.static(__dirname + "/uploads"));
// API routes
app.use("/api/users", userRoutes);
app.use("/api/posts", postRoutes);
app.use("/api/bookmarks", bookmarkRoutes);
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
