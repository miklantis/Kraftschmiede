-- 0063 Soft-Archiv der Workouts entfernen (Issue #491)
-- ----------------------------------------------------------------------------
-- Was: Die Spalte `templates.active` faellt weg.
--
-- Warum: Workouts liessen sich bisher nur archivieren, nicht loeschen
-- (Migration 0004: "Soft-Archiv statt hartem Loeschen ... damit der Verlauf und
-- bestehende Sessions heil bleiben"). Diese Begruendung traegt nicht mehr:
--   * Saetze, Gewichte, Uebungen, Notizen und 1RM-Tests sind Kopien in der
--     Einheit, keine Verweise ins Workout.
--   * Der Workout-Name steht seit 0053 an der Einheit (`sessions.template_name`),
--     und seit Issue #490 fallen Verlauf, Kalender, Journey-Rueckschau und
--     Coach-Export darauf zurueck, sobald das Workout fehlt.
--   * `sessions.template_id` ist `on delete set null`, `template_exercises` und
--     `journey_workouts` haengen per `on delete cascade` - die Datenbank raeumt
--     beim Loeschen selbst auf.
-- Damit bleibt vom Archiv nur der Nachteil: archivierte Workouts liegen
-- sichtbar herum und blockieren ueber `templates_unique_user_name` dauerhaft
-- ihren Namen. Ab jetzt gibt es Workouts und geloeschte Workouts, sonst nichts.
--
-- Fuer wen: alle Nutzer. Zum Zeitpunkt dieser Migration existiert kein einziges
-- archiviertes Workout - es geht also nichts verloren. Sollte doch eines
-- liegen, taucht es nach dem Lauf schlicht wieder in der Liste auf; geloescht
-- wird durch diese Migration nichts.
--
-- Bewusst unveraendert:
--   * `templates_unique_user_name`: zwei gleichzeitig bestehende Workouts
--     duerfen weiterhin nicht gleich heissen. Der Name eines geloeschten
--     Workouts wird dadurch wieder frei - das ist der Gewinn, nicht der Index.
--   * `templates.key`, `image`, `position` und die Zeilensicherheit.
--   * Jede Einheit, jede Zuordnung, jedes Referenzgewicht.
--
-- Idempotent: `drop column if exists`. Ein zweiter Lauf findet nichts mehr.
-- Erwartete Ausgabe im SQL-Editor: "Success. No rows returned".

begin;

alter table public.templates
  drop column if exists active;

commit;

-- Kontrolle (nach dem Lauf auszufuehren, erwartet 0 Zeilen):
--   select column_name
--     from information_schema.columns
--    where table_schema = 'public'
--      and table_name = 'templates'
--      and column_name = 'active';
