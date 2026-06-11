const mongoose = require("mongoose");

const VocabularySchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    wordId: {
      type: Number,
      required: true,
    },
    term: {
      type: String,
      required: true,
      trim: true,
    },
    definition: {
      type: String,
      required: true,
      trim: true,
    },
    synonym: {
      type: String,
      default: "",
    },
    ipa: {
      type: String,
      default: "",
    },
    status: {
      type: String,
      required: true,
      default: "not_learned",
    },
    consecutiveCorrect: {
      type: Number,
      default: 0,
    },
    totalCorrect: {
      type: Number,
      default: 0,
    },
    totalWrong: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

// Compound index to ensure uniqueness of wordId per user
VocabularySchema.index({ user: 1, wordId: 1 }, { unique: true });

module.exports = mongoose.model("Vocabulary", VocabularySchema);
