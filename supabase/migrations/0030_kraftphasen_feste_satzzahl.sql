-- 0030 Kraftphasen ohne Satzrampe: feste 4 Saetze pro Woche
-- ----------------------------------------------------------------
-- Issue #220. Kraftphasen (Fokus 'strength') sollen die Satzzahl nicht mehr
-- hochrampen, sondern durchgehend 4 Saetze fahren - die Steigerung laeuft in
-- einer Kraftphase ueber das Gewicht, nicht ueber das Volumen.
--
-- Betroffen sind nur Phasen mit Fokus 'strength'. Hypertrophie, Kraftausdauer,
-- Wiedereinstieg, Erhaltung, Test und Schnellkraft ('power') behalten ihre
-- Rampen unveraendert.
--
--   1. Vorlagen-Phasen: fuenf Kraftphasen in vier Vorlagen (Wiedereinstieg &
--      Aufbau, Kraft & Peak, 3-Monats-Block, Periodisiert 6 Monate) gehen auf
--      4/4. Der Seed (src/seed/definitions.ts) fuehrt dieselben Werte.
--   2. Laufende Journeys sind Kopien ihrer Vorlage und wuerden sonst bis zum
--      Ende mit der alten Rampe weiterlaufen. Angeglichen werden nur die
--      Satzzahlen; Phasenlaengen und Entlastungswochen bleiben stehen, damit
--      sich die Zeitachse unter einer laufenden Journey nicht verschiebt.
--      Archivierte/abgeschlossene Journeys bleiben als Aufzeichnung unberuehrt.
--
-- Die Entlastungswoche einer Kraftphase senkt weiterhin um einen Satz auf 3.
-- Das rechnet der Code (src/engine/volume.ts), nicht die Datenbank.
--
-- Idempotent: die Updates setzen feste Werte, mehrfaches Ausfuehren aendert
-- nach dem ersten Lauf nichts mehr. Vorlagen sind in der App nicht editierbar,
-- es geht dabei nichts verloren.

-- ----------------------------------------------------------------
-- 1. Kraftphasen der Vorlagen
-- ----------------------------------------------------------------
update public.journey_template_phases
   set sets_start = 4,
       sets_end = 4
 where focus = 'strength'
   and (sets_start is distinct from 4 or sets_end is distinct from 4);

-- ----------------------------------------------------------------
-- 2. Kraftphasen laufender Journeys
-- ----------------------------------------------------------------
update public.phases p
   set sets_start = 4,
       sets_end = 4
  from public.journeys j
 where j.id = p.journey_id
   and j.status = 'active'
   and p.focus = 'strength'
   and (p.sets_start is distinct from 4 or p.sets_end is distinct from 4);
