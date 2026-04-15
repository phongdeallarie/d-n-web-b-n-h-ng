import { useMemo, useState } from "react";
import { apiFetch } from "../api/client.js";
import { useShop } from "../context/ShopContext.jsx";
import { formatCurrency, formatDate, statusLabel } from "../utils/format.js";
import { Link } from "react-router-dom";

export default function OrdersPage() {
  const { user, orders, cartItems, cartSubtotal, checkout, showToast, cancelOrder } = useShop();
  const [couponCode, setCouponCode] = useState("");
  const [couponInfo, setCouponInfo] = useState(null);
  const [loadingCheckout, setLoadingCheckout] = useState(false);
  const [checkoutForm, setCheckoutForm] = useState({ addressId: "", paymentMethod: "COD", note: "" });

  const shippingFee = useMemo(() => {
    if (cartSubtotal >= 1000000) return 0;
    if (cartSubtotal >= 500000) return 15000;
    return cartItems.length ? 30000 : 0;
  }, [cartItems.length, cartSubtotal]);

  const discountAmount = useMemo(() => {
    if (!couponInfo) return 0;
    if (couponInfo.discountType === "percent") {
      const raw = cartSubtotal * (couponInfo.discountValue / 100);
      return Math.min(raw, couponInfo.maxDiscount || raw);
    }
    return Math.min(couponInfo.discountValue, cartSubtotal);
  }, [couponInfo, cartSubtotal]);

  const total = Math.max(0, cartSubtotal + shippingFee - discountAmount);

  async function validateCoupon() {
    try {
      const data = await apiFetch("/coupons/validate", {
        method: "POST",
        body: JSON.stringify({ code: couponCode, subtotal: cartSubtotal }),
      });
      setCouponInfo(data.coupon);
      showToast(data.message || "Áp dụng mã thành công.");
    } catch (error) {
      setCouponInfo(null);
      showToast(error.message, "error");
    }
  }

  async function handleCheckout() {
    if (!user) {
      showToast("Vui lòng đăng nhập trước khi thanh toán.", "error");
      return;
    }
    setLoadingCheckout(true);
    try {
      await checkout({
        items: cartItems.map((item) => ({ productId: item.productId, quantity: item.quantity })),
        addressId: checkoutForm.addressId ? Number(checkoutForm.addressId) : undefined,
        paymentMethod: checkoutForm.paymentMethod,
        couponCode: couponInfo?.code || couponCode,
        note: checkoutForm.note,
      });
      setCouponCode("");
      setCouponInfo(null);
    } catch (error) {
      showToast(error.message, "error");
    } finally {
      setLoadingCheckout(false);
    }
  }

  if (!user) {
    return (
      <div className="container page-section">
        <div className="empty-state">
          <h1>Bạn chưa đăng nhập</h1>
          <p>Đăng nhập để tiến hành thanh toán và xem lịch sử đơn hàng.</p>
          <Link className="btn primary" to="/auth">Đăng nhập ngay</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container page-section">
      <div className="section-heading">
        <h1>Thanh toán & đơn hàng</h1>
        <p>Giỏ hàng hiện tại và lịch sử mua sắm của bạn.</p>
      </div>

      <section className="detail-grid-two">
        <div className="card-panel">
          <h2>Giỏ hàng hiện tại</h2>
          {cartItems.length === 0 ? (
            <p>Giỏ hàng đang trống. Hãy quay lại trang chủ để chọn sản phẩm.</p>
          ) : (
            <>
              <div className="checkout-items">
                {cartItems.map((item) => (
                  <div className="checkout-item" key={item.productId}>
                    <img src={item.product?.image} alt={item.product?.name} />
                    <div>
                      <strong>{item.product?.name}</strong>
                      <p>Số lượng: {item.quantity}</p>
                    </div>
                    <strong>{formatCurrency((item.product?.finalPrice || item.product?.price || 0) * item.quantity)}</strong>
                  </div>
                ))}
              </div>

              <div className="form-grid top-space">
                <label>
                  Chọn địa chỉ giao hàng
                  <select value={checkoutForm.addressId} onChange={(e) => setCheckoutForm((p) => ({ ...p, addressId: e.target.value }))}>
                    <option value="">Dùng địa chỉ mặc định</option>
                    {(user.addresses || []).map((address) => (
                      <option key={address.id} value={address.id}>
                        {address.receiverName} - {address.line1}, {address.city} {address.isDefault ? "(Mặc định)" : ""}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Phương thức thanh toán
                  <select value={checkoutForm.paymentMethod} onChange={(e) => setCheckoutForm((p) => ({ ...p, paymentMethod: e.target.value }))}>
                    <option value="COD">Thanh toán khi nhận hàng</option>
                    <option value="BANK_TRANSFER">Chuyển khoản</option>
                    <option value="MOMO">MoMo</option>
                    <option value="VNPAY">VNPay</option>
                  </select>
                </label>
                <label>
                  Ghi chú đơn hàng
                  <textarea rows="4" value={checkoutForm.note} onChange={(e) => setCheckoutForm((p) => ({ ...p, note: e.target.value }))} />
                </label>
                <div className="coupon-row">
                  <input value={couponCode} onChange={(e) => setCouponCode(e.target.value.toUpperCase())} placeholder="Nhập mã giảm giá" />
                  <button className="btn outline" type="button" onClick={validateCoupon}>Áp dụng</button>
                </div>
              </div>

              <div className="summary-box">
                <div className="row between"><span>Tạm tính</span><strong>{formatCurrency(cartSubtotal)}</strong></div>
                <div className="row between"><span>Phí vận chuyển</span><strong>{formatCurrency(shippingFee)}</strong></div>
                <div className="row between"><span>Giảm giá</span><strong>-{formatCurrency(discountAmount)}</strong></div>
                <div className="row between total-row"><span>Tổng thanh toán</span><strong>{formatCurrency(total)}</strong></div>
              </div>

              <button className="btn primary full top-space" type="button" onClick={handleCheckout} disabled={loadingCheckout || !cartItems.length}>
                {loadingCheckout ? "Đang tạo đơn hàng..." : "Xác nhận thanh toán"}
              </button>
            </>
          )}
        </div>

        <div className="card-panel">
          <h2>Lịch sử đơn hàng</h2>
          {orders.length === 0 ? (
            <p>Bạn chưa có đơn hàng nào.</p>
          ) : (
            <div className="order-history-list">
              {orders.map((order) => (
                <div className="order-card" key={order.id}>
                  <div className="row between wrap">
                    <div>
                      <strong>{order.code}</strong>
                      <p>{formatDate(order.createdAt)}</p>
                    </div>
                    <div className="order-status-stack">
                      <span className="badge soft">{statusLabel(order.status)}</span>
                      <span className="badge">{statusLabel(order.paymentStatus)}</span>
                    </div>
                  </div>
                  <p>Người nhận: {order.customerName} • {order.customerPhone}</p>
                  <p>Địa chỉ: {order.shippingLine1}, {order.shippingDistrict ? `${order.shippingDistrict}, ` : ""}{order.shippingCity}</p>
                  <div className="mini-order-items">
                    {order.items.map((item) => (
                      <div key={item.id} className="row between"><span>{item.productName} × {item.quantity}</span><strong>{formatCurrency(item.totalPrice)}</strong></div>
                    ))}
                  </div>
                  <div className="row between total-row"><span>Tổng tiền</span><strong>{formatCurrency(order.totalAmount)}</strong></div>
                  {order.note ? <p className="muted-text">Ghi chú: {order.note}</p> : null}
                  {["PENDING", "CONFIRMED"].includes(order.status) ? (
                    <button className="btn outline danger-outline" type="button" onClick={() => cancelOrder(order.id)}>Hủy đơn</button>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
