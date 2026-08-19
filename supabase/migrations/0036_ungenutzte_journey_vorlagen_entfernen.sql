-- 0036 Ungenutzte Journey-Vorlagen entfernen
-- ----------------------------------------------------------------
-- Issue #242. Von den sieben Vorlagen auf "Journey waehlen" hat der Nutzer nur
-- zwei je gebraucht. Die uebrigen fuenf verstellen die Auswahl und verschwinden.
-- Der Seed (src/seed/definitions.ts) fuehrt sie ebenfalls nicht mehr, damit sie
-- bei einer Erstbefuellung nicht wieder entstehen.
--
-- Es bleiben:
--
--   * Wiedereinstieg & Aufbau   (reentry_build)
--   * Wiederaufbau nach Fasten  (refeed_rebuild)
--
-- Es entfallen: hypertrophy_block, conditioning, maintenance, block_3m,
-- periodized_6m. Ihre Phasen haengen per "on delete cascade" an der Vorlage und
-- gehen mit; sie werden hier trotzdem ausdruecklich zuerst geloescht, damit die
-- Absicht in der Datei steht.
--
-- Was bleibt unberuehrt:
--
--   * Die laufende Journey "Rueckkehr 2026". Sie haengt an keiner Vorlage
--     (source_template_id ist null) und wird davon nicht beruehrt. Auch sonst
--     verweist keine Journey auf eine der fuenf Vorlagen - es geht keine
--     Aufzeichnung verloren. Der Fremdschluessel "on delete set null" wuerde
--     einen solchen Bezug ohnehin nur loesen, nie die Journey loeschen.
--   * Die Phasentypen (focus) im Code. Es faellt keiner davon weg, es tragen ihn
--     nur weniger Vorlagen.
--
-- Idempotent: alle Loeschungen laufen ueber den Schluessel und sind nach dem
-- ersten Lauf folgenlos. Vorlagen sind in der App nicht editierbar, es geht
-- dabei nichts verloren.

delete from public.journey_template_phases p
 using public.journey_templates t
 where p.journey_template_id = t.id
   and t.key in (
     'hypertrophy_block',
     'conditioning',
     'maintenance',
     'block_3m',
     'periodized_6m'
   );

delete from public.journey_templates
 where key in (
   'hypertrophy_block',
   'conditioning',
   'maintenance',
   'block_3m',
   'periodized_6m'
 );
