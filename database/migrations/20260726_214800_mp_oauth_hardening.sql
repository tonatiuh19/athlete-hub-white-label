-- Mercado Pago OAuth CSRF + PKCE state storage (nonce is opaque; no organizer id in redirect state).
-- TiDB: avoid AFTER references to columns added in the same statement.
ALTER TABLE `organizers`
  ADD COLUMN `mp_oauth_state_nonce` VARCHAR(64) NULL;

ALTER TABLE `organizers`
  ADD COLUMN `mp_oauth_state_expires_at` DATETIME NULL;

ALTER TABLE `organizers`
  ADD COLUMN `mp_oauth_code_verifier_enc` TEXT NULL;

ALTER TABLE `organizers`
  ADD KEY `idx_organizers_mp_oauth_nonce` (`mp_oauth_state_nonce`);
