-- Phase 2: per-event manual/physical sales flag + ledger-only refunds for provider=manual
-- TiDB / MySQL 8 compatible

ALTER TABLE `events`
  ADD COLUMN `manual_sales_enabled` tinyint(1) NOT NULL DEFAULT 0
    COMMENT 'When 1, staff may record cash manual sales (provider=manual) for this event';

ALTER TABLE `payment_refunds`
  MODIFY COLUMN `provider` enum('stripe','mock','mercadopago','manual')
    COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'stripe';
