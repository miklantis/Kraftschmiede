-- 0061 Uebung bevorzugt eine Laenge und eine Form
-- ----------------------------------------------------------------
-- Migration 0060 sagt, WELCHE Stangen ueberhaupt in Frage kommen. Bleiben
-- mehrere uebrig, entschied bisher allein das Gewicht - beim Barbell Curl
-- landete damit die gerade Stange unter den Haenden, obwohl die SZ-Stange die
-- bessere ist (Vorhaben #433, Schritt 4 = #437).
--
--   preferred_bar_length  bevorzugte Laenge ('long', 'short'), darf leer bleiben
--   preferred_bar_shape   bevorzugte Form  ('straight', 'curved'), dito
--
-- Die Bevorzugung schraenkt NIE ein. Sie kann keine Stange ausschliessen, die
-- die Voraussetzung erfuellt - sie entscheidet allein die Reihenfolge: zuerst
-- wird unter den bevorzugten Stangen gesucht, und erst wenn dort keine
-- brauchbare steht (etwa weil die leichteste schon schwerer ist als das Ziel),
-- faellt die Wahl auf die uebrigen zugelassenen.
--
-- Ein bevorzugter Wert, der gar nicht zugelassen ist, waere ein Fehler in den
-- Stammdaten - der CHECK schliesst ihn aus. Bei leerer Zulassungsliste ("keine
-- Angabe", schraenkt nicht ein) ist jeder Wert erlaubt.
--
-- Vorbelegung: nur Barbell Curl bevorzugt die gekruemmte Form. Alle uebrigen
-- Uebungen bleiben leer und verhalten sich damit wie bisher (schwerste Stange
-- unterhalb des Zielgewichts).
--
-- Idempotent (add column if not exists, constraint erst loeschen, dann setzen,
-- Vorbelegung setzt statt zu ergaenzen).
-- Erwartete Ausgabe im SQL-Editor: "No rows returned".

-- 1. Neue Spalten
alter table public.exercises
  add column if not exists preferred_bar_length text;

alter table public.exercises
  add column if not exists preferred_bar_shape text;

-- 2. Erlaubte Werte - und der Gleichlauf mit der Zulassung aus 0060
alter table public.exercises
  drop constraint if exists exercises_preferred_bar_length_check;
alter table public.exercises
  add constraint exercises_preferred_bar_length_check
  check (
    preferred_bar_length is null
    or (
      preferred_bar_length in ('long', 'short')
      and (
        cardinality(allowed_bar_lengths) = 0
        or preferred_bar_length = any (allowed_bar_lengths)
      )
    )
  );

alter table public.exercises
  drop constraint if exists exercises_preferred_bar_shape_check;
alter table public.exercises
  add constraint exercises_preferred_bar_shape_check
  check (
    preferred_bar_shape is null
    or (
      preferred_bar_shape in ('straight', 'curved')
      and (
        cardinality(allowed_bar_shapes) = 0
        or preferred_bar_shape = any (allowed_bar_shapes)
      )
    )
  );

-- 3. Vorbelegung. Erst alles leeren, damit ein zweiter Lauf keine spaeter
--    entfernte Bevorzugung stehen laesst, dann die eine setzen.
update public.exercises
set preferred_bar_length = null,
    preferred_bar_shape = null
where preferred_bar_length is not null
   or preferred_bar_shape is not null;

update public.exercises
set preferred_bar_shape = 'curved'
where key = 'barbell_curl';
