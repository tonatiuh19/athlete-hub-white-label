-- Event vanity subdomains: {subdomain}.atleita.com (globally unique, immutable after create)
-- TiDB / MySQL 8 compatible — avoid REGEXP_REPLACE for broader TiDB support

ALTER TABLE `events`
  ADD COLUMN `subdomain` varchar(63) COLLATE utf8mb4_unicode_ci DEFAULT NULL
    COMMENT 'Vanity host label for {subdomain}.atleita.com; immutable; globally unique'
    AFTER `slug`;

-- Prefer slug-derived label; fall back to e{id} (always unique / valid DNS label)
UPDATE `events`
SET `subdomain` = LOWER(
  TRIM(BOTH '-' FROM
    SUBSTRING(
      REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(`slug`, '_', '-'), '.', '-'), ' ', '-'), '--', '-'), '--', '-'), '--', '-'),
      1, 63
    )
  )
)
WHERE `deleted_at` IS NULL;

UPDATE `events`
SET `subdomain` = CONCAT('e', `id`)
WHERE `deleted_at` IS NULL
  AND (
    `subdomain` IS NULL
    OR `subdomain` = ''
    OR CHAR_LENGTH(`subdomain`) < 3
    OR `subdomain` IN (
      'www','api','app','admin','staff','portal','cdn','static','assets','mail','email',
      'smtp','ftp','dev','test','staging','sandbox','embed','widget','docs','help','support',
      'status','blog','shop','store','pay','payments','billing','stripe','webhooks','webhook',
      'oauth','auth','login','signup','register','account','accounts','dashboard','console',
      'm','mobile','ns','ns1','ns2','mx','root','localhost', 'atleita', 'triboo', 'triboosport','sim',
      'simulation','simulations'
    )
  );

-- Resolve remaining duplicates (keep lowest id)
UPDATE `events` e
INNER JOIN (
  SELECT `subdomain`, MIN(`id`) AS keep_id
  FROM `events`
  WHERE `deleted_at` IS NULL AND `subdomain` IS NOT NULL
  GROUP BY `subdomain`
  HAVING COUNT(*) > 1
) d ON d.`subdomain` = e.`subdomain` AND e.`id` <> d.keep_id
SET e.`subdomain` = LEFT(CONCAT('e', e.`id`), 63)
WHERE e.`deleted_at` IS NULL;

ALTER TABLE `events`
  ADD UNIQUE KEY `uk_events_subdomain` (`subdomain`);
