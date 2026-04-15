import { useShop } from "../context/ShopContext.jsx";

export default function ToastViewport() {
  const { toast } = useShop();
  if (!toast) return null;
  return <div className={`toast toast-${toast.type || "success"}`}>{toast.message}</div>;
}
