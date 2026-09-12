-- 0058 Stangen-Bestand auf drei kuerzen
-- ----------------------------------------------------------------
-- Der Seed hat bisher fuenf Stangen angelegt: Standard 20, Leicht 10, SZ 12,5,
-- SZ-Curl 8 und Kurz 15. Die letzten beiden gibt es real nicht - sie standen
-- nur im Auswahlfeld herum und konnten vom Coach sogar unter eine Kniebeuge
-- gelegt werden (Vorhaben #433, Schritt 1 = #434).
--
-- Beide werden entfernt. Die Fremdschluessel auf inventory_bars stehen auf
-- "on delete set null": eine aufgezeichnete Einheit verliert dadurch hoechstens
-- ihren Verweis auf die Stange, nie ihre Saetze. Geprueft und mit dem Nutzer
-- abgestimmt: genau ein Alteintrag (Back Squat vom 08.09.2026) zeigte auf
-- "Kurz", auf "SZ-Curl" zeigte nichts. Die Stangen-Angabe einer gespeicherten
-- Einheit wird nirgends angezeigt, die Gewichte bleiben unveraendert.
--
-- Idempotent: ein zweiter Lauf findet nichts mehr zu loeschen.
-- Erwartete Ausgabe im SQL-Editor: "No rows returned".

delete from public.inventory_bars
where key in ('sz-curl', 'kurz');
