-- 0065 Messgeraet je Koerpermessung
-- ----------------------------------------------------------------
-- Vorhaben #494, Schritt 2 = #496.
--
-- Was: Jede Koerpermessung (composition) kann optional auf eines der
-- Messgeraete verweisen, die der Nutzer in den Einstellungen eintraegt
-- (measurement_devices, Migration 0064). Neue Spalte `device_id`, leer = kein
-- Geraet angegeben.
--
-- Warum: Das Messgeraet im Studio wechselt gelegentlich, und verschiedene
-- Geraete messen unterschiedlich. So bleibt je Wert nachvollziehbar, wo er
-- entstand.
--
-- Loeschen: Ein Geraet, an dem noch Messungen haengen, laesst sich nicht
-- loeschen (on delete restrict) – sonst ginge die Zuordnung still verloren.
-- Die Oberflaeche sperrt das vorab und erklaert den Grund; die Datenbank
-- sichert zusaetzlich ab. Umbenennen bleibt jederzeit moeglich.
--
-- Bestehende Messungen bleiben unveraendert (device_id = null).
-- Idempotent (add column if not exists, create index if not exists).
-- Erwartete Ausgabe im SQL-Editor: "No rows returned".

-- 1. Neue Spalte mit Verweis auf das Messgeraet
alter table public.composition
  add column if not exists device_id uuid
  references public.measurement_devices(id) on delete restrict;

-- 2. Index fuer den Verweis (Loesch-Pruefung und Abfragen je Geraet)
create index if not exists composition_device_id_idx
  on public.composition (device_id);
