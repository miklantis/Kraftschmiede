-- 0005 – Workout-Namen als volle Wahrheit
--
-- Frueher hielten die Vorlagen nur den Buchstaben ("A", "B", "C", ...) und die
-- Oberflaeche stellte bei der Anzeige "Workout " voran. Seit Workouts sichtbar
-- und editierbar sind (Vorhaben 1.3), soll der Name die volle Wahrheit sein und
-- das Anzeige-Praefix entfaellt (Code ab 1.3.3). Damit die bestehenden Workouts
-- weiterhin "Workout A" usw. heissen, werden ihre Namen einmalig gehoben.
--
-- Trifft genau die einbuchstabigen Alt-Namen; laenger benannte (z. B. selbst im
-- Editor angelegte) bleiben unberuehrt. Idempotent: nach dem Lauf sind die Namen
-- laenger als ein Zeichen und werden nicht erneut ergaenzt. Der Unique-Index
-- (user_id, name) bleibt gewahrt, da aus eindeutigen Buchstaben eindeutige
-- "Workout X"-Namen werden.

update templates
set name = 'Workout ' || name
where char_length(name) = 1;
