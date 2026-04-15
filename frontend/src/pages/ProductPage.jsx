import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { apiFetch } from "../api/client.js";
import Loading from "../components/Loading.jsx";
import ProductCard from "../components/ProductCard.jsx";
import { useShop } from "../context/ShopContext.jsx";
import { formatCurrency } from "../utils/format.js";

function StarInput({ value, onChange }) {
  return (
    <div className="star-input">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          className={star <= value ? "active" : ""}
          onClick={() => onChange(star)}
        >
          ★
        </button>
      ))}
    </div>
  );
}

export default function ProductPage() {
  const { id } = useParams();
  const { addToCart, user, showToast } = useShop();
  const [loading, setLoading] = useState(true);
  const [product, setProduct] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [reviewForm, setReviewForm] = useState({ rating: 5, comment: "" });
  const [submittingReview, setSubmittingReview] = useState(false);

  async function fetchDetail() {
    setLoading(true);
    try {
      const data = await apiFetch(`/products/${id}`);
      setProduct(data);
    } catch (error) {
      showToast(error.message, "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchDetail();
  }, [id]);

  const inStock = useMemo(() => Number(product?.stock || 0) > 0, [product]);

  async function handleReviewSubmit(e) {
    e.preventDefault();
    setSubmittingReview(true);
    try {
      await apiFetch(`/reviews/product/${id}`, {
        method: "POST",
        body: JSON.stringify(reviewForm),
      });
      setReviewForm({ rating: 5, comment: "" });
      showToast("Đã gửi đánh giá.");
      await fetchDetail();
    } catch (error) {
      showToast(error.message, "error");
    } finally {
      setSubmittingReview(false);
    }
  }

  if (loading) return <Loading text="Đang tải chi tiết sản phẩm..." />;
  if (!product) return <div className="container page-section"><div className="empty-state"><p>Không tìm thấy sản phẩm.</p></div></div>;

  return (
    <div className="container page-section">
      <section className="product-detail-layout">
        <div className="product-gallery-card">
          <img src={product.image} alt={product.name} className="product-detail-image" />
        </div>
        <div className="product-detail-card">
          <div className="row gap wrap">
            <span className="badge soft">{product.category?.name}</span>
            {product.brand ? <span className="badge">{product.brand}</span> : null}
            {product.tag ? <span className="badge warning">{product.tag}</span> : null}
          </div>
          <h1>{product.name}</h1>
          <div className="rating-row larger">
            <span>⭐ {Number(product.rating || 0).toFixed(1)}</span>
            <span>{product.reviews?.length || 0} đánh giá</span>
            <span>{inStock ? `Còn ${product.stock} sản phẩm` : "Hết hàng"}</span>
          </div>
          <div className="price-row big">
            <strong>{formatCurrency(product.finalPrice || product.price)}</strong>
            {product.oldPrice ? <span>{formatCurrency(product.oldPrice)}</span> : null}
          </div>
          <p className="product-long-desc">{product.description}</p>
          {product.detail ? <div className="rich-detail">{product.detail}</div> : null}

          <div className="purchase-box">
            <div className="qty-inline">
              <button type="button" onClick={() => setQuantity((q) => Math.max(1, q - 1))}>-</button>
              <span>{quantity}</span>
              <button type="button" onClick={() => setQuantity((q) => Math.min(product.stock || q + 1, q + 1))}>+</button>
            </div>
            <button className="btn primary" disabled={!inStock} onClick={() => addToCart(product, quantity)} type="button">
              {inStock ? "Thêm vào giỏ hàng" : "Tạm hết hàng"}
            </button>
          </div>
        </div>
      </section>

      <section className="detail-grid-two">
        <div className="card-panel">
          <h2>Đánh giá từ khách hàng</h2>
          {product.reviews?.length ? (
            <div className="review-list">
              {product.reviews.map((review) => (
                <div className="review-item" key={review.id}>
                  <div className="row between">
                    <strong>{review.user?.fullName || "Người dùng"}</strong>
                    <span>{"★".repeat(review.rating)}{"☆".repeat(5 - review.rating)}</span>
                  </div>
                  <p>{review.comment || "Không có nhận xét."}</p>
                </div>
              ))}
            </div>
          ) : (
            <p>Chưa có đánh giá nào cho sản phẩm này.</p>
          )}
        </div>

        <div className="card-panel">
          <h2>Viết đánh giá</h2>
          {user ? (
            <form className="form-grid" onSubmit={handleReviewSubmit}>
              <label>
                Số sao
                <StarInput value={reviewForm.rating} onChange={(rating) => setReviewForm((prev) => ({ ...prev, rating }))} />
              </label>
              <label>
                Nhận xét
                <textarea
                  rows="5"
                  value={reviewForm.comment}
                  onChange={(e) => setReviewForm((prev) => ({ ...prev, comment: e.target.value }))}
                  placeholder="Chia sẻ trải nghiệm của bạn"
                />
              </label>
              <button className="btn primary" type="submit" disabled={submittingReview}>
                {submittingReview ? "Đang gửi..." : "Gửi đánh giá"}
              </button>
            </form>
          ) : (
            <p>Vui lòng đăng nhập và đã mua sản phẩm trước khi gửi đánh giá.</p>
          )}
        </div>
      </section>

      {product.relatedProducts?.length ? (
        <section className="related-section">
          <div className="section-heading">
            <h2>Sản phẩm liên quan</h2>
          </div>
          <div className="product-grid">
            {product.relatedProducts.map((item) => (
              <ProductCard key={item.id} product={item} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
