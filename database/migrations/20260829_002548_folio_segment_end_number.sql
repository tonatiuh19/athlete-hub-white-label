-- Folio blocks: optional inclusive end of the sequence range (NULL = unlimited).
ALTER TABLE event_folio_segments
  ADD COLUMN end_number INT UNSIGNED NULL DEFAULT NULL AFTER start_number;
