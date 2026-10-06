-- Phase 3: SPEI settlement queue for platform-mode Stripe charges (manual payout rail).
-- Ops SPEIs registration_amount_cents to the organizer's verified Cuenta de Pago.
-- TiDB / MySQL 8 compatible.

CREATE TABLE IF NOT EXISTS `payment_spei_settlements` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `payment_id` int unsigned NOT NULL,
  `organizer_id` int unsigned NOT NULL,
  `event_id` int unsigned DEFAULT NULL,
  `amount_cents` int unsigned NOT NULL COMMENT 'registration_amount_cents portion for organizer',
  `currency` char(3) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'MXN',
  `status` enum('pending','sent','cancelled') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `payout_account_id` int unsigned DEFAULT NULL,
  `marked_sent_by_admin_id` int unsigned DEFAULT NULL,
  `marked_sent_at` datetime DEFAULT NULL,
  `notes` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_pss_payment` (`payment_id`),
  KEY `idx_pss_organizer_status` (`organizer_id`, `status`),
  KEY `idx_pss_status_created` (`status`, `created_at`),
  CONSTRAINT `fk_pss_payment` FOREIGN KEY (`payment_id`) REFERENCES `payments` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_pss_organizer` FOREIGN KEY (`organizer_id`) REFERENCES `organizers` (`id`),
  CONSTRAINT `fk_pss_event` FOREIGN KEY (`event_id`) REFERENCES `events` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_pss_payout_account` FOREIGN KEY (`payout_account_id`) REFERENCES `organizer_payout_accounts` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_pss_marked_sent_admin` FOREIGN KEY (`marked_sent_by_admin_id`) REFERENCES `admins` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Backfill pending rows for existing platform-mode Stripe charges (non-simulation).
INSERT INTO `payment_spei_settlements` (
  `payment_id`,
  `organizer_id`,
  `event_id`,
  `amount_cents`,
  `currency`,
  `status`,
  `payout_account_id`
)
SELECT
  p.`id`,
  p.`organizer_id`,
  p.`event_id`,
  p.`registration_amount_cents`,
  COALESCE(NULLIF(p.`currency`, ''), 'MXN'),
  'pending',
  (
    SELECT opa.`id`
    FROM `organizer_payout_accounts` opa
    WHERE opa.`organizer_id` = p.`organizer_id`
      AND opa.`status` = 'verified'
      AND opa.`is_default` = 1
    ORDER BY opa.`id` ASC
    LIMIT 1
  )
FROM `payments` p
WHERE p.`provider` = 'stripe'
  AND COALESCE(p.`is_simulation`, 0) = 0
  AND p.`status` = 'succeeded'
  AND p.`registration_amount_cents` > 0
  AND JSON_UNQUOTE(JSON_EXTRACT(p.`metadata_json`, '$.connect_charge_mode')) = 'platform'
  AND NOT EXISTS (
    SELECT 1 FROM `payment_spei_settlements` s WHERE s.`payment_id` = p.`id`
  );
