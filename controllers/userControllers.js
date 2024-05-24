const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/userModel");
const Post = require("../models/postModel");
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
//--------------------------------------------------------------
//----------------------- REGISTER A NEW USER -------------------
// POST: api/users/register
// UNPROTECTED

const registerUser = async (req, res, next) => {
  console.log("register user is running");
  try {
    const { name, email, password, password2 } = req.body;
    if (!name || !email || !password) {
      return next(new HttpError("Fill in all fields", 422));
    }

    const newEmail = email.trim().toLowerCase();

    // Email validation regex pattern
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      return next(new HttpError("Invalid email address", 422));
    }

    const emailExists = await User.findOne({ email: newEmail });
    console.log("third");
    if (emailExists) {
      return next(new HttpError("Email already exists.", 422));
    }
    if (password.trim().length < 6) {
      return next(new HttpError("Password should be at least 6 characters."));
    }
    if (password !== password2) {
      return next(new HttpError("Passwords do not match.", 422));
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPass = await bcrypt.hash(password, salt);

    const newUser = await User.create({
      name,
      email: newEmail,
      password: hashedPass,
    });

    res.status(201).json(`New user ${newUser.email} registered`);
  } catch (error) {
    return next(new HttpError("User registration failed.", 422));
  }
};

//-------------------------------------------------------------------
//--------------------------- LOGIN A REGISTER USER ------------------
// POST: api/users/login
// UNPROTECTED
const loginUser = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return next(new HttpError("fill in all fields", 422));
    }

    const newEmail = email.toLowerCase();
    const user = await User.findOne({ email: newEmail });

    if (!user) {
      return next(new HttpError("Invalid credentials", 422));
    }
    const comparePass = await bcrypt.compare(password, user.password);

    if (!comparePass) {
      return next(new HttpError("Invalid credentials", 422));
    }
    console.log("first");
    const { _id: id, name } = user;
    console.log("second");
    const token = jwt.sign({ id, name }, process.env.JWT_SECRET, {
      expiresIn: "1d",
    });
    console.log("third");
    res.status(200).json({ token, id, name });
  } catch (error) {
    return next(
      new HttpError("Login Failed , please check your credentials", 422)
    );
  }
};

// //-------------------------------------------------------
// //---------------- USER PROFILE ------------
// // POST: api/users/:id
// // ROTECTED
const getUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id).select("-password");
    if (!user) {
      return next(new HttpError("User not found", 404));
    }

    let avatarURL;
    if (user.avatar) {
      avatarURL = await getObjectURL(user.avatar);
    }

    const userResponse = {
      ...user.toObject(),
    };

    if (avatarURL) {
      userResponse.avatarURL = avatarURL;
    }

    res.status(200).json(userResponse);
  } catch (error) {
    return next(new HttpError(error));
  }
};

///////////////////////////////////////////////////////
///////// -------------- CHANGE USER AVATAR --------------------------

const changeAvatar = async (req, res, next) => {
  try {
    if (!req.files || !req.files.avatar) {
      return next(new HttpError("Please choose an image", 422));
    }

    const { avatar } = req.files;

    // Check file size
    if (avatar.size > 500000) {
      return next(
        new HttpError("Profile picture too big. Should be less than 500KB", 422)
      );
    }

    // Find user from database
    const user = await User.findById(req.user.id);
    if (!user) {
      return next(new HttpError("User not found", 404));
    }

    // Delete old avatar if exists in S3
    if (user.avatar) {
      const deleteParams = {
        Bucket: process.env.AWS_S3_BUCKET_NAME,
        Key: user.avatar,
      };

      try {
        await s3Client.send(new DeleteObjectCommand(deleteParams));
      } catch (err) {
        console.error("Error deleting old avatar from S3:", err);
        throw new HttpError("Failed to delete old avatar from S3", 500);
      }
    }

    // Upload new avatar to AWS S3
    let fileName = avatar.name;
    let splittedFilename = fileName.split(".");
    let newFilename =
      splittedFilename[0] +
      uuid() +
      "." +
      splittedFilename[splittedFilename.length - 1];

    const uploadParams = {
      Bucket: process.env.AWS_S3_BUCKET_NAME,
      Key: `avatar/${newFilename}`,
      Body: avatar.data,
      ContentType: mime.lookup(avatar.name) || "application/octet-stream",
      ACL: "private",
    };

    try {
      await s3Client.send(new PutObjectCommand(uploadParams));
    } catch (err) {
      console.error("Error uploading avatar to S3:", err);
      throw new HttpError("Error uploading avatar to S3", 500);
    }

    // Store the new avatar key in the database
    const updatedAvatar = await User.findByIdAndUpdate(
      req.user.id,
      { avatar: `avatar/${newFilename}` },
      { new: true }
    );

    if (!updatedAvatar) {
      return next(new HttpError("Avatar couldn't be changed", 422));
    }

    // Generate and return the signed URL for the uploaded avatar
    const avatarURL = await getObjectURL(`avatar/${newFilename}`);
    res.status(200).json({ avatarURL });
  } catch (error) {
    console.error("Error changing avatar:", error);
    return next(new HttpError(error.message, 500));
  }
};

//---------------- EDIT USER DETAILS (from profile) ------------
// POST: api/users/edit-user
// PROTECTED

const editUser = async (req, res, next) => {
  try {
    const { name, email, currentPassword, newPassword, confirmNewPassword } =
      req.body;
    if (!name || !email || !currentPassword || !newPassword) {
      return next(new HttpError("Fill in all fields", 422));
    }

    // Get user from database
    const user = await User.findById(req.user.id);
    if (!user) {
      return next(new HttpError("User not found", 403));
    }

    // Make sure new email doesn't already exist and is not the current user's email
    const emailExists = await User.findOne({ email });
    if (emailExists && emailExists._id != req.user.id) {
      return next(new HttpError("Email already exists", 422));
    }

    // Compare current password to database password
    const validateUserPassword = await bcrypt.compare(
      currentPassword,
      user.password
    );
    if (!validateUserPassword) {
      return next(new HttpError("Invalid current password", 422));
    }

    // Compare new passwords
    if (newPassword !== confirmNewPassword) {
      return next(new HttpError("New passwords do not match", 422));
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(newPassword, salt);

    // Update user info in database
    const newInfo = await User.findByIdAndUpdate(
      req.user.id,
      { name, email, password: hash },
      { new: true }
    );
    res.status(200).json(newInfo);
  } catch (error) {
    return next(new HttpError(error));
  }
};

//---------------- GET AUTHORS ------------
// POST: api/users/edit-user
// UNPROTECTED
const getAuthors = async (req, res, next) => {
  try {
    const authors = await User.find().select("-password");
    const authorsWithAvatars = await Promise.all(
      authors.map(async (author) => {
        const authorObj = author.toObject();
        if (author.avatar) {
          authorObj.avatarURL = await getObjectURL(author.avatar);
        }
        return authorObj;
      })
    );

    res.json(authorsWithAvatars);
  } catch (error) {
    return next(new HttpError(error));
  }
};

//////////////////////////////////////////////////////////////////////////////////
//------------------- ALL BOOKMARKED POSTS ------------------------------
const getBookmarkedPosts = async (req, res, next) => {
  const userId = req.params.id;

  try {
    const user = await User.findById(userId);
    if (!user) {
      return next(new HttpError("User not found", 404));
    }

    const bookmarkedPosts = await Promise.all(
      user.bookmarks.map(async (postId) => {
        const post = await Post.findById(postId);
        if (!post) {
          return null;
        }

        const thumbnailURL = await getObjectURL(post.thumbnail, {
          expiresIn: 3600,
        });

        return {
          ...post.toObject(),
          thumbnailURL,
        };
      })
    );

    // Filter out any null values (if any posts were not found)
    const validBookmarkedPosts = bookmarkedPosts.filter(
      (post) => post !== null
    );

    res.status(200).json(validBookmarkedPosts);
  } catch (error) {
    return next(
      new HttpError("Fetching bookmarks failed, please try again", 500)
    );
  }
};

module.exports = {
  registerUser,
  loginUser,
  getUser,
  changeAvatar,
  editUser,
  getAuthors,
  getBookmarkedPosts,
};
