-- Atleita white-label: organizer microsites, theme, sections, legal, email templates
-- Fresh TiDB schema companion migration (apply after base athlete-hub tables exist).

CREATE TABLE IF NOT EXISTS `organizer_sites` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `organizer_id` int unsigned NOT NULL,
  `subdomain` varchar(63) COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` enum('draft','published','suspended') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'draft',
  `template_key` varchar(40) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'general_v1',
  `locale_default` enum('es','en') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'es',
  `published_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_organizer_sites_organizer` (`organizer_id`),
  UNIQUE KEY `uk_organizer_sites_subdomain` (`subdomain`),
  KEY `idx_organizer_sites_status` (`status`),
  CONSTRAINT `fk_organizer_sites_organizer` FOREIGN KEY (`organizer_id`) REFERENCES `organizers` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `organizer_site_themes` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `organizer_site_id` int unsigned NOT NULL,
  `logo_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `favicon_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `hero_image_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `primary_color` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '#214B3A',
  `secondary_color` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '#18231F',
  `accent_color` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '#D7ED70',
  `background_color` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '#F7F9F6',
  `text_color` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '#18231F',
  `font_family` varchar(120) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Archivo, system-ui, sans-serif',
  `button_radius_px` smallint unsigned NOT NULL DEFAULT 10,
  `tagline` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_organizer_site_themes_site` (`organizer_site_id`),
  CONSTRAINT `fk_organizer_site_themes_site` FOREIGN KEY (`organizer_site_id`) REFERENCES `organizer_sites` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `organizer_site_sections` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `organizer_site_id` int unsigned NOT NULL,
  `section_key` enum('hero','about','upcoming_events','sponsors','faq','footer_links') COLLATE utf8mb4_unicode_ci NOT NULL,
  `enabled` tinyint(1) NOT NULL DEFAULT 1,
  `sort_order` smallint unsigned NOT NULL DEFAULT 0,
  `content_json` json NOT NULL,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_organizer_site_sections` (`organizer_site_id`,`section_key`),
  CONSTRAINT `fk_organizer_site_sections_site` FOREIGN KEY (`organizer_site_id`) REFERENCES `organizer_sites` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `organizer_site_legal_documents` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `organizer_site_id` int unsigned NOT NULL,
  `document_key` enum('terms','privacy','refund') COLLATE utf8mb4_unicode_ci NOT NULL,
  `locale` enum('es','en') COLLATE utf8mb4_unicode_ci NOT NULL,
  `title` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `body_html` mediumtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_organizer_site_legal` (`organizer_site_id`,`document_key`,`locale`),
  CONSTRAINT `fk_organizer_site_legal_site` FOREIGN KEY (`organizer_site_id`) REFERENCES `organizer_sites` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Platform defaults + organizer/event overrides for athlete-facing + broadcast emails.
-- OTP templates are platform-owned; only chrome (logo/colors) may be injected at send time.
CREATE TABLE IF NOT EXISTS `email_template_definitions` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `template_key` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `audience` enum('athlete','organizer','admin','broadcast') COLLATE utf8mb4_unicode_ci NOT NULL,
  `editable_by_organizer` tinyint(1) NOT NULL DEFAULT 0,
  `supports_event_override` tinyint(1) NOT NULL DEFAULT 0,
  `required_tokens_json` json NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_email_template_definitions_key` (`template_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `email_templates` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `scope` enum('platform','organizer','event') COLLATE utf8mb4_unicode_ci NOT NULL,
  `organizer_id` int unsigned DEFAULT NULL,
  `event_id` int unsigned DEFAULT NULL,
  `template_key` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `locale` enum('es','en') COLLATE utf8mb4_unicode_ci NOT NULL,
  `subject` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `body_html` mediumtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `preheader` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `updated_by_type` enum('admin','organizer') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `updated_by_id` int unsigned DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_email_templates_scope` (`scope`,`organizer_id`,`event_id`,`template_key`,`locale`),
  KEY `idx_email_templates_org` (`organizer_id`,`template_key`),
  KEY `idx_email_templates_event` (`event_id`,`template_key`),
  CONSTRAINT `fk_email_templates_organizer` FOREIGN KEY (`organizer_id`) REFERENCES `organizers` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_email_templates_event` FOREIGN KEY (`event_id`) REFERENCES `events` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `email_template_definitions`
  (`template_key`, `audience`, `editable_by_organizer`, `supports_event_override`, `required_tokens_json`)
VALUES
  ('otp_login', 'athlete', 0, 0, JSON_ARRAY('code', 'minutes', 'organizer_name', 'powered_by')),
  ('otp_register', 'athlete', 0, 0, JSON_ARRAY('code', 'minutes', 'organizer_name', 'powered_by')),
  ('welcomeAthlete', 'athlete', 1, 0, JSON_ARRAY('first_name', 'cta_url')),
  ('registrationConfirmed', 'athlete', 1, 1, JSON_ARRAY('first_name', 'event_name', 'folio', 'cta_url')),
  ('waiverAcceptanceUpdated', 'athlete', 1, 1, JSON_ARRAY('first_name', 'event_name')),
  ('groupOrderSummary', 'athlete', 1, 1, JSON_ARRAY('first_name', 'event_name', 'total')),
  ('eventBroadcast', 'broadcast', 1, 1, JSON_ARRAY('first_name', 'event_name', 'body'))
ON DUPLICATE KEY UPDATE
  `editable_by_organizer` = VALUES(`editable_by_organizer`),
  `supports_event_override` = VALUES(`supports_event_override`);
