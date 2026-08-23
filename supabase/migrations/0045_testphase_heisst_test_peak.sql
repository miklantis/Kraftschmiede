-- 0045 Testphase heisst ueberall "Test/Peak"
-- ----------------------------------------------------------------
-- Schritt 3 von "Bausteine in der Datenbank" (Issue #321/#324, Konzept
-- docs/Konzept-Bausteine-Datenstruktur.md, Abschnitte 9 und 10).
--
-- Was: Die Testphase heisst in der Vorlage "Wiedereinstieg & Aufbau" und in der
-- daraus gestarteten laufenden Journey bisher "Übergang / Test". Sie bekommt den
-- Namen ihres Bausteins: "Test/Peak".
--
-- Warum: Dieselbe Phase traegt heute je nach Bildschirm zwei Namen - auf der
-- Journey-Seite steht der Phasenname "Übergang / Test", auf dem
-- Trainingsbildschirm der aus dem Fokus abgeleitete Name "Test/Peak". Seit
-- Schritt 3 gibt es diesen abgeleiteten Namen nicht mehr; ueberall steht der
-- Phasenname. Damit dort nicht der falsche der beiden Namen uebrig bleibt, wird
-- er hier auf den Baustein-Namen gezogen.
--
-- Fuer wen: alle Nutzer. Betroffen sind nur Phasen, die heute exakt
-- "Übergang / Test" heissen - ein abweichend benannter Phasenname bleibt
-- unangetastet (der Baustein-Name ist die Vorgabe, nicht der Zwang).
--
-- Idempotent: Ein zweiter Lauf findet keine Zeile mehr mit dem alten Namen.

begin;

update journey_template_phases
   set name = 'Test/Peak'
 where focus = 'test'
   and name = 'Übergang / Test';

update phases
   set name = 'Test/Peak'
 where focus = 'test'
   and name = 'Übergang / Test';

commit;

-- Kontrolle (nach dem Lauf auszufuehren, erwartet 0 Zeilen):
--   select 'vorlage' as ort, id, name from journey_template_phases
--    where name = 'Übergang / Test'
--   union all
--   select 'journey', id, name from phases
--    where name = 'Übergang / Test';
