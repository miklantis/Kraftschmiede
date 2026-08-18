-- 0026 Periodisierung der Journey-Vorlagen
-- ----------------------------------------------------------------
-- Zieht fuer bestehende Nutzer nach, was neue Nutzer ueber den Seed bekommen
-- (src/seed/definitions.ts, journeyTemplateSeeds). Hintergrund ist Issue #197:
-- Die Vorlagen unterschieden sich bisher nur ueber das Wiederholungsband, der
-- Belastungsverlauf war ueberall derselbe (die Satzzahl steigt).
--
-- Drei Regeln aendern sich:
--   1. Kraft-, Power- und Testphasen fahren eine konstante Satzzahl
--      (sets_start = sets_end). Dort arbeitet nur noch das Gewicht.
--   2. Hypertrophie- und Kraftausdauerphasen rampen flacher und enden nach
--      hoechstens vier Aufbauwochen mit einer Entlastungswoche (3:1).
--   3. In die Testwoche hinein sinkt das Volumen, damit ausgeruht gemessen wird.
--
-- Zwei Vorlagen bekommen dadurch einen zusaetzlichen Block ("3-Monats-Block",
-- "6-Monats-Periodisierung"); ihre Zusammenfassung wird mit aktualisiert.
-- "Erhaltung / Minimaldosis" bleibt unveraendert.
--
-- Idempotent: Die Phasen der betroffenen Vorlagen werden komplett ersetzt
-- (loeschen + neu einfuegen), mehrfaches Ausfuehren fuehrt zum selben Stand.
-- Vorlagen sind in der App nicht editierbar, es geht dabei nichts verloren.

-- ----------------------------------------------------------------
-- 1. Phasen der betroffenen Vorlagen ersetzen
-- ----------------------------------------------------------------

delete from public.journey_template_phases p
 using public.journey_templates t
 where p.journey_template_id = t.id
   and t.key in (
     'reentry_build',
     'hypertrophy_block',
     'strength_peak',
     'conditioning',
     'block_3m',
     'periodized_6m'
   );

insert into public.journey_template_phases
  (user_id, journey_template_id, name, focus, weeks,
   sets_start, sets_end, deload_week, rep_target_min, rep_target_max,
   position, load_factor)
select t.user_id, t.id, n.name, n.focus, n.weeks,
       n.sets_start, n.sets_end, n.deload_week, n.rep_min, n.rep_max,
       n.pos, 1.0
  from public.journey_templates t
  join (
    values
      -- Wiedereinstieg & Aufbau (11 Wochen)
      ('reentry_build',     0, 'Wiedereinstieg',   'reentry',     2, 2, 2, null::integer, 5,  8),
      ('reentry_build',     1, 'Hypertrophie',     'hypertrophy', 4, 3, 5, 4,             8, 12),
      ('reentry_build',     2, 'Maximalkraft',     'strength',    4, 4, 4, 4,             4,  6),
      ('reentry_build',     3, 'Übergang / Test',  'test',        1, 2, 2, null,          2,  4),
      -- Hypertrophie-Block (9 Wochen)
      ('hypertrophy_block', 0, 'Akkumulation I',   'hypertrophy', 4, 3, 5, null,          8, 12),
      ('hypertrophy_block', 1, 'Deload',           'maintenance', 1, 4, 4, 1,             8, 10),
      ('hypertrophy_block', 2, 'Akkumulation II',  'hypertrophy', 4, 4, 5, 4,             8, 12),
      -- Maximalkraft / Peaking (9 Wochen)
      ('strength_peak',     0, 'Kraftbasis',       'strength',    4, 4, 4, 4,             4,  6),
      ('strength_peak',     1, 'Intensivierung',   'power',       3, 3, 3, 3,             3,  5),
      ('strength_peak',     2, 'Peak & Test',      'test',        2, 3, 2, null,          2,  4),
      -- Kraftausdauer / Kondition (7 Wochen)
      ('conditioning',      0, 'Aufbau Kapazität', 'endurance',   4, 3, 5, 4,            12, 18),
      ('conditioning',      1, 'Verdichtung',      'endurance',   3, 4, 6, 3,            12, 15),
      -- 3-Monats-Block (13 Wochen)
      ('block_3m',          0, 'Hypertrophie I',   'hypertrophy', 4, 3, 5, 4,             8, 12),
      ('block_3m',          1, 'Hypertrophie II',  'hypertrophy', 3, 4, 5, 3,             8, 12),
      ('block_3m',          2, 'Maximalkraft',     'strength',    4, 4, 4, 4,             4,  6),
      ('block_3m',          3, 'Peak & Test',      'test',        2, 3, 2, null,          2,  4),
      -- 6-Monats-Periodisierung (24 Wochen)
      ('periodized_6m',     0, 'Wiedereinstieg',   'reentry',     2, 2, 2, null,          5,  8),
      ('periodized_6m',     1, 'Hypertrophie I',   'hypertrophy', 4, 3, 5, 4,             8, 12),
      ('periodized_6m',     2, 'Kraft I',          'strength',    4, 4, 4, 4,             4,  6),
      ('periodized_6m',     3, 'Hypertrophie II',  'hypertrophy', 4, 4, 5, 4,             8, 12),
      ('periodized_6m',     4, 'Kraft II',         'strength',    4, 4, 4, 4,             4,  6),
      ('periodized_6m',     5, 'Maximalkraft',     'strength',    4, 4, 4, 4,             3,  5),
      ('periodized_6m',     6, 'Peak & Test',      'test',        2, 3, 2, null,          2,  4)
  ) as n (tkey, pos, name, focus, weeks, sets_start, sets_end, deload_week, rep_min, rep_max)
    on n.tkey = t.key;

-- ----------------------------------------------------------------
-- 2. Testwoche der Vorlage "Wiederaufbau nach Fasten"
-- ----------------------------------------------------------------
-- Einzige Aenderung dort: die Standort-Woche steigt nicht mehr von 2 auf 3
-- Saetze. Die Lastfaktor-Rampe (0.65 / 0.80 / 0.95 / 1.00) bleibt unberuehrt,
-- deshalb hier ein gezieltes Update statt eines Austauschs.

update public.journey_template_phases p
   set sets_start = 2,
       sets_end = 2
  from public.journey_templates t
 where p.journey_template_id = t.id
   and t.key = 'refeed_rebuild'
   and p.focus = 'test';

-- ----------------------------------------------------------------
-- 3. Zusammenfassungen der beiden umgebauten Vorlagen
-- ----------------------------------------------------------------

update public.journey_templates
   set summary = 'Ein kompletter Quartalszyklus: ein Hypertrophie-Block in zwei '
     || 'Abschnitten für Muskelmasse, ein Maximalkraft-Block für Last und eine '
     || 'kurze Peak- und Testphase. Jeder Abschnitt endet mit einer '
     || 'Entlastungswoche, und zur Testwoche hin sinkt das Volumen, damit du '
     || 'ausgeruht misst.'
 where key = 'block_3m';

update public.journey_templates
   set summary = 'Ein langfristiger Plan über sechs Monate: sanfter Einstieg, '
     || 'zwei Hypertrophie-Blöcke im Wechsel mit drei Kraftblöcken, die von '
     || 'Block zu Block schwerer werden, abgeschlossen durch eine Peak- und '
     || 'Testphase. Jeder Block endet nach drei Aufbauwochen mit einer '
     || 'Entlastungswoche.'
 where key = 'periodized_6m';

-- ----------------------------------------------------------------
-- 4. Laufende Journeys an die neuen Satzregeln angleichen
-- ----------------------------------------------------------------
-- Eine laufende Journey ist eine Kopie der Vorlage und wuerde sonst bis zum
-- Ende mit dem alten Verlauf weiterlaufen. Angeglichen werden nur die
-- Satzzahlen; Phasenlaengen (weeks) und Entlastungswochen bleiben stehen,
-- damit sich die Zeitachse unter einer laufenden Journey nicht verschiebt und
-- der Nutzer nicht mitten im Block in einer anderen Woche landet.
-- Archivierte Journeys bleiben als Aufzeichnung unangetastet.

update public.phases p
   set sets_start = 4,
       sets_end = 4
  from public.journeys j
 where j.id = p.journey_id
   and j.status = 'active'
   and p.focus = 'strength';

update public.phases p
   set sets_start = 3,
       sets_end = 3
  from public.journeys j
 where j.id = p.journey_id
   and j.status = 'active'
   and p.focus = 'power';

update public.phases p
   set sets_start = case when p.weeks > 1 then 3 else 2 end,
       sets_end = 2
  from public.journeys j
 where j.id = p.journey_id
   and j.status = 'active'
   and p.focus = 'test';

update public.phases p
   set sets_end = least(p.sets_end, 5),
       sets_start = greatest(p.sets_start, least(p.sets_end, 5) - 2)
  from public.journeys j
 where j.id = p.journey_id
   and j.status = 'active'
   and p.focus = 'hypertrophy';
