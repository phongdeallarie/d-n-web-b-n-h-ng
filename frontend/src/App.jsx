import { Navigate, Route, Routes } from "react-router-dom";
import Layout from "./components/Layout.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import AdminRoute from "./components/AdminRoute.jsx";
import HomePage from "./pages/HomePage.jsx";
import ProductPage from "./pages/ProductPage.jsx";
import AuthPage from "./pages/AuthPage.jsx";
import ProfilePage from "./pages/ProfilePage.jsx";
import WishlistPage from "./pages/WishlistPage.jsx";
import OrdersPage from "./pages/OrdersPage.jsx";
import AdminPage from "./pages/AdminPage.jsx";
import NotFoundPage from "./pages/NotFoundPage.jsx";
import { useShop } from "./context/ShopContext.jsx";
import Loading from "./components/Loading.jsx";

export default function App() {
  const { loadingApp } = useShop();

  if (loadingApp) {
    return <Loading text="Đang khởi tạo ứng dụng..." />;
  }

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/products/:id" element={<ProductPage />} />
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
        <Route path="/wishlist" element={<WishlistPage />} />
        <Route path="/orders" element={<OrdersPage />} />
        <Route path="/admin" element={<AdminRoute><AdminPage /></AdminRoute>} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Layout>
  );
}
