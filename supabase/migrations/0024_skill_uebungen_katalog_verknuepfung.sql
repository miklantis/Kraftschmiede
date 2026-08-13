-- 0024_skill_uebungen_katalog_verknuepfung.sql
--
-- Was: Fuellt skill_phase_exercises.exercise_id fuer die Phasen-Uebungen der
--      Skills "Klimmzug" (strict_pullup) und "Liegestuetz" (pushup) nach. Fuer
--      den Plank-Skill hat das bereits Migration 0020 erledigt.
-- Warum: Die Verknuepfung zur Katalog-Uebung war vorgesehen (Spalte existiert
--      seit 0001), wurde beim Erstbefuellen aber hart auf null gesetzt. Ohne sie
--      kann das Start-Popup den Uebungsnamen einer Skill-Einheit nicht auf die
--      Uebungs-Detailseite verlinken.
-- Fuer wen: Alle Nutzer mit bestehenden Skill-Phasen. Der Anwendungscode setzt
--      die Verknuepfung ab jetzt direkt beim Anlegen (src/lib/seed.ts), diese
--      Migration ist der einmalige Nachzug fuer den Bestand.
--
-- Idempotent: Es werden nur Zeilen angefasst, deren exercise_id noch null ist.
-- Die drei Band-Varianten (stark/mittel/leicht) zeigen bewusst auf dieselbe
-- Katalog-Uebung "Band Pull-Up" - im Katalog gibt es die Bandstaerken nicht
-- getrennt.

update public.skill_phase_exercises spe
   set exercise_id = ex.id
  from public.skill_phases sp
  join public.skills sk on sk.id = sp.skill_id
  join (values
    ('strict_pullup', 'Dead Hang',            'dead_hang'),
    ('strict_pullup', 'Scapular Pull-Up',     'scapular_pullup'),
    ('strict_pullup', 'Band Pull-Up (stark)', 'band_pullup'),
    ('strict_pullup', 'Band Pull-Up (mittel)','band_pullup'),
    ('strict_pullup', 'Band Pull-Up (leicht)','band_pullup'),
    ('strict_pullup', 'Negative Pull-Up',     'negative_pullup'),
    ('strict_pullup', 'Strict Pull-Up',       'strict_pullup'),
    ('pushup',        'Knee Push-Up',         'knee_pushup'),
    ('pushup',        'Incline Push-Up',      'incline_pushup'),
    ('pushup',        'Full Push-Up',         'full_pushup'),
    ('plank',         'Plank',                'plank')
  ) as m(skill_key, uebung_name, exercise_key)
    on m.skill_key = sk.key
  join public.exercises ex
    on ex.user_id = sp.user_id and ex.key = m.exercise_key
 where spe.skill_phase_id = sp.id
   and spe.name = m.uebung_name
   and spe.exercise_id is null;
