const { Router } = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const router = Router();
const {
  addBookmark,
  removeBookmark,
} = require("../controllers/bookmarkController");

router.post("/add", authMiddleware, addBookmark);
router.post("/remove", authMiddleware, removeBookmark);

module.exports = router;
