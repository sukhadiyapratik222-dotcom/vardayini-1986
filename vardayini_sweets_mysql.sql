-- ========================================================
-- Vardayini Sweet Mart · Full MySQL Database Schema
-- Database Name: vardayini_sweets
-- ========================================================

CREATE DATABASE IF NOT EXISTS `vardayini_sweets` 
DEFAULT CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;

USE `vardayini_sweets`;

-- 1. Users table (Admin & Customers)
CREATE TABLE IF NOT EXISTS `users` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(120) NOT NULL,
  `email` VARCHAR(160) NOT NULL UNIQUE,
  `phone` VARCHAR(20) NOT NULL,
  `password_hash` TEXT NOT NULL,
  `role` VARCHAR(20) NOT NULL DEFAULT 'customer',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Categories table (All 18 Departments & Categories)
CREATE TABLE IF NOT EXISTS `categories` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(120) NOT NULL,
  `slug` VARCHAR(140) NOT NULL UNIQUE,
  `description` TEXT NOT NULL,
  `image_url` TEXT NOT NULL,
  `sort_order` INT NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Products table
CREATE TABLE IF NOT EXISTS `products` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `category_id` INT NOT NULL,
  `name` VARCHAR(160) NOT NULL,
  `slug` VARCHAR(180) NOT NULL UNIQUE,
  `description` TEXT NOT NULL,
  `image_url` TEXT NOT NULL,
  `tags` TEXT DEFAULT NULL,
  `is_featured` BOOLEAN NOT NULL DEFAULT FALSE,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Product Variants table (Sizes, Weights, SKUs, Stock & Pricing)
CREATE TABLE IF NOT EXISTS `product_variants` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `product_id` INT NOT NULL,
  `weight` VARCHAR(40) NOT NULL,
  `sku` VARCHAR(80) NOT NULL UNIQUE,
  `price` INT NOT NULL,
  `discounted_price` INT DEFAULT NULL,
  `stock` INT NOT NULL DEFAULT 0,
  FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Coupons & Offers
CREATE TABLE IF NOT EXISTS `coupons` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `code` VARCHAR(40) NOT NULL UNIQUE,
  `description` TEXT NOT NULL,
  `type` VARCHAR(20) NOT NULL,
  `value` INT NOT NULL,
  `min_order` INT NOT NULL DEFAULT 0,
  `active` BOOLEAN NOT NULL DEFAULT TRUE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Addresses table
CREATE TABLE IF NOT EXISTS `addresses` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `label` VARCHAR(40) NOT NULL DEFAULT 'Home',
  `line1` VARCHAR(200) NOT NULL,
  `city` VARCHAR(80) NOT NULL,
  `state` VARCHAR(80) NOT NULL,
  `pincode` VARCHAR(12) NOT NULL,
  `phone` VARCHAR(20) NOT NULL,
  FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. Orders table
CREATE TABLE IF NOT EXISTS `orders` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `order_number` VARCHAR(40) NOT NULL UNIQUE,
  `user_id` INT DEFAULT NULL,
  `guest_name` VARCHAR(120) DEFAULT NULL,
  `guest_phone` VARCHAR(20) DEFAULT NULL,
  `status` VARCHAR(30) NOT NULL DEFAULT 'pending',
  `subtotal` INT NOT NULL,
  `discount` INT NOT NULL DEFAULT 0,
  `delivery_fee` INT NOT NULL DEFAULT 0,
  `tax` INT NOT NULL DEFAULT 0,
  `total` INT NOT NULL,
  `coupon_code` VARCHAR(40) DEFAULT NULL,
  `address_snapshot` TEXT NOT NULL,
  `delivery_slot` VARCHAR(80) NOT NULL,
  `payment_method` VARCHAR(30) NOT NULL,
  `payment_status` VARCHAR(30) NOT NULL DEFAULT 'pending',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. Order Items
CREATE TABLE IF NOT EXISTS `order_items` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `order_id` INT NOT NULL,
  `product_name` VARCHAR(160) NOT NULL,
  `variant_weight` VARCHAR(40) NOT NULL,
  `unit_price` INT NOT NULL,
  `quantity` INT NOT NULL,
  `image_url` TEXT NOT NULL,
  FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. Cart Items table
CREATE TABLE IF NOT EXISTS `cart_items` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT DEFAULT NULL,
  `session_id` VARCHAR(80) DEFAULT NULL,
  `variant_id` INT NOT NULL,
  `quantity` INT NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  FOREIGN KEY (`variant_id`) REFERENCES `product_variants` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 10. Reviews & Ratings
CREATE TABLE IF NOT EXISTS `reviews` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `product_id` INT NOT NULL,
  `user_id` INT NOT NULL,
  `rating` INT NOT NULL,
  `comment` TEXT NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE,
  FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 11. Wishlist Items
CREATE TABLE IF NOT EXISTS `wishlist_items` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `product_id` INT NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY `wishlist_user_product` (`user_id`, `product_id`),
  FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 12. Stores table
CREATE TABLE IF NOT EXISTS `stores` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(160) NOT NULL,
  `address` TEXT NOT NULL,
  `city` VARCHAR(80) NOT NULL,
  `pincode` VARCHAR(12) NOT NULL,
  `phone` VARCHAR(20) NOT NULL,
  `hours` VARCHAR(80) NOT NULL,
  `lat` DECIMAL(10, 6) NOT NULL,
  `lng` DECIMAL(10, 6) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
