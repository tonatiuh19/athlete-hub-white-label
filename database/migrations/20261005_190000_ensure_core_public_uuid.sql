-- Ensure public_uuid exists on core tables (idempotent).
-- Prior hardening migration was marked applied while columns were missing on some TiDB dumps.
-- TiDB supports ADD COLUMN / ADD UNIQUE KEY IF NOT EXISTS.

ALTER TABLE `organizers` ADD COLUMN IF NOT EXISTS `public_uuid` CHAR(36) DEFAULT NULL AFTER `id`;
UPDATE `organizers` SET `public_uuid` = UUID() WHERE `public_uuid` IS NULL OR `public_uuid` = '';
ALTER TABLE `organizers` MODIFY COLUMN `public_uuid` CHAR(36) NOT NULL;
ALTER TABLE `organizers` ADD UNIQUE KEY IF NOT EXISTS `uk_organizers_public_uuid` (`public_uuid`);

ALTER TABLE `organizer_members` ADD COLUMN IF NOT EXISTS `public_uuid` CHAR(36) DEFAULT NULL AFTER `id`;
UPDATE `organizer_members` SET `public_uuid` = UUID() WHERE `public_uuid` IS NULL OR `public_uuid` = '';
ALTER TABLE `organizer_members` MODIFY COLUMN `public_uuid` CHAR(36) NOT NULL;
ALTER TABLE `organizer_members` ADD UNIQUE KEY IF NOT EXISTS `uk_organizer_members_public_uuid` (`public_uuid`);

ALTER TABLE `athletes` ADD COLUMN IF NOT EXISTS `public_uuid` CHAR(36) DEFAULT NULL AFTER `id`;
UPDATE `athletes` SET `public_uuid` = UUID() WHERE `public_uuid` IS NULL OR `public_uuid` = '';
ALTER TABLE `athletes` MODIFY COLUMN `public_uuid` CHAR(36) NOT NULL;
ALTER TABLE `athletes` ADD UNIQUE KEY IF NOT EXISTS `uk_athletes_public_uuid` (`public_uuid`);

ALTER TABLE `events` ADD COLUMN IF NOT EXISTS `public_uuid` CHAR(36) DEFAULT NULL AFTER `id`;
UPDATE `events` SET `public_uuid` = UUID() WHERE `public_uuid` IS NULL OR `public_uuid` = '';
ALTER TABLE `events` MODIFY COLUMN `public_uuid` CHAR(36) NOT NULL;
ALTER TABLE `events` ADD UNIQUE KEY IF NOT EXISTS `uk_events_public_uuid` (`public_uuid`);

ALTER TABLE `event_categories` ADD COLUMN IF NOT EXISTS `public_uuid` CHAR(36) DEFAULT NULL AFTER `id`;
UPDATE `event_categories` SET `public_uuid` = UUID() WHERE `public_uuid` IS NULL OR `public_uuid` = '';
ALTER TABLE `event_categories` MODIFY COLUMN `public_uuid` CHAR(36) NOT NULL;
ALTER TABLE `event_categories` ADD UNIQUE KEY IF NOT EXISTS `uk_event_categories_public_uuid` (`public_uuid`);

ALTER TABLE `registrations` ADD COLUMN IF NOT EXISTS `public_uuid` CHAR(36) DEFAULT NULL AFTER `id`;
UPDATE `registrations` SET `public_uuid` = UUID() WHERE `public_uuid` IS NULL OR `public_uuid` = '';
ALTER TABLE `registrations` MODIFY COLUMN `public_uuid` CHAR(36) NOT NULL;
ALTER TABLE `registrations` ADD UNIQUE KEY IF NOT EXISTS `uk_registrations_public_uuid` (`public_uuid`);

ALTER TABLE `payments` ADD COLUMN IF NOT EXISTS `public_uuid` CHAR(36) DEFAULT NULL AFTER `id`;
UPDATE `payments` SET `public_uuid` = UUID() WHERE `public_uuid` IS NULL OR `public_uuid` = '';
ALTER TABLE `payments` MODIFY COLUMN `public_uuid` CHAR(36) NOT NULL;
ALTER TABLE `payments` ADD UNIQUE KEY IF NOT EXISTS `uk_payments_public_uuid` (`public_uuid`);
