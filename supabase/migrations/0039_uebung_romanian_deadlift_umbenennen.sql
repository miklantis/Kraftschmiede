-- 0039 Uebung "Deadlift" in "Romanian Deadlift (RDL)" umbenennen (Vorhaben #260)
-- ----------------------------------------------------------------------------
-- Die Hauptuebung mit dem key "deadlift" hiess "Deadlift" und trug die
-- Beschreibung des klassischen Kreuzhebens vom Boden. Tatsaechlich wird seit
-- jeher der Romanian Deadlift (RDL) trainiert: Start im aufrechten Stand,
-- Knie leicht gebeugt, Hantel eng an den Beinen nach unten, Rueckfuehrung aus
-- der Huefte. Name und Beschreibung werden auf die real ausgefuehrte Uebung
-- korrigiert.
--
-- Bewusst unveraendert:
--   * key bleibt "deadlift" – daran haengen im Code die reduzierte
--     Aufwaermrampe (warmupFor) und das 72-h-Erholungsfenster (suitability).
--     Beides passt fuer den RDL.
--   * Alle Zahlen (1RM, Arbeitsgewicht, Referenz-/Startgewicht der Kraftphase,
--     Meilenstein) bleiben gueltig, weil sie mit dem RDL erarbeitet wurden.
--   * Trainingshistorie haengt an der Uebungs-ID, nicht am Namen.
--   * Wiederholungsbereich (4-8) und Muskel-Zuordnung bleiben unberuehrt.
--
-- Idempotent: greift nur auf Zeilen mit key = 'deadlift', mehrfaches
-- Ausfuehren setzt dieselben Werte erneut.
-- Erwartete Ausgabe im SQL-Editor: "Success. No rows returned".

update public.exercises
set
  name = 'Romanian Deadlift (RDL)',
  description = 'Rumänisches Kreuzheben: aus dem aufrechten Stand mit leicht gebeugten Knien die Hüfte nach hinten schieben, die Langhantel eng an den Beinen bis etwa Mitte Schienbein senken, Rücken gerade, dann aus der Hüfte zurück in den Stand.'
where key = 'deadlift';
