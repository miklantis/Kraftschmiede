-- 0028 Lastrampen fuer Kraft-, Power- und Testphasen
-- ----------------------------------------------------------------
-- Setzt die Prozentwerte, mit denen eine Phase ihre Last plant (Spalten aus
-- 0027). Damit wird das zweite Steuerrad der Journey erstmals wirksam: in
-- Kraft-, Power- und Testphasen steigt das Gewicht ueber die Wochen, waehrend
-- Saetze und Wiederholungen konstant bleiben. Hypertrophie und Kraftausdauer
-- bleiben beim Coach - dort ist Volumen der Motor.
--
-- Die Werte folgen Bompa/Buzzichelli, Periodisierung der Kraft: eine
-- Maximalkraftphase mit Band 4-6 laeuft von 77,5 auf 82,5 Prozent des 1RM,
-- engere Baender entsprechend schwerer, die Testphase bis nahe an das Maximum.
--
-- 1) Vorlagen-Phasen (journey_template_phases), je Vorlage und Phasenname.
-- 2) Laufende Journeys (phases) nach derselben Regel, aber ueber Fokus und
--    Wiederholungsband statt ueber den Namen - laufende Phasen koennen
--    abweichende Wochenzahlen tragen (0026 hat die Zeitachse bewusst nicht
--    angefasst), die Rampe kommt damit zurecht.
--
-- Ausgenommen: "Wiederaufbau nach Fasten" und jede laufende Journey mit einem
-- Lastfaktor. Dort gibt bereits der Lastfaktor das Gewicht vor; beide
-- Mechanismen duerfen nie an derselben Phase haengen.
--
-- Idempotent: reine Updates auf feste Zielwerte, mehrfaches Ausfuehren aendert
-- nach dem ersten Lauf nichts mehr.

-- 1) Vorlagen -----------------------------------------------------------------

update public.journey_template_phases p
set intensity_start = v.i_start,
    intensity_end = v.i_end
from (values
  ('reentry_build',  'Maximalkraft',    77.5, 82.5),
  ('reentry_build',  'Übergang / Test', 90.0, 90.0),
  ('strength_peak',  'Kraftbasis',      77.5, 82.5),
  ('strength_peak',  'Intensivierung',  82.5, 87.5),
  ('strength_peak',  'Peak & Test',     87.5, 92.5),
  ('block_3m',       'Maximalkraft',    77.5, 82.5),
  ('block_3m',       'Peak & Test',     85.0, 90.0),
  ('periodized_6m',  'Kraft I',         75.0, 80.0),
  ('periodized_6m',  'Kraft II',        77.5, 82.5),
  ('periodized_6m',  'Maximalkraft',    82.5, 87.5),
  ('periodized_6m',  'Peak & Test',     87.5, 92.5)
) as v(tpl_key, phase_name, i_start, i_end)
where p.name = v.phase_name
  and exists (
    select 1 from public.journey_templates t
    where t.id = p.journey_template_id and t.key = v.tpl_key
  );

-- 2) Laufende Journeys --------------------------------------------------------
-- Regel ueber Fokus und Wiederholungsband, damit auch abweichende Wochenzahlen
-- getroffen werden. Journeys mit Lastfaktor bleiben unberuehrt.

update public.phases p
set intensity_start = case
      when p.focus = 'power' then 82.5
      when p.focus = 'test' and p.weeks = 1 then 90.0
      when p.focus = 'test' then 87.5
      when coalesce(p.rep_target_max, 6) <= 5 then 82.5
      else 77.5
    end,
    intensity_end = case
      when p.focus = 'power' then 87.5
      when p.focus = 'test' and p.weeks = 1 then 90.0
      when p.focus = 'test' then 92.5
      when coalesce(p.rep_target_max, 6) <= 5 then 87.5
      else 82.5
    end
where p.focus in ('strength', 'power', 'test')
  and exists (
    select 1 from public.journeys j
    where j.id = p.journey_id and j.status = 'active'
  )
  and not exists (
    select 1 from public.phases q
    where q.journey_id = p.journey_id and q.load_factor <> 1
  );
