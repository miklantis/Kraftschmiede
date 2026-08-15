-- 0025 Freitext-Notizen zu Uebungen und 1RM-Tests (Vorhaben #136, Schritt #137)
-- ----------------------------------------------------------------------------
-- Bisher liess sich zu einem Training nichts Freies festhalten. Es gab nur
-- sessions.notes (Migration 0001), im UI ausschliesslich bei Yoga angeboten.
-- Auf Uebungsebene fehlte jede Moeglichkeit: sets.adjust_note ist ein
-- automatischer technischer Vermerk ("Gewicht angepasst"), kein Freitext.
--
-- Diese Migration legt die beiden fehlenden Felder an, damit je Uebung und je
-- 1RM-Test festgehalten werden kann, was passiert ist ("hier abgebrochen",
-- "fiel schwer", "Schmerzen links"). Beide sind Freitext, not null mit
-- Leerstring als Default – so tragen Altbestand und neue Zeilen ohne Notiz
-- denselben Wert und im Code muss nirgends auf null geprueft werden.
--
-- sessions.notes existiert bereits und wird fuer die Einheiten-Notiz
-- wiederverwendet – bewusst keine zweite Spalte.
--
-- Idempotent (add column if not exists).
-- Erwartete Ausgabe im SQL-Editor: "No rows returned".

-- 1. Notiz je Uebung-in-Einheit
alter table public.session_exercises
  add column if not exists note text not null default '';

-- 2. Notiz je 1RM-Test
alter table public.rm_tests
  add column if not exists notiz text not null default '';
