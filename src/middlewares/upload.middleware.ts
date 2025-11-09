import multer from "multer";

/**
 * ✅ Multer configuration for in-memory processing (no local uploads)
 * Files are available in `req.file.buffer` or `req.files[i].buffer`
 */
const storage = multer.memoryStorage();

export const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // ⛔ limit: 5MB per file
  },
  fileFilter: (req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (!allowed.includes(file.mimetype)) {
      return cb(new Error("Only JPEG, PNG, and WEBP images are allowed"));
    }
    cb(null, true);
  },
});
