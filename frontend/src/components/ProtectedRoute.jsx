import { Navigate, useLocation } from "react-router-dom";
import { useShop } from "../context/ShopContext.jsx";

export default function ProtectedRoute({ children }) {
  const { user, loadingApp } = useShop();
  const location = useLocation();
  if (loadingApp) return null;
  if (!user) {
    return <Navigate to="/auth" state={{ from: location.pathname }} replace />;
  }
  return children;
}
