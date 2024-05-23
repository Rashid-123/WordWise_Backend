const { Router } = require("express");

const {
  registerUser,
  loginUser,
  getUser,
  changeAvatar,
  editUser,
  getAuthors,
  getBookmarkedPosts,
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

module.exports = router;
