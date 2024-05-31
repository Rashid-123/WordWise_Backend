const { Schema, model } = require("mongoose");

const userSchema = new Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  password: { type: String, required: true },
  avatar: { type: String },
  posts: { type: Number, default: 0 },
  bookmarks: [{ type: Schema.Types.ObjectId, ref: "Post" }],
  reports: [{ type: Schema.Types.ObjectId, ref: "Post" }],
});

module.exports = model("user", userSchema);
