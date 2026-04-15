import express from "express";
import { prisma } from "../lib/prisma.js";
import { protect } from "../middleware/authMiddleware.js";
import { isAdmin } from "../middleware/roleMiddleware.js";

const router = express.Router();

router.get("/", protect, isAdmin, async (_req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        role: true,
        loyaltyPoint: true,
        createdAt: true,
        _count: { select: { orders: true, reviews: true, wishlist: true, addresses: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return res.json(users);
  } catch (error) {
    return res.status(500).json({ message: "Không thể lấy danh sách người dùng.", error: error.message });
  }
});

router.patch("/:id/role", protect, isAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const role = req.body?.role;
    if (!["ADMIN", "CUSTOMER"].includes(role)) {
      return res.status(400).json({ message: "Role không hợp lệ." });
    }
    const user = await prisma.user.update({ where: { id }, data: { role } });
    return res.json({ message: "Cập nhật quyền thành công.", user });
  } catch (error) {
    return res.status(500).json({ message: "Không thể cập nhật quyền người dùng.", error: error.message });
  }
});

router.delete("/:id", protect, isAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return res.status(404).json({ message: "Không tìm thấy người dùng." });
    }
    if (user.role === "ADMIN") {
      return res.status(400).json({ message: "Không thể xóa tài khoản admin." });
    }
    await prisma.user.delete({ where: { id } });
    return res.json({ message: "Đã xóa người dùng." });
  } catch (error) {
    return res.status(500).json({ message: "Không thể xóa người dùng.", error: error.message });
  }
});

export default router;
