import express from "express";
import { prisma } from "../lib/prisma.js";
import { protect } from "../middleware/authMiddleware.js";
import { isAdmin } from "../middleware/roleMiddleware.js";
import { calculateCouponDiscount, calculateShippingFee } from "../utils/order.js";
import { formatOrderCode, normalizeText, parseNumber } from "../utils/helpers.js";

const router = express.Router();

async function getCouponByCode(code) {
  if (!code) return null;
  const coupon = await prisma.coupon.findUnique({ where: { code: code.toUpperCase() } });
  if (!coupon) return null;
  const now = new Date();
  if (!coupon.isActive) return null;
  if (coupon.startsAt && coupon.startsAt > now) return null;
  if (coupon.endsAt && coupon.endsAt < now) return null;
  if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) return null;
  return coupon;
}

const serializeOrder = (order) => ({
  ...order,
  subtotalAmount: Number(order.subtotal || 0),
  discountAmount: Number(order.discountAmount || 0),
  shippingFee: Number(order.shippingFee || 0),
  totalAmount: Number(order.total || 0),
  items: Array.isArray(order.items)
    ? order.items.map((item) => ({
        ...item,
        price: Number(item.price || 0),
        totalPrice: Number(item.total || 0),
      }))
    : [],
});

router.post("/checkout", protect, async (req, res) => {
  try {
    const items = Array.isArray(req.body?.items) ? req.body.items : [];
    const addressId = req.body?.addressId ? Number(req.body.addressId) : null;
    const paymentMethod = ["COD", "BANK_TRANSFER", "MOMO", "VNPAY"].includes(req.body?.paymentMethod)
      ? req.body.paymentMethod
      : "COD";
    const couponCode = normalizeText(req.body?.couponCode || "");
    const note = normalizeText(req.body?.note || "");

    if (!items.length) {
      return res.status(400).json({ message: "Giỏ hàng đang trống." });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: { addresses: true },
    });

    let selectedAddress = null;
    if (addressId) {
      selectedAddress = user.addresses.find((item) => item.id === addressId) || null;
    }
    if (!selectedAddress) {
      selectedAddress = user.addresses.find((item) => item.isDefault) || user.addresses[0] || null;
    }

    if (!selectedAddress) {
      return res.status(400).json({ message: "Vui lòng thêm ít nhất một địa chỉ giao hàng trước khi thanh toán." });
    }

    const productIds = items.map((item) => Number(item.productId)).filter(Boolean);
    const products = await prisma.product.findMany({ where: { id: { in: productIds } }, include: { category: true } });

    if (products.length !== productIds.length) {
      return res.status(400).json({ message: "Một hoặc nhiều sản phẩm không tồn tại." });
    }

    let subtotal = 0;
    const normalizedItems = [];

    for (const rawItem of items) {
      const productId = Number(rawItem.productId);
      const quantity = Math.max(1, Number(rawItem.quantity || 1));
      const product = products.find((item) => item.id === productId);
      if (!product) {
        return res.status(400).json({ message: `Sản phẩm #${productId} không tồn tại.` });
      }
      if (product.stock < quantity) {
        return res.status(400).json({ message: `Sản phẩm ${product.name} chỉ còn ${product.stock} trong kho.` });
      }
      const unitPrice = Number(product.finalPrice || product.price || 0);
      const totalPrice = unitPrice * quantity;
      subtotal += totalPrice;
      normalizedItems.push({
        productId,
        productName: product.name,
        productImage: product.image,
        quantity,
        unitPrice,
        totalPrice,
      });
    }

    const shippingFee = calculateShippingFee(subtotal);
    const coupon = await getCouponByCode(couponCode);

    if (coupon && subtotal < coupon.minOrderValue) {
      return res.status(400).json({ message: `Đơn hàng cần tối thiểu ${coupon.minOrderValue.toLocaleString("vi-VN")}đ để áp dụng mã này.` });
    }

    const discountAmount = coupon ? calculateCouponDiscount(coupon, subtotal) : 0;
    const totalAmount = Math.max(0, subtotal + shippingFee - discountAmount);
    const loyaltyPoint = Math.floor(totalAmount / 10000);

    const order = await prisma.$transaction(async (tx) => {
      const created = await tx.order.create({
        data: {
          userId: req.user.id,
          addressId: selectedAddress.id,
          couponId: coupon?.id || null,
          code: `TMP-${Date.now()}`,
          customerName: selectedAddress.receiverName,
          customerEmail: user.email,
          customerPhone: selectedAddress.phone,
          shippingLine1: selectedAddress.line1,
          shippingWard: selectedAddress.ward,
          shippingDistrict: selectedAddress.district,
          shippingCity: selectedAddress.city,
          note: note || null,
          subtotal,
          shippingFee,
          discountAmount,
          total: totalAmount,
          paymentMethod: paymentMethod === "BANK_TRANSFER" ? "BANK_TRANSFER" : "COD",
          paymentStatus: paymentMethod === "COD" ? "PENDING" : "PAID",
          status: "PENDING",
          items: {
            create: normalizedItems.map((item) => ({
              productId: item.productId,
              productName: item.productName,
              productImage: item.productImage,
              quantity: item.quantity,
              price: item.unitPrice,
              total: item.totalPrice,
            })),
          },
        },
        include: {
          items: { include: { product: true } },
          address: true,
          coupon: true,
        },
      });

      for (const item of normalizedItems) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: item.quantity } },
        });
      }

      if (coupon) {
        await tx.coupon.update({ where: { id: coupon.id }, data: { usedCount: { increment: 1 } } });
      }

      await tx.user.update({ where: { id: req.user.id }, data: { loyaltyPoint: { increment: loyaltyPoint } } });
      const updated = await tx.order.update({
        where: { id: created.id },
        data: { code: formatOrderCode(created.id) },
        include: {
          items: { include: { product: true } },
          address: true,
          coupon: true,
        },
      });
      return updated;
    });

    return res.status(201).json({
      message: "Đặt hàng thành công. Đơn hàng của bạn đang chờ xác nhận.",
      order: serializeOrder(order),
      addedPoints: loyaltyPoint,
    });
  } catch (error) {
    return res.status(500).json({ message: "Không thể thanh toán đơn hàng.", error: error.message });
  }
});

router.get("/my-orders", protect, async (req, res) => {
  try {
    const orders = await prisma.order.findMany({
      where: { userId: req.user.id },
      include: {
        items: { include: { product: true } },
        address: true,
        coupon: true,
      },
      orderBy: { createdAt: "desc" },
    });
    return res.json(orders.map(serializeOrder));
  } catch (error) {
    return res.status(500).json({ message: "Không thể lấy lịch sử đơn hàng.", error: error.message });
  }
});

router.patch("/:id/cancel", protect, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const order = await prisma.order.findFirst({
      where: { id, userId: req.user.id },
      include: { items: true },
    });
    if (!order) {
      return res.status(404).json({ message: "Không tìm thấy đơn hàng." });
    }
    if (!["PENDING", "CONFIRMED"].includes(order.status)) {
      return res.status(400).json({ message: "Đơn hàng này không thể hủy ở trạng thái hiện tại." });
    }

    await prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id },
        data: {
          status: "CANCELLED",
          paymentStatus: order.paymentStatus === "PAID" ? "REFUNDED" : order.paymentStatus,
        },
      });
      for (const item of order.items) {
        await tx.product.update({ where: { id: item.productId }, data: { stock: { increment: item.quantity } } });
      }
    });

    return res.json({ message: "Đã hủy đơn hàng." });
  } catch (error) {
    return res.status(500).json({ message: "Không thể hủy đơn hàng.", error: error.message });
  }
});

router.get("/admin/all", protect, isAdmin, async (req, res) => {
  try {
    const status = req.query.status;
    const keyword = normalizeText(req.query.keyword || "");
    const page = Math.max(1, Number(req.query.page || 1));
    const limit = Math.min(30, Math.max(1, Number(req.query.limit || 10)));
    const skip = (page - 1) * limit;

    const where = {
      AND: [
        status ? { status } : {},
        keyword
          ? {
              OR: [
                { code: { contains: keyword } },
                { customerName: { contains: keyword } },
                { customerEmail: { contains: keyword } },
                { customerPhone: { contains: keyword } },
              ],
            }
          : {},
      ],
    };

    const [items, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          user: { select: { id: true, fullName: true, email: true } },
          items: true,
          coupon: true,
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.order.count({ where }),
    ]);

    return res.json({
      items,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    return res.status(500).json({ message: "Không thể lấy danh sách đơn hàng.", error: error.message });
  }
});

router.patch("/admin/:id/status", protect, isAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const status = req.body?.status;
    const paymentStatus = req.body?.paymentStatus;

    const order = await prisma.order.findUnique({ where: { id }, include: { items: true } });
    if (!order) {
      return res.status(404).json({ message: "Không tìm thấy đơn hàng." });
    }

    const allowedStatuses = ["PENDING", "CONFIRMED", "SHIPPING", "COMPLETED", "CANCELLED"];
    const allowedPaymentStatuses = ["PENDING", "PAID", "FAILED", "REFUNDED"];

    if (status && !allowedStatuses.includes(status)) {
      return res.status(400).json({ message: "Trạng thái đơn hàng không hợp lệ." });
    }
    if (paymentStatus && !allowedPaymentStatuses.includes(paymentStatus)) {
      return res.status(400).json({ message: "Trạng thái thanh toán không hợp lệ." });
    }

    if (status === "CANCELLED" && order.status !== "CANCELLED") {
      await prisma.$transaction(async (tx) => {
        await tx.order.update({
          where: { id },
          data: {
            status,
            paymentStatus: paymentStatus || order.paymentStatus,
          },
        });
        for (const item of order.items) {
          await tx.product.update({ where: { id: item.productId }, data: { stock: { increment: item.quantity } } });
        }
      });
      return res.json({ message: "Đã cập nhật và hoàn kho cho đơn bị hủy." });
    }

    await prisma.order.update({
      where: { id },
      data: {
        status: status || undefined,
        paymentStatus: paymentStatus || undefined,
      },
    });

    return res.json({ message: "Cập nhật trạng thái đơn hàng thành công." });
  } catch (error) {
    return res.status(500).json({ message: "Không thể cập nhật trạng thái đơn hàng.", error: error.message });
  }
});

router.get("/analytics", protect, isAdmin, async (_req, res) => {
  const activeRevenueStatuses = new Set(["CONFIRMED", "SHIPPING", "COMPLETED"]);
  const nonCancelledStatuses = new Set(["PENDING", "CONFIRMED", "SHIPPING", "COMPLETED"]);

  const toMoney = (value) => Number(Number(value || 0).toFixed(2));
  const monthKey = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
  const dayKey = (date) => date.toISOString().slice(0, 10);

  try {
    const [orders, users, products, categories] = await Promise.all([
      prisma.order.findMany({
        include: {
          user: { select: { id: true, fullName: true, email: true } },
          items: { include: { product: { include: { category: true } } } },
          coupon: true,
        },
        orderBy: { createdAt: "asc" },
      }),
      prisma.user.findMany({ select: { id: true, fullName: true, email: true, createdAt: true } }),
      prisma.product.findMany({ include: { category: true } }),
      prisma.category.findMany({ include: { products: true } }),
    ]);

    const now = new Date();
    const monthlySeed = [];
    for (let index = 5; index >= 0; index -= 1) {
      const date = new Date(now.getFullYear(), now.getMonth() - index, 1);
      monthlySeed.push({
        key: monthKey(date),
        label: date.toLocaleDateString("vi-VN", { month: "2-digit", year: "numeric" }),
        revenue: 0,
        orders: 0,
      });
    }
    const monthlyMap = new Map(monthlySeed.map((item) => [item.key, { ...item }]));

    const dailySeed = [];
    for (let index = 13; index >= 0; index -= 1) {
      const date = new Date(now);
      date.setDate(now.getDate() - index);
      const key = dayKey(date);
      dailySeed.push({
        key,
        label: date.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" }),
        revenue: 0,
        orders: 0,
      });
    }
    const dailyMap = new Map(dailySeed.map((item) => [item.key, { ...item }]));

    const userGrowthMap = new Map(monthlySeed.map((item) => [item.key, 0]));
    users.forEach((user) => {
      const key = monthKey(new Date(user.createdAt));
      if (userGrowthMap.has(key)) {
        userGrowthMap.set(key, userGrowthMap.get(key) + 1);
      }
    });

    let totalRevenue = 0;
    let deliveredRevenue = 0;
    let activeOrders = 0;

    const orderStatusDistribution = {};
    const revenueByCategory = {};
    const paymentMethodDistribution = {};
    const topProductsMap = {};
    const topCustomersMap = {};

    for (const order of orders) {
      const orderTotal = toMoney(order.total);
      const orderMonthKey = monthKey(new Date(order.createdAt));
      const orderDayKey = dayKey(new Date(order.createdAt));

      orderStatusDistribution[order.status] = (orderStatusDistribution[order.status] || 0) + 1;
      const paymentKey = `${order.paymentMethod} - ${order.paymentStatus}`;
      paymentMethodDistribution[paymentKey] = (paymentMethodDistribution[paymentKey] || 0) + orderTotal;

      if (nonCancelledStatuses.has(order.status)) {
        activeOrders += 1;
      }

      if (activeRevenueStatuses.has(order.status)) {
        totalRevenue += orderTotal;
        if (order.status === "COMPLETED") {
          deliveredRevenue += orderTotal;
        }

        const monthBucket = monthlyMap.get(orderMonthKey);
        if (monthBucket) {
          monthBucket.revenue += orderTotal;
          monthBucket.orders += 1;
        }

        const dayBucket = dailyMap.get(orderDayKey);
        if (dayBucket) {
          dayBucket.revenue += orderTotal;
          dayBucket.orders += 1;
        }
      }

      const customerKey = order.user?.email || order.customerEmail || `guest-${order.id}`;
      if (!topCustomersMap[customerKey]) {
        topCustomersMap[customerKey] = {
          name: order.user?.fullName || order.customerName,
          email: order.user?.email || order.customerEmail,
          orders: 0,
          totalSpent: 0,
        };
      }
      topCustomersMap[customerKey].orders += 1;
      if (activeRevenueStatuses.has(order.status)) {
        topCustomersMap[customerKey].totalSpent += orderTotal;
      }

      if (!activeRevenueStatuses.has(order.status)) {
        continue;
      }

      for (const item of order.items) {
        const soldKey = item.product?.name || item.productName;
        if (!topProductsMap[soldKey]) {
          topProductsMap[soldKey] = { name: soldKey, quantity: 0, revenue: 0 };
        }
        topProductsMap[soldKey].quantity += Number(item.quantity || 0);
        topProductsMap[soldKey].revenue += toMoney(item.total);

        const categoryName = item.product?.category?.name || "Khác";
        revenueByCategory[categoryName] = (revenueByCategory[categoryName] || 0) + toMoney(item.total);
      }
    }

    const metrics = {
      revenue: toMoney(totalRevenue),
      deliveredRevenue: toMoney(deliveredRevenue),
      orderCount: orders.length,
      activeOrders,
      userCount: users.length,
      productCount: products.length,
      lowStockCount: products.filter((item) => item.stock <= 5).length,
      pendingOrders: orders.filter((item) => item.status === "PENDING").length,
      averageOrderValue: activeOrders ? toMoney(totalRevenue / activeOrders) : 0,
    };

    const lowStockProducts = products
      .filter((item) => item.stock <= 5)
      .map((item) => ({ id: item.id, name: item.name, stock: item.stock, category: item.category?.name || "" }))
      .sort((a, b) => a.stock - b.stock)
      .slice(0, 10);

    const topProducts = Object.values(topProductsMap)
      .map((item) => ({ ...item, revenue: toMoney(item.revenue) }))
      .sort((a, b) => b.quantity - a.quantity || b.revenue - a.revenue)
      .slice(0, 8);

    const topCustomers = Object.values(topCustomersMap)
      .map((item) => ({ ...item, totalSpent: toMoney(item.totalSpent) }))
      .sort((a, b) => b.totalSpent - a.totalSpent || b.orders - a.orders)
      .slice(0, 8);

    return res.json({
      metrics,
      charts: {
        revenueByMonth: Array.from(monthlyMap.values()).map((item) => ({
          label: item.label,
          value: toMoney(item.revenue),
          orders: item.orders,
        })),
        revenueLast14Days: Array.from(dailyMap.values()).map((item) => ({
          label: item.label,
          value: toMoney(item.revenue),
          orders: item.orders,
        })),
        userGrowth: Array.from(monthlyMap.values()).map((item) => ({
          label: item.label,
          value: userGrowthMap.get(item.key) || 0,
        })),
        orderStatusDistribution: Object.entries(orderStatusDistribution).map(([name, value]) => ({ name, value })),
        revenueByCategory: Object.entries(revenueByCategory)
          .map(([name, value]) => ({ name, value: toMoney(value) }))
          .sort((a, b) => b.value - a.value),
        paymentMethodDistribution: Object.entries(paymentMethodDistribution)
          .map(([name, value]) => ({ name, value: toMoney(value) }))
          .sort((a, b) => b.value - a.value),
        topProducts,
        topCustomers,
      },
      lowStockProducts,
      categorySummary: categories.map((item) => ({ id: item.id, name: item.name, productCount: item.products.length })),
    });
  } catch (error) {
    return res.status(500).json({ message: "Không thể lấy dữ liệu thống kê.", error: error.message });
  }
});

export default router;
