import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../api/client.js";
import Loading from "../components/Loading.jsx";
import { useShop } from "../context/ShopContext.jsx";
import { formatCurrency, formatDate, statusLabel } from "../utils/format.js";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
} from "recharts";

const productInitial = {
  name: "",
  brand: "",
  description: "",
  detail: "",
  price: "",
  oldPrice: "",
  discountPct: "",
  tag: "",
  image: "",
  stock: "",
  categoryId: "",
  featured: false,
};

const couponInitial = {
  code: "",
  description: "",
  discountType: "percent",
  discountValue: "",
  minOrderValue: "",
  maxDiscount: "",
  usageLimit: "",
  startsAt: "",
  endsAt: "",
  isActive: true,
};

const COLORS = ["#2563eb", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#14b8a6"];

function MetricCard({ label, value }) {
  return (
    <div className="metric-card">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function AdminTable({ columns, rows, renderActions }) {
  return (
    <div className="table-wrap">
      <table className="admin-table">
        <thead>
          <tr>
            {columns.map((col) => <th key={col.key}>{col.label}</th>)}
            {renderActions ? <th>Thao tác</th> : null}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              {columns.map((col) => <td key={col.key}>{col.render ? col.render(row) : row[col.key]}</td>)}
              {renderActions ? <td>{renderActions(row)}</td> : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function AdminPage() {
  const { showToast, categories } = useShop();
  const [tab, setTab] = useState("dashboard");
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState(null);
  const [products, setProducts] = useState([]);
  const [coupons, setCoupons] = useState([]);
  const [users, setUsers] = useState([]);
  const [ordersData, setOrdersData] = useState({ items: [], pagination: { page: 1, totalPages: 1 } });
  const [productForm, setProductForm] = useState(productInitial);
  const [editingProductId, setEditingProductId] = useState(null);
  const [couponForm, setCouponForm] = useState(couponInitial);
  const [editingCouponId, setEditingCouponId] = useState(null);
  const [uploading, setUploading] = useState(false);

  async function loadData() {
    setLoading(true);
    try {
      const [analyticsData, productData, couponData, userData, orderData] = await Promise.all([
        apiFetch("/orders/analytics"),
        apiFetch("/products?limit=100"),
        apiFetch("/coupons"),
        apiFetch("/users"),
        apiFetch("/orders/admin/all?limit=50"),
      ]);
      setAnalytics(analyticsData);
      setProducts(productData.items || []);
      setCoupons(couponData);
      setUsers(userData);
      setOrdersData(orderData);
    } catch (error) {
      showToast(error.message, "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function submitProduct(e) {
    e.preventDefault();
    try {
      if (editingProductId) {
        await apiFetch(`/products/${editingProductId}`, { method: "PUT", body: JSON.stringify(productForm) });
        showToast("Đã cập nhật sản phẩm.");
      } else {
        await apiFetch("/products", { method: "POST", body: JSON.stringify(productForm) });
        showToast("Đã tạo sản phẩm mới.");
      }
      setProductForm(productInitial);
      setEditingProductId(null);
      loadData();
    } catch (error) {
      showToast(error.message, "error");
    }
  }

  async function submitCoupon(e) {
    e.preventDefault();
    try {
      if (editingCouponId) {
        await apiFetch(`/coupons/${editingCouponId}`, { method: "PUT", body: JSON.stringify(couponForm) });
        showToast("Đã cập nhật coupon.");
      } else {
        await apiFetch("/coupons", { method: "POST", body: JSON.stringify(couponForm) });
        showToast("Đã tạo coupon mới.");
      }
      setCouponForm(couponInitial);
      setEditingCouponId(null);
      loadData();
    } catch (error) {
      showToast(error.message, "error");
    }
  }

  async function handleUpload(file) {
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const data = await apiFetch("/upload/image", { method: "POST", body: formData });
      setProductForm((prev) => ({ ...prev, image: data.url }));
      showToast("Upload ảnh thành công.");
    } catch (error) {
      showToast(error.message, "error");
    } finally {
      setUploading(false);
    }
  }

  const productColumns = useMemo(() => [
    { key: "name", label: "Sản phẩm" },
    { key: "category", label: "Danh mục", render: (row) => row.category?.name || "" },
    { key: "price", label: "Giá", render: (row) => formatCurrency(row.finalPrice || row.price) },
    { key: "stock", label: "Kho" },
    { key: "rating", label: "Đánh giá", render: (row) => Number(row.rating || 0).toFixed(1) },
  ], []);

  const couponColumns = useMemo(() => [
    { key: "code", label: "Mã" },
    { key: "discountType", label: "Loại" },
    { key: "discountValue", label: "Giảm", render: (row) => row.discountType === "percent" ? `${row.discountValue}%` : formatCurrency(row.discountValue) },
    { key: "minOrderValue", label: "Đơn tối thiểu", render: (row) => formatCurrency(row.minOrderValue) },
    { key: "usedCount", label: "Đã dùng" },
  ], []);

  const userColumns = useMemo(() => [
    { key: "fullName", label: "Người dùng" },
    { key: "email", label: "Email" },
    { key: "role", label: "Vai trò" },
    { key: "loyaltyPoint", label: "Điểm" },
    { key: "createdAt", label: "Ngày tạo", render: (row) => formatDate(row.createdAt) },
  ], []);

  if (loading) return <Loading text="Đang tải dữ liệu quản trị..." />;

  return (
    <div className="container page-section admin-page">
      <div className="section-heading">
        <h1>Trang quản trị ShopNow</h1>
        <p>Quản lý sản phẩm, coupon, đơn hàng, người dùng và xem thống kê qua biểu đồ.</p>
      </div>

      <div className="admin-tabs">
        {[
          ["dashboard", "Tổng quan"],
          ["products", "Sản phẩm"],
          ["orders", "Đơn hàng"],
          ["coupons", "Coupon"],
          ["users", "Người dùng"],
        ].map(([value, label]) => (
          <button key={value} className={tab === value ? "active" : ""} type="button" onClick={() => setTab(value)}>{label}</button>
        ))}
      </div>

      {tab === "dashboard" ? (
        <section className="admin-dashboard-grid">
          <div className="metrics-grid">
            <MetricCard label="Doanh thu" value={formatCurrency(analytics?.metrics?.revenue || 0)} />
            <MetricCard label="Doanh thu đã giao" value={formatCurrency(analytics?.metrics?.deliveredRevenue || 0)} />
            <MetricCard label="AOV" value={formatCurrency(analytics?.metrics?.averageOrderValue || 0)} />
            <MetricCard label="Đơn hàng" value={analytics?.metrics?.orderCount || 0} />
            <MetricCard label="Đơn đang hoạt động" value={analytics?.metrics?.activeOrders || 0} />
            <MetricCard label="Người dùng" value={analytics?.metrics?.userCount || 0} />
            <MetricCard label="Sản phẩm" value={analytics?.metrics?.productCount || 0} />
            <MetricCard label="Sắp hết hàng" value={analytics?.metrics?.lowStockCount || 0} />
          </div>

          <div className="card-panel chart-panel chart-panel-wide">
            <div className="panel-heading-row">
              <div>
                <h2>Xu hướng doanh thu 6 tháng</h2>
                <p>So sánh doanh thu và số lượng đơn để xem nhịp bán hàng theo thời gian.</p>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={320}>
              <LineChart data={analytics?.charts?.revenueByMonth || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip formatter={(value, name) => name === "Doanh thu" ? formatCurrency(value) : value} />
                <Legend />
                <Bar yAxisId="right" dataKey="orders" name="Đơn hàng" />
                <Line yAxisId="left" type="monotone" dataKey="value" name="Doanh thu" strokeWidth={3} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="card-panel chart-panel">
            <h2>Doanh thu 14 ngày gần nhất</h2>
            <ResponsiveContainer width="100%" height={320}>
              <LineChart data={analytics?.charts?.revenueLast14Days || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" />
                <YAxis />
                <Tooltip formatter={(value) => formatCurrency(value)} />
                <Legend />
                <Line type="monotone" dataKey="value" name="Doanh thu" strokeWidth={3} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="card-panel chart-panel">
            <h2>Người dùng đăng ký mới</h2>
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={analytics?.charts?.userGrowth || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="value" name="Người dùng mới" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="card-panel chart-panel">
            <h2>Trạng thái đơn hàng</h2>
            <ResponsiveContainer width="100%" height={320}>
              <PieChart>
                <Pie data={analytics?.charts?.orderStatusDistribution || []} dataKey="value" nameKey="name" outerRadius={110} label>
                  {(analytics?.charts?.orderStatusDistribution || []).map((_, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(value, name) => [value, statusLabel(name)]} />
                <Legend formatter={(value) => statusLabel(value)} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="card-panel chart-panel">
            <h2>Doanh thu theo danh mục</h2>
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={analytics?.charts?.revenueByCategory || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(value) => formatCurrency(value)} />
                <Bar dataKey="value" name="Doanh thu" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="card-panel chart-panel">
            <h2>Phân bổ phương thức thanh toán</h2>
            <ResponsiveContainer width="100%" height={320}>
              <PieChart>
                <Pie data={analytics?.charts?.paymentMethodDistribution || []} dataKey="value" nameKey="name" outerRadius={110} label>
                  {(analytics?.charts?.paymentMethodDistribution || []).map((_, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(value) => formatCurrency(value)} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="card-panel chart-panel">
            <h2>Top sản phẩm bán chạy</h2>
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={analytics?.charts?.topProducts || []} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis type="category" dataKey="name" width={150} />
                <Tooltip formatter={(value, name) => name === "Doanh thu" ? formatCurrency(value) : value} />
                <Legend />
                <Bar dataKey="quantity" name="Số lượng bán" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="card-panel">
            <h2>Sản phẩm sắp hết hàng</h2>
            <div className="stack-list">
              {(analytics?.lowStockProducts || []).map((item) => (
                <div className="row between" key={item.id}>
                  <span>
                    <strong>{item.name}</strong>
                    <small>{item.category || "Chưa phân loại"}</small>
                  </span>
                  <strong>{item.stock}</strong>
                </div>
              ))}
            </div>
          </div>

          <div className="card-panel">
            <h2>Khách hàng chi tiêu cao</h2>
            <div className="stack-list">
              {(analytics?.charts?.topCustomers || []).map((item) => (
                <div className="row between" key={item.email}>
                  <span>
                    <strong>{item.name}</strong>
                    <small>{item.email}</small>
                  </span>
                  <strong>{formatCurrency(item.totalSpent)}</strong>
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {tab === "products" ? (
        <section className="detail-grid-two admin-editor-grid">
          <form className="card-panel form-grid" onSubmit={submitProduct}>
            <h2>{editingProductId ? "Cập nhật sản phẩm" : "Thêm sản phẩm mới"}</h2>
            <label>Tên sản phẩm<input value={productForm.name} onChange={(e) => setProductForm((p) => ({ ...p, name: e.target.value }))} required /></label>
            <label>Thương hiệu<input value={productForm.brand} onChange={(e) => setProductForm((p) => ({ ...p, brand: e.target.value }))} /></label>
            <label>Mô tả ngắn<textarea rows="3" value={productForm.description} onChange={(e) => setProductForm((p) => ({ ...p, description: e.target.value }))} required /></label>
            <label>Mô tả chi tiết<textarea rows="5" value={productForm.detail} onChange={(e) => setProductForm((p) => ({ ...p, detail: e.target.value }))} /></label>
            <div className="grid-2">
              <label>Giá gốc<input type="number" value={productForm.price} onChange={(e) => setProductForm((p) => ({ ...p, price: e.target.value }))} required /></label>
              <label>Giá cũ<input type="number" value={productForm.oldPrice} onChange={(e) => setProductForm((p) => ({ ...p, oldPrice: e.target.value }))} /></label>
              <label>Giảm %<input type="number" value={productForm.discountPct} onChange={(e) => setProductForm((p) => ({ ...p, discountPct: e.target.value }))} /></label>
              <label>Tồn kho<input type="number" value={productForm.stock} onChange={(e) => setProductForm((p) => ({ ...p, stock: e.target.value }))} required /></label>
            </div>
            <label>Danh mục<select value={productForm.categoryId} onChange={(e) => setProductForm((p) => ({ ...p, categoryId: e.target.value }))} required>
              <option value="">Chọn danh mục</option>
              {categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select></label>
            <label>Tag<input value={productForm.tag} onChange={(e) => setProductForm((p) => ({ ...p, tag: e.target.value }))} /></label>
            <label>URL ảnh<input value={productForm.image} onChange={(e) => setProductForm((p) => ({ ...p, image: e.target.value }))} required /></label>
            <label>Upload ảnh<input type="file" accept="image/*" onChange={(e) => handleUpload(e.target.files?.[0])} /></label>
            <label className="checkbox-row"><input type="checkbox" checked={productForm.featured} onChange={(e) => setProductForm((p) => ({ ...p, featured: e.target.checked }))} />Sản phẩm nổi bật</label>
            <div className="row gap wrap">
              <button className="btn primary" type="submit">{editingProductId ? "Lưu thay đổi" : "Tạo sản phẩm"}</button>
              {editingProductId ? <button className="btn outline" type="button" onClick={() => { setEditingProductId(null); setProductForm(productInitial); }}>Hủy</button> : null}
              {uploading ? <span>Đang upload ảnh...</span> : null}
            </div>
          </form>

          <div className="card-panel">
            <h2>Danh sách sản phẩm</h2>
            <AdminTable
              columns={productColumns}
              rows={products}
              renderActions={(row) => (
                <div className="row gap wrap">
                  <button className="text-btn" type="button" onClick={() => {
                    setEditingProductId(row.id);
                    setProductForm({
                      name: row.name || "",
                      brand: row.brand || "",
                      description: row.description || "",
                      detail: row.detail || "",
                      price: row.price || "",
                      oldPrice: row.oldPrice || "",
                      discountPct: row.discountPct || "",
                      tag: row.tag || "",
                      image: row.image || "",
                      stock: row.stock || "",
                      categoryId: row.categoryId || "",
                      featured: !!row.featured,
                    });
                  }}>Sửa</button>
                  <button className="text-btn danger-text" type="button" onClick={async () => {
                    await apiFetch(`/products/${row.id}`, { method: "DELETE" });
                    showToast("Đã xóa sản phẩm.", "info");
                    loadData();
                  }}>Xóa</button>
                </div>
              )}
            />
          </div>
        </section>
      ) : null}

      {tab === "orders" ? (
        <section className="card-panel">
          <h2>Quản lý đơn hàng</h2>
          <div className="order-history-list">
            {ordersData.items.map((order) => (
              <div className="order-card" key={order.id}>
                <div className="row between wrap">
                  <div>
                    <strong>{order.code}</strong>
                    <p>{order.customerName} • {order.customerEmail}</p>
                    <p>{formatDate(order.createdAt)}</p>
                  </div>
                  <div className="row gap wrap">
                    <select defaultValue={order.status} onChange={async (e) => {
                      await apiFetch(`/orders/admin/${order.id}/status`, { method: "PATCH", body: JSON.stringify({ status: e.target.value }) });
                      showToast("Đã cập nhật trạng thái đơn hàng.");
                      loadData();
                    }}>
                      {['PENDING','CONFIRMED','SHIPPING','COMPLETED','CANCELLED'].map((status) => <option key={status} value={status}>{statusLabel(status)}</option>)}
                    </select>
                    <select defaultValue={order.paymentStatus} onChange={async (e) => {
                      await apiFetch(`/orders/admin/${order.id}/status`, { method: "PATCH", body: JSON.stringify({ paymentStatus: e.target.value }) });
                      showToast("Đã cập nhật trạng thái thanh toán.");
                      loadData();
                    }}>
                      {['PENDING','PAID','FAILED','REFUNDED'].map((status) => <option key={status} value={status}>{statusLabel(status)}</option>)}
                    </select>
                  </div>
                </div>
                <div className="mini-order-items">
                  {order.items.map((item) => (
                    <div className="row between" key={item.id}><span>{item.productName} × {item.quantity}</span><strong>{formatCurrency(item.totalPrice)}</strong></div>
                  ))}
                </div>
                <div className="row between total-row"><span>Tổng tiền</span><strong>{formatCurrency(order.totalAmount)}</strong></div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {tab === "coupons" ? (
        <section className="detail-grid-two admin-editor-grid">
          <form className="card-panel form-grid" onSubmit={submitCoupon}>
            <h2>{editingCouponId ? "Cập nhật coupon" : "Tạo coupon mới"}</h2>
            <label>Mã coupon<input value={couponForm.code} onChange={(e) => setCouponForm((p) => ({ ...p, code: e.target.value.toUpperCase() }))} required /></label>
            <label>Mô tả<textarea rows="3" value={couponForm.description} onChange={(e) => setCouponForm((p) => ({ ...p, description: e.target.value }))} /></label>
            <label>Loại giảm<select value={couponForm.discountType} onChange={(e) => setCouponForm((p) => ({ ...p, discountType: e.target.value }))}><option value="percent">Phần trăm</option><option value="fixed">Số tiền cố định</option></select></label>
            <div className="grid-2">
              <label>Giá trị giảm<input type="number" value={couponForm.discountValue} onChange={(e) => setCouponForm((p) => ({ ...p, discountValue: e.target.value }))} required /></label>
              <label>Đơn tối thiểu<input type="number" value={couponForm.minOrderValue} onChange={(e) => setCouponForm((p) => ({ ...p, minOrderValue: e.target.value }))} /></label>
              <label>Giảm tối đa<input type="number" value={couponForm.maxDiscount} onChange={(e) => setCouponForm((p) => ({ ...p, maxDiscount: e.target.value }))} /></label>
              <label>Giới hạn sử dụng<input type="number" value={couponForm.usageLimit} onChange={(e) => setCouponForm((p) => ({ ...p, usageLimit: e.target.value }))} /></label>
            </div>
            <div className="grid-2">
              <label>Bắt đầu<input type="datetime-local" value={couponForm.startsAt} onChange={(e) => setCouponForm((p) => ({ ...p, startsAt: e.target.value }))} /></label>
              <label>Kết thúc<input type="datetime-local" value={couponForm.endsAt} onChange={(e) => setCouponForm((p) => ({ ...p, endsAt: e.target.value }))} /></label>
            </div>
            <label className="checkbox-row"><input type="checkbox" checked={couponForm.isActive} onChange={(e) => setCouponForm((p) => ({ ...p, isActive: e.target.checked }))} />Đang kích hoạt</label>
            <div className="row gap wrap">
              <button className="btn primary" type="submit">{editingCouponId ? "Lưu coupon" : "Tạo coupon"}</button>
              {editingCouponId ? <button className="btn outline" type="button" onClick={() => { setEditingCouponId(null); setCouponForm(couponInitial); }}>Hủy</button> : null}
            </div>
          </form>

          <div className="card-panel">
            <h2>Danh sách coupon</h2>
            <AdminTable
              columns={couponColumns}
              rows={coupons}
              renderActions={(row) => (
                <div className="row gap wrap">
                  <button className="text-btn" type="button" onClick={() => {
                    setEditingCouponId(row.id);
                    setCouponForm({
                      code: row.code || "",
                      description: row.description || "",
                      discountType: row.discountType || "percent",
                      discountValue: row.discountValue || "",
                      minOrderValue: row.minOrderValue || "",
                      maxDiscount: row.maxDiscount || "",
                      usageLimit: row.usageLimit || "",
                      startsAt: row.startsAt ? new Date(row.startsAt).toISOString().slice(0, 16) : "",
                      endsAt: row.endsAt ? new Date(row.endsAt).toISOString().slice(0, 16) : "",
                      isActive: !!row.isActive,
                    });
                  }}>Sửa</button>
                  <button className="text-btn danger-text" type="button" onClick={async () => {
                    await apiFetch(`/coupons/${row.id}`, { method: "DELETE" });
                    showToast("Đã xóa coupon.", "info");
                    loadData();
                  }}>Xóa</button>
                </div>
              )}
            />
          </div>
        </section>
      ) : null}

      {tab === "users" ? (
        <section className="card-panel">
          <h2>Danh sách người dùng</h2>
          <AdminTable
            columns={userColumns}
            rows={users}
            renderActions={(row) => (
              <div className="row gap wrap">
                <button className="text-btn" type="button" onClick={async () => {
                  const nextRole = row.role === "ADMIN" ? "CUSTOMER" : "ADMIN";
                  await apiFetch(`/users/${row.id}/role`, { method: "PATCH", body: JSON.stringify({ role: nextRole }) });
                  showToast("Đã cập nhật vai trò người dùng.");
                  loadData();
                }}>{row.role === "ADMIN" ? "Chuyển CUSTOMER" : "Chuyển ADMIN"}</button>
                {row.role !== "ADMIN" ? <button className="text-btn danger-text" type="button" onClick={async () => {
                  await apiFetch(`/users/${row.id}`, { method: "DELETE" });
                  showToast("Đã xóa người dùng.", "info");
                  loadData();
                }}>Xóa</button> : null}
              </div>
            )}
          />
        </section>
      ) : null}
    </div>
  );
}
