-- =========================================================
-- Web bán hàng - MySQL 8 schema đồng bộ backend/frontend
-- Charset utf8mb4 + unicode_ci để hiển thị tiếng Việt mượt nhất
-- =========================================================

CREATE DATABASE IF NOT EXISTS shopdatabase
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE shopdatabase;
SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS Review;
DROP TABLE IF EXISTS WishlistItem;
DROP TABLE IF EXISTS OrderItem;
DROP TABLE IF EXISTS `Order`;
DROP TABLE IF EXISTS Address;
DROP TABLE IF EXISTS Product;
DROP TABLE IF EXISTS Coupon;
DROP TABLE IF EXISTS Category;
DROP TABLE IF EXISTS User;

SET FOREIGN_KEY_CHECKS = 1;

CREATE TABLE User (
  id INT NOT NULL AUTO_INCREMENT,
  email VARCHAR(191) NOT NULL,
  passwordHash VARCHAR(255) NOT NULL,
  fullName VARCHAR(191) NOT NULL,
  phone VARCHAR(50) NULL,
  avatar VARCHAR(500) NULL,
  loyaltyPoint INT NOT NULL DEFAULT 0,
  role ENUM('CUSTOMER', 'ADMIN') NOT NULL DEFAULT 'CUSTOMER',
  createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updatedAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_user_email (email),
  KEY idx_user_role (role),
  KEY idx_user_createdAt (createdAt)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE Category (
  id INT NOT NULL AUTO_INCREMENT,
  name VARCHAR(191) NOT NULL,
  slug VARCHAR(191) NOT NULL,
  description TEXT NULL,
  imageUrl VARCHAR(500) NULL,
  createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updatedAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_category_name (name),
  UNIQUE KEY uq_category_slug (slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE Product (
  id INT NOT NULL AUTO_INCREMENT,
  name VARCHAR(191) NOT NULL,
  slug VARCHAR(191) NOT NULL,
  description TEXT NULL,
  price DECIMAL(10,2) NOT NULL,
  compareAtPrice DECIMAL(10,2) NULL,
  stock INT NOT NULL DEFAULT 0,
  imageUrl VARCHAR(500) NULL,
  imagePublicId VARCHAR(255) NULL,
  brand VARCHAR(191) NULL,
  tag VARCHAR(100) NULL,
  featured TINYINT(1) NOT NULL DEFAULT 0,
  active TINYINT(1) NOT NULL DEFAULT 1,
  rating FLOAT NOT NULL DEFAULT 0,
  ratingCount INT NOT NULL DEFAULT 0,
  categoryId INT NOT NULL,
  createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updatedAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_product_slug (slug),
  KEY idx_product_category (categoryId),
  KEY idx_product_active (active),
  KEY idx_product_featured (featured),
  KEY idx_product_createdAt (createdAt),
  CONSTRAINT fk_product_category FOREIGN KEY (categoryId)
    REFERENCES Category (id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE Address (
  id INT NOT NULL AUTO_INCREMENT,
  userId INT NOT NULL,
  label VARCHAR(100) NULL,
  receiverName VARCHAR(191) NOT NULL,
  phone VARCHAR(50) NOT NULL,
  city VARCHAR(191) NOT NULL,
  district VARCHAR(191) NULL,
  ward VARCHAR(191) NULL,
  line1 VARCHAR(255) NOT NULL,
  isDefault TINYINT(1) NOT NULL DEFAULT 0,
  createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updatedAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY idx_address_user (userId),
  KEY idx_address_default (isDefault),
  CONSTRAINT fk_address_user FOREIGN KEY (userId)
    REFERENCES User (id)
    ON UPDATE CASCADE
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE WishlistItem (
  id INT NOT NULL AUTO_INCREMENT,
  userId INT NOT NULL,
  productId INT NOT NULL,
  createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_wishlist_user_product (userId, productId),
  KEY idx_wishlist_product (productId),
  CONSTRAINT fk_wishlist_user FOREIGN KEY (userId)
    REFERENCES User (id)
    ON UPDATE CASCADE
    ON DELETE CASCADE,
  CONSTRAINT fk_wishlist_product FOREIGN KEY (productId)
    REFERENCES Product (id)
    ON UPDATE CASCADE
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE Coupon (
  id INT NOT NULL AUTO_INCREMENT,
  code VARCHAR(80) NOT NULL,
  description VARCHAR(255) NULL,
  discountType VARCHAR(20) NOT NULL,
  discountValue DECIMAL(10,2) NOT NULL,
  minOrderValue DECIMAL(10,2) NULL,
  maxDiscountValue DECIMAL(10,2) NULL,
  usageLimit INT NULL,
  usedCount INT NOT NULL DEFAULT 0,
  startsAt DATETIME(3) NULL,
  endsAt DATETIME(3) NULL,
  isActive TINYINT(1) NOT NULL DEFAULT 1,
  createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updatedAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_coupon_code (code),
  KEY idx_coupon_active (isActive),
  KEY idx_coupon_endsAt (endsAt)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `Order` (
  id INT NOT NULL AUTO_INCREMENT,
  code VARCHAR(30) NOT NULL,
  userId INT NULL,
  addressId INT NULL,
  couponId INT NULL,
  customerName VARCHAR(191) NOT NULL,
  customerEmail VARCHAR(191) NOT NULL,
  customerPhone VARCHAR(50) NOT NULL,
  shippingLine1 VARCHAR(255) NOT NULL,
  shippingWard VARCHAR(191) NOT NULL,
  shippingDistrict VARCHAR(191) NOT NULL,
  shippingCity VARCHAR(191) NOT NULL,
  subtotal DECIMAL(10,2) NOT NULL,
  discountAmount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  shippingFee DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  total DECIMAL(10,2) NOT NULL,
  paymentMethod ENUM('COD', 'BANK_TRANSFER') NOT NULL DEFAULT 'COD',
  paymentStatus ENUM('PENDING', 'PAID', 'FAILED', 'REFUNDED') NOT NULL DEFAULT 'PENDING',
  status ENUM('PENDING', 'CONFIRMED', 'SHIPPING', 'COMPLETED', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
  note TEXT NULL,
  createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updatedAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_order_code (code),
  KEY idx_order_user (userId),
  KEY idx_order_address (addressId),
  KEY idx_order_coupon (couponId),
  KEY idx_order_status (status),
  KEY idx_order_payment_status (paymentStatus),
  KEY idx_order_createdAt (createdAt),
  CONSTRAINT fk_order_user FOREIGN KEY (userId)
    REFERENCES User (id)
    ON UPDATE CASCADE
    ON DELETE SET NULL,
  CONSTRAINT fk_order_address FOREIGN KEY (addressId)
    REFERENCES Address (id)
    ON UPDATE CASCADE
    ON DELETE SET NULL,
  CONSTRAINT fk_order_coupon FOREIGN KEY (couponId)
    REFERENCES Coupon (id)
    ON UPDATE CASCADE
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE OrderItem (
  id INT NOT NULL AUTO_INCREMENT,
  orderId INT NOT NULL,
  productId INT NULL,
  productName VARCHAR(191) NOT NULL,
  productImage VARCHAR(500) NULL,
  price DECIMAL(10,2) NOT NULL,
  quantity INT NOT NULL,
  total DECIMAL(10,2) NOT NULL,
  createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY idx_orderitem_order (orderId),
  KEY idx_orderitem_product (productId),
  CONSTRAINT fk_orderitem_order FOREIGN KEY (orderId)
    REFERENCES `Order` (id)
    ON UPDATE CASCADE
    ON DELETE CASCADE,
  CONSTRAINT fk_orderitem_product FOREIGN KEY (productId)
    REFERENCES Product (id)
    ON UPDATE CASCADE
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE Review (
  id INT NOT NULL AUTO_INCREMENT,
  rating INT NOT NULL,
  comment TEXT NULL,
  userId INT NOT NULL,
  productId INT NOT NULL,
  createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updatedAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_review_user_product (userId, productId),
  KEY idx_review_product (productId),
  KEY idx_review_rating (rating),
  CONSTRAINT fk_review_user FOREIGN KEY (userId)
    REFERENCES User (id)
    ON UPDATE CASCADE
    ON DELETE CASCADE,
  CONSTRAINT fk_review_product FOREIGN KEY (productId)
    REFERENCES Product (id)
    ON UPDATE CASCADE
    ON DELETE CASCADE,
  CONSTRAINT chk_review_rating CHECK (rating >= 1 AND rating <= 5)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Sau khi import SQL:
-- 1. Cập nhật backend/.env với DATABASE_URL đúng MySQL
-- 2. Chạy: npx prisma generate
-- 3. Nếu đang dùng DB mới hoàn toàn, có thể chạy thêm: npx prisma db push
-- 4. Tạo tài khoản admin rồi đổi role thành ADMIN trong bảng User
