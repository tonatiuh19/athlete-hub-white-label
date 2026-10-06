-- Event broadcasts (Resend) + per-event confirmed audience cache for segment sync

ALTER TABLE `events`
  ADD COLUMN `resend_confirmed_segment_id` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL
    COMMENT 'Resend segment for confirmed registrants (atleita-event-{id}-confirmed)' AFTER `registration_count`;

CREATE TABLE `event_broadcast_audience` (
  `event_id` int unsigned NOT NULL,
  `athlete_id` int unsigned NOT NULL,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `first_name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `last_name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `in_resend_segment` tinyint(1) NOT NULL DEFAULT '0',
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`event_id`, `athlete_id`),
  KEY `idx_eba_event_email` (`event_id`, `email`),
  CONSTRAINT `fk_eba_event` FOREIGN KEY (`event_id`) REFERENCES `events` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_eba_athlete` FOREIGN KEY (`athlete_id`) REFERENCES `athletes` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `event_broadcasts` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `public_uuid` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `event_id` int unsigned NOT NULL,
  `organizer_id` int unsigned NOT NULL,
  `created_by_member_id` int unsigned DEFAULT NULL,
  `created_by_admin_id` int unsigned DEFAULT NULL,
  `audience_type` enum('confirmed') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'confirmed',
  `template_key` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `subject` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL,
  `content_html` mediumtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `rendered_html` mediumtext COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `from_display` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `resend_broadcast_id` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `resend_segment_id` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` enum('draft','scheduled','sent','failed','cancelled') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'draft',
  `send_mode` enum('now','scheduled') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'now',
  `scheduled_at` datetime DEFAULT NULL,
  `sent_at` datetime DEFAULT NULL,
  `recipient_count` int unsigned NOT NULL DEFAULT '0',
  `error_message` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_event_broadcasts_public_uuid` (`public_uuid`),
  KEY `idx_event_broadcasts_event` (`event_id`, `created_at`),
  KEY `idx_event_broadcasts_status` (`status`, `scheduled_at`),
  CONSTRAINT `fk_event_broadcasts_event` FOREIGN KEY (`event_id`) REFERENCES `events` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_event_broadcasts_organizer` FOREIGN KEY (`organizer_id`) REFERENCES `organizers` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
