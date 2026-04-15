import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import authRoutes from "./routes/auth.routes.js";
import addressRoutes from "./routes/address.routes.js";
import categoryRoutes from "./routes/category.routes.js";
import couponRoutes from "./routes/coupon.routes.js";
import orderRoutes from "./routes/order.routes.js";
import productRoutes from "./routes/product.routes.js";
import reviewRoutes from "./routes/review.routes.js";
import uploadRoutes from "./routes/upload.routes.js";
import usersRoutes from "./routes/users.routes.js";
import wishlistRoutes from "./routes/wishlist.routes.js";

dotenv.config();

const app = express();

app.use(cors({ origin: [process.env.FRONTEND_URL, "http://localhost:5173"].filter(Boolean) }));
app.use(express.json({ limit: "10mb" }));

app.get("/", (_req, res) => {
  res.json({ message: "ShopNow backend is running" });
});

app.use("/api/auth", authRoutes);
app.use("/api/addresses", addressRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/coupons", couponRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/products", productRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/wishlist", wishlistRoutes);

export default app;
