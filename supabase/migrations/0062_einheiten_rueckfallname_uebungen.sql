-- 0062 Rueckfallnamen der Uebungen in alten Einheiten nachziehen (Issue #483)
-- ----------------------------------------------------------------------------
-- Jede Uebung-in-Einheit (`session_exercises`) traegt neben dem Verweis auf die
-- Katalog-Uebung auch deren Namen. Angezeigt wird er nur als Rueckfall: solange
-- `exercise_id` gesetzt ist, loesen Verlauf, Einheiten-Ansicht und
-- Journey-Rueckschau den Namen ueber den Katalog auf (src/lib/history.ts,
-- SessionEditPanel). Gebraucht wird der gespeicherte Name bei Zeilen ohne
-- Katalogbezug, also bei Skill-Uebungen.
--
-- Was: Bei allen Zeilen MIT Katalogbezug wird der gespeicherte Name auf den
-- heutigen Katalognamen gezogen.
--
-- Warum: Nach den Umbenennungen 0039 (Deadlift -> "Romanian Deadlift (RDL)")
-- und 0055/0056 (Back Squat -> "Back Squat (Full)") stehen in aelteren
-- Einheiten noch die alten Namen, in den aeltesten gar keiner. Sichtbar ist
-- davon nichts, aber ein Rueckfallwert, der etwas anderes behauptet als der
-- Katalog, ist eine Falle fuer spaeter. Uebungen sind Stammdaten: eine
-- Namenskorrektur soll rueckwirkend gelten - anders als beim Workout-Namen, der
-- beim Journey-Abschluss bewusst eingebrannt wird (ADR-0022).
--
-- Fuer wen: alle Nutzer mit Trainingsverlauf.
--
-- Bewusst unveraendert:
--   * Zeilen ohne `exercise_id` (Skill-Uebungen) - dort ist der gespeicherte
--     Name die einzige Quelle.
--   * Saetze, Gewichte, 1RM-Tests, Notizen und jede Zuordnung zu Journey und
--     Phase.
--
-- Idempotent: Die Bedingung greift nur, solange ein Name fehlt oder abweicht.
-- Ein zweiter Lauf findet nichts mehr.
-- Erwartete Ausgabe im SQL-Editor: "Success. No rows returned".

begin;

update public.session_exercises se
   set name = e.name
  from public.exercises e
 where se.exercise_id = e.id
   and (se.name is null or se.name is distinct from e.name);

commit;

-- Kontrolle (nach dem Lauf auszufuehren, erwartet 0 Zeilen):
--   select se.id, se.name, e.name as katalog
--     from public.session_exercises se
--     join public.exercises e on e.id = se.exercise_id
--    where se.name is null or se.name is distinct from e.name;
