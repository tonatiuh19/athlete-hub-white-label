-- Manual organizer payout accounts (Cuenta de Pago / SPEI settlement).
-- TiDB / MySQL 8 compatible.

ALTER TABLE `organizers`
  MODIFY COLUMN `payout_rail` enum('stripe','mercadopago','manual')
    COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'stripe'
    COMMENT 'Preferred checkout/payout rail';

CREATE TABLE IF NOT EXISTS `organizer_payout_accounts` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `organizer_id` int unsigned NOT NULL,
  `nickname` varchar(80) COLLATE utf8mb4_unicode_ci NOT NULL,
  `holder_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `clabe_enc` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `clabe_last4` char(4) COLLATE utf8mb4_unicode_ci NOT NULL,
  `clabe_hash` char(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'SHA-256 hex for duplicate detection',
  `bank_name` varchar(120) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `person_type` enum('persona_fisica','persona_moral') COLLATE utf8mb4_unicode_ci NOT NULL,
  `legal_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `tax_regime` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `rfc` varchar(13) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `curp` varchar(18) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `fiscal_street` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `fiscal_ext_number` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `fiscal_int_number` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `fiscal_neighborhood` varchar(120) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `fiscal_city` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `fiscal_municipality` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `fiscal_state` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `fiscal_postal_code` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `phone` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `invoice_email` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `constancia_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `bank_statement_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_default` tinyint(1) NOT NULL DEFAULT 0,
  `status` enum('draft','submitted','verified','rejected') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'draft',
  `rejection_reason` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `locked_at` datetime DEFAULT NULL,
  `submitted_at` datetime DEFAULT NULL,
  `verified_at` datetime DEFAULT NULL,
  `verified_by_admin_id` int unsigned DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_opa_organizer` (`organizer_id`),
  KEY `idx_opa_org_status` (`organizer_id`, `status`),
  KEY `idx_opa_clabe_hash` (`organizer_id`, `clabe_hash`),
  CONSTRAINT `fk_opa_organizer` FOREIGN KEY (`organizer_id`) REFERENCES `organizers` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
