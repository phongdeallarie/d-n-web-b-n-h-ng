import { Navigate } from "react-router-dom";
import { useShop } from "../context/ShopContext.jsx";

export default function AdminRoute({ children }) {
  const { user, loadingApp } = useShop();
  if (loadingApp) return null;
  if (!user) return <Navigate to="/auth" replace />;
  if (user.role !== "ADMIN") return <Navigate to="/" replace />;
  return children;
}
