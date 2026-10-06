-- Drop Mercado Pago organizer payout rail (product surface purge).
-- Keeps payments.provider / payment_refunds.provider 'mercadopago' for historical rows.
-- TiDB / MySQL 8 compatible.

-- Migrate any preferred MP rail to Stripe before narrowing the enum.
UPDATE `organizers`
SET `payout_rail` = 'stripe'
WHERE `payout_rail` = 'mercadopago';

-- Narrow enum to stripe|manual only.
ALTER TABLE `organizers`
  MODIFY COLUMN `payout_rail` ENUM('stripe','manual')
    COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'stripe'
    COMMENT 'Preferred checkout/payout rail';

-- Drop OAuth nonce index if present.
DROP INDEX IF EXISTS `idx_organizers_mp_oauth_nonce` ON `organizers`;

ALTER TABLE `organizers`
  DROP COLUMN `mp_user_id`,
  DROP COLUMN `mp_access_token_enc`,
  DROP COLUMN `mp_refresh_token_enc`,
  DROP COLUMN `mp_token_expires_at`,
  DROP COLUMN `mp_public_key`,
  DROP COLUMN `mp_oauth_status`,
  DROP COLUMN `mp_oauth_connected_at`,
  DROP COLUMN `mp_oauth_last_synced_at`,
  DROP COLUMN `mp_oauth_state_nonce`,
  DROP COLUMN `mp_oauth_state_expires_at`,
  DROP COLUMN `mp_oauth_code_verifier_enc`;
