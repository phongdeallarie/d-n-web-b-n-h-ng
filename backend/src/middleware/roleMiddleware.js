export function isAdmin(req, res, next) {
  if (req.user?.role !== "ADMIN") {
    return res.status(403).json({ message: "Bạn không có quyền truy cập chức năng này." });
  }
  next();
}
