import express from "express";
import { prisma } from "../lib/prisma.js";
import { protect } from "../middleware/authMiddleware.js";
import { normalizeText } from "../utils/helpers.js";

const router = express.Router();

router.get("/", protect, async (req, res) => {
  try {
    const addresses = await prisma.address.findMany({
      where: { userId: req.user.id },
      orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
    });
    return res.json(addresses);
  } catch (error) {
    return res.status(500).json({ message: "Không thể lấy danh sách địa chỉ.", error: error.message });
  }
});

router.post("/", protect, async (req, res) => {
  try {
    const label = normalizeText(req.body?.label || "Nhà riêng");
    const receiverName = normalizeText(req.body?.receiverName);
    const phone = normalizeText(req.body?.phone);
    const line1 = normalizeText(req.body?.line1);
    const ward = normalizeText(req.body?.ward || "");
    const district = normalizeText(req.body?.district || "");
    const city = normalizeText(req.body?.city);
    const isDefault = Boolean(req.body?.isDefault);

    if (!receiverName || !phone || !line1 || !city) {
      return res.status(400).json({ message: "Vui lòng nhập đầy đủ thông tin địa chỉ bắt buộc." });
    }

    if (isDefault) {
      await prisma.address.updateMany({ where: { userId: req.user.id }, data: { isDefault: false } });
    }

    const existingCount = await prisma.address.count({ where: { userId: req.user.id } });

    const address = await prisma.address.create({
      data: {
        userId: req.user.id,
        label,
        receiverName,
        phone,
        line1,
        ward: ward || null,
        district: district || null,
        city,
        isDefault: existingCount === 0 ? true : isDefault,
      },
    });

    return res.status(201).json({ message: "Thêm địa chỉ thành công.", address });
  } catch (error) {
    return res.status(500).json({ message: "Không thể thêm địa chỉ.", error: error.message });
  }
});

router.put("/:id", protect, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const address = await prisma.address.findFirst({ where: { id, userId: req.user.id } });
    if (!address) {
      return res.status(404).json({ message: "Không tìm thấy địa chỉ." });
    }

    const label = normalizeText(req.body?.label || address.label);
    const receiverName = normalizeText(req.body?.receiverName || address.receiverName);
    const phone = normalizeText(req.body?.phone || address.phone);
    const line1 = normalizeText(req.body?.line1 || address.line1);
    const ward = normalizeText(req.body?.ward || "");
    const district = normalizeText(req.body?.district || "");
    const city = normalizeText(req.body?.city || address.city);
    const isDefault = Boolean(req.body?.isDefault);

    if (isDefault) {
      await prisma.address.updateMany({ where: { userId: req.user.id }, data: { isDefault: false } });
    }

    const updated = await prisma.address.update({
      where: { id },
      data: {
        label,
        receiverName,
        phone,
        line1,
        ward: ward || null,
        district: district || null,
        city,
        isDefault: isDefault || address.isDefault,
      },
    });

    return res.json({ message: "Cập nhật địa chỉ thành công.", address: updated });
  } catch (error) {
    return res.status(500).json({ message: "Không thể cập nhật địa chỉ.", error: error.message });
  }
});

router.patch("/:id/default", protect, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const address = await prisma.address.findFirst({ where: { id, userId: req.user.id } });
    if (!address) {
      return res.status(404).json({ message: "Không tìm thấy địa chỉ." });
    }

    await prisma.$transaction([
      prisma.address.updateMany({ where: { userId: req.user.id }, data: { isDefault: false } }),
      prisma.address.update({ where: { id }, data: { isDefault: true } }),
    ]);

    return res.json({ message: "Đã đặt địa chỉ mặc định." });
  } catch (error) {
    return res.status(500).json({ message: "Không thể cập nhật địa chỉ mặc định.", error: error.message });
  }
});

router.delete("/:id", protect, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const address = await prisma.address.findFirst({ where: { id, userId: req.user.id } });
    if (!address) {
      return res.status(404).json({ message: "Không tìm thấy địa chỉ." });
    }

    await prisma.address.delete({ where: { id } });

    if (address.isDefault) {
      const latest = await prisma.address.findFirst({
        where: { userId: req.user.id },
        orderBy: { createdAt: "desc" },
      });
      if (latest) {
        await prisma.address.update({ where: { id: latest.id }, data: { isDefault: true } });
      }
    }

    return res.json({ message: "Đã xóa địa chỉ." });
  } catch (error) {
    return res.status(500).json({ message: "Không thể xóa địa chỉ.", error: error.message });
  }
});

export default router;
