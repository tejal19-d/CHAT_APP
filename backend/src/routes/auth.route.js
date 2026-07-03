import express from "express";
import {
  checkAuth,
  login,
  logout,
  signup,
  updateProfile,
  verifyEmail,
  forgotPassword,
  resetPassword,
  refreshSession,
} from "../controllers/auth.controller.js";
import { protectRoute } from "../middlewares/auth.middleware.js";
import multer from "multer";
import {cloudinary} from "../lib/cloudinary.js";

console.log("✅ auth.route.js loaded");

const router = express.Router();
const storage = multer.memoryStorage();
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } }); // 10MB

router.post("/signup", signup);
router.post("/login", login);
router.post("/logout", logout);
router.post("/verify-email", verifyEmail);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);
router.post("/refresh", refreshSession);
router.put("/update-profile", protectRoute, updateProfile);
router.get("/check", protectRoute, checkAuth);

router.post(
  "/upload-profile",
  protectRoute,
  upload.single("profilePic"),
  async (req, res) => {
    console.log("🟢 /upload-profile route is active");

    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const uploadStream = cloudinary.uploader.upload_stream(
        { resource_type: "image", folder: "chat-profile" },
        async (error, result) => {
          if (error) {
            console.error(error);
            return res.status(500).json({ message: "Upload failed" });
          }

          return res.status(200).json({ url: result.secure_url });
        }
      );

      uploadStream.end(req.file.buffer);
    } catch (error) {
      console.error("❌ Upload error:", error);
      res.status(500).json({ message: "Something went wrong" });
    }
  }
);

export default router;
