-- 0032 Journey-Vorlage "Maximalkraft / Peaking" entfernen
-- ----------------------------------------------------------------
-- Issue #234. Der Nutzer braucht die Vorlage nicht; sie verschwindet aus der
-- Auswahl auf "Journey waehlen". Der Seed (src/seed/definitions.ts) fuehrt sie
-- ebenfalls nicht mehr, damit sie bei einer Erstbefuellung nicht wieder
-- entsteht.
--
-- Geloescht werden die Phasen der Vorlage und die Vorlage selbst. Was bleibt:
--
--   * Die archivierte Journey "Maximalkraft / Peaking" bleibt als Aufzeichnung
--     stehen. Ihr Vorlagenbezug (journeys.source_template_id) faellt durch den
--     Fremdschluessel "on delete set null" auf null zurueck - derselbe Zustand,
--     in dem "Rueckkehr 2026" schon heute steht. Ihre Phasen haengen an der
--     Journey, nicht an der Vorlage, und bleiben unberuehrt.
--   * Die uebrigen sieben Vorlagen bleiben unveraendert.
--
-- Nebenwirkung: dies war die einzige Vorlage mit einer Schnellkraftphase
-- (focus 'power'). Der Wochenplan-Code deckt 'power' weiter ab, es traegt nur
-- keine Vorlage mehr eine solche Phase.
--
-- Idempotent: beide Loeschungen laufen ueber den Schluessel und sind nach dem
-- ersten Lauf folgenlos. Vorlagen sind in der App nicht editierbar, es geht
-- dabei nichts verloren.

delete from public.journey_template_phases p
 using public.journey_templates t
 where p.journey_template_id = t.id
   and t.key = 'strength_peak';

delete from public.journey_templates
 where key = 'strength_peak';
