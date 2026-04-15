export function formatCurrency(value = 0) {
  return Number(value || 0).toLocaleString("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  });
}

export function formatDate(value) {
  if (!value) return "";
  const date = new Date(value);
  return date.toLocaleString("vi-VN");
}

export function getDiscountPercent(product) {
  if (product?.discountPct) return Math.round(product.discountPct);
  const oldPrice = Number(product?.oldPrice || 0);
  const finalPrice = Number(product?.finalPrice || product?.price || 0);
  if (oldPrice > finalPrice && oldPrice > 0) {
    return Math.round(((oldPrice - finalPrice) / oldPrice) * 100);
  }
  return 0;
}

export function statusLabel(status) {
  const map = {
    PENDING: "Chờ xác nhận",
    CONFIRMED: "Đã xác nhận",
    SHIPPING: "Đang giao",
    COMPLETED: "Hoàn thành",
    CANCELLED: "Đã hủy",
    PAID: "Đã thanh toán",
    FAILED: "Thất bại",
    REFUNDED: "Hoàn tiền",
    COD: "Thanh toán khi nhận hàng",
    BANK_TRANSFER: "Chuyển khoản",
    MOMO: "MoMo",
    VNPAY: "VNPay",
  };
  return map[status] || status;
}
