# dự án web bán hàng
web chỉ có vài chức năng cơ bản, chưa đầy đủ nghiệp vụ, chỉ thích hợp cho thực hàng tester và BA

admin@test.com
Admin@123
customer@test.com
Customer@123
//Đã cố đưa lên vercel nhưng vercel yêu cầu dịch vụ sql ngoài (tui tạo mysql thủ công)\
//Chắc chắn sẽ làm 1 bản khác để đưa lên vercel
# ShopNow Full Project (Frontend + Backend + MySQL)

## Cấu trúc
- `frontend/`: React + Vite
- `backend/`: Express + Prisma + MySQL
- `shopdatabase.sql`: file SQL tạo database thủ công

## 1. Tạo database
Import file `shopdatabase.sql` vào MySQL để tạo database `shopdatabase`.

## 2. Chạy backend
```bash
cd backend
cp .env.example .env
# sửa DATABASE_URL trong .env
npm install
npx prisma generate
npm run dev
```

## 3. Chạy frontend
```bash
cd frontend
cp .env.example .env
# sửa VITE_API_URL nếu cần
npm install
npm run dev
```

## 4. URL mặc định
- Backend: `http://localhost:5000`
- Frontend: `http://localhost:5173`

## 5. Tài khoản đăng nhập
Nếu tài khoản mẫu trong SQL không đăng nhập được, hãy tạo hash bcrypt thật rồi update cột `password` trong bảng `users`.

