import { Link } from "react-router-dom";
import ProductCard from "../components/ProductCard.jsx";
import { useShop } from "../context/ShopContext.jsx";

export default function WishlistPage() {
  const { wishlist, user } = useShop();

  if (!user) {
    return (
      <div className="container page-section">
        <div className="empty-state">
          <h1>Bạn cần đăng nhập</h1>
          <p>Đăng nhập để lưu lại các sản phẩm yêu thích và đồng bộ trên mọi thiết bị.</p>
          <Link to="/auth" className="btn primary">Đi tới trang đăng nhập</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container page-section">
      <div className="section-heading">
        <h1>Danh sách yêu thích</h1>
        <p>{wishlist.length} sản phẩm bạn đã lưu.</p>
      </div>
      {wishlist.length === 0 ? (
        <div className="empty-state"><p>Chưa có sản phẩm nào trong wishlist.</p></div>
      ) : (
        <div className="product-grid">
          {wishlist.map((item) => (
            <ProductCard key={item.id} product={item.product} />
          ))}
        </div>
      )}
    </div>
  );
}
