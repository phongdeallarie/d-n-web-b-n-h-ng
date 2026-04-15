import { Link } from "react-router-dom";

export default function NotFoundPage() {
  return (
    <div className="container page-section">
      <div className="empty-state">
        <h1>404</h1>
        <p>Trang bạn tìm không tồn tại hoặc đã được di chuyển.</p>
        <Link to="/" className="btn primary">Quay về trang chủ</Link>
      </div>
    </div>
  );
}
