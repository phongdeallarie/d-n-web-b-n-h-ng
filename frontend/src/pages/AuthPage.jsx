import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useShop } from "../context/ShopContext.jsx";

export default function AuthPage() {
  const { login, register, showToast } = useShop();
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ fullName: "", phone: "", email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "login") {
        await login(form.email, form.password);
      } else {
        await register(form);
      }
      navigate(location.state?.from || "/");
    } catch (error) {
      showToast(error.message, "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container page-section auth-wrap">
      <div className="auth-panel">
        <div className="auth-switch">
          <button className={mode === "login" ? "active" : ""} type="button" onClick={() => setMode("login")}>Đăng nhập</button>
          <button className={mode === "register" ? "active" : ""} type="button" onClick={() => setMode("register")}>Đăng ký</button>
        </div>
        <h1>{mode === "login" ? "Chào mừng bạn quay lại" : "Tạo tài khoản mới"}</h1>
        <p>Đăng nhập để lưu đơn hàng, wishlist, địa chỉ giao nhận và đánh giá sản phẩm.</p>

        <form className="form-grid" onSubmit={handleSubmit}>
          {mode === "register" ? (
            <>
              <label>
                Họ và tên
                <input value={form.fullName} onChange={(e) => setForm((p) => ({ ...p, fullName: e.target.value }))} required />
              </label>
              <label>
                Số điện thoại
                <input value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} />
              </label>
            </>
          ) : null}
          <label>
            Email
            <input type="email" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} required />
          </label>
          <label>
            Mật khẩu
            <input type="password" value={form.password} onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))} required />
          </label>
          <button className="btn primary full" type="submit" disabled={loading}>
            {loading ? "Đang xử lý..." : mode === "login" ? "Đăng nhập" : "Tạo tài khoản"}
          </button>
        </form>
      </div>
    </div>
  );
}
