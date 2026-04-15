# ShopNow Frontend (MySQL-ready)

Frontend React + Vite này đã khớp với backend MySQL hiện tại của bạn.

## 1. Cài đặt
```bash
npm install
```

## 2. Tạo file môi trường
Tạo file `.env` từ `.env.example`

```env
VITE_API_URL=http://localhost:5000/api
```

## 3. Chạy
```bash
npm run dev
```

Mở:
```text
http://localhost:5173
```

## 4. Backend cần chạy song song
Backend phải chạy ở `http://localhost:5000`

## 5. Các API frontend đang dùng
- `POST /auth/login`
- `POST /auth/register`
- `GET /auth/me`
- `GET /categories`
- `POST /categories`
- `DELETE /categories/:id`
- `GET /products`
- `GET /products/:id`
- `POST /products`
- `PUT /products/:id`
- `DELETE /products/:id`
- `GET /users`
- `GET /orders/my-orders`
- `POST /orders/checkout`
- `GET /orders/analytics`
- `POST /upload/image`

## 6. Lưu ý về tài khoản
Nếu tài khoản mẫu trong MySQL chưa có hash bcrypt đúng, bạn có thể:
- tạo tài khoản mới bằng form đăng ký
- hoặc cập nhật lại hash mật khẩu trong bảng `users`
