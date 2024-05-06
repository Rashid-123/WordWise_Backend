const express = require("express");
const cors = require("cors");
const { connect } = require("mongoose");
const upload = require("express-fileupload");
require("dotenv").config();
const userRoutes = require("./routes/userRoutes");
const postRoutes = require("./routes/postRoutes");
const { notFound, errorHandler } = require("./middleware/errorMiddleware");

const app = express();

app.use(express.json({ extended: true }));
app.use(express.urlencoded({ extended: true }));
// app.use(cors({ credentials: true, origin: "http://localhost:3000" }));
app.use(cors({ 
  credentials: true, 
  origin: "https://https://word-wise-frontend.vercel.app/" 
}));



app.use(upload());
//When you use app.use(express.static(__dirname + "/uploads")),
//you're telling Express to use the express.static middleware
//for any incoming request to serve static files from the uploads directory.
app.use("/uploads", express.static(__dirname + "/uploads"));
//
app.use("/api/users", userRoutes);
app.use("/api/posts", postRoutes);
//
app.use(notFound);
app.use(errorHandler);
connect(process.env.MONGO_URI)
  .then(
    app.listen(5000, () => {
      console.log(`Server started on port ${process.env.PORT}`);
    })
  )
  .catch((error) => {
    console.log(error);
  });
