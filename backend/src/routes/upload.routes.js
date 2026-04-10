import express from "express";
import multer from "multer";
import { put } from "@vercel/blob";
import { protect } from "../middleware/authMiddleware.js";
import { isAdmin } from "../middleware/roleMiddleware.js";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post("/image", protect, isAdmin, upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "Chưa có file ảnh" });
    }

    const blob = await put(`products/${Date.now()}-${req.file.originalname}`, req.file.buffer, {
      access: "public",
      token: process.env.BLOB_READ_WRITE_TOKEN,
      contentType: req.file.mimetype,
      addRandomSuffix: true,
    });

    return res.status(201).json({
      message: "Upload ảnh thành công",
      url: blob.url,
      pathname: blob.pathname,
    });
  } catch (error) {
    return res.status(500).json({ message: "Lỗi server", error: error.message });
  }
});

export default router;
