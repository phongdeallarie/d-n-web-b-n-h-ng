import express from "express";
import multer from "multer";
import { put } from "@vercel/blob";
import { protect } from "../middleware/authMiddleware.js";
import { isAdmin } from "../middleware/roleMiddleware.js";

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      cb(new Error("Chỉ chấp nhận file ảnh."));
      return;
    }
    cb(null, true);
  },
});

router.post("/image", protect, isAdmin, upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "Chưa có file ảnh." });
    }

    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      return res.status(400).json({ message: "Thiếu BLOB_READ_WRITE_TOKEN để upload ảnh." });
    }

    const filename = `products/${Date.now()}-${req.file.originalname.replace(/\s+/g, "-")}`;
    const blob = await put(filename, req.file.buffer, {
      access: "public",
      addRandomSuffix: true,
      token: process.env.BLOB_READ_WRITE_TOKEN,
      contentType: req.file.mimetype,
    });

    return res.status(201).json({ message: "Upload ảnh thành công.", url: blob.url });
  } catch (error) {
    return res.status(500).json({ message: "Không thể upload ảnh.", error: error.message });
  }
});

export default router;
