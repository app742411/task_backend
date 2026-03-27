const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const User = require("../models/User");

const connectDB = async () => {
  try {
    const connect = await mongoose.connect(process.env.MONGO_URI);

    console.log(
      `Database connected successfully:\nHost: ${connect.connection.host}\nName: ${connect.connection.name}`
    );

    //  Check if any user exists
    const userCount = await User.countDocuments({});

    if (userCount === 0) {
      const hashedPassword = await bcrypt.hash("Test@123", 10);

      await User.create({
        email: "test@gmail.com",
        password: hashedPassword,
        token: null,
      });

      console.log("Default user created");
    }

  } catch (error) {
    console.error("DB Connection Error:", error.message);
    process.exit(1);
  }
};

module.exports = connectDB;