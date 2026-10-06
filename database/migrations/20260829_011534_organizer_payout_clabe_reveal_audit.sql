-- Durable audit log for admin CLABE reveals (SPEI ops).
-- TiDB / MySQL 8 compatible.

CREATE TABLE IF NOT EXISTS `organizer_payout_account_clabe_reveals` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `organizer_id` int unsigned NOT NULL,
  `payout_account_id` int unsigned NOT NULL,
  `admin_id` int unsigned NOT NULL,
  `clabe_last4` char(4) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_opa_reveal_account` (`payout_account_id`),
  KEY `idx_opa_reveal_admin` (`admin_id`),
  KEY `idx_opa_reveal_org_created` (`organizer_id`, `created_at`),
  CONSTRAINT `fk_opa_reveal_account` FOREIGN KEY (`payout_account_id`)
    REFERENCES `organizer_payout_accounts` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_opa_reveal_organizer` FOREIGN KEY (`organizer_id`)
    REFERENCES `organizers` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
