import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { apiFetch, setToken } from "../api/client.js";

const ShopContext = createContext(null);

function getStoredCart() {
  try {
    return JSON.parse(localStorage.getItem("shop_cart") || "[]");
  } catch {
    return [];
  }
}

function getStoredUser() {
  try {
    return JSON.parse(localStorage.getItem("shop_user") || "null");
  } catch {
    return null;
  }
}

export function ShopProvider({ children }) {
  const [user, setUser] = useState(getStoredUser);
  const [cartItems, setCartItems] = useState(getStoredCart);
  const [categories, setCategories] = useState([]);
  const [wishlist, setWishlist] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loadingApp, setLoadingApp] = useState(true);
  const [toast, setToast] = useState(null);
  const [cartOpen, setCartOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem("shop_cart", JSON.stringify(cartItems));
  }, [cartItems]);

  useEffect(() => {
    if (user) localStorage.setItem("shop_user", JSON.stringify(user));
    else localStorage.removeItem("shop_user");
  }, [user]);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(() => setToast(null), 3000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  async function initialize() {
    try {
      const categoryData = await apiFetch("/categories");
      setCategories(categoryData);
    } catch {
      setCategories([]);
    }

    if (localStorage.getItem("shop_token")) {
      try {
        const profile = await apiFetch("/auth/me");
        setUser(profile);
        const [wishlistData, orderData] = await Promise.all([
          apiFetch("/wishlist"),
          apiFetch("/orders/my-orders"),
        ]);
        setWishlist(wishlistData);
        setOrders(orderData);
      } catch {
        logout(false);
      }
    }
    setLoadingApp(false);
  }

  useEffect(() => {
    initialize();
  }, []);

  function showToast(message, type = "success") {
    setToast({ message, type });
  }

  function logout(showMessage = true) {
    setToken("");
    setUser(null);
    setWishlist([]);
    setOrders([]);
    if (showMessage) showToast("Bạn đã đăng xuất.", "info");
  }

  async function login(email, password) {
    const data = await apiFetch("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    setToken(data.token);
    setUser(data.user);
    const [profile, wishlistData, orderData] = await Promise.all([
      apiFetch("/auth/me"),
      apiFetch("/wishlist"),
      apiFetch("/orders/my-orders"),
    ]);
    setUser(profile);
    setWishlist(wishlistData);
    setOrders(orderData);
    showToast("Đăng nhập thành công.");
    return data.user;
  }

  async function register(payload) {
    const data = await apiFetch("/auth/register", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    setToken(data.token);
    const profile = await apiFetch("/auth/me");
    setUser(profile);
    setWishlist([]);
    setOrders([]);
    showToast("Tạo tài khoản thành công.");
    return data.user;
  }

  function addToCart(product, quantity = 1) {
    setCartItems((prev) => {
      const existing = prev.find((item) => item.productId === product.id);
      if (existing) {
        return prev.map((item) =>
          item.productId === product.id
            ? { ...item, quantity: Math.min(item.quantity + quantity, product.stock || 99) }
            : item
        );
      }
      return [
        ...prev,
        {
          productId: product.id,
          quantity: Math.min(quantity, product.stock || 99),
          product,
        },
      ];
    });
    setCartOpen(true);
    showToast("Đã thêm sản phẩm vào giỏ hàng.");
  }

  function updateCartQuantity(productId, quantity) {
    setCartItems((prev) =>
      prev
        .map((item) =>
          item.productId === productId
            ? { ...item, quantity: Math.max(1, quantity) }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  }

  function removeFromCart(productId) {
    setCartItems((prev) => prev.filter((item) => item.productId !== productId));
    showToast("Đã xóa sản phẩm khỏi giỏ hàng.", "info");
  }

  function clearCart() {
    setCartItems([]);
  }

  async function refreshProfile() {
    if (!user) return null;
    const profile = await apiFetch("/auth/me");
    setUser(profile);
    return profile;
  }

  async function saveProfile(payload) {
    const data = await apiFetch("/auth/me", {
      method: "PUT",
      body: JSON.stringify(payload),
    });
    await refreshProfile();
    showToast(data.message || "Đã cập nhật hồ sơ.");
    return data;
  }

  async function changePassword(payload) {
    const data = await apiFetch("/auth/change-password", {
      method: "PUT",
      body: JSON.stringify(payload),
    });
    showToast(data.message || "Đổi mật khẩu thành công.");
    return data;
  }

  async function refreshOrders() {
    if (!user) return [];
    const orderData = await apiFetch("/orders/my-orders");
    setOrders(orderData);
    return orderData;
  }

  async function toggleWishlist(productId) {
    if (!user) {
      throw new Error("Vui lòng đăng nhập để dùng danh sách yêu thích.");
    }
    const data = await apiFetch("/wishlist", {
      method: "POST",
      body: JSON.stringify({ productId }),
    });
    const wishlistData = await apiFetch("/wishlist");
    setWishlist(wishlistData);
    showToast(data.message || "Đã cập nhật yêu thích.");
    return data;
  }

  async function checkout(payload) {
    const data = await apiFetch("/orders/checkout", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    clearCart();
    await Promise.all([refreshProfile(), refreshOrders()]);
    showToast(data.message || "Đặt hàng thành công.");
    return data;
  }

  async function cancelOrder(orderId) {
    const data = await apiFetch(`/orders/${orderId}/cancel`, { method: "PATCH" });
    await refreshOrders();
    showToast(data.message || "Đã hủy đơn hàng.", "info");
    return data;
  }

  const cartCount = useMemo(
    () => cartItems.reduce((sum, item) => sum + Number(item.quantity || 0), 0),
    [cartItems]
  );

  const cartSubtotal = useMemo(
    () => cartItems.reduce((sum, item) => sum + Number(item.product?.finalPrice || item.product?.price || 0) * item.quantity, 0),
    [cartItems]
  );

  const wishlistIds = useMemo(
    () => new Set(wishlist.map((item) => item.productId || item.product?.id)),
    [wishlist]
  );

  const value = {
    user,
    categories,
    cartItems,
    cartCount,
    cartSubtotal,
    wishlist,
    wishlistIds,
    orders,
    loadingApp,
    toast,
    cartOpen,
    setCartOpen,
    showToast,
    login,
    register,
    logout,
    addToCart,
    updateCartQuantity,
    removeFromCart,
    clearCart,
    toggleWishlist,
    refreshProfile,
    saveProfile,
    changePassword,
    checkout,
    refreshOrders,
    cancelOrder,
  };

  return <ShopContext.Provider value={value}>{children}</ShopContext.Provider>;
}

export function useShop() {
  const context = useContext(ShopContext);
  if (!context) throw new Error("useShop must be used within ShopProvider");
  return context;
}
