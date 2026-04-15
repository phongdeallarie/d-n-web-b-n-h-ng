export function calculateShippingFee(subtotal) {
  if (subtotal >= 1000000) return 0;
  if (subtotal >= 500000) return 15000;
  return 30000;
}

export function calculateCouponDiscount(coupon, subtotal) {
  if (!coupon) return 0;
  if (coupon.discountType === "percent") {
    const rawDiscount = subtotal * (coupon.discountValue / 100);
    const maxDiscount = coupon.maxDiscount ? Number(coupon.maxDiscount) : Infinity;
    return Math.min(rawDiscount, maxDiscount);
  }
  return Math.min(Number(coupon.discountValue || 0), subtotal);
}
