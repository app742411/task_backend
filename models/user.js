const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
    },

    password: {
      type: String,
      required: true,
    },

    token: {
      type: String,
    },

    profileImage: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// IMPORTANT: prevent overwrite error + export model
module.exports = mongoose.models.User || mongoose.model("User", userSchema);