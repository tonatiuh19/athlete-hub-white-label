-- Align backfilled vanity labels with shared EVENT_SUBDOMAIN_RESERVED + prefix rules.
-- Labels that validate as reserved (ssh/vpn/null/undefined, sim-*, www-*) are rewritten
-- to e{id} so they cannot be opened as dead vanity hosts and stay unique.

UPDATE `events`
SET `subdomain` = LEFT(CONCAT('e', `id`), 63),
    `updated_at` = CURRENT_TIMESTAMP
WHERE `subdomain` IS NOT NULL
  AND (
    `subdomain` IN ('ssh', 'vpn', 'null', 'undefined')
    OR `subdomain` LIKE 'sim-%'
    OR `subdomain` LIKE 'www-%'
  );

-- If e{id} collided (rare), uniquify remaining duplicates among live+deleted
UPDATE `events` e
INNER JOIN (
  SELECT `subdomain`, MIN(`id`) AS keep_id
  FROM `events`
  WHERE `subdomain` IS NOT NULL
  GROUP BY `subdomain`
  HAVING COUNT(*) > 1
) d ON d.`subdomain` = e.`subdomain` AND e.`id` <> d.keep_id
SET e.`subdomain` = LEFT(CONCAT('e', e.`id`, '-', e.`id`), 63),
    e.`updated_at` = CURRENT_TIMESTAMP;
