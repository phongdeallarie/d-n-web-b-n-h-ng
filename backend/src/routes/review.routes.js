import express from "express";
import { prisma } from "../lib/prisma.js";
import { protect } from "../middleware/authMiddleware.js";
import { isAdmin } from "../middleware/roleMiddleware.js";
import { normalizeText } from "../utils/helpers.js";

const router = express.Router();

async function syncRating(productId) {
  const rows = await prisma.review.findMany({ where: { productId }, select: { rating: true } });
  const ratingCount = rows.length;
  const rating = ratingCount ? rows.reduce((sum, item) => sum + item.rating, 0) / ratingCount : 0;
  await prisma.product.update({ where: { id: productId }, data: { rating, ratingCount } });
}

router.get("/product/:productId", async (req, res) => {
  try {
    const productId = Number(req.params.productId);
    const reviews = await prisma.review.findMany({
      where: { productId },
      include: { user: { select: { id: true, fullName: true, avatar: true } } },
      orderBy: { createdAt: "desc" },
    });
    return res.json(reviews);
  } catch (error) {
    return res.status(500).json({ message: "Không thể lấy đánh giá.", error: error.message });
  }
});

router.post("/product/:productId", protect, async (req, res) => {
  try {
    const productId = Number(req.params.productId);
    const rating = Number(req.body?.rating || 0);
    const comment = normalizeText(req.body?.comment || "");

    if (!productId || rating < 1 || rating > 5) {
      return res.status(400).json({ message: "Đánh giá không hợp lệ." });
    }

    const hasPurchased = await prisma.orderItem.findFirst({
      where: {
        productId,
        order: {
          userId: req.user.id,
          status: { in: ["COMPLETED", "SHIPPING", "CONFIRMED"] },
        },
      },
    });

    if (!hasPurchased) {
      return res.status(400).json({ message: "Bạn cần mua sản phẩm trước khi đánh giá." });
    }

    const review = await prisma.review.upsert({
      where: { userId_productId: { userId: req.user.id, productId } },
      update: { rating, comment: comment || null },
      create: { userId: req.user.id, productId, rating, comment: comment || null },
      include: { user: { select: { id: true, fullName: true, avatar: true } } },
    });

    await syncRating(productId);
    return res.status(201).json({ message: "Đã lưu đánh giá của bạn.", review });
  } catch (error) {
    return res.status(500).json({ message: "Không thể gửi đánh giá.", error: error.message });
  }
});

router.delete("/:id", protect, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const review = await prisma.review.findUnique({ where: { id } });
    if (!review) {
      return res.status(404).json({ message: "Không tìm thấy đánh giá." });
    }

    if (review.userId !== req.user.id && req.user.role !== "ADMIN") {
      return res.status(403).json({ message: "Bạn không có quyền xóa đánh giá này." });
    }

    await prisma.review.delete({ where: { id } });
    await syncRating(review.productId);
    return res.json({ message: "Đã xóa đánh giá." });
  } catch (error) {
    return res.status(500).json({ message: "Không thể xóa đánh giá.", error: error.message });
  }
});

export default router;
