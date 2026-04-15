import express from "express";
import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma.js";
import { generateToken } from "../utils/generateToken.js";
import { protect } from "../middleware/authMiddleware.js";
import { normalizeText } from "../utils/helpers.js";

const router = express.Router();

router.post("/register", async (req, res) => {
  try {
    const fullName = normalizeText(req.body?.fullName);
    const email = normalizeText(req.body?.email).toLowerCase();
    const password = normalizeText(req.body?.password);
    const phone = normalizeText(req.body?.phone || "");

    if (!fullName || !email || !password) {
      return res.status(400).json({ message: "Vui lòng nhập đầy đủ họ tên, email và mật khẩu." });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: "Mật khẩu cần có ít nhất 6 ký tự." });
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: "Email này đã được sử dụng." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        fullName,
        email,
        passwordHash: hashedPassword,
        phone: phone || null,
      },
    });

    const token = generateToken(user);

    return res.status(201).json({
      message: "Đăng ký thành công.",
      token,
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        avatar: user.avatar,
        role: user.role,
        loyaltyPoint: user.loyaltyPoint,
      },
    });
  } catch (error) {
    return res.status(500).json({
      message: "Không thể đăng ký tài khoản.",
      error: error.message,
    });
  }
});

router.post("/login", async (req, res) => {
  try {
    const email = normalizeText(req.body?.email).toLowerCase();
    const password = normalizeText(req.body?.password);

    if (!email || !password) {
      return res.status(400).json({ message: "Vui lòng nhập email và mật khẩu." });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ message: "Email hoặc mật khẩu không đúng." });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ message: "Email hoặc mật khẩu không đúng." });
    }

    const token = generateToken(user);

    return res.json({
      message: "Đăng nhập thành công.",
      token,
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        avatar: user.avatar,
        role: user.role,
        loyaltyPoint: user.loyaltyPoint,
      },
    });
  } catch (error) {
    return res.status(500).json({
      message: "Không thể đăng nhập.",
      error: error.message,
    });
  }
});

router.get("/me", protect, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: {
        addresses: { orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }] },
      },
    });

    if (!user) {
      return res.status(404).json({ message: "Không tìm thấy người dùng." });
    }

    return res.json({
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      phone: user.phone,
      avatar: user.avatar,
      role: user.role,
      loyaltyPoint: user.loyaltyPoint,
      createdAt: user.createdAt,
      addresses: user.addresses,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Không thể lấy thông tin người dùng.",
      error: error.message,
    });
  }
});

router.put("/me", protect, async (req, res) => {
  try {
    const fullName = normalizeText(req.body?.fullName);
    const phone = normalizeText(req.body?.phone || "");
    const avatar = normalizeText(req.body?.avatar || "");

    if (!fullName) {
      return res.status(400).json({ message: "Họ tên không được để trống." });
    }

    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: { fullName, phone: phone || null, avatar: avatar || null },
    });

    return res.json({
      message: "Cập nhật hồ sơ thành công.",
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        avatar: user.avatar,
        role: user.role,
        loyaltyPoint: user.loyaltyPoint,
      },
    });
  } catch (error) {
    return res.status(500).json({
      message: "Không thể cập nhật hồ sơ.",
      error: error.message,
    });
  }
});

router.put("/change-password", protect, async (req, res) => {
  try {
    const currentPassword = normalizeText(req.body?.currentPassword);
    const newPassword = normalizeText(req.body?.newPassword);

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: "Vui lòng nhập mật khẩu hiện tại và mật khẩu mới." });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: "Mật khẩu mới cần có ít nhất 6 ký tự." });
    }

    const user = await prisma.user.findUnique({ where: { id: req.user.id } });

    const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isMatch) {
      return res.status(400).json({ message: "Mật khẩu hiện tại không đúng." });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: req.user.id },
      data: { passwordHash: hashedPassword },
    });

    return res.json({ message: "Đổi mật khẩu thành công." });
  } catch (error) {
    return res.status(500).json({
      message: "Không thể đổi mật khẩu.",
      error: error.message,
    });
  }
});

export default router;