const HttpError = require("../models/errorModel");
const Post = require("../models/postModel");
const User = require("../models/userModel");

const addBookmark = async (req, res, next) => {
  const { userId, postId } = req.body;
  console.log("in book");
  try {
    const user = await User.findById(userId);
    if (!user) {
      return next(new HttpError("User not found", 404));
    }

    const post = await Post.findById(postId);
    if (!post) {
      return next(new HttpError("Post not found", 404));
    }

    if (!user.bookmarks.includes(postId)) {
      user.bookmarks.push(postId);
      await user.save();
    }

    res.status(200).json({ message: "Post bookmarked" });
  } catch (error) {
    return next(new HttpError("Bookmarking failed, please try again", 500));
  }
};

const removeBookmark = async (req, res, next) => {
  const { userId, postId } = req.body;

  try {
    const user = await User.findById(userId);
    if (!user) {
      return next(new HttpError("User not found", 404));
    }

    user.bookmarks = user.bookmarks.filter(
      (bookmark) => bookmark.toString() !== postId
    );
    await user.save();

    res.status(200).json({ message: "Bookmark removed" });
  } catch (error) {
    return next(
      new HttpError("Removing bookmark failed, please try again", 500)
    );
  }
};

module.exports = {
  addBookmark,
  removeBookmark,
};
