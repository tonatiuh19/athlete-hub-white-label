-- Backfill known city coordinates for event location mini-maps (Coatepec, Veracruz).
UPDATE geo_cities gc
JOIN geo_states gs ON gs.id = gc.state_id
SET gc.lat = 19.4522000,
    gc.lng = -96.9614000,
    gc.source = CASE WHEN gc.source = 'seed' THEN 'manual' ELSE gc.source END
WHERE gc.name = 'Coatepec'
  AND gs.country = 'MX'
  AND (gs.name = 'Veracruz' OR gs.code = 'VER')
  AND (gc.lat IS NULL OR gc.lng IS NULL);
