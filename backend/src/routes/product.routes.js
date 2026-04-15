import express from "express";
import slugify from "slugify";
import { prisma } from "../lib/prisma.js";
import { protect } from "../middleware/authMiddleware.js";
import { isAdmin } from "../middleware/roleMiddleware.js";

const router = express.Router();

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function serializeProduct(product) {
  const finalPrice = toNumber(product.price);
  const oldPrice = product.compareAtPrice != null ? toNumber(product.compareAtPrice) : null;
  const discountPct = oldPrice && oldPrice > finalPrice ? Math.round(((oldPrice - finalPrice) / oldPrice) * 100) : 0;

  return {
    ...product,
    price: finalPrice,
    finalPrice,
    oldPrice,
    discountPct,
    image: product.imageUrl,
    detail: product.description,
    wishlistCount: product._count?.wishlistItems || 0,
    reviews: Array.isArray(product.reviews)
      ? product.reviews.map((review) => ({
          ...review,
          user: review.user ? { id: review.user.id, fullName: review.user.fullName } : null,
        }))
      : [],
  };
}

function buildOrderBy(sort) {
  switch (sort) {
    case "price_asc":
      return { price: "asc" };
    case "price_desc":
      return { price: "desc" };
    case "best_rating":
      return { rating: "desc" };
    case "name_asc":
      return { name: "asc" };
    default:
      return { createdAt: "desc" };
  }
}

router.get("/", async (req, res) => {
  const page = Math.max(parseInt(req.query.page || "1", 10), 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit || "12", 10), 1), 60);
  const skip = (page - 1) * limit;

  const where = { active: true };

  if (req.query.search) {
    where.OR = [
      { name: { contains: req.query.search } },
      { description: { contains: req.query.search } },
      { brand: { contains: req.query.search } },
      { tag: { contains: req.query.search } },
    ];
  }

  if (req.query.categoryId) {
    where.categoryId = Number(req.query.categoryId);
  }

  if (req.query.minPrice || req.query.maxPrice) {
    where.price = {};
    if (req.query.minPrice) where.price.gte = Number(req.query.minPrice);
    if (req.query.maxPrice) where.price.lte = Number(req.query.maxPrice);
  }

  if (req.query.minRating) {
    where.rating = { gte: Number(req.query.minRating) };
  }

  if (req.query.featured === "true") {
    where.featured = true;
  }

  const [items, total] = await Promise.all([
    prisma.product.findMany({
      where,
      skip,
      take: limit,
      orderBy: buildOrderBy(req.query.sort),
      include: {
        category: true,
        reviews: { include: { user: { select: { id: true, fullName: true } } }, orderBy: { createdAt: "desc" } },
        _count: { select: { wishlistItems: true } },
      },
    }),
    prisma.product.count({ where }),
  ]);

  return res.json({
    items: items.map(serializeProduct),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
  });
});

router.get("/featured", async (_req, res) => {
  const items = await prisma.product.findMany({
    where: { active: true, featured: true },
    take: 8,
    orderBy: { createdAt: "desc" },
    include: {
      category: true,
      reviews: { include: { user: { select: { id: true, fullName: true } } }, orderBy: { createdAt: "desc" } },
      _count: { select: { wishlistItems: true } },
    },
  });

  return res.json(items.map(serializeProduct));
});

router.get("/:slugOrId", async (req, res) => {
  const raw = req.params.slugOrId;
  const where = /^\d+$/.test(raw) ? { id: Number(raw) } : { slug: raw };

  const product = await prisma.product.findFirst({
    where: { ...where, active: true },
    include: {
      category: true,
      reviews: { include: { user: { select: { id: true, fullName: true } } }, orderBy: { createdAt: "desc" } },
      _count: { select: { wishlistItems: true } },
    },
  });

  if (!product) {
    return res.status(404).json({ message: "Không tìm thấy sản phẩm." });
  }

  const relatedProducts = await prisma.product.findMany({
    where: { active: true, categoryId: product.categoryId, id: { not: product.id } },
    take: 4,
    orderBy: { createdAt: "desc" },
    include: {
      category: true,
      reviews: { include: { user: { select: { id: true, fullName: true } } }, orderBy: { createdAt: "desc" } },
      _count: { select: { wishlistItems: true } },
    },
  });

  return res.json({
    ...serializeProduct(product),
    relatedProducts: relatedProducts.map(serializeProduct),
  });
});

router.post("/", protect, isAdmin, async (req, res) => {
  const {
    name,
    brand,
    categoryId,
    stock,
    image,
    oldPrice,
    finalPrice,
    price,
    tag,
    description,
    detail,
    featured,
  } = req.body;

  if (!name || !categoryId) {
    return res.status(400).json({ message: "Tên và danh mục là bắt buộc." });
  }

  const basePrice = toNumber(finalPrice ?? price, 0);
  if (basePrice <= 0) {
    return res.status(400).json({ message: "Giá sản phẩm phải lớn hơn 0." });
  }

  const created = await prisma.product.create({
    data: {
      name,
      slug: slugify(name, { lower: true, strict: true }),
      brand: brand || null,
      categoryId: Number(categoryId),
      stock: toNumber(stock, 0),
      imageUrl: image || null,
      compareAtPrice: oldPrice != null && oldPrice !== "" ? toNumber(oldPrice, 0) : null,
      price: basePrice,
      tag: tag || null,
      description: detail || description || null,
      featured: Boolean(featured),
      active: true,
    },
    include: {
      category: true,
      reviews: { include: { user: { select: { id: true, fullName: true } } } },
      _count: { select: { wishlistItems: true } },
    },
  });

  return res.status(201).json(serializeProduct(created));
});

router.put("/:id", protect, isAdmin, async (req, res) => {
  const id = Number(req.params.id);
  const {
    name,
    brand,
    categoryId,
    stock,
    image,
    oldPrice,
    finalPrice,
    price,
    tag,
    description,
    detail,
    featured,
    active,
  } = req.body;

  const existing = await prisma.product.findUnique({ where: { id } });
  if (!existing) {
    return res.status(404).json({ message: "Không tìm thấy sản phẩm." });
  }

  const nextName = name || existing.name;
  const nextPrice = toNumber(finalPrice ?? price ?? existing.price, toNumber(existing.price));

  const updated = await prisma.product.update({
    where: { id },
    data: {
      name: nextName,
      slug: slugify(nextName, { lower: true, strict: true }),
      brand: brand !== undefined ? brand || null : existing.brand,
      categoryId: categoryId !== undefined ? Number(categoryId) : existing.categoryId,
      stock: stock !== undefined ? toNumber(stock, 0) : existing.stock,
      imageUrl: image !== undefined ? image || null : existing.imageUrl,
      compareAtPrice: oldPrice !== undefined ? (oldPrice === "" || oldPrice == null ? null : toNumber(oldPrice, 0)) : existing.compareAtPrice,
      price: nextPrice,
      tag: tag !== undefined ? tag || null : existing.tag,
      description: detail !== undefined ? detail || null : description !== undefined ? description || null : existing.description,
      featured: featured !== undefined ? Boolean(featured) : existing.featured,
      active: active !== undefined ? Boolean(active) : existing.active,
    },
    include: {
      category: true,
      reviews: { include: { user: { select: { id: true, fullName: true } } } },
      _count: { select: { wishlistItems: true } },
    },
  });

  return res.json(serializeProduct(updated));
});

router.delete("/:id", protect, isAdmin, async (req, res) => {
  const id = Number(req.params.id);
  const existing = await prisma.product.findUnique({ where: { id } });
  if (!existing) {
    return res.status(404).json({ message: "Không tìm thấy sản phẩm." });
  }

  await prisma.product.update({ where: { id }, data: { active: false } });
  return res.json({ message: "Đã ẩn sản phẩm khỏi cửa hàng." });
});

export default router;
