import { Link } from "react-router-dom";
import { useShop } from "../context/ShopContext.jsx";
import { formatCurrency, getDiscountPercent } from "../utils/format.js";

export default function ProductCard({ product }) {
  const { addToCart, toggleWishlist, wishlistIds, user, showToast } = useShop();
  const isLoved = wishlistIds.has(product.id);
  const discount = getDiscountPercent(product);

  async function onWishlistClick() {
    try {
      await toggleWishlist(product.id);
    } catch (error) {
      showToast(error.message, "error");
    }
  }

  return (
    <article className="product-card">
      <button
        className={`wishlist-btn ${isLoved ? "active" : ""}`}
        onClick={onWishlistClick}
        aria-label={isLoved ? "Bỏ yêu thích" : "Thêm yêu thích"}
        type="button"
      >
        ♥
      </button>

      <Link to={`/products/${product.id}`} className="product-image-wrap">
        <img src={product.image} alt={product.name} className="product-image" />
      </Link>

      <div className="product-content">
        <div className="row between">
          <span className="badge soft">{product.category?.name || "Sản phẩm"}</span>
          {discount > 0 && <span className="badge danger">-{discount}%</span>}
        </div>
        <Link to={`/products/${product.id}`} className="product-title">
          {product.name}
        </Link>
        <p className="product-desc">{product.description}</p>
        <div className="rating-row">
          <span>⭐ {Number(product.rating || 0).toFixed(1)}</span>
          <span>{product.ratingCount || product._count?.reviews || 0} đánh giá</span>
          <span>{product.stock > 0 ? `Còn ${product.stock}` : "Hết hàng"}</span>
        </div>
        <div className="price-row">
          <strong>{formatCurrency(product.finalPrice || product.price)}</strong>
          {product.oldPrice ? <span>{formatCurrency(product.oldPrice)}</span> : null}
        </div>
        <button
          className="btn primary full"
          onClick={() => addToCart(product, 1)}
          disabled={product.stock <= 0}
          type="button"
        >
          {product.stock > 0 ? "Thêm vào giỏ" : "Tạm hết hàng"}
        </button>
      </div>
    </article>
  );
}
