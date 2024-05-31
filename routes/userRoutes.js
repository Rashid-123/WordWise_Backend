const { Router } = require("express");

const {
  registerUser,
  loginUser,
  getUser,
  changeAvatar,
  editUser,
  getAuthors,
  getBookmarkedPosts,
  loginAdmin,
  removeBookmark,
  addBookmark,
  addReport,
  removeReport,
} = require("../controllers/userControllers");
const authMiddleware = require("../middleware/authMiddleware");
// const { route } = require("./userRoutes");

const router = Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.get("/:id", getUser);
router.get("/", getAuthors);
router.post("/change-avatar", authMiddleware, changeAvatar);
router.patch("/edit-user", authMiddleware, editUser);
router.get("/bookmarkedPost/:id", authMiddleware, getBookmarkedPosts);
router.post("/addreport", authMiddleware, addReport);
router.post("/removeReport", authMiddleware, removeReport);
router.post("/addBookmark", authMiddleware, addBookmark);
router.post("/removeBookmark", authMiddleware, removeBookmark);
//
router.post("/login/admin", loginAdmin);

module.exports = router;
