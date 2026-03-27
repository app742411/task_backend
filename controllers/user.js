const User = require("../models/user");
const Question = require("../models/question");
const Submission = require("../models/submission");
const csv = require("csv-parser");
const fs = require("fs");
const jwt = require("jsonwebtoken");
const { loginValidation, answerValidation, questionValidation } = require("../utils/validates");

const bcrypt = require("bcrypt");

exports.login = async (req, res) => {
  try {
    const { error } = loginValidation(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details.map(err => err.message),
      });
    }

    const { email, password } = req.body;

    //  Find user
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not found",
      });
    }


    if (!user.password) {
      return res.status(500).json({
        success: false,
        message: "User password not set properly",
      });
    }

    //  Compare password
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    //  Generate token
    const token = jwt.sign(
      { id: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES }
    );

    // Optional: save token
    user.token = token;
    await user.save();
    return res.status(200).json({
      success: true,
      message: "Login successful",
      token,
    });

  } catch (error) {
    console.error("Login Error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Something went wrong",
    });
  }
};
// UPLOAD QUESTIONS (CSV)

// exports.uploadQuestions = async (req, res) => {
//   try {
//     if (!req.file) {
//       return res.status(400).json({
//         success: false,
//         message: "CSV file is required",
//       });
//     }

//     const results = [];

//     fs.createReadStream(req.file.path)
//       .pipe(csv())
//       .on("data", (data) => {
//         if (data.id && data.question && data.category) {
//           results.push({
//             questionId: data.id,
//             text: data.question,
//             category: data.category,
//           });
//         }
//       })
//       .on("end", async () => {
//         if (results.length === 0) {
//           return res.status(400).json({
//             success: false,
//             message: "CSV is empty or invalid format",
//           });
//         }

//         await Question.deleteMany();

//         await Question.insertMany(results);

//         return res.status(201).json({
//           success: true,
//           message: "Questions uploaded successfully",
//           count: results.length,
//         });
//       })
//       .on("error", (err) => {
//         console.error("CSV Error:", err.message);
//         return res.status(500).json({
//           success: false,
//           message: "Error processing CSV file",
//         });
//       });
//   } catch (error) {
//     console.error("Upload Questions Error:", error.message);
//     return res.status(500).json({
//       success: false,
//       message: "Something went wrong",
//     });
//   }
// };
// path adjust kar lena

exports.uploadQuestions = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "CSV file is required",
      });
    }

    const results = [];
    const errors = [];
    const seenIds = new Set(); // ✅ duplicate check

    fs.createReadStream(req.file.path)
      .pipe(csv())
      .on("data", (data) => {
        const formattedData = {
          questionId: data.id,
          text: data.question,
          category: data.category,
        };

        // ✅ Joi validation
        const { error } = questionValidation(formattedData);

        if (error) {
          errors.push(error.details.map((e) => e.message));
          return;
        }

        // ❌ Duplicate check
        if (seenIds.has(formattedData.questionId)) {
          errors.push([`Duplicate questionId: ${formattedData.questionId}`]);
          return;
        }

        seenIds.add(formattedData.questionId);

        results.push(formattedData);
      })
      .on("end", async () => {
        if (errors.length > 0) {
          return res.status(400).json({
            success: false,
            message: "Validation errors in CSV",
            errors,
          });
        }

        if (results.length === 0) {
          return res.status(400).json({
            success: false,
            message: "CSV is empty or invalid format",
          });
        }

        await Question.deleteMany();
        await Question.insertMany(results);

        return res.status(201).json({
          success: true,
          message: "Questions uploaded successfully",
          count: results.length,
        });
      })
      .on("error", (err) => {
        console.error("CSV Error:", err.message);
        return res.status(500).json({
          success: false,
          message: "Error processing CSV file",
        });
      });
  } catch (error) {
    console.error("Upload Questions Error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Something went wrong",
    });
  }
};

// GET QUESTIONS
exports.getQuestions = async (req, res) => {
  try {
    // query params
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    const skip = (page - 1) * limit;

    const questions = await Question.find()
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await Question.countDocuments();

    return res.status(200).json({
      success: true,
      data: questions,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Get Questions Error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch questions",
    });
  }
};
// SUBMIT ANSWERS

exports.submitAnswers = async (req, res) => {
  try {
    const { error } = answerValidation(req.body);

    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details.map(err => err.message),
      });
    }

    const questions = await Question.find().lean();

    if (questions.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No questions available",
      });
    }

    if (questions.length !== req.body.answers.length) {
      return res.status(400).json({
        success: false,
        message: "All questions must be answered",
      });
    }

    //  Valid question IDs (fast lookup)
    const validQuestionSet = new Set(questions.map(q => q.questionId));

    //  Duplicate check set
    const answeredSet = new Set();

    for (let ans of req.body.answers) {

      //  Invalid questionId
      if (!validQuestionSet.has(ans.questionId)) {
        return res.status(400).json({
          success: false,
          message: `Invalid questionId: ${ans.questionId}`,
        });
      }

      //  Duplicate questionId
      if (answeredSet.has(ans.questionId)) {
        return res.status(400).json({
          success: false,
          message: `Duplicate answer for questionId: ${ans.questionId}`,
        });
      }

      // Mark as answered
      answeredSet.add(ans.questionId);
    }

    const submission = await Submission.create({
      userId: req.userId,
      answers: req.body.answers,
    });

    return res.status(201).json({
      success: true,
      message: "Answers submitted successfully",
      submissionId: submission._id,
    });
  } catch (error) {
    console.error("Submit Answers Error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Something went wrong",
    });
  }
};
// GET RESULT
exports.getResult = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 1;
    const skip = (page - 1) * limit;

    // Get submissions (paginated)
    const submissions = await Submission.find({ userId: req.userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    if (!submissions.length) {
      return res.status(404).json({
        success: false,
        message: "No submission found",
      });
    }

    const total = await Submission.countDocuments({ userId: req.userId });

    const questions = await Question.find().lean();

    const results = submissions.map((submission) => {
      let totalScore = 0;
      const categoryMap = {};

      submission.answers.forEach((ans) => {
        totalScore += ans.rating;

        const question = questions.find(
          (q) => q.questionId === ans.questionId
        );

        if (question) {
          if (!categoryMap[question.category]) {
            categoryMap[question.category] = [];
          }
          categoryMap[question.category].push(ans.rating);
        }
      });

      const overallAvg = totalScore / submission.answers.length;

      const categories = Object.keys(categoryMap).map((cat) => {
        const avg =
          categoryMap[cat].reduce((a, b) => a + b, 0) /
          categoryMap[cat].length;

        return {
          category: cat,
          average: Number(avg.toFixed(2)),
          status: avg < 2.5 ? "Needs Attention" : "Good",
        };
      });

      let level = "Low";
      if (overallAvg >= 4) level = "High";
      else if (overallAvg >= 2.5) level = "Medium";

      return {
        submissionId: submission._id,
        overallAverage: Number(overallAvg.toFixed(2)),
        level,
        categories,
      };
    });

    return res.status(200).json({
      success: true,
      data: results,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Get Result Error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Failed to calculate result",
    });
  }
};

// UPLOAD PROFILE
exports.uploadProfile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Profile image is required",
      });
    }

    req.user.profileImage = req.file.filename;
    await req.user.save();

    return res.status(200).json({
      success: true,
      message: "Profile uploaded successfully",
      fileName: req.file.filename
    });
  } catch (error) {
    console.error("Upload Profile Error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Something went wrong",
    });
  }
};