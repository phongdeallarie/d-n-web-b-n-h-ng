import express from "express";
import { prisma } from "../lib/prisma.js";
import { protect } from "../middleware/authMiddleware.js";
import { isAdmin } from "../middleware/roleMiddleware.js";
import { normalizeText, parseDate, parseNumber } from "../utils/helpers.js";

const router = express.Router();

function isCouponAvailable(coupon) {
  const now = new Date();
  if (!coupon.isActive) return false;
  if (coupon.startsAt && coupon.startsAt > now) return false;
  if (coupon.endsAt && coupon.endsAt < now) return false;
  if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) return false;
  return true;
}

router.get("/active", async (_req, res) => {
  try {
    const coupons = await prisma.coupon.findMany({ orderBy: { createdAt: "desc" } });
    return res.json(coupons.filter(isCouponAvailable));
  } catch (error) {
    return res.status(500).json({ message: "Không thể lấy danh sách mã giảm giá.", error: error.message });
  }
});

router.post("/validate", async (req, res) => {
  try {
    const code = normalizeText(req.body?.code).toUpperCase();
    const subtotal = parseNumber(req.body?.subtotal, 0);
    if (!code) {
      return res.status(400).json({ message: "Vui lòng nhập mã giảm giá." });
    }

    const coupon = await prisma.coupon.findUnique({ where: { code } });
    if (!coupon || !isCouponAvailable(coupon)) {
      return res.status(400).json({ message: "Mã giảm giá không hợp lệ hoặc đã hết hạn." });
    }

    if (subtotal < coupon.minOrderValue) {
      return res.status(400).json({ message: `Đơn hàng cần tối thiểu ${coupon.minOrderValue.toLocaleString("vi-VN")}đ để dùng mã này.` });
    }

    return res.json({ message: "Mã giảm giá hợp lệ.", coupon });
  } catch (error) {
    return res.status(500).json({ message: "Không thể kiểm tra mã giảm giá.", error: error.message });
  }
});

router.get("/", protect, isAdmin, async (_req, res) => {
  try {
    const coupons = await prisma.coupon.findMany({ orderBy: { createdAt: "desc" } });
    return res.json(coupons);
  } catch (error) {
    return res.status(500).json({ message: "Không thể lấy danh sách coupon.", error: error.message });
  }
});

router.post("/", protect, isAdmin, async (req, res) => {
  try {
    const code = normalizeText(req.body?.code).toUpperCase();
    const description = normalizeText(req.body?.description || "");
    const discountType = req.body?.discountType === "fixed" ? "fixed" : "percent";
    const discountValue = parseNumber(req.body?.discountValue, 0);
    const minOrderValue = parseNumber(req.body?.minOrderValue, 0);
    const maxDiscount = req.body?.maxDiscount ? parseNumber(req.body?.maxDiscount, 0) : null;
    const usageLimit = req.body?.usageLimit ? parseNumber(req.body?.usageLimit, 0) : null;
    const startsAt = parseDate(req.body?.startsAt);
    const endsAt = parseDate(req.body?.endsAt);

    if (!code || discountValue <= 0) {
      return res.status(400).json({ message: "Thiếu mã hoặc mức giảm giá không hợp lệ." });
    }

    const coupon = await prisma.coupon.create({
      data: {
        code,
        description: description || null,
        discountType,
        discountValue,
        minOrderValue,
        maxDiscount,
        usageLimit,
        startsAt,
        endsAt,
        isActive: req.body?.isActive === undefined ? true : Boolean(req.body?.isActive),
      },
    });

    return res.status(201).json({ message: "Tạo coupon thành công.", coupon });
  } catch (error) {
    return res.status(500).json({ message: "Không thể tạo coupon.", error: error.message });
  }
});

router.put("/:id", protect, isAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const coupon = await prisma.coupon.update({
      where: { id },
      data: {
        code: req.body?.code ? normalizeText(req.body?.code).toUpperCase() : undefined,
        description: req.body?.description === undefined ? undefined : normalizeText(req.body?.description || "") || null,
        discountType: req.body?.discountType,
        discountValue: req.body?.discountValue === undefined ? undefined : parseNumber(req.body?.discountValue, 0),
        minOrderValue: req.body?.minOrderValue === undefined ? undefined : parseNumber(req.body?.minOrderValue, 0),
        maxDiscount: req.body?.maxDiscount === undefined ? undefined : (req.body?.maxDiscount ? parseNumber(req.body?.maxDiscount, 0) : null),
        usageLimit: req.body?.usageLimit === undefined ? undefined : (req.body?.usageLimit ? parseNumber(req.body?.usageLimit, 0) : null),
        startsAt: req.body?.startsAt === undefined ? undefined : parseDate(req.body?.startsAt),
        endsAt: req.body?.endsAt === undefined ? undefined : parseDate(req.body?.endsAt),
        isActive: req.body?.isActive === undefined ? undefined : Boolean(req.body?.isActive),
      },
    });
    return res.json({ message: "Cập nhật coupon thành công.", coupon });
  } catch (error) {
    return res.status(500).json({ message: "Không thể cập nhật coupon.", error: error.message });
  }
});

router.delete("/:id", protect, isAdmin, async (req, res) => {
  try {
    await prisma.coupon.delete({ where: { id: Number(req.params.id) } });
    return res.json({ message: "Đã xóa coupon." });
  } catch (error) {
    return res.status(500).json({ message: "Không thể xóa coupon.", error: error.message });
  }
});

export default router;
