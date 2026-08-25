-- 0054 Schoenheitsfehler im Uebungskatalog aufraeumen (Vorhaben #396)
-- ----------------------------------------------------------------------------
-- Zwei Altlasten, die beim Umsetzen von #393 bewusst stehen blieben, weil der
-- Seed dort erst einmal den Bestand abbilden sollte:
--
--   1. Schluessel-Schreibweise: 'dumbbell-curl' ist der einzige der 22
--      Uebungsschluessel mit Bindestrich; alle anderen sind snake_case.
--      Entstanden in Migration 0010. Funktional gleichwertig - kein Code liest
--      diesen Schluessel, und alle Verknuepfungen (Saetze, Meilensteine,
--      1RM-Tests, Phasen-Anker, Workout-Zuordnungen) haengen an der
--      Uebungs-ID, nicht am key.
--   2. Positionen: 'dumbbell-curl' und 'plate_situps' teilen sich beide die
--      Position 7, die 22 Uebungen laufen dadurch nur bis 20. Sortiert wird
--      der Katalog allein ueber position (hooks/useExercises.ts), ohne zweites
--      Sortierfeld - bei gleicher Position ist die Reihenfolge dieser beiden
--      Uebungen also undefiniert und kann zwischen zwei Abfragen wechseln.
--
-- Schritt 2 nummeriert je Nutzer lueckenlos ab 0 durch, in der bisherigen
-- Reihenfolge (position, dann key als Stichentscheid). Die sichtbare
-- Reihenfolge bleibt damit erhalten; nur die beiden Uebungen auf der 7
-- bekommen eine feste statt einer zufaelligen Abfolge. Selbst angelegte
-- Uebungen laufen mit, ihre Einsortierung bleibt.
--
-- Idempotent: Schritt 1 greift nur die Zeile mit dem alten Schluessel.
-- Schritt 2 ist in sich wiederholbar - nach dem ersten Lauf sind die
-- Positionen eindeutig, eine erneute Nummerierung ueber (position, key)
-- ergibt dieselbe Reihenfolge und dieselben Werte.
-- Erwartete Ausgabe im SQL-Editor: "Success. No rows returned".

-- 1. Schluessel auf snake_case bringen
update public.exercises
set key = 'dumbbell_curl'
where key = 'dumbbell-curl';

-- 2. Positionen je Nutzer lueckenlos und eindeutig ab 0 durchnummerieren
with neu as (
  select
    id,
    (row_number() over (
      partition by user_id
      order by position, key nulls last, name
    ))::int - 1 as position
  from public.exercises
)
update public.exercises e
set position = neu.position
from neu
where neu.id = e.id
  and neu.position is distinct from e.position;
