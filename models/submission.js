const mongoose = require("mongoose");

const answerSchema = new mongoose.Schema(
  {
    questionId: {
      type: String,
      required: true,
    },

    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
  },
  { _id: false }
);

const submissionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    answers: {
      type: [answerSchema],
    // validate: [
    //     (arr) => arr.length > 0,
    //     "Answers cannot be empty",
    //   ],  
    },
  },
  {
    timestamps: true,
  }
);

// Index for latest submission
submissionSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model("Submission", submissionSchema);