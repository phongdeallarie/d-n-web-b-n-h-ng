import express from "express";
import { prisma } from "../lib/prisma.js";
import { protect } from "../middleware/authMiddleware.js";
import { isAdmin } from "../middleware/roleMiddleware.js";
import { normalizeText } from "../utils/helpers.js";

const router = express.Router();

router.get("/", async (_req, res) => {
  try {
    const categories = await prisma.category.findMany({
      include: { _count: { select: { products: true } } },
      orderBy: { name: "asc" },
    });
    return res.json(categories);
  } catch (error) {
    return res.status(500).json({ message: "Không thể lấy danh mục.", error: error.message });
  }
});

router.post("/", protect, isAdmin, async (req, res) => {
  try {
    const name = normalizeText(req.body?.name);
    if (!name) {
      return res.status(400).json({ message: "Tên danh mục là bắt buộc." });
    }
    const category = await prisma.category.create({ data: { name } });
    return res.status(201).json({ message: "Tạo danh mục thành công.", category });
  } catch (error) {
    return res.status(500).json({ message: "Không thể tạo danh mục.", error: error.message });
  }
});

router.put("/:id", protect, isAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const name = normalizeText(req.body?.name);
    if (!name) {
      return res.status(400).json({ message: "Tên danh mục là bắt buộc." });
    }
    const category = await prisma.category.update({ where: { id }, data: { name } });
    return res.json({ message: "Cập nhật danh mục thành công.", category });
  } catch (error) {
    return res.status(500).json({ message: "Không thể cập nhật danh mục.", error: error.message });
  }
});

router.delete("/:id", protect, isAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const count = await prisma.product.count({ where: { categoryId: id } });
    if (count > 0) {
      return res.status(400).json({ message: "Không thể xóa danh mục đang có sản phẩm." });
    }
    await prisma.category.delete({ where: { id } });
    return res.json({ message: "Đã xóa danh mục." });
  } catch (error) {
    return res.status(500).json({ message: "Không thể xóa danh mục.", error: error.message });
  }
});

export default router;
