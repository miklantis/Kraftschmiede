-- 0015 Zeitraeume: Namensfeld
-- ----------------------------------------------------------------
-- Ergaenzt den Timeline-Marker um einen kurzen, freien Namen. Der Name ist der
-- Titel des Zeitraums und wird im Kalender-Band angezeigt (fehlt er, zeigt das
-- Band den Typ). Die bestehende Notiz bleibt unveraendert als separater,
-- laengerer Kontext erhalten und erscheint nicht im Band.
--
-- Nullable, kein Default: bestehende Zeilen bleiben ohne Namen (das Band faellt
-- dort auf den Typ zurueck). Idempotent (add column if not exists).
-- Erwartete Ausgabe im SQL-Editor: "No rows returned".

alter table public.zeitraeume
  add column if not exists name text;
