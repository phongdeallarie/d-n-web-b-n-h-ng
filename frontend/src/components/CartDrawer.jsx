import { Link } from "react-router-dom";
import { useShop } from "../context/ShopContext.jsx";
import { formatCurrency } from "../utils/format.js";

export default function CartDrawer() {
  const {
    cartOpen,
    setCartOpen,
    cartItems,
    cartSubtotal,
    updateCartQuantity,
    removeFromCart,
  } = useShop();

  if (!cartOpen) return null;

  return (
    <div className="drawer-overlay" onClick={() => setCartOpen(false)}>
      <aside className="drawer" onClick={(e) => e.stopPropagation()}>
        <div className="drawer-header">
          <h3>Giỏ hàng của bạn</h3>
          <button className="icon-btn" onClick={() => setCartOpen(false)} type="button">✕</button>
        </div>

        <div className="drawer-body">
          {cartItems.length === 0 ? (
            <div className="empty-state compact">
              <p>Chưa có sản phẩm nào trong giỏ hàng.</p>
            </div>
          ) : (
            cartItems.map((item) => (
              <div key={item.productId} className="cart-item">
                <img src={item.product?.image} alt={item.product?.name} />
                <div className="cart-item-content">
                  <strong>{item.product?.name}</strong>
                  <span>{formatCurrency(item.product?.finalPrice || item.product?.price)}</span>
                  <div className="qty-row">
                    <button type="button" onClick={() => updateCartQuantity(item.productId, item.quantity - 1)}>-</button>
                    <span>{item.quantity}</span>
                    <button type="button" onClick={() => updateCartQuantity(item.productId, item.quantity + 1)}>+</button>
                  </div>
                </div>
                <button className="text-btn danger-text" type="button" onClick={() => removeFromCart(item.productId)}>
                  Xóa
                </button>
              </div>
            ))
          )}
        </div>

        <div className="drawer-footer">
          <div className="row between total-row">
            <span>Tạm tính</span>
            <strong>{formatCurrency(cartSubtotal)}</strong>
          </div>
          <Link className="btn primary full" to="/orders" onClick={() => setCartOpen(false)}>
            Xem đơn hàng / Thanh toán
          </Link>
        </div>
      </aside>
    </div>
  );
}
