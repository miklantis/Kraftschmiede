-- 0052 – Profilbild am Konto
--
-- Was:   Neue Spalte `avatar` an `public.settings` (Text, Vorgabe Leerstring).
-- Warum: Statt des Anfangsbuchstabens soll ein eigenes Bild im Konto-Kreis
--        stehen (Kopfzeile mobil, Seitenleiste am Desktop, Konto-Karte in den
--        Einstellungen). Das Bild wird im Browser quadratisch aus der Mitte
--        beschnitten, auf 256 Pixel verkleinert und als Data-URL abgelegt.
--        Leerstring = kein Bild, dann bleibt es beim Buchstaben.
-- Fuer wen: jeder Nutzer; `settings` ist die Einzelzeile je Nutzer, damit
--        gehoert das Bild automatisch zur Sicherung (Export/Wiederherstellen).
--
-- Zeilensicherheit und Rechte haengen an der Tabelle und gelten unveraendert
-- weiter; eine neue Spalte braucht dort nichts.
--
-- Idempotent: `add column if not exists`, mehrfaches Ausfuehren aendert nichts.

alter table public.settings
  add column if not exists avatar text not null default '';
