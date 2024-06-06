const Post = require("../models/postModel");
const User = require("../models/userModel");
const Admin = require("../models/adminModel");
// const { post } = require("../routes/postRoutes");
const path = require("path");
const fs = require("fs");
const { v4: uuid } = require("uuid");
const HttpError = require("../models/errorModel");
const mime = require("mime-types");
const {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
  DeleteObjectCommand,
} = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");

//
///// --------------- AWS S3 Setup ----------------------------

const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

async function getObjectURL(key) {
  const command = new GetObjectCommand({
    Bucket: process.env.AWS_S3_BUCKET_NAME,
    Key: key,
  });

  const url = await getSignedUrl(s3Client, command);
  return url;
}

////////////////////----------- CREATE A POST ------------------------
// POST : api/posts
// PROTECTED

const createPost = async (req, res, next) => {
  try {
    let { title, shortDescription, category, description } = req.body;
    if (!title || !category || !description || !req.files) {
      return next(
        new HttpError("Fill in all fields and choose thumbnail", 422)
      );
    }

    const { thumbnail } = req.files;
    if (thumbnail.size > 2000000) {
      return next(
        new HttpError("Thumbnail too big. File should be less than 2mb", 422)
      );
    }

    const fileName = thumbnail.name;
    const newFilename =
      fileName.split(".")[0] + uuid() + "." + fileName.split(".").pop();

    const uploadParams = {
      Bucket: process.env.AWS_S3_BUCKET_NAME,
      Key: `thumbnail/${newFilename}`,
      Body: thumbnail.data,
      ContentType: mime.lookup(thumbnail.name) || "application/octet-stream",
      ACL: "private",
    };

    try {
      await s3Client.send(new PutObjectCommand(uploadParams));
    } catch (err) {
      console.error("Error uploading thumbnail to S3:", err);
      throw new HttpError("Error uploading thumbnail to S3", 500);
    }

    const newPost = await Post.create({
      title,
      shortDescription,
      category,
      description,
      thumbnail: `thumbnail/${newFilename}`,
      creator: req.user.id,
    });

    if (!newPost) {
      return next(new HttpError("Post couldn't be created", 422));
    }

    const currentUser = await User.findById(req.user.id);
    const userPostCount = currentUser.posts + 1;
    await User.findByIdAndUpdate(req.user.id, { posts: userPostCount });

    res.status(201).json(newPost);
  } catch (error) {
    return next(new HttpError(error));
  }
};

//-------------------- GET ALL POST------------------------------
// GET : api/posts
// PROTECTED

const getPosts = async (req, res, next) => {
  console.log("in all posts");
  try {
    console.log("in tyr ");
    const posts = await Post.find().sort({ updatedAt: -1 });
    const postsWithUrls = await Promise.all(
      posts.map(async (post) => {
        if (post.thumbnail) {
          const thumbnailURL = await getObjectURL(post.thumbnail);
          return {
            ...post.toObject(),
            thumbnailURL,
          };
        }
        return post.toObject();
      })
    );

    res.status(200).json(postsWithUrls);
  } catch (error) {
    return next(new HttpError(error));
  }
};

//-------------------- GET SINGLE POST ---------------------
// GET : api/posts/:id
// UNPROTECTED

const getSinglePost = async (req, res, next) => {
  console.log("int getsingle post");
  try {
    console.log("in try");
    const postId = req.params.id;
    console.log("first");
    const post = await Post.findById(postId);
    let thumbnailURL = null;
    if (post.thumbnail) {
      thumbnailURL = await getObjectURL(post.thumbnail);
    }

    res.status(200).json({
      ...post.toObject(),
      thumbnailURL,
    });
  } catch (error) {
    return next(new HttpError(error));
  }
};

///////////--------------- GET POST BY CATEGORY -----------------------
// GET : api/posts/categories/:category
// UNPROTECTED

const getCatPosts = async (req, res, next) => {
  try {
    const { category } = req.params;
    const catPOsts = await Post.find({ category }).sort({ updatedAt: -1 });
    const postsWithUrls = await Promise.all(
      catPOsts.map(async (post) => {
        if (post.thumbnail) {
          const thumbnailURL = await getObjectURL(post.thumbnail);
          return {
            ...post.toObject(),
            thumbnailURL,
          };
        }
        return post.toObject();
      })
    );

    res.status(200).json(postsWithUrls);
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
    const postsWithUrls = await Promise.all(
      posts.map(async (post) => {
        if (post.thumbnail) {
          const thumbnailURL = await getObjectURL(post.thumbnail);
          return {
            ...post.toObject(),
            thumbnailURL,
          };
        }
        return post.toObject();
      })
    );

    res.status(200).json(postsWithUrls);
  } catch (error) {
    return next(new HttpError(error));
  }
};

//-------------------- EDIT POST -----------------------------------
// PATCH : api/posts/:id
// PROTECTED
const editPost = async (req, res, next) => {
  try {
    let fileName;
    let newFilename;
    let updatedPost;
    const postId = req.params.id;
    let { title, shortDescription, category, description } = req.body;

    if (!title || !category || !shortDescription || description.length < 12) {
      return next(new HttpError("Fill in all fields", 422));
    }

    if (!req.files) {
      updatedPost = await Post.findByIdAndUpdate(
        postId,
        { title, shortDescription, category, description },
        { new: true }
      );
    } else {
      // get old post from database;
      const oldPost = await Post.findById(postId);
      //delete old thumbnail from AWS S3
      if (oldPost.thumbnail) {
        const deleteParams = {
          Bucket: process.env.AWS_S3_BUCKET_NAME,
          Key: oldPost.thumbnail,
        };
        await s3Client.send(new DeleteObjectCommand(deleteParams));
      }
      // upload new Thumbnail
      const { thumbnail } = req.files;
      // check file size;
      if (thumbnail.size > 2000000) {
        return next(
          new HttpError("Thumbnail too big. Should be less than 2mb")
        );
      }
      const fileName = thumbnail.name;
      const newFilename =
        fileName.split(".")[0] + uuid() + "." + fileName.split(".").pop();

      const uploadParams = {
        Bucket: process.env.AWS_S3_BUCKET_NAME,
        Key: `thumbnail/${newFilename}`,
        Body: thumbnail.data,
        ContentType: mime.lookup(thumbnail.name) || "application/octet-stream",
        ACL: "private",
      };

      try {
        await s3Client.send(new PutObjectCommand(uploadParams));
      } catch (err) {
        console.error("Error uploading thumbnail to S3:", err);
        throw new HttpError("Error uploading thumbnail to S3", 500);
      }
      updatedPost = await Post.findByIdAndUpdate(
        postId,
        {
          title,
          shortDescription,
          category,
          description,
          thumbnail: `thumbnail/${newFilename}`,
        },
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
//----------------------------- DELETE POST --------------------------------------
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
      // Delete thumbnail from AWS S3
      if (fileName) {
        const deleteParams = {
          Bucket: process.env.AWS_S3_BUCKET_NAME,
          Key: fileName,
        };

        try {
          await s3Client.send(new DeleteObjectCommand(deleteParams));
        } catch (err) {
          return next(new HttpError("Failed to delete thumbnail from S3", 500));
        }
      }

      // Delete post from database
      await Post.findByIdAndDelete(postId);

      // Find user and reduce post count by 1
      const currentUser = await User.findById(req.user.id);
      let userPostCount = currentUser?.posts - 1;
      if (userPostCount < 0) userPostCount = 0;
      await User.findByIdAndUpdate(req.user.id, { posts: userPostCount });

      res.json(`Post ${postId} deleted successfully`);
    } else {
      return next(new HttpError("Post couldn't be deleted", 403));
    }
  } catch (error) {
    return next(new HttpError(error));
  }
};
/////////////////////////////////////////////////////
//---------- Get Featured post ---------------------
const getFeaturedPost = async (req, res, next) => {
  try {
    const admin = await Admin.findOne();
    const post = await Post.findById(admin.featured);
    //
    let thumbnailURL = null;
    if (post.thumbnail) {
      thumbnailURL = await getObjectURL(post.thumbnail);
    }

    res.status(200).json({
      ...post.toObject(),
      thumbnailURL,
    });
  } catch (error) {
    console.log(error);
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
  getFeaturedPost,
};
