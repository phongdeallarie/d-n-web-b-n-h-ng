import express from "express";
import { prisma } from "../lib/prisma.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/", protect, async (req, res) => {
  try {
    const items = await prisma.wishlistItem.findMany({
      where: { userId: req.user.id },
      include: { product: { include: { category: true, _count: { select: { reviews: true } } } } },
      orderBy: { createdAt: "desc" },
    });
    return res.json(items);
  } catch (error) {
    return res.status(500).json({ message: "Không thể lấy danh sách yêu thích.", error: error.message });
  }
});

router.post("/", protect, async (req, res) => {
  try {
    const productId = Number(req.body?.productId || 0);
    if (!productId) {
      return res.status(400).json({ message: "Thiếu productId." });
    }

    const existing = await prisma.wishlistItem.findUnique({
      where: { userId_productId: { userId: req.user.id, productId } },
    });

    if (existing) {
      await prisma.wishlistItem.delete({ where: { id: existing.id } });
      return res.json({ message: "Đã bỏ khỏi yêu thích.", active: false });
    }

    const item = await prisma.wishlistItem.create({
      data: { userId: req.user.id, productId },
      include: { product: true },
    });
    return res.status(201).json({ message: "Đã thêm vào yêu thích.", active: true, item });
  } catch (error) {
    return res.status(500).json({ message: "Không thể cập nhật yêu thích.", error: error.message });
  }
});

router.delete("/:productId", protect, async (req, res) => {
  try {
    const productId = Number(req.params.productId);
    const existing = await prisma.wishlistItem.findUnique({
      where: { userId_productId: { userId: req.user.id, productId } },
    });
    if (!existing) {
      return res.status(404).json({ message: "Sản phẩm chưa nằm trong danh sách yêu thích." });
    }
    await prisma.wishlistItem.delete({ where: { id: existing.id } });
    return res.json({ message: "Đã bỏ khỏi yêu thích." });
  } catch (error) {
    return res.status(500).json({ message: "Không thể xóa khỏi yêu thích.", error: error.message });
  }
});

export default router;
