-- Scrub legacy third-party brand defaults from platform_settings (Atleita rebrand).
-- Idempotent: only replaces known legacy values; custom admin edits are preserved when already Atleita.

UPDATE `platform_settings`
SET `setting_value` = JSON_SET(
  `setting_value`,
  '$.legalEntity.brandName', 'Atleita',
  '$.legalEntity.legalName', 'ATLEITA',
  '$.legalEntity.arcoEmail', 'privacidad@atleita.com',
  '$.legalEntity.supportEmail', 'soporte@atleita.com',
  '$.legalEntity.website', 'https://www.atleita.com',
  '$.legalEntity.lastUpdated', '2026-10-05'
)
WHERE `setting_key` = 'site_public_profile'
  AND (
    JSON_UNQUOTE(JSON_EXTRACT(`setting_value`, '$.legalEntity.brandName')) IN ('Triboo Sport', 'TRIBOO SPORT', 'Triboo')
    OR JSON_UNQUOTE(JSON_EXTRACT(`setting_value`, '$.legalEntity.website')) LIKE '%triboosport.com%'
    OR JSON_UNQUOTE(JSON_EXTRACT(`setting_value`, '$.legalEntity.supportEmail')) LIKE '%triboosport.com%'
    OR JSON_UNQUOTE(JSON_EXTRACT(`setting_value`, '$.legalEntity.arcoEmail')) LIKE '%triboosport.com%'
  );
