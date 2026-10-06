-- Audience + category targeting for event responsivas (adult vs minor, optional categories).
-- Acceptance certificate PDF URL stored per signature for confirmation email / audit.

ALTER TABLE `event_waivers`
  ADD COLUMN `audience` ENUM('all', 'adult', 'minor') NOT NULL DEFAULT 'all'
    COMMENT 'all=everyone; adult=age>=18 on event start; minor=age<18';

ALTER TABLE `event_waivers`
  ADD COLUMN `category_ids` JSON DEFAULT NULL
    COMMENT 'NULL or [] = all categories; else array of event_categories.id';

ALTER TABLE `registration_waiver_signatures`
  ADD COLUMN `acceptance_pdf_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL
    COMMENT 'CDN URL of stamped acceptance certificate PDF';
