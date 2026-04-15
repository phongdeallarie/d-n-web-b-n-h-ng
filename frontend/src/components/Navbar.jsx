import { Link, NavLink, useNavigate } from "react-router-dom";
import { useShop } from "../context/ShopContext.jsx";

export default function Navbar() {
  const { user, cartCount, setCartOpen, logout, categories } = useShop();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/");
  }

  return (
    <header className="site-header">
      <div className="container nav-shell">
        <Link to="/" className="brand">ShopNow</Link>

        <nav className="nav-links">
          <NavLink to="/">Trang chủ</NavLink>
          <NavLink to="/wishlist">Yêu thích</NavLink>
          <NavLink to="/orders">Đơn hàng</NavLink>
          {user?.role === "ADMIN" ? <NavLink to="/admin">Quản trị</NavLink> : null}
        </nav>

        <div className="nav-actions">
          <button type="button" className="cart-chip" onClick={() => setCartOpen(true)}>
            🛒 <span>{cartCount}</span>
          </button>
          {user ? (
            <div className="user-actions">
              <Link to="/profile" className="nav-user">{user.fullName?.split(" ").slice(-1)[0] || "Tài khoản"}</Link>
              <button className="text-btn" type="button" onClick={handleLogout}>Đăng xuất</button>
            </div>
          ) : (
            <Link to="/auth" className="btn outline small">Đăng nhập</Link>
          )}
        </div>
      </div>
      <div className="category-strip">
        <div className="container category-list">
          {categories.slice(0, 8).map((category) => (
            <Link key={category.id} to={`/?category=${category.id}`} className="category-chip">
              {category.name}
            </Link>
          ))}
        </div>
      </div>
    </header>
  );
}
