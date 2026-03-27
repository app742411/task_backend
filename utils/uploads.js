const multer = require("multer");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

const baseUploadPath = path.join(process.cwd(), "public", "uploads");
if (!fs.existsSync(baseUploadPath)) fs.mkdirSync(baseUploadPath, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(baseUploadPath, file.fieldname);
    if (!fs.existsSync(uploadPath)) fs.mkdirSync(uploadPath, { recursive: true });
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const name = Date.now() + "-" + crypto.randomBytes(6).toString("hex") + path.extname(file.originalname);
    cb(null, name);
  },
});

const fileFilter = (req, file, cb) => {
  if (file.fieldname === "questions" && path.extname(file.originalname) !== ".csv") {
    return cb(new Error("Only CSV allowed"), false);
  }
  
 if (file.fieldname === "questions") {
  if (path.extname(file.originalname).toLowerCase() !== ".csv") {
    return cb(new Error("Only CSV files allowed"), false);
  }
}

// profile ke liye koi check nahi
cb(null, true);
};

module.exports = multer({ storage, fileFilter });