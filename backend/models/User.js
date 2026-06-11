const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: true,
    },
    totalAnswered: {
      type: Number,
      default: 0,
    },
    totalCorrect: {
      type: Number,
      default: 0,
    },
    selectedTestIndex: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", UserSchema, "user");
