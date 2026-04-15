import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { apiFetch } from "../api/client.js";
import ProductCard from "../components/ProductCard.jsx";
import Loading from "../components/Loading.jsx";
import { useShop } from "../context/ShopContext.jsx";

const SORT_OPTIONS = [
  { value: "newest", label: "Mới nhất" },
  { value: "price_asc", label: "Giá tăng dần" },
  { value: "price_desc", label: "Giá giảm dần" },
  { value: "best_rating", label: "Đánh giá cao" },
  { value: "name_asc", label: "Tên A-Z" },
];

export default function HomePage() {
  const { categories, showToast } = useShop();
  const [searchParams, setSearchParams] = useSearchParams();
  const [data, setData] = useState({ items: [], pagination: null });
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState(searchParams.get("search") || "");

  const filters = useMemo(
    () => ({
      search: searchParams.get("search") || "",
      categoryId: searchParams.get("category") || "",
      sort: searchParams.get("sort") || "newest",
      minPrice: searchParams.get("minPrice") || "",
      maxPrice: searchParams.get("maxPrice") || "",
      minRating: searchParams.get("minRating") || "",
      featured: searchParams.get("featured") || "",
      page: searchParams.get("page") || "1",
    }),
    [searchParams]
  );

  useEffect(() => {
    setSearchInput(filters.search);
  }, [filters.search]);

  useEffect(() => {
    async function fetchProducts() {
      setLoading(true);
      try {
        const query = new URLSearchParams();
        Object.entries(filters).forEach(([key, value]) => {
          if (value) query.set(key === "categoryId" ? "categoryId" : key, value);
        });
        const result = await apiFetch(`/products?${query.toString()}`);
        setData(result);
      } catch (error) {
        showToast(error.message, "error");
      } finally {
        setLoading(false);
      }
    }
    fetchProducts();
  }, [filters, showToast]);

  function updateFilter(key, value) {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== "page") next.set("page", "1");
    setSearchParams(next);
  }

  function handleSearchSubmit(e) {
    e.preventDefault();
    updateFilter("search", searchInput.trim());
  }

  return (
    <div className="container page-section">
      <section className="hero-banner">
        <div>
          <p className="eyebrow">Mua sắm hiện đại</p>
          <h1>Web bán hàng full-stack làm đẹp CV</h1>
          <p>
            Tìm kiếm, lọc nâng cao, yêu thích, review, coupon, địa chỉ giao hàng, lịch sử đơn và bảng điều khiển admin với biểu đồ thống kê.
          </p>
        </div>
        <div className="hero-stats">
          <div><strong>Gà</strong><span>Chưa đủ các nghiệp vụ :(((</span></div>
          <div><strong>Admin</strong><span>Chỉ có thể xem thống kê, không thể chỉnh sửa, admin cần được toàn quyền hơn?</span></div>
          <div><strong>Viết testcases</strong><span>Chưa làm</span></div>
        </div>
      </section>

      <section className="filter-panel">
        <form className="search-form" onSubmit={handleSearchSubmit}>
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Tìm theo tên, thương hiệu, mô tả..."
          />
          <button className="btn primary" type="submit">Tìm kiếm</button>
        </form>

        <div className="filter-grid">
          <select value={filters.categoryId} onChange={(e) => updateFilter("category", e.target.value)}>
            <option value="">Tất cả danh mục</option>
            {categories.map((item) => (
              <option key={item.id} value={item.id}>{item.name}</option>
            ))}
          </select>

          <select value={filters.sort} onChange={(e) => updateFilter("sort", e.target.value)}>
            {SORT_OPTIONS.map((item) => (
              <option key={item.value} value={item.value}>{item.label}</option>
            ))}
          </select>

          <input
            type="number"
            placeholder="Giá từ"
            value={filters.minPrice}
            onChange={(e) => updateFilter("minPrice", e.target.value)}
          />
          <input
            type="number"
            placeholder="Giá đến"
            value={filters.maxPrice}
            onChange={(e) => updateFilter("maxPrice", e.target.value)}
          />
          <select value={filters.minRating} onChange={(e) => updateFilter("minRating", e.target.value)}>
            <option value="">Mọi mức đánh giá</option>
            <option value="4">Từ 4 sao</option>
            <option value="3">Từ 3 sao</option>
            <option value="2">Từ 2 sao</option>
          </select>
          <select value={filters.featured} onChange={(e) => updateFilter("featured", e.target.value)}>
            <option value="">Tất cả sản phẩm</option>
            <option value="true">Sản phẩm nổi bật</option>
          </select>
        </div>
      </section>

      {loading ? (
        <Loading text="Đang tải danh sách sản phẩm..." />
      ) : data.items.length === 0 ? (
        <div className="empty-state"><p>Không tìm thấy sản phẩm phù hợp.</p></div>
      ) : (
        <>
          <section className="product-grid">
            {data.items.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </section>
          <div className="pagination-row">
            <button
              className="btn outline"
              type="button"
              disabled={Number(filters.page) <= 1}
              onClick={() => updateFilter("page", String(Number(filters.page) - 1))}
            >
              Trang trước
            </button>
            <span>
              Trang {data.pagination?.page || 1} / {data.pagination?.totalPages || 1}
            </span>
            <button
              className="btn outline"
              type="button"
              disabled={(data.pagination?.page || 1) >= (data.pagination?.totalPages || 1)}
              onClick={() => updateFilter("page", String(Number(filters.page) + 1))}
            >
              Trang sau
            </button>
          </div>
        </>
      )}
    </div>
  );
}
