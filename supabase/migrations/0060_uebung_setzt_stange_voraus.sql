-- 0060 Uebung setzt Laenge und Form der Stange voraus
-- ----------------------------------------------------------------
-- Bisher stand bei jeder Langhantel-Uebung der gesamte Stangenbestand zur
-- Auswahl. Kuenftig sagt jede Uebung je Eigenschaft, welche Werte sie
-- voraussetzt (Vorhaben #433, Schritt 3 = #436):
--
--   allowed_bar_lengths  zugelassene Laengen ('long', 'short')
--   allowed_bar_shapes   zugelassene Formen  ('straight', 'curved')
--
-- Eine Stange kommt durch, wenn ihre Laenge zugelassen ist UND ihre Form
-- zugelassen ist. Beide Listen sind mehrfach belegbar und voneinander
-- unabhaengig: "die Laenge ist egal, aber es muss gerade sein" ist damit
-- genauso ausdrueckbar wie "nur lang und nur gerade".
--
-- Die Listen sind bindend: was dort steht, ist zugelassen, der Rest ist fuer
-- diese Uebung nicht ausfuehrbar. Eine LEERE Liste ist dagegen keine Aussage
-- "nichts ist erlaubt", sondern "keine Angabe" - sie schraenkt nicht ein. So
-- bleiben Uebungen ohne Stange (equipment <> 'barbell') unberuehrt, und eine
-- spaeter ergaenzte Uebung verliert nicht still jede Stange.
--
-- Idempotent (add column if not exists, constraint erst loeschen, dann setzen,
-- Vorbelegung setzt statt zu ergaenzen).
-- Erwartete Ausgabe im SQL-Editor: "No rows returned".

-- 1. Neue Spalten
alter table public.exercises
  add column if not exists allowed_bar_lengths text[] not null default '{}'::text[];

alter table public.exercises
  add column if not exists allowed_bar_shapes text[] not null default '{}'::text[];

-- 2. Erlaubter Vorrat je Liste ("<@" = ist enthalten in). Die leere Liste
--    erfuellt das ebenfalls.
alter table public.exercises
  drop constraint if exists exercises_allowed_bar_lengths_check;
alter table public.exercises
  add constraint exercises_allowed_bar_lengths_check
  check (allowed_bar_lengths <@ array['long', 'short']::text[]);

alter table public.exercises
  drop constraint if exists exercises_allowed_bar_shapes_check;
alter table public.exercises
  add constraint exercises_allowed_bar_shapes_check
  check (allowed_bar_shapes <@ array['straight', 'curved']::text[]);

-- 3. Vorbelegung der neun Langhantel-Uebungen des Katalogs. Sie tragen feste
--    Schluessel (Migration 0054), darum gilt die Zuordnung fuer jedes Konto.
--    Die sieben grossen Uebungen brauchen die lange gerade Stange.
update public.exercises
set allowed_bar_lengths = array['long']::text[],
    allowed_bar_shapes  = array['straight']::text[]
where key in (
  'back_squat',
  'bench_press',
  'deadlift',
  'romanian_deadlift',
  'bent_row',
  'push_press',
  'lunge'
);

-- Curl und Pull Over gehen mit jeder Stange.
update public.exercises
set allowed_bar_lengths = array['long', 'short']::text[],
    allowed_bar_shapes  = array['straight', 'curved']::text[]
where key in ('barbell_curl', 'pull_over');
