const express = require("express");
const cors = require("cors");
const { connect } = require("mongoose");
const upload = require("express-fileupload");
require("dotenv").config();
const userRoutes = require("./routes/userRoutes");
const postRoutes = require("./routes/postRoutes");
const { notFound, errorHandler } = require("./middleware/errorMiddleware");

// Require statements at the top
const app = express();
// app.use(cors()); // CORS middleware setup
<<<<<<< HEAD
// app.use(
//   cors({
//     origin: "https://wordwise-o5cvukhbi-shadan-rashids-projects.vercel.app",
//     credentials: true, // If your frontend sends cookies, include this
//   })
// );
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true, // If your frontend sends cookies, include this
}));
=======
app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true,
  })
);
>>>>>>> d07ea77 (fifth commit)

app.use(express.json({ extended: true })); // Body parser middleware
app.use(express.urlencoded({ extended: true })); // URL-encoded parser middleware
app.use(upload()); // File upload middleware
app.use("/uploads", express.static(__dirname + "/uploads")); // Static file serving middleware

// API routes
app.use("/api/users", userRoutes);
app.use("/api/posts", postRoutes);

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
