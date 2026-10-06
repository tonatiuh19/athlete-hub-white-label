-- Align core table columns with database/schema.sql (idempotent).
-- TiDB had schema_hardening marked applied while many columns were never created.
-- Fixes organizer self-service register (invited_at) and prevents the next Unknown-column 500s.

ALTER TABLE `organizers` ADD COLUMN IF NOT EXISTS `billing_email` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL AFTER `email`;

ALTER TABLE `organizer_members` ADD COLUMN IF NOT EXISTS `invited_at` datetime DEFAULT NULL AFTER `status`;
ALTER TABLE `organizer_members` ADD COLUMN IF NOT EXISTS `invited_by_member_id` int unsigned DEFAULT NULL AFTER `invited_at`;

ALTER TABLE `athletes` ADD COLUMN IF NOT EXISTS `phone_verified_at` datetime DEFAULT NULL AFTER `phone`;
ALTER TABLE `athletes` ADD COLUMN IF NOT EXISTS `clerk_user_id` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Clerk user id (sub) for SSO linking';
ALTER TABLE `athletes` ADD COLUMN IF NOT EXISTS `is_simulation` tinyint(1) NOT NULL DEFAULT '0' COMMENT 'Throwaway sim athlete (safe to wipe if no live regs)';

ALTER TABLE `events` ADD COLUMN IF NOT EXISTS `venue_id` int unsigned DEFAULT NULL;
ALTER TABLE `events` ADD COLUMN IF NOT EXISTS `search_keywords` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL;
ALTER TABLE `events` ADD COLUMN IF NOT EXISTS `featured` tinyint(1) NOT NULL DEFAULT '0';
ALTER TABLE `events` ADD COLUMN IF NOT EXISTS `version` int unsigned NOT NULL DEFAULT '1' COMMENT 'Optimistic locking';

ALTER TABLE `event_categories` ADD COLUMN IF NOT EXISTS `currency` char(3) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'MXN';
ALTER TABLE `event_categories` ADD COLUMN IF NOT EXISTS `waitlist_enabled` tinyint(1) NOT NULL DEFAULT '0';
ALTER TABLE `event_categories` ADD COLUMN IF NOT EXISTS `registration_opens_at` datetime DEFAULT NULL;
ALTER TABLE `event_categories` ADD COLUMN IF NOT EXISTS `registration_closes_at` datetime DEFAULT NULL;

ALTER TABLE `registrations` ADD COLUMN IF NOT EXISTS `discount_code_id` int unsigned DEFAULT NULL;
ALTER TABLE `registrations` ADD COLUMN IF NOT EXISTS `schedule_wave_id` int unsigned DEFAULT NULL;
ALTER TABLE `registrations` ADD COLUMN IF NOT EXISTS `source` enum('web','mobile','admin','api','transfer') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'web';
ALTER TABLE `registrations` ADD COLUMN IF NOT EXISTS `is_simulation` tinyint(1) NOT NULL DEFAULT '0';

ALTER TABLE `payments` ADD COLUMN IF NOT EXISTS `idempotency_key` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL;
ALTER TABLE `payments` ADD COLUMN IF NOT EXISTS `failure_code` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL;
ALTER TABLE `payments` ADD COLUMN IF NOT EXISTS `failure_message` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL;
ALTER TABLE `payments` ADD COLUMN IF NOT EXISTS `is_simulation` tinyint(1) NOT NULL DEFAULT '0';
ALTER TABLE `payments` ADD UNIQUE KEY IF NOT EXISTS `uk_payments_idempotency` (`idempotency_key`);

ALTER TABLE `registration_orders` ADD COLUMN IF NOT EXISTS `is_simulation` tinyint(1) NOT NULL DEFAULT '0';

ALTER TABLE `sport_types` ADD COLUMN IF NOT EXISTS `description` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL;
ALTER TABLE `sport_types` ADD COLUMN IF NOT EXISTS `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

ALTER TABLE `waitlist_entries` ADD COLUMN IF NOT EXISTS `batch_id` int unsigned DEFAULT NULL;
ALTER TABLE `waitlist_entries` ADD COLUMN IF NOT EXISTS `participant_email` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL;
