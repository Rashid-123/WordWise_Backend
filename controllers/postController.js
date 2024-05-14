const Post = require("../models/postModel");
const User = require("../models/userModel");
const path = require("path");
const fs = require("fs");
const { v4: uuid } = require("uuid");
const HttpError = require("../models/errorModel");
const { hasUncaughtExceptionCaptureCallback } = require("process");
const { promises } = require("dns");
const { Http2ServerResponse } = require("http2");
const { CLIENT_RENEG_LIMIT } = require("tls");
// const { post } = require("../routes/postRoutes");

//-------------------- CREATE A POST
// POST : api/posts
// PROTECTED

// const createPost = async (req, res, next) => {
//   try {
//     let { title, category, description } = req.body;
//     if (!title || !category || !description || !req.files) {
//       return next(
//         new HttpError("fill in all fields and choose thumbnail", 422)
//       );
//     }
//     const { thumbnail } = req.files;
//     //check the files size
//     if (thumbnail > 2000000) {
//       return next(
//         new HttpError("Thumvnail too big , file should be less than 2mb")
//       );
//     }

//     let fileName = thumbnail.name;
//     let splittedFilename = fileName.split(".");
//     let newFilename =
//       splittedFilename[0] +
//       uuid() +
//       "." +
//       splittedFilename[splittedFilename.length - 1];
//     thumbnail.mv(
//       path.join(__dirname, "..", "/uploads", newFilename),
//       async (err) => {
//         if (err) {
//           return next(new HttpError(err));
//         } else {
//           const newPost = await Post.create({
//             title,
//             category,
//             description,
//             thumbnail: newFilename,
//             creator: req.user.id,
//           });
//           if (!newPost) {
//             return next(new HttpError("post couldn't be created", 422));
//           }
//           // find user and increase post count by 1
//           const currrentUser = await User.findById(req.user.id);
//           const userPostCount = currrentUser.posts + 1;
//           await User.findByIdAndUpdate(req.user.id, { posts: userPostCount });

//           res.status(201).json(newPost);
//         }
//       }
//     );
//   } catch (error) {
//     return next(new HttpError(error));
//   }
// };
const createPost = async (req, res, next) => {
  try {
    let { title, category, description } = req.body;
    if (!title || !category || !description || !req.files) {
      return next(new HttpError("Fill in all fields and choose thumbnail", 422));
    }

    const { thumbnail } = req.files;
    if (thumbnail.size > 2000000) {
      return next(new HttpError("Thumbnail too big. File should be less than 2mb", 422));
    }

    const fileName = thumbnail.name;
    const newFilename = fileName.split(".")[0] + uuid() + "." + fileName.split(".").pop();
    thumbnail.mv(
      path.join(__dirname, "../uploads", newFilename),
      async (err) => {
        if (err) {
          return next(new HttpError(err));
        }

        const newPost = await Post.create({
          title,
          category,
          description,
          thumbnail: newFilename,
          creator: req.user.id,
        });

        if (!newPost) {
          return next(new HttpError("Post couldn't be created", 422));
        }

        const currentUser = await User.findById(req.user.id);
        const userPostCount = currentUser.posts + 1;
        await User.findByIdAndUpdate(req.user.id, { posts: userPostCount });

        res.status(201).json(newPost);
      }
    );
  } catch (error) {
    return next(new HttpError(error));
  }
};

//-------------------- GET ALL POST
// GET : api/posts
// PROTECTED

const getPosts = async (req, res, next) => {
  console.log("in all posts");
  try {
    console.log("in tyr ");
    const posts = await Post.find().sort({ updatedAt: -1 });
    console.log("after post");
    res.status(200).json(posts);
  } catch (error) {
    return next(new HttpError(error));
  }
};

//-------------------- GET SINGLE POST
// GET : api/posts/:id
// UNPROTECTED

const getSinglePost = async (req, res, next) => {
  console.log("int getsingle post");
  try {
    console.log("in try");
    const postId = req.params.id;
    console.log("first");
    const post = await Post.findById(postId);
    console.log("second");
    if (!post) {
      return next(new HttpError("Post not found.", 404));
    }
    res.status(200).json(post);
  } catch (error) {
    return next(new HttpError(error));
  }
};

//-------------------- GET POST BY CATEGORY
// GET : api/posts/categories/:category
// UNPROTECTED

const getCatPosts = async (req, res, next) => {
  try {
    const { category } = req.params;
    const catPOsts = await Post.find({ category }).sort({ updatedAt: -1 });
    res.status(200).json(catPOsts);
  } catch (error) {
    return next(new HttpError(error));
  }
};

//-------------------- GET USER/AUTHOR POST
// GET : api/posts/users/:id
// UNPROTECTED

const getUserPosts = async (req, res, next) => {
  try {
    const { id } = req.params;
    const posts = await Post.find({ creator: id }).sort({ updatedAt: -1 });
    res.status(200).json(posts);
  } catch (error) {
    return next(new HttpError(error));
  }
};

//-------------------- EDIT POST
// PATCH : api/posts/:id
// PROTECTED
const editPost = async (req, res, next) => {
  try {
    let fileName;
    let newFilename;
    let updatedPost;
    const postId = req.params.id;
    let { title, category, description } = req.body;

    if (!title || !category || description.length < 12) {
      return next(new HttpError("Fill in all fields", 422));
    }

    if (!req.files) {
      updatedPost = await Post.findByIdAndUpdate(
        postId,
        { title, category, description },
        { new: true }
      );
    } else {
      // get old post from database;
      const oldPost = await Post.findById(postId);
      //delete old thumbnail from uploa
      fs.unlink(
        path.join(__dirname, "../uploads", oldPost.thumbnail),
        async (err) => {
          if (err) {
            return next(new HttpError(err));
          }
        }
      );
      // upload new Thumbnail
      const { thumbnail } = req.files;
      // check file size;
      if (thumbnail.size > 2000000) {
        return next(
          new HttpError("Thumbnail too big. Should be less than 2mb")
        );
      }
      fileName = thumbnail.name;
      let splittedFilename = fileName.split(".");
      newFilename =
        splittedFilename[0] +
        uuid() +
        "." +
        splittedFilename[splittedFilename.length - 1];
      thumbnail.mv(
        path.join(__dirname, "../uploads", newFilename),
        async (err) => {
          if (err) {
            return next(new HttpError(err));
          }
        }
      );
      updatedPost = await Post.findByIdAndUpdate(
        postId,
        { title, category, description, thumbnail: newFilename },
        { new: true }
      );
    }

    //
    if (!updatedPost) {
      return next(new HttpError("couldn't update post", 400));
    }
    res.status(200).json(updatedPost);
  } catch (error) {
    return next(new HttpError(error));
  }
};
//-------------------- DELETE POST ---------------
// DELETE : api/posts/:id
// PROTECTED

const deletePost = async (req, res, next) => {
  try {
    const postId = req.params.id;
    if (!postId) {
      return next(new HttpError("Post unavailable", 400));
    }

    const post = await Post.findById(postId);
    const fileName = post?.thumbnail;
    if (req.user.id == post.creator) {
      console.log("in delete 1");
      // delete thumbnail from uploads folder
      fs.unlink(
        path.join(__dirname, "../uploads", fileName),
        async (err) => {
          if (err) {
            return next(new HttpError(err));
          } else {
            await Post.findByIdAndDelete(postId);
            // find user and reduce post Count by 1
            const currrentUser = await User.findById(req.user.id);
            const userPostCount = currrentUser?.posts - 1;
            if (userPostCount < 0) userPostCount = 0;
            await User.findByIdAndUpdate(req.user.id, { posts: userPostCount });
          }
        }
      );
    } else {
      return next(new HttpError("post couldn't be deleted", 403));
    }
    res.json(`post ${postId} deleted successfully`);
  } catch (error) {
    return next(new HttpError(error));
  }
};

module.exports = {
  createPost,
  getPosts,
  getSinglePost,
  getCatPosts,
  getUserPosts,
  editPost,
  deletePost,
};
