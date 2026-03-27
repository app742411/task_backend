// const Joi = require("joi");

// exports.loginValidation = Joi.object({
//   email: Joi.string().email().required(),
//   password: Joi.string().required(),
// });

// exports.answerValidation = Joi.object({
//   answers: Joi.array().items(
//     Joi.object({
//       questionId: Joi.string().required(),
//       rating: Joi.number().min(1).max(5).required()
//     })
//   ).required()
// });

const Joi = require("joi");

// Common options
const options = {
  abortEarly: false,
  allowUnknown: false,
  stripUnknown: true,
};

// LOGIN VALIDATION
exports.loginValidation = (data) => {
  const schema = Joi.object({
    email: Joi.string()
      .email({ tlds: { allow: false } })
      .trim()
      .lowercase()
      .required()
      .messages({
        "string.empty": "Email is required",
        "string.email": "Invalid email format",
        "any.required": "Email is required",
      }),

    password: Joi.string()
      .min(6)
      .max(8)
      .required()
      .messages({
        "string.empty": "Password is required",
        "string.min": "Password must be at least 6 characters",
        "string.max": "Password must not exceed 8 characters",
        "any.required": "Password is required",
      }),
  });

  return schema.validate(data, options);
};

exports.questionValidation = (data) => {
  const schema = Joi.object({
    questionId: Joi.string()
      .trim()
      .required()
      .messages({
        "string.empty": "Question ID is required",
        "any.required": "Question ID is required",
      }),

    text: Joi.string()
      .trim()
      .required()
      .messages({
        "string.empty": "Question text is required",
        "any.required": "Question text is required",
      }),

    category: Joi.string()
      .trim()
      .required()
      .messages({
        "string.empty": "Category is required",
        "any.required": "Category is required",
      }),
  });

  return schema.validate(data, options);
};

// ANSWER VALIDATION
exports.answerValidation = (data) => {
  const schema = Joi.object({
    answers: Joi.array()
      .items(
        Joi.object({
          questionId: Joi.string()
            .trim()
            .required()
            .messages({
              "string.empty": "Question ID is required",
              "any.required": "Question ID is required",
            }),

          rating: Joi.number()
            .integer()
            .min(1)
            .max(5)
            .required()
            .messages({
              "number.base": "Rating must be a number",
              "number.min": "Rating must be at least 1",
              "number.max": "Rating must not exceed 5",
              "any.required": "Rating is required",
            }),
        })
      )
      .min(1)
      .required()
      .messages({
        "array.base": "Answers must be an array",
        "array.min": "At least one answer is required",
        "any.required": "Answers are required",
      }),
  });

  return schema.validate(data, options);
};