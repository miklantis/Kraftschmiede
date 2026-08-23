-- 0047 Vorlage "Wiederaufbau nach Fasten": vier Phasen werden zwei
-- ----------------------------------------------------------------
-- Schritt 7 von "Bausteine in der Datenbank" (Issue #321/#328, Konzept
-- docs/Konzept-Bausteine-Datenstruktur.md, Abschnitt 9).
--
-- Was: Die Vorlage besteht danach aus zwei Phasen statt aus vier:
--   1. "Wiederaufbau" (Baustein rebuild), 3 Wochen, Lastliste 65 / 80 / 95 %
--   2. "Test/Peak"    (Baustein test),    1 Woche, reine Testwoche
-- Die vier getippten Wochenphasen "Tasten", "Reaktivieren", "Anschluss" und
-- "Standort" entfallen samt ihren Eigennamen; beide neuen Phasen heissen wie
-- ihr Baustein.
--
-- Warum: Die Werte einer Phase kommen seit diesem Vorhaben aus dem Baustein und
-- werden beim Anlegen in die Phasenzeile kopiert. Diese Vorlage war die letzte,
-- die stattdessen Wert fuer Wert getippt war - drei Ein-Wochen-Phasen bildeten
-- von Hand nach, was der Wiederaufbau-Baustein als Lastleiter selbst baut.
--
-- Drei bewusste Abweichungen vom heutigen Stand (alle innerhalb dessen, was die
-- Einzelphasen ohnehin taten):
--   1. Das Wiederholungsband ist ueber alle drei Wochen 6-10 statt
--      8-10 / 6-10 / 6-10.
--   2. Die Satzrampe laeuft 2 -> 4 statt 2 / 3 / 3-4.
--   3. Der Nutzer sieht eine Phasenkarte ueber drei Wochen statt drei Karten
--      ueber je eine Woche; den Verlauf zeigt die Wochentabelle.
-- Die vorsichtige Steigerung der ersten Wochen bleibt erhalten: der
-- Wiederaufbau-Baustein traegt careful = true.
--
-- Fuer wen: alle Nutzer. Keine laufende Journey ist betroffen - die Vorlage ist
-- nicht in Benutzung (gegen die Live-Datenbank geprueft). Angefasst wird
-- ausschliesslich journey_template_phases; phases bleibt unberuehrt.
--
-- Idempotent: Umgebaut wird nur eine Vorlage, die noch keine rebuild-Phase hat.
-- Ein zweiter Lauf findet sie vor und laesst alles stehen.
-- Erwartete Ausgabe im SQL-Editor: "No rows returned".

begin;

-- ----------------------------------------------------------------
-- 1. Die vier alten Phasen entfernen
-- ----------------------------------------------------------------
-- Geloescht wird ueber den Vorlagen-Schluessel, nicht ueber die Phasennamen:
-- ein abweichend benannter Bestand soll ebenso sauber ersetzt werden.

delete from public.journey_template_phases p
 using public.journey_templates t
 where p.journey_template_id = t.id
   and t.key = 'refeed_rebuild'
   and not exists (
     select 1
       from public.journey_template_phases r
      where r.journey_template_id = t.id
        and r.focus = 'rebuild'
   );

-- ----------------------------------------------------------------
-- 2. Die zwei neuen Phasen anlegen
-- ----------------------------------------------------------------
-- Die Werte sind die des jeweiligen Bausteins (Migration 0043), gebaut wie im
-- Code (engine/phaseBuild.ts): Der Wiederaufbau bekommt seine Lastliste aus der
-- Bauregel rebuild_ramp (gleichmaessige Stufen von 65 auf 95 Prozent, eine je
-- Phasenwoche), die Testphase ihren Wochenplan aus der Bauregel test - bei
-- einer Woche ist das genau die Testwoche ohne Vorgabe.

insert into public.journey_template_phases (
  user_id, journey_template_id, name, focus, weeks,
  sets_start, sets_end, deload_week, rep_target_min, rep_target_max,
  load_plan, week_plan, plan_builder, load_builder, careful, position
)
select t.user_id, t.id, v.name, v.focus, v.weeks,
       v.sets_start, v.sets_end, v.deload_week, v.rep_target_min, v.rep_target_max,
       v.load_plan, v.week_plan, v.plan_builder, v.load_builder, v.careful, v.position
  from public.journey_templates t
 cross join (values
   (
     'Wiederaufbau', 'rebuild', 3,
     2, 4, null::integer, 6, 10,
     '[{"week": 1, "loadPct": 0.65}, {"week": 2, "loadPct": 0.8}, {"week": 3, "loadPct": 0.95}]'::jsonb,
     null::jsonb, null::text, 'rebuild_ramp'::text, true, 0
   ),
   (
     'Test/Peak', 'test', 1,
     2, 2, null::integer, 2, 4,
     null::jsonb,
     '[{"week": 1, "sets": 0, "reps": 1, "repsMax": null, "rir": 0, "loadPct": 1, "note": "Testwoche: keine Vorgabe, der 1RM-Test läuft über die Übungsseite"}]'::jsonb,
     'test'::text, null::text, false, 1
   )
 ) as v (
   name, focus, weeks,
   sets_start, sets_end, deload_week, rep_target_min, rep_target_max,
   load_plan, week_plan, plan_builder, load_builder, careful, position
 )
 where t.key = 'refeed_rebuild'
   and not exists (
     select 1
       from public.journey_template_phases r
      where r.journey_template_id = t.id
        and r.focus = 'rebuild'
   );

commit;

-- Kontrolle (nach dem Lauf auszufuehren, erwartet je Nutzer genau zwei Zeilen:
-- "Wiederaufbau" mit der Lastliste 0.65/0.8/0.95 und "Test/Peak" ueber eine
-- Woche):
--   select p.position, p.name, p.focus, p.weeks, p.sets_start, p.sets_end,
--          p.rep_target_min, p.rep_target_max, p.load_plan,
--          p.plan_builder, p.load_builder, p.careful
--     from journey_template_phases p
--     join journey_templates t on t.id = p.journey_template_id
--    where t.key = 'refeed_rebuild'
--    order by p.user_id, p.position;
