-- 0059 Stangen bekommen Laenge und Form
-- ----------------------------------------------------------------
-- inventory_bars kannte je Stange bisher nur Name und Eigengewicht. Damit liess
-- sich nicht sagen, ob eine Uebung mit dieser Stange ueberhaupt ausfuehrbar ist -
-- eine kurze SZ-Stange sah fuer den Coach aus wie eine leichte Langhantel
-- (Vorhaben #433, Schritt 2 = #435).
--
-- Zwei unabhaengige Eigenschaften, fest im System hinterlegt und in der
-- Oberflaeche nicht editierbar (wie das Stangen-Set selbst):
--   bar_length  'long'     lang     | 'short'  kurz
--   bar_shape   'straight' gerade   | 'curved' gekruemmt
-- Jede Kombination ist moeglich, auch lang und gekruemmt oder kurz und gerade.
--
-- Die Vorgabe ('long'/'straight') ist bewusst die haeufigste Bauart: eine spaeter
-- ohne Angabe angelegte Stange faellt damit nicht aus jeder Auswahl heraus.
--
-- Beide Eigenschaften werden hier nur erfasst und angezeigt. Was sie steuern -
-- Zulassung je Uebung und Stangenwahl des Coaches - kommt in den Schritten 3
-- und 4 desselben Vorhabens.
--
-- Idempotent (add column if not exists, constraint erst loeschen, dann setzen,
-- Bestandswerte werden gesetzt statt ergaenzt).
-- Erwartete Ausgabe im SQL-Editor: "No rows returned".

-- 1. Neue Spalten
alter table public.inventory_bars
  add column if not exists bar_length text not null default 'long';

alter table public.inventory_bars
  add column if not exists bar_shape text not null default 'straight';

-- 2. Erlaubte Werte
alter table public.inventory_bars
  drop constraint if exists inventory_bars_bar_length_check;
alter table public.inventory_bars
  add constraint inventory_bars_bar_length_check
  check (bar_length in ('long', 'short'));

alter table public.inventory_bars
  drop constraint if exists inventory_bars_bar_shape_check;
alter table public.inventory_bars
  add constraint inventory_bars_bar_shape_check
  check (bar_shape in ('straight', 'curved'));

-- 3. Bestand beschreiben. Die Stangen tragen feste Schluessel (Migration 0008),
--    darum laesst sich die Bauart je Schluessel setzen - fuer jedes Konto gleich.
update public.inventory_bars
set bar_length = 'long', bar_shape = 'straight'
where key in ('standard', 'leicht');

update public.inventory_bars
set bar_length = 'short', bar_shape = 'curved'
where key = 'sz';
