-- 0027 Intensitaetsrampe je Phase und Phasenbezug des Ankers
-- ----------------------------------------------------------------
-- Grundlage fuer das zweite Steuerrad der Journey (Issue #200): eine Phase soll
-- nicht nur die Satzzahl ueber die Wochen rampen koennen, sondern auch die Last.
-- Bisher liefert nur die Satzrampe einen Phasenunterschied; das Gewicht bestimmt
-- allein der Coach aus der letzten Leistung, und der Lastfaktor aus 0022 haengt
-- pro Phase statt pro Woche.
--
-- 1) journey_template_phases.intensity_start / .intensity_end
--    phases.intensity_start / .intensity_end
--    Geplante Intensitaet in Prozent des 1RM zu Beginn und am Ende der Phase
--    (z. B. 77.5 und 82.5). Dazwischen wird ueber die Aufbauwochen linear
--    interpoliert, die Entlastungswoche liegt darunter. Nullable, weil nur
--    Kraft-, Power- und Testphasen die Last planen; ueberall sonst bleibt es
--    beim bisherigen Verhalten (Coach steuert das Gewicht).
-- 2) exercises.reference_phase_id
--    Zu welcher Phase das aktuell hinterlegte reference_weight gehoert. Noetig,
--    weil der Anker beim Eintritt in eine lastgesteuerte Phase neu gesetzt wird
--    und sonst ueber Phasengrenzen hinweg kleben wuerde. Ohne diesen Bezug
--    liesse sich "Anker gilt fuer diese Phase" nicht von "noch kein Anker"
--    unterscheiden, und die Last wuerde pro Einheit statt pro Woche steigen.
--    Nullable und ohne Fremdschluessel-Zwang beim Loeschen: verschwindet die
--    Phase, ist der Anker schlicht ungueltig und wird neu gesetzt.
--
-- Idempotent: mehrfaches Ausfuehren aendert nichts (add column if not exists).
-- Folgenlos auf dem bestehenden Stand: alle neuen Spalten sind null.

alter table public.journey_template_phases
  add column if not exists intensity_start numeric,
  add column if not exists intensity_end numeric;

alter table public.phases
  add column if not exists intensity_start numeric,
  add column if not exists intensity_end numeric;

alter table public.exercises
  add column if not exists reference_phase_id uuid;
