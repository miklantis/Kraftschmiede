# Kraftschmiede – Architektur & Schema

Referenzdokument für den laufenden Betrieb: Datenbank-Schema, Architektur-Leitplanken
und der umgesetzte Stand der App. Beschreibt, wie das System gebaut ist, nicht einen
Bauplan.

Die getroffenen strategischen Entscheidungen und Betriebs-Lernpunkte liegen als einzelne
Architektur-Entscheidungen (ADRs) in [`docs/adr/`](./adr/README.md). Dieses Dokument
beschreibt den Ist-Zustand und verweist für das Warum auf die jeweilige ADR.

---

## 1. Überblick

Kraftschmiede ist eine moderne Web-App: React 19, TypeScript, Vite, TanStack Router/Query,
Tailwind, shadcn/ui, Supabase mit normalisierter relationaler Datenbank. Installierbar als
PWA mit Offline-Hülle und bewusstem Update-Hinweis.

Leitprinzipien:
- Wiederverwendbare Komponenten statt Seiten-Duplikation (Pop-ups, Tabellen, Charts).
- Reine, testbare Engine- und Coach-Logik ohne DOM-Bezug.
- Datenzugriff in Hooks gekapselt; Komponenten kennen Supabase nicht direkt.
- Domänensprache deutsch (Übung, Journey, Session, Vorlage, Phase, Coach),
  Code-/Architekturbegriffe englisch.

Grundlegende Entscheidungen dazu: Offline-first (ADR-0001), Definitionen in der
Datenbank (ADR-0002), Skill-Definitionen (ADR-0003).

---

## 2. Tech-Stack

- Frontend: React 19
- Build: Vite
- Sprache: TypeScript (strict, kein `any`, Interfaces für alle Strukturen)
- Routing: TanStack Router (file-based, `src/routes`)
- Server-State: TanStack Query (v5+)
- Client-State: minimal halten; URL-State oder TanStack Store nur wo nötig
- Styling: Tailwind CSS
- UI-Komponenten: shadcn/ui (Primitives in `src/components/ui`)
- Icons: Lucide
- Validierung: Zod (Formulare, API-Antworten, Schemas)
- Datenbank: Supabase (Postgres), RLS pro Tabelle

---

## 3. Datenbank-Schema (umgesetzt)

Angelegt als `supabase/migrations/0001_initial_schema.sql` mit 23 Tabellen; durch spätere
Migrationen sind es inzwischen 30 (die vollständige Liste führt das Bestandsregister,
siehe 3.4). Jede Tabelle mit `user_id` und Row Level Security (vier Policies select/insert/update/delete
strikt auf `auth.uid() = user_id`), Zugriff für Rolle `authenticated` freigegeben.
Definitionen werden beim ersten Start pro Nutzer aus einem Seed befüllt. Tabellen mit
stabilem Seed-Identifikator haben ein `key`-Feld (`unique(user_id, key)`); Fremdschlüssel
nutzen UUIDs. Kleine, attributarme
Wertobjekte bleiben bewusst als `jsonb` (Befinden-Snapshot, Aufwärmen, Coach-Vorschlag,
Recovery-Fenster, Timer).

### 3.1 Inventar

- **inventory_bars** – Stangen: key, name, weight, is_default, position. Fester Satz
  (Standard/Leicht/SZ/SZ-Curl/Kurz), in der Oberflaeche nicht editierbar; per `key`
  markiert, per Migration 0008 gesetzt. Neue Konten bekommen ihn über den Seed (3.2) –
  er muss vor dem Übungskatalog stehen, weil `exercises.bar_id` hierher zeigt.
- **inventory_plates** – Scheiben: je Zeile ein verfügbares Gewicht (kein Stück-Zähler;
  der Plate-Loader rechnet ohne Limit)
- **inventory_kettlebells** – Kettlebells: je Zeile ein Gewicht
- **inventory_equipment** – Skill-Equipment-Tor: key, label, active (Klimmzugstange,
  Bänder, Ringe ...)

### 3.2 Definitionen (Stammdaten in der DB, per Seed)

Der Seed läuft beim App-Start über `SeedBootstrap` und legt in dieser Reihenfolge an –
die Reihenfolge ist nicht frei, jeder Schritt braucht den vorigen: Bausteine → Inventar
(Stangen, Scheiben, Kettlebells) → Übungskatalog samt Muskel-Zuordnung →
Journey-Vorlagen → Skills → Ausstattung. Übungen zeigen per `bar_id` auf eine Stange,
Skill-Phasen-Übungen per `exercise_id` auf eine Katalog-Übung; beide Verknüpfungen
entstehen über den `key` und gehen still verloren, wenn das Ziel noch fehlt (Issue #393).

Er liegt hinter einer Schreibnaht wie jeder andere Schreibweg (4.3, ADR-0019): die
Abfolge in `src/lib/seedWrite.ts`, die Datenbank-Handgriffe in `src/lib/seedStore.ts`,
die Daten in `src/seed/definitions.ts`; `src/lib/seed.ts` ist nur noch der Anstoß.
Reihenfolge, Umfang eines neuen Kontos und Idempotenz stehen damit als Test fest
(`src/lib/__tests__/seedWrite.test.ts`) und nicht mehr nur als Kommentar.

Zwei Arten von Erstbefüllung liegen dabei nebeneinander:

- **einmalig** – Journey-Vorlagen und Skills entstehen nur, solange der Nutzer noch gar
  keine Skills hat. Sie sind später bearbeitbar; ein zweiter Lauf dürfte Gelöschtes nicht
  wieder hinstellen.
- **nachziehend** – Bausteine, Übungskatalog und Ausstattung ergänzen je Lauf nur die
  fehlenden `key`s und lassen vorhandene Zeilen unangetastet. So bekommen auch früher
  angelegte Konten, was später dazugekommen ist.
- **nur im leeren Fall** – Stangen, Scheiben und Kettlebells. Sie sind persönlicher
  Bestand und in den Einstellungen löschbar (Scheiben/Kettlebells haben nicht einmal
  einen `key`); ein Nachziehen würde Weggeräumtes beim nächsten Start zurückbringen.

- **exercises** – key, name, profile (strength/core/bodyweight), tier (main/accessory),
  equipment, bar_id (FK), description, metric (reps/duration – die Mess-Art ohne
  Gewicht; leer = Gewicht × Wiederholungen. Maßgeblich für „trägt diese Übung ein
  1RM?“ ist dieses Feld, **nicht** das Profil: Plank ist eine Core-Übung auf
  Haltezeit. Die gemeinsame Regel dafür ist `misstGewicht` in `lib/exercises.ts`),
  muscle_groups (grobe Tags als text[]), rep_range_min/max, work_weight,
  reference_weight (nullable, eingefrorenes Arbeitsgewicht zum Start einer
  Journey mit Lastliste), reference_phase_id (FK auf phases, nullable – zu welcher Phase
  das eingefrorene reference_weight gehört; ohne diesen Bezug lässt sich „Anker dieser
  Phase" nicht von „noch kein Anker" unterscheiden), plan_start_weight (nullable –
  Startgewicht X derselben Phase, also der Stand beim Eintritt; Bezug der Entlastung
  in der Entlastungswoche der Testphase, Migration 0035), recovery_hours,
  rm/rm_as_of/rm_stale (zwischengespeichertes 1RM für den Coach), position
- **exercise_muscles** – feine Regionen-Map: exercise_id (FK), region_id (Code-/SVG-Region),
  kategorie (primär/sekundär/stabilisierend)
- **templates** – key, name, image, active (Soft-Archiv), position. Namen pro Nutzer
  eindeutig über alle Workouts inkl. archivierter (`templates_unique_user_name`)
- **template_exercises** – template_id (FK), exercise_id (FK), position
- **phase_types** – Bausteine einer Journey-Phase, ein Baustein je Zeile: key (identisch
  mit `phases.focus` – der Vertrag mit dem Code), name, summary, position, control
  (coach/plan – gibt eine Wochenliste Sätze und Wiederholungen vor oder steuert der
  Coach), plan_builder und load_builder (Name der Bauregel für Wochen- bzw. Lastliste,
  nullable), careful (vorsichtige Steigerung des Coaches),
  weeks_min/weeks_max/weeks_default, sets_start_default/sets_end_default/sets_max und
  sets_locked, rep_min_default/rep_max_default (nullable – null heißt: die Übung behält
  ihr eigenes Band) samt Korridor rep_bound_min/rep_bound_max und rep_band_locked,
  deload_allowed/deload_default, load_start_default/load_end_default (Start- und Ziellast
  der Lastliste), placement_hint (reiner Hinweistext ohne Wirkung). Acht Zeilen je Nutzer
  (Migration 0043): Kraftausdauer, Hypertrophie, Wiedereinstieg, Erhaltung, Maximalkraft,
  Intensivierung, Test/Peak und Wiederaufbau. `CHECK`s halten die Zeile stimmig
  (Steuerweg und Bauregel gehören zusammen, gesperrte Sätze hat genau wer eine
  Wochenliste baut, Band paarig und im Korridor, Entlastung nie in der letzten
  Phasenwoche, Last aufsteigend und höchstens volles Niveau). Was ein Baustein
  ausdrücklich nicht sagt, ist wie gerechnet wird: `plan_builder`/`load_builder` nennen
  die Bauregel nur beim Namen, die Rechnung steht in der Engine. Gelesen wird die Tabelle
  beim Anlegen einer Phase, nicht beim Rechnen (siehe 4.2). Seit Migration 0048 zeigen
  beide Phasentabellen per Fremdschlüssel über `(user_id, focus)` hierher
  (`phase_types (user_id, key)`, ADR-0021): Eine Phase kann keinen Typ tragen, den es als
  Baustein nicht gibt, und ein Baustein, auf den Phasen zeigen, lässt sich nicht löschen.
  Deshalb legt der Seed die Bausteine vor den Journey-Vorlagen an (`src/lib/seedWrite.ts`)
- **journey_templates** – key, name, tagline, for_whom, summary, position
- **journey_template_phases** – journey_template_id (FK), name, focus (FK auf
  `phase_types` über Nutzer plus Schlüssel, Migration 0048), weeks, sets_start,
  sets_end, deload_week (nullable), rep_target_min/max, position. Die Vorlagenphase
  trägt bewusst **nur** ihren Baustein und die eingestellten Werte – alles daraus
  Ableitbare ist hier entfallen: der Bauart-Vermerk
  (plan_builder/load_builder/careful, Migration 0049) und die beiden gebauten Listen
  (week_plan/load_plan, Migration 0050). Beides entsteht erst beim Journey-Start aus
  Baustein und Wochenzahl (`lib/journeyWrite.ts`), die Vorlagen-Auswahl rechnet die
  Vorschau mit derselben Regel (`lib/journey.ts`, `buildTemplatePhaseInputs`). So kann
  eine Vorlage weder eine Bauart noch eine Leiter tragen, die nicht zu ihrem Baustein
  und ihrer Wochenzahl passt. Das frühere Einzelfeld load_factor ist mit Migration
  0046 entfallen
- **skills** – key, name, category, image, position
- **skill_phases** – skill_id (FK), label, description, consecutive_sessions
  (aufeinanderfolgende Erfolge bis Aufstieg), position
- **skill_phase_exercises** – skill_phase_id (FK), name, metric (reps/duration), sets,
  target, tempo, exercise_id (FK, optional zur Katalog-Übung), position
- **skill_phase_equipment** – skill_phase_id (FK), equipment_key (Voraussetzung)

Skill-Definitionen liegen als Seed in DB-Tabellen (einheitlicher Zugriff über
Query-Hooks, später editierbar); der Fortschritt steht separat in `skill_progress`.
Begründung in ADR-0003.

### 3.3 Nutzerzustand

- **journeys** – name, active, status (active/archived), source_template_id (FK), start_date,
  end_date (nullable, gesetzt beim Abschluss bzw. beim Wechsel), created_at. Invariante:
  Partial Unique Index `journeys_one_active_per_user` auf
  `user_id where active` -> genau eine aktive Journey pro Nutzer (ADR-0004)
- **phases** – journey_id (FK), name, focus (FK auf `phase_types` über Nutzer plus
  Schlüssel, Migration 0048), weeks, sets_start, sets_end, deload_week
  (nullable), rep_target_min/max, load_plan (jsonb, nullable – Lastliste der Phase: je
  Phasenwoche der Anteil des Referenzgewichts; null = keine Vorgabe, dann rechnet der
  Coach wie gewohnt), week_plan (jsonb, nullable – Wochenplan der Phase, beim
  Journey-Start aus dem Baustein gebaut und danach eingefroren, Migration 0050),
  plan_builder/load_builder/careful
  (Bauart der Phase: nach welcher Regel Wochen- und Lastliste gebaut wurden und ob der
  Coach vorsichtig steigert – ein Wochenplan allein sagt nicht, was er tut; beim
  Journey-Start aus dem Baustein gesetzt und danach eingefroren, Migration 0049),
  position. Das frühere Einzelfeld load_factor ist mit Migration 0046 entfallen
- **journey_workouts** – ordnet Workouts der Journey zu: journey_id (FK), template_id (FK),
  `unique(user_id, journey_id, template_id)`. Reine Ja/Nein-Menge, bewusst ohne position
  (die Empfehlungsreihenfolge bestimmt der Coach); ON DELETE CASCADE über beide FKs
- **sessions** – date, type (strength/yoga/skill), status (live/done), journey_id,
  phase_id, template_id, skill_id (alle FK, nullable), template_name (eingebrannter
  Workout-Name, nullable – beim Abschluss der Journey aus der Vorlage kopiert,
  Migration 0053, ADR-0022; null = noch nicht eingebrannt, dann löst die Anzeige aktuell
  auf), week (eingefrorene Journey-Woche),
  duration_sec, minutes (yoga), notes, started_at, body (jsonb Befinden-Snapshot),
  general_warmup (jsonb), skill_phase, skill_result (completed/missed/skipped)
- **session_exercises** – Übung-in-Einheit: session_id (FK), exercise_id
  (FK, nullable), name, bar_id (FK), metric, tested_1rm, suggestion (jsonb), position,
  note (Freitext-Notiz zur Übung, Leerstring = keine Notiz, Migration 0025)
- **sets** – session_exercise_id (FK), kind (warmup/work), position, reps, weight,
  duration_sec, score, failed, done, target_reps, target_weight, target_score, adjusted,
  adjust_note, met (Skill: Ziel erreicht)
- **skill_progress** – skill_id (FK), active, current_phase, counter (Konsekutiv-Zähler,
  Reset bei Fehlversuch), mastered, log (jsonb), `unique(user_id, skill_id)`
- **body_log** – Tages-Befinden: date, legs, upper_body, overall (Muskelkater 0..3),
  readiness, pain_flag, pain_note, notes, `unique(user_id, date)`
- **composition** – InBody-/BIA-Messung: date, weight, body_fat_kg, body_fat_pct,
  skeletal_muscle_kg, muscle_mass_kg, tbw_kg, phase_angle, visceral_fat, ecw_kg, icw_kg,
  bmr_kcal, `unique(user_id, date)` (ecw_kg/icw_kg = extra-/intrazellulaeres Wasser,
  muscle_mass_kg = Muskelmasse inkl. glatter Muskulatur, alles Rohwerte)
- **exercise_milestones** – Ziele je Übung: exercise_id (FK), name, target_rm,
  achieved_at (Erreichen-Datum, nullable), position (Migration 0011)
- **composition_milestones** – Ziele je Mess-Metrik: metric
  (weight/fat/muscle/muscle_mass/water/phase/bmr), name, target, position
  (Migration 0012, erweitert in 0021)
- **rm_tests** – bewusste 1RM-Tests je Übung: exercise_id (FK), date, weight, reps, est_rm,
  previous_rm (Rekord vor dem Test, nullable), notiz (Freitext-Notiz zum Test, Leerstring
  = keine Notiz, Migration 0025), created_at (Migration 0013). Bewusst ohne
  Bezug zu `sessions`: ein Test ist keine Trainingseinheit und zählt nirgends als solche
- **settings** – user_id (PK), rm_formula, weekly_frequency_target, weight_step, unit,
  recovery_windows (jsonb), timers (jsonb), avatar (Profilbild als Data-URL, quadratisch
  mit 256 px Kante, im Browser erzeugt; Leerstring = kein Bild, Migration 0052)

Einen Scheiben-Bestandszähler gibt es bewusst nicht.

### 3.4 Bestandsregister (Sicherung der Nutzerdaten)

Sicherung und Wiederherstellung laufen über JSON-Export/Import. Welche Tabellen zum
Datenbestand eines Nutzers gehören, steht an genau einer Stelle:
`src/lib/bestandsregister.ts`. Vorher war diese Liste an acht Stellen von Hand
aufgezählt – wurde eine vergessen, fiel die Tabelle still aus der Sicherung heraus und
bemerkt wurde es erst beim Wiederherstellen.

Jeder Eintrag führt:

- **tabelle** – Name in der Datenbank (z. B. `composition_milestones`)
- **key** – Schlüssel im Export-JSON (z. B. `compositionMilestones`)
- **tiefe** – Fremdschlüssel-Tiefe (0 = hängt an keiner anderen Tabelle des Bestands).
  Daraus werden Einfüge- (Eltern zuerst) und Löschreihenfolge (Kinder zuerst) berechnet,
  statt sie getrennt zu pflegen.
- **ablage** – wo die Zeilen im Export liegen: eigene Liste, Inventar-Block, die
  Einheiten selbst, oder geschachtelt in den Einheiten (Übungen und Sätze)
- **einzelzeile** – `settings` ist eine Zeile pro Nutzer und wird per Upsert ersetzt
- **schema** – Name des zugehörigen Row-Schemas in `src/schemas`

Daraus lesen: `exportSource.ts` (Abruf), `exportData.ts` (Aufbau des Export-JSON),
`restoreData.ts` (Prüfung und Aufbereitung), `restoreWrite.ts` (Löschen/Einfügen) und
`bestandsSpalten.ts` (gültige Spalten je Tabelle).
Die Reihenfolge der Einträge im Register ist zugleich die Reihenfolge der Schlüssel im
Export-JSON – nach Themen gruppiert, damit die Datei lesbar bleibt.

Abgesichert durch Tests in `src/lib/__tests__/bestandsregister.test.ts`: Register und
Row-Schemas müssen deckungsgleich sein, die abgeleiteten Reihenfolgen müssen Eltern vor
Kinder stellen, und ein Rundlauf Export → Wiederherstellen (ohne Datenbank, reine
Funktionen) muss jede Tabelle zurückbringen.

Das Export-Format bleibt abwärtskompatibel: Sicherungen der Schemaversionen v2 und v3
sind weiterhin einspielbar. Kennt eine ältere Sicherung einen Schlüssel nicht, bleibt die
betroffene Tabelle beim Wiederherstellen leer.

Eine Ausnahme davon sind seit Migration 0048 die Bausteine: Enthält eine Sicherung keine
`phaseTypes`, scheitert das Einfügen der Phasen am Fremdschlüssel, statt Phasen ohne
gültigen Typ zu hinterlassen (ADR-0021). Die Einfügereihenfolge stimmt bereits – die
Bausteine haben Tiefe 0 und laufen damit vor Vorlagenphasen (1) und Phasen (2).

#### Zeilen auf die bekannten Spalten eindampfen

Eine Sicherung hält den Stand von damals fest. Fällt später eine Spalte weg, enthält die
Datei ein Feld, das es nicht mehr gibt – ungefiltert eingespielt bricht der Schritt ab
und die ganze Sicherung ist unbrauchbar. Damit wäre jede Sicherung nur so lange
einspielbar, wie sich das Schema nicht ändert.

`src/lib/bestandsSpalten.ts` leitet darum je Tabelle die heute gültigen Spalten aus dem
Row-Schema in `src/schemas` ab (verbunden über den Schema-Namen im Register).
`restoreData.ts` dampft jede Zeile darauf ein, bevor sie zum Schreiber geht:

- **Unbekannte Felder** fallen weg, statt das Einspielen abzubrechen.
- **Werte** bleiben unangetastet; über ihre Gültigkeit entscheidet weiterhin die
  Datenbank. Ein voller Zod-Durchlauf würde ältere Sicherungen an Detailregeln scheitern
  lassen, die beim Einspielen niemand gewinnt.
- **Fehlende Spalten** werden nicht erfunden: das Feld wird nicht mitgeschickt, die
  Datenbank setzt ihren Vorgabewert. Fehlt für eine Pflichtspalte ein Vorgabewert, bricht
  der Schritt mit Tabellennamen ab – wie bisher.

Damit erledigen sich die früher von Hand gepflegten Sonderfälle: die abgeleiteten
Satz-Felder (`rir`/`rpe`/`scoreLabel`) und die entfallene Rolle in `template_exercises`
fallen automatisch weg. In `restoreData.ts` bleibt nur, was echtes Umrechnen braucht
(aus alten Feldern neue ableiten, z. B. `tier` aus `kind`) – und das läuft **vor** dem
Eindampfen, sonst wären die alten Felder schon weg.

**Neue Tabelle heißt: einen Eintrag im Register ergänzen, sonst nichts.**

---

## 4. Architektur-Leitplanken

### 4.1 Engine und Coach

- **Engine bleibt rein.** Die reinen Rechenfunktionen (1RM, Plate-Loader,
  Aufwärm-Generator, Doppelprogression, Suitability, Volumen/Deload, Skill-Advice) sind
  in TypeScript umgesetzt – mitsamt Unit-Tests. Da sie reine Funktionen sind (Daten rein,
  Ergebnis raus), bleiben sie vom Schema unberührt. Nur die datenbeschaffende
  Glue-/Coach-Schicht greift darauf zu.
- **Coach als eigenes, testbares Modul** (`coach.ts`): nimmt Zustand explizit herein,
  gibt Entscheidungen heraus – gleiche Form wie die Engine. Kein DOM-Bezug.
- **Die Coach-Kette liegt an einer Stelle** (`lib/coachStand.ts`, Issue #380). Plan-Bezug,
  geltendes Repband, Vorschlag samt Stange, Phasenwechsel-Einstieg und daraus die
  Anzeigeform (`coachStandFor` / `coachViewFor`): einmal geschrieben, von allen drei
  Anzeigeorten gelesen – Aufbau einer Einheit (`lib/liveBuild.ts`), Übungs-Statusanzeige
  (`useCoachStatuses`) und Coach-Vorschau im Training (`useLiveCoachPreview`). Vorher lag
  die Kette dreimal von Hand gelegt im Code, zwei Fassungen davon in Hooks und damit
  außerhalb der Testlinie; sie waren bereits auseinandergelaufen (der
  Phasenwechsel-Einstieg musste nachträglich in die Statusanzeige kopiert werden, weil
  sie sonst ein anderes Gewicht zeigte als die gestartete Einheit). Die Hooks beschaffen
  seither nur noch Daten. Die eine Lage, die abweicht – die laufende Einheit im Training
  –, sagt das über ein benanntes Eingabefeld (`running`) statt über eine eigene Fassung:
  gerechnet wird auf dem heute Abgehakten, und der Phasenwechsel-Einstieg ruht, weil
  während des Trainings noch nicht entschieden ist, ob ein Phasenwechsel ansteht.
- **Eine Textquelle für alle Coach-Begründungen.** Engine und Rechnung geben keine
  fertigen deutschen Sätze mehr aus, sondern eine Kennung samt der Zahlen, die der Text
  braucht (`CoachReason` in `engine/coachReason.ts`: Kennung, tatsächliche Differenz zum
  heutigen Gewicht, oberes Ende des Wiederholungsbandes). Den Satz baut ausschließlich
  `lib/coachText.ts` – Trainingsbildschirm und Übungs-Detailseite lesen ihn über
  `coachStatusFromSuggestion`. Vorher lagen die Texte in drei Töpfen
  (Doppelprogression, Wochenplan, Phasenwechsel) mit unterschiedlicher Sprache; jetzt
  lässt sich eine gemeinsame Sprache erzwingen statt nur vereinbaren, und
  Textänderungen fassen die Rechenlogik nicht mehr an. Der Katalog nennt statt „ein
  Schritt" immer die echte Differenz zwischen heutigem und vorgeschlagenem Gewicht –
  bei Kurzhanteln und krummen Scheiben weicht sie von der eingestellten Schrittweite ab;
  ergibt sich keine Differenz, bleibt derselbe Satz ohne Zahl. Dass es zu jeder Kennung
  genau einen Satz gibt, sichert ein Test über `COACH_REASON_CODES`.
- **Wochenvorgabe und Ausblick sind zwei getrennte Aussagen.** „Beim nächsten Mal"
  bedeutet je nach Logik etwas anderes: in Maximalkraft- und Intensivierungsphasen gilt
  die Vorgabe die ganze Journey-Woche, in der Doppelprogression nur bis zur nächsten
  Einheit. Welche gerade greift, sagt `CoachScope` (`engine/coachReason.ts`, gesetzt über
  `coachScopeFor`); die Beschriftung dazu kommt aus `lib/coachText.ts` („Diese Woche" /
  „Beim nächsten Mal"), unterschiedliche Beschriftungen auf verschiedenen Karten
  derselben Einheit sind gewollt. Der Blick auf die Folgewoche ist eine eigene Rechnung
  (`planOutlook` in `lib/coach.ts`: Anker nach dieser Einheit über `anchorAfterSession`,
  dann `planWeekLoad` auf der Zeile der Folgewoche); er entfällt in der letzten
  Phasenwoche und in der Entlastungswoche. Damit verschwindet auch ein Anzeigefehler:
  vorher wertete die Vorschau die laufende Einheit als Vorwoche und zeigte das Gewicht
  der nächsten Woche neben den Wiederholungen der laufenden – ein Paar, das real nie
  vorkommt. Der Zwischenstand-Marker („Stand jetzt") hängt seither nur an der Zeile, die
  noch wandern kann (`previewProvisional` in `lib/livePreview.ts`).
- **Die Wochenvorgabe steht vor der Einheit, der Ausblick erst danach.** Wovon die
  Coach-Vorschau rechnet, entscheidet `previewWorkWeight` (`lib/livePreview.ts`) am
  `CoachScope`: im Wochenplan der Katalogstand – die Vorgabe der Woche ist vor dem ersten
  Satz entschieden und liegt als Zielgewicht auf den Sätzen –, sonst das im Block
  tatsächlich bewegte Gewicht. Damit trägt eine Hauptübung im Wochenplan ihren
  Coach-Block von Beginn der Einheit an; ohne Wochenplan bleibt es beim ersten
  abgehakten Satz (`useLiveCoachPreview`). Der Ausblick auf die Folgewoche kommt in
  beiden Fällen erst mit dem ersten abgehakten Satz. Das Coach-Zeichen setzt damit keine
  Bewertung der laufenden Einheit mehr voraus: ohne jede Vordaten steht es wie auf der
  Übungsseite im Zustand „Start".
- **Die Steigerungs-Regel steht genau einmal, und beide Anzeigeorte sprechen dieselbe
  Sprache.** Woran die Steigerung hängt, sagt der Wochenplan-Hinweis oben
  (`lib/planNote.ts`) und sonst nichts: gewertet wird die **letzte Einheit einer Übung in
  der Woche** – wer zweimal pro Woche trainiert, dessen schwache zweite Einheit kassiert
  die saubere erste –, und „sauber" heißt alle Sätze mit den vorgegebenen Wiederholungen,
  nicht härter als die Ziel-Anstrengung der Woche. Die Übungskarten wiederholen diesen
  Vorbehalt nicht; sie zeigen Wochenvorgabe und Ausblick. Beides zeigt auch die
  Übungs-Detailseite: Trainingskarte und Coach-Kasten lesen dieselbe Anzeigeform
  `CoachView` (`lib/coach.ts`: Zahlen, `CoachScope`, Ausblick), gefüllt von
  `useLiveCoachPreview` bzw. `useCoachStatuses`. Bewertet wird dort die letzte
  gespeicherte Einheit der laufenden Journey-Woche (`plan.currentWeekEntry`) statt der
  laufenden – steht diese Woche noch nichts, gibt es wie vor dem ersten abgehakten Satz
  keinen Ausblick. Einen Zwischenstand-Zusatz trägt die Übungsseite nie: außerhalb der
  Einheit wandert nichts mehr.
- **Phasen-Repband schlägt Übungs-Repband.** Läuft eine Journey, rechnet der Coach bei
  Kraftübungen mit dem Wiederholungsband der aktiven Phase (ersatzweise aus deren Fokus
  abgeleitet); das Band aus dem Übungskatalog ruht solange. Core- und
  Bodyweight-Übungen behalten ihr eigenes Band. Gerechnet wird das Band der Phase an
  einer Stelle (`phaseRepBand` in `engine/journey.ts`, angewandt in
  `derivePhaseContext`); ob es die Übung überstimmt, entscheidet allein das Profil-Tor
  `activeRepTarget` in `lib/coachStand.ts`. Genutzt wird das von Trainingsbildschirm,
  Übungs-Statusanzeige und Coach-Export – der Export weist beide Bänder getrennt
  aus (`repBand` = Katalog, `activeRepBand` = was gerade gilt), damit von außen nicht das
  falsche für maßgeblich gehalten wird.
- **Die Ziel-Anstrengung gehört ins System, nicht an die Übung.** Wo ein Wochenplan
  gilt, kommt sie aus dessen Wochenzeile (RIR); überall sonst gilt systemweit fest
  Score 3 (RIR 2) – `DEFAULT_TARGET_SCORE` in `engine/score.ts`, umgeschaltet an einer
  Stelle (`planTargetScore` in `lib/coach.ts`). Die frühere Stellschraube pro Übung
  (`exercises.target_score`) ist mit Migration 0042 entfernt: Sie hatte keinen
  Wochenbezug und war in genau den Phasen wirkungslos, in denen am meisten hingeschaut
  wird. Nicht betroffen ist `sets.target_score` – die Ziel-Anstrengung des einzelnen
  Satzes: Beim Abschließen einer Einheit wird dort seit Vorhaben #299 festgehalten,
  welche Vorgabe beim Aufbau galt (`LiveSet.targetScore` aus `planTargetScore`, quer
  durch `lib/setResult.ts`). Sie hängt am Satz und bleibt stehen, auch wenn im Training
  am RIR-Regler gedreht oder die Einheit später korrigiert wird; Aufwärmsätze und Skills
  tragen keine. Rückwirkend gefüllt wurde nichts – ältere Sätze bleiben leer.
  Das „Übung anpassen"-Popup führt seit Migration 0042 nur noch Stammwerte der Übung
  (Arbeitsgewicht, Repband) und zeigt die geltende Vorgabe der Journey als gesperrte
  Zeile an (`lib/exerciseTarget.ts`, dieselbe Weiche `planGovernsExercise` wie der
  Coach).
- **Der Coach senkt bei zweimal verfehltem Ziel.** Wird das Wiederholungsziel in zwei
  aufeinanderfolgenden Einheiten am selben Gewicht verfehlt, geht die Last einen Schritt
  zurück statt das obere Bandende erneut vorzugeben. Dafür bekommt `suggestWeight` neben
  dem letzten auch den vorletzten Eintrag der Übung (`buildPrevEntries` in
  `lib/lastEntries.ts`); weicht das Gewicht der beiden Einheiten ab, beginnt die Zählung
  neu. Die Schrittweite jedes Gewichtssprungs kommt aus den Einstellungen
  (`weight_step`, Standard 2,5), gerundet wird danach auf eine ladbare Stufe. In Phasen
  mit Wochenplan ruht die Regel (Regel 6 der Doppelprogression, ADR-0018).
- **Die Lastliste schlägt die Doppelprogression.** Trägt die laufende Phase eine
  Lastliste (`load_plan`), gibt sie das Arbeitsgewicht vor: `reference_weight` mal dem
  Anteil der laufenden Phasenwoche (`loadPlanForWeek` in `engine/loadPlan.ts`),
  abgerundet auf ladbare Scheiben bzw. Kurzhantelstufen. Unter vollem Niveau ist dieser
  Wert zugleich Ziel und Obergrenze (der Coach steuert nur noch die Wiederholungen), bei
  100 % nur Untergrenze. Nach unten reagiert der Coach unverändert. Die Vorgabe entsteht
  an einer Stelle (`rampLoad` in `coach.ts`, angewandt in `progression.ts`); der
  1RM-Einstieg beim Phasenwechsel ruht solange. Ohne Lastliste ändert sich nichts – auch
  dann nicht, wenn an den Übungen noch ein altes Referenzgewicht hängt. Bis Migration
  0046 stand statt der Liste ein einzelner Faktor an der Phase (`load_factor`); warum es
  eine Liste je Woche und keine Formel wurde, steht im Nachtrag zu ADR-0018.
- **Der Coach steigert vorsichtig, wo der Baustein es sagt.** Wiedereinstieg und
  Wiederaufbau steigern in kleineren Schritten. Ob das gilt, hängt am Vermerk `careful`
  der Phase und nicht mehr am Fokus (`isCarefulPhase` in `engine/weekPlan.ts`, gesetzt
  beim Anlegen aus dem Baustein); die Rechnung dazu bleibt unverändert in
  `engine/progression.ts` (`reentry`-Zweig).
- **Die Lastvorgabe ist überall sichtbar, aber nur wenn sie wirkt.** Ob ein Anteil
  überhaupt wirkt, entscheidet ein Prüfwort an einer Stelle (`isNeutralLoad` in
  `lib/loadFactor.ts`, samt Rundungstoleranz), ob eine Phase überhaupt eine Vorgabe
  macht, ein zweites (`usesLoadPlan`) – genutzt von Journey-Start, Coach-Rampe und
  Hinweistext. Die Anzeigetexte entstehen ebenfalls dort: die laufende Phase zeigt den
  Anteil ihrer laufenden Woche (`loadPercent`), jede andere Ansicht die Spanne der Liste
  (`loadSpanLabel`, „65 → 95 %") – ein einzelner Prozentwert wäre für einen wandernden
  Block schlicht falsch. Genutzt werden sie von Phasenliste, Vorlagen-Vorschau,
  Periodisierungskurve (der Anteil steckt in der Intensitätslinie), Trainingsbildschirm
  (`phaseContext.loadNote`, eingefroren auf die laufende Einheit), Rückschau und
  Coach-Export. Journeys ohne Lastliste sehen unverändert aus – keine zusätzliche Zeile,
  kein Hinweis.

### 4.2 Journey, Phasen und Wochenplan

- **Bausteine geben die Startwerte, aber nur beim Anlegen.** Was eine Phase mitbringt –
  Wochenzahl, Satzrampe, Wiederholungsband, Entlastungswoche, Last und die Bauart –,
  steht als Datenzeile in `phase_types` (3.2) und nicht mehr im Code. Gelesen wird sie
  dort, wo eine Phase entsteht: `buildPhaseFromType` (`engine/phaseBuild.ts`) baut aus
  Baustein plus wenigen Anpassungen (Wochen, Band, Entlastungswoche) die fertige
  Vorlagenphase, angewandt im Seed (`src/seed/definitions.ts`); beim Journey-Start
  wandern deren eingestellte Werte als Kopie in die Phasenzeile (`lib/journeyWrite.ts`).
  Bauart und die beiden Listen holt der Start dagegen direkt aus dem Baustein, weil die
  Vorlagenphase sie seit den Migrationen 0049 und 0050 nicht mehr trägt: Gebaut wird mit
  `buildPhasePlans` (`engine/phaseBuild.ts`) – derselben Funktion, die auch
  `buildPhaseFromType` benutzt, damit gestartete und gebaute Phase nicht auseinanderlaufen
  können. Engine und Coach lesen danach nur noch die Phase – eine
  geänderte Baustein-Vorgabe greift nie in eine laufende Journey. Die Phase trägt ihre
  Bauart mit (`plan_builder`, `load_builder`, `careful`), weil ein Wochenplan allein
  nicht sagt, was er tut: Kraftphase und Testphase tragen beide einen und verhalten sich
  gegensätzlich. Der Baustein sagt, **was** gebaut
  wird; **wie** gerechnet wird, steht in der Engine (`engine/weekPlan.ts`,
  `engine/loadPlan.ts`) – die gültigen Bauregel-Namen kommen von dort, damit Tabelle,
  Schema und Rechnung nicht auseinanderlaufen.
- **Journey-Standort an einer Stelle.** „Wo stehe ich gerade?" beantwortet
  `derivePhaseContext` (`lib/phaseContext.ts`): es nimmt die Session- und Phasen-Zeilen
  herein, bringt sie selbst auf die Engine-Form (`toPlacementSessions`,
  `toPlacementPhases`), ruft `journeyPlacement` und liefert Platzierung, laufende Phase,
  Fokus, Repband, Volumen-Phase, Woche und den Lastanteil der laufenden Phasenwoche.
  Trainingsbildschirm, Journey-Seite, Übungs-Statusanzeige, Live-Aufbau und das „Übung
  anpassen"-Popup setzen sich daraus zusammen, ohne selbst zu platzieren. Ausnahme: der
  Coach-Export liest aus einem Export-JSON statt aus Hooks und behält seine eigene
  Zeilenform – die Regeln (Band, Lastanteil) teilt er trotzdem.
- **Die Phase gibt die Wochenstruktur vor, der Coach nur das Gewicht.** Maximalkraft-,
  Intensivierungs- und Testphasen tragen ihren Wochenplan als jsonb an der Phase
  (`week_plan`): je Woche Sätze, Wiederholungen, Ziel-Anstrengung (RIR), Anteil am
  Arbeitsgewicht und ein kurzer Wochenziel-Text. Gerechnet wird er an einer Stelle
  (`engine/weekPlan.ts`: `buildWeekPlanFor` beim Anlegen, `weekPlanForWeek` beim Lesen);
  das Zod-Schema dort ist die Quelle der Wahrheit für die Form, die DB-Schemas verweisen
  nur darauf. In der Vorlage steht er seit Migration 0050 nicht mehr: Er ist dort aus
  Baustein und Wochenzahl vollständig ableitbar, entsteht darum erst beim Journey-Start
  und wird ab da an der Phase eingefroren. Die Vorlagen-Auswahl rechnet ihre Vorschau mit
  derselben Regel (`buildTemplatePhaseInputs` in `lib/journey.ts`), zeigt also genau, was
  der Start später einfriert. Damit laufen drei Wege nebeneinander: Phasen mit Plan nach dem
  Wochenplan; Hypertrophie, Kraftausdauer, Wiedereinstieg und Erhaltung – und jede Phase
  ohne Plan (null) – unverändert weiter über die Doppelprogression des Coaches; und der
  Wiederaufbau als dritter Weg, in dem der Coach die Wiederholungen steuert und die
  Lastliste das Gewicht deckelt (4.1, Nachtrag zu ADR-0018). Welchen Plan eine Phase
  bekommt, entscheidet ihre Bauregel (`plan_builder`, gebaut in `buildWeekPlanFor`); ob
  er in der laufenden Woche die Last steuert, `planGovernsLoad` in `derivePhaseContext`;
  umgeschaltet wird in `suggestForExercise` (`lib/coach.ts`, `planSuggestion`). Trägt die
  laufende Phase einen Wochenplan und ist die Übung eine Hauptübung mit Profil
  `strength`, gibt der Plan Sätze, Wiederholungen und Ziel-Anstrengung vor; das Repband
  der Phase ruht dann, ebenso Toleranz und Rückwärtsregel der Doppelprogression. Die
  Gewichtsregel selbst steht in `engine/planLoad.ts`: Startgewicht beim Phaseneintritt
  aus dem geschätzten 1RM (Planwiederholungen der ersten Woche + 2 Reserve, abgerundet),
  danach je Journey-Woche ein `weight_step` hoch, wenn die letzte Einheit der Vorwoche
  voll sauber war – sonst bleibt das Gewicht stehen. Innerhalb einer Woche liegt immer
  dasselbe Gewicht auf der Übung. Gesenkt wird nie; nur eine im Training selbst
  reduzierte Last zieht den Anker nach unten nach (`anchorAfterSession`, angewandt in
  `lib/katalogPatch.ts`). Der Anker ist `reference_weight` samt `reference_phase_id` –
  nur ein an die laufende Phase gebundener Anker zählt, sonst tritt die Übung gerade ein.
  Die Wochen-Buchhaltung (welche Einheit liegt in dieser, welche in der vorigen
  Journey-Woche derselben Phase) liegt in `lib/lastEntries.ts` (`buildWeekEntries`) und
  `engine/journey.ts` (`journeyWeekLookup`), zusammengesetzt in `lib/planContext.ts`
  (`buildPlanSource` – eine Quelle für Live-Aufbau, Übungs-Statusanzeige und
  Coach-Vorschau). Warum zwei Wege statt einer Regel: ADR-0018.
- **Die Testphase entlastet erst, dann testet sie.** Bauregel an einer Stelle
  (`engine/weekPlan.ts`, `buildTestPhaseWeekPlan`): die letzte Woche einer Testphase ist
  die reine Testwoche, jede Woche davor ist Entlastung. Die Entlastungswoche läuft
  denselben Weg wie die Kraftwoche, nur mit anderem Bezug: 2 Sätze zu 3–5 Wiederholungen
  mit dem `loadPct` des Plans (60 %) vom Startgewicht X der vorangegangenen Kraftphase,
  ohne jede Steigerung (`planWeekLoad` mit `deload`). X steht als `plan_start_weight` an
  der Übung, gebunden an dieselbe Phase wie der Anker, und wird beim Eintritt in die
  Phase einmal festgehalten (`lib/katalogPatch.ts`); fehlt es, gilt der Anker, sonst das
  1RM. Welche Phase den Bezug stellt, entscheidet `derivePhaseContext` (`deload`,
  `anchorPhaseId` – die nächste Maximalkraft-/Intensivierungsphase davor). Die Testwoche
  selbst plant nichts: sie steht mit `sets: 0` im Wochenplan (`weekDemandsSession` fragt
  das ab) und gibt weder dem Coach noch der Anzeige etwas vor – `derivePhaseContext`
  lässt den ganzen Plan-Block leer, der Coach rechnet dort wie in einer Phase ohne Plan.
  Trainieren ist erlaubt, aber nicht eingeplant; der 1RM-Test läuft unverändert von der
  Übungsseite. Auf dem Trainingsbildschirm erklärt sie sich selbst: statt der Lücke, die
  eine Woche ohne Plan sonst hinterlässt, steht dort der Hinweis, dass die Testwoche
  läuft und bis wann (`sundayOfWeek` in `engine/journey.ts`), darunter die Hauptübungen
  mit direktem Test-Start und einem Haken für die, die in dieser Kalenderwoche schon
  getestet sind (`TestWeekPanel`). Erkannt wird die Woche an einer Stelle
  (`derivePhaseContext.testWeek`: Testfokus, Plan vorhanden, Woche verlangt nichts,
  Journey noch nicht durchlaufen). Die Liste ist reine Ableitung aus dem Bestand –
  Übungen mit Rang `main` und `profile !== "bodyweight"`, abgeglichen mit `rm_tests` der
  laufenden Kalenderwoche (`lib/testWeek.ts`) – und **entscheidet nichts**: die Woche
  endet am Sonntag, unabhängig davon, was offen bleibt. Gestartet wird über die
  bestehende Mechanik (`useStartRmTest.startById`), Empfehlung und Workout-Liste bleiben
  unverändert darunter stehen, damit Trainieren in der Testwoche nicht verstellt ist. Ein
  neuer Phasentyp entsteht für all das nicht – die Testphase bleibt `test`, nur mit zwei
  Wochen (ADR-0017, Issue #240, Schritte 1 und 3).
- **Der Wochenplan ist dort sichtbar, wo er wirkt.** Auf dem Trainingsbildschirm steht
  der Hinweis der laufenden Planwoche (Phase und Woche, Sätze/Wiederholungen/RIR, was
  den nächsten Gewichtsschritt auslöst, dazu der Cluster-Hinweis) – gebaut an einer
  Stelle (`lib/planNote.ts`, Schrittweite und Einheit aus den Einstellungen), beim Start
  auf die Einheit eingefroren wie der Lasthinweis (`WorkoutSession.planNote`) und
  in Start-Popup und Live-Panel im selben Kasten gezeigt (`PlanNoteBanner`). Auf der
  Journey-Seite listet **jede** Phase mit Plan ihre Wochen auf (`PhaseView.weekRows` aus
  `lib/journey.ts`): je Woche Sätze, Wiederholungen, Ziel-Anstrengung und Wochenziel.
  Unterschiedlich ist nur der markierte Stand – an einer vergangenen Phase sind alle
  Wochen abgehakt, an einer künftigen alle blass, an der laufenden ist die aktuelle
  hervorgehoben; in der Vorlagen-Vorschau läuft keine Journey, dort stehen alle Zeilen
  neutral (`tableWeek` liefert die Bezugswoche, `null` heißt Vorschau). Eine Überschrift
  trägt der Block nicht – „Woche 1" sagt schon, was dort steht (Issue #366). Die
  Testphase ist dabei keine Ausnahme: sie trägt einen festen Plan wie Maximalkraft und
  Intensivierung und zeigt ihn genauso – Woche 1 die Entlastung, Woche 2 den Test. Weil
  die Testwoche keine Einheit plant (0 Sätze), steht in ihrer Zeile „1RM-Test" statt
  Zahlen; der frühere Fließtext (`testNote`) ist damit entfallen (Issue #364).
- **Was die Wochentabelle trägt, steht nicht noch einmal darüber.** Die Detailzeilen
  einer Phase sind die Zusammenfassung derselben Zahlen, die die Tabelle Woche für
  Woche auflistet – also lässt `phaseDetail` weg, was die Tabelle schon zeigt
  (`PhaseView.detail` bleibt dann leer, `PhaseList` blendet die Kachel aus). Kommt die
  Tabelle aus der Wochenliste, entfällt die Kachel ganz; kommt sie aus der Lastliste,
  entfällt nur die Zeile „Vorgegebene Last", weil Band, Satz-Rampe und Deload dort
  nirgends stehen. Ohne Tabelle – die Phasen, die ganz beim Coach liegen – bleiben die
  Eckwerte unverändert stehen. Daraus folgt eine Regel ohne Ausnahme: Phase mit
  Wochenplan zeigt ihre Wochen und keine Kachel, Phase mit Lastliste zeigt ihre
  Laststufen je Woche plus Band, Satz-Rampe und Deload, Coach-Phase zeigt nur die
  Eckwerte. Sichtbar ist das auf beiden Breiten gleich: die mobile Liste klappt nicht
  mehr nur die laufende Phase auf, sondern zeigt an jeder Phase dieselben Angaben wie
  das Raster (Issue #362). Auch die Periodisierungskurve
  rechnet dann wochengenau: beide Linien kommen in `lib/periodization.ts` aus der
  jeweiligen Planwoche statt aus den Eckwerten der Phase – die Intensität aus den
  Wiederholungen der Woche mal dem Anteil am Arbeitsgewicht (`loadPct`), das Volumen aus
  den Sätzen der Woche, und die Entlastungswoche ergibt sich aus `loadPct < 1` statt aus
  `deload_week`. Dadurch steigt der Kraftblock sichtbar an, die Entlastungswoche bricht
  ein und die Testwoche steht ohne Volumen auf höchster Intensität; der Chart-Baustein
  selbst bleibt unangetastet (reiner Datenteil). Phasen ohne Plan sehen überall
  unverändert aus und rechnen weiter über Repband und Satz-Rampe.
- **Eine Woche, die nichts verlangt, erfüllt sich selbst.** Eine Journey-Woche gilt
  normal als erfüllt, wenn genug zählende Einheiten in ihr liegen. Genau eine Ausnahme,
  an genau einer Stelle in `engine/journey.ts` (`fulfilledWeeks`): plant die Woche gar
  keine Einheit – das ist die reine Testwoche mit `sets: 0` –, ist sie ohne Zutun
  erfüllt. Die Einheitenzahl der Anzeige bleibt dabei die tatsächliche. Weil diese
  Ausnahme an der Journey-Wochennummer hängt, die sich ihrerseits aus den erfüllten
  Wochen davor ergibt, rechnet die Engine Kalenderwoche für Kalenderwoche vorwärts (ab
  der ersten Einheit der Journey) statt über eine Menge von Wochenschlüsseln. Dafür
  gehören die Wochenpläne zur Platzierung: die Phasen kommen als `PhaseLike` samt
  `weekPlan` herein (`toPlacementPhases`), überall gleich, damit Übungsseite, Live-Aufbau
  und Journey dieselbe Woche zeigen (ADR-0017, Issue #240, Schritt 2).
- **Die Journey ist durchlaufen, wenn alle geplanten Wochen erfüllt und vorbei sind.**
  Nicht mehr beim Beenden einer Einheit – zwei Regeln für dieselbe Frage wären die Quelle
  künftiger Abweichungen zwischen Anzeige und Abschluss. Ausgewertet wird das vorhandene
  Signal `placement.done`; geprüft wird bei jedem App-Start und auf jeder Seite, weil der
  Hook (`useJourneyCompletion`) in der global gemounteten Live-Schicht hängt. Der
  Schreibvorgang (`writeJourneyAbschluss` in `lib/journeyWrite.ts`: Workout-Namen
  einbrennen, archivieren, Referenzgewichte räumen) ist bewusst einfach und nicht offline-gepuffert: der Abschluss ist keine Dateneingabe,
  sondern eine Schlussfolgerung aus vorhandenen Daten – schlägt er fehl, ist die
  Bedingung beim nächsten Öffnen unverändert wahr und der Vorgang heilt sich selbst. Als
  `end_date` steht der Sonntag der letzten geplanten Woche im Archiv (`journeyEndDate`),
  nicht der Tag des Merkens; sonst hinge die Dauer davon ab, wann die App zufällig
  geöffnet wurde. Das Popup „Journey abgeschlossen" kommt erst nach erfolgreichem
  Archivieren. Begründung samt Konsequenzen in ADR-0017; ADR-0014 gilt für den Abschluss
  nicht mehr, sein Teil „ohne Journey gibt der Coach nichts vor" unverändert weiter.
- **Eine abgeschlossene Journey ist ein Protokoll, kein Plan** (ADR-0022). Beim Abschluss
  wird der heute gültige Workout-Name in die Einheiten der Journey geschrieben
  (`sessions.template_name`) – erst einbrennen, dann archivieren, damit ein Abbruch die
  Journey aktiv lässt und sich der Vorgang wie oben selbst nachholt. Beide Wege, auf denen
  eine Journey endet, brennen ein: der Kalender-Abschluss und der Journey-Wechsel
  (`writeJourneyStart`, löst die bisherige ab). Die Rückschau nimmt danach den
  eingebrannten Namen und leitet ihre Workout-Liste aus den absolvierten Einheiten ab, nicht
  aus der Zuordnung `journey_workouts`; der Trainingsverlauf bleibt die lebende Sicht und
  löst weiter aktuell auf. Dieselbe Einheit darf deshalb in Verlauf und Rückschau
  unterschiedlich heißen.

### 4.3 Datenzugriff und Schreibwege

- **Datenzugriff gekapselt** in Query-/Mutation-Hooks je Entität (z. B.
  `useSessions`, `useExercises`). Komponenten kennen kein Supabase direkt.
- **Naht zur Datenbank je Schreibbereich** (`src/lib/<bereich>Store.ts` +
  `src/lib/<bereich>Write.ts`). Der Store ist eine schmale Schnittstelle mit einem
  Handgriff je Methode und zwei Gesichtern: `supabase<Bereich>Store` im Betrieb
  (Fehlerprüfung an genau einer Stelle, `must`) und `createMemory<Bereich>Store()` für
  Tests (protokolliert statt zu schreiben). Der Write-Baustein hält die reine Abfolge
  „Absicht → Handgriffe" samt Feld-Abbildung und kennt Supabase nicht; der Hook trägt nur
  noch Absicht und Auffrischung. Dadurch ist jeder umgestellte Schreibpfad ohne echte
  Datenbank prüfbar (`src/lib/__tests__/<bereich>Write.test.ts`). Warum die Naht je
  Bereich statt je Tabelle verläuft und wonach ein Store mehrere Tabellen bedienen darf:
  ADR-0019. Bei den registrierten (pausierbaren) Mutationen tauscht die Naht
  ausschließlich den Rumpf der `mutationFn`: Mutations-Kennung, Nutzlast-Felder und
  Registrier-Reihenfolge bleiben unverändert, damit offline pausierte Schreibvorgänge
  einen App-Neustart weiterhin überleben (ADR-0009). Umgestellt sind:
  - **Verlauf** (`historyStore`/`historyWrite`) – der geführte Schreibpfad einer Einheit
  - **Zeiträume** (`zeitraumStore`/`zeitraumWrite`)
  - **Messungen** samt Mess-Meilensteinen (`compositionStore`/`compositionWrite`), ein
    Store für beide Tabellen, weil fachlich derselbe Bereich
  - **Übungskatalog** samt Übungs-Meilensteinen und 1RM-Tests
    (`exerciseStore`/`exerciseWrite`): `exercises`, `exercise_milestones`, `rm_tests`
  - **Journey** samt Phasen, Workout-Zuordnung und Workout-Vorlagen
    (`journeyStore`/`journeyWrite`): `journeys`, `phases`, `journey_workouts`,
    `templates`, `template_exercises` und die Referenzgewichte in `exercises`.
    **Beide Wege, auf denen eine Journey endet, laufen hier durch**: der Wechsel
    (`writeJourneyStart` löst die bisherige ab) und der Kalender-Abschluss
    (`writeJourneyAbschluss`). Vorher stand die Regel „Journey endet" zusätzlich
    im `historyStore`, und die beiden Fassungen räumten unterschiedlich auf – der
    Weg über den Verlauf ließ den Phasenbezug (`reference_phase_id`) der
    abgelösten Journey stehen. Seit Issue #379 gibt es dafür einen Handgriff
    (`clearReferenzgewichte`: Gewicht, Startgewicht und Phasenbezug zusammen),
    den beide benutzen; der `historyStore` hat mit der Journey nichts mehr zu tun
  - **Ausstattung** samt Einstellungen (`ausstattungStore`/`ausstattungWrite`):
    `inventory_plates`, `inventory_kettlebells`, `inventory_dumbbells`,
    `inventory_equipment`, `settings`
  - **Erfassungen** am eigenen Verlauf (`erfassungStore`/`erfassungWrite`): `body_log`,
    das Anlegen/Löschen einzelner `sessions` außerhalb des geführten Ablaufs und die
    manuellen Eingriffe in `skill_progress`; der geführte Schreibpfad bleibt im
    `historyStore`
  - **Erstbefüllung eines neuen Kontos** (`seedStore`/`seedWrite`): dreizehn Tabellen in
    einem Zug – Bausteine, Inventar, Übungskatalog samt Muskel-Zuordnung,
    Journey-Vorlagen, Skills samt Phasen und Ausstattung (3.2). Ein Store für alle,
    weil ihre Reihenfolge voneinander abhängt. Der Test-Speicher merkt sich hier
    zusätzlich das Geschriebene und beantwortet damit die Lesefragen – nur so lässt
    sich prüfen, dass ein zweiter Lauf nichts mehr anlegt
  - **Wiederherstellen einer Sicherung** (`restoreStore`/`restoreWrite`): drei Handgriffe
    – Tabelle leeren, Zeilen einfügen, Einzelzeile ersetzen –, die Reihenfolgen kommen
    unverändert aus dem Bestandsregister. Damit ist der heikelste Schreibpfad der App
    (erst den kompletten Bestand löschen, dann neu einfügen) erstmals ohne echte
    Datenbank geprüft.
- **Naht zur Leseseite** (`src/lib/tabelleLesen.ts`) – das Gegenstück zu den
  Schreib-Stores, aber eines für alle Bereiche statt eines je Bereich, weil das Lesen
  überall dieselbe Form hat. Ein `LeseAbfrage`-Wert beschreibt Tabelle, Spaltenauswahl,
  Gleichheits-Filter, Sortierstufen und Grenze; `leseZeilen`/`leseZeile` spielen ihn im
  Betrieb über `supabaseTabellenLeser` ab, `createMemoryTabellenLeser()` bedient in Tests
  aus dem Arbeitsspeicher und protokolliert jede Abfrage. Die Regel „Supabase-Fehler wird
  zu einem `Error`" und die Kettenreihenfolge (auswählen → filtern → sortieren →
  begrenzen) stehen damit einmal statt in zwanzig Hooks. Kein Lese-Hook importiert noch
  `@/lib/supabase`. Die Nutzer-Kennung ist bewusst kein Teil der Abfrage: RLS scope't
  ohnehin auf den angemeldeten Nutzer, sie trägt allein der Query-Schlüssel. Die
  Umformung der Zeilen (verschachtelte Auswahl auspacken, nach `position` sortieren,
  abgeleitete Ansichten) bleibt beim jeweiligen Hook – Sonderformen wie `useTemplates`,
  `useSkills` oder `useSessionsDetailed` werden nicht in ein Schema gepresst, ihnen nimmt
  die Grundlage nur den wiederkehrenden Teil ab. Geprüft ist die Grundlage selbst
  (`src/lib/__tests__/tabelleLesen.test.ts`); die Hooks bleiben ungetestet, solange keine
  Test-Bibliothek für React installiert ist.
- **Query-Schlüssel und Auffrischung an einer Stelle** (`src/lib/queryKeys.ts`). Kein
  Schlüssel steht als loses Textliteral in Hook, Komponente oder Route. Drei Regeln:
  `queryKeys.<entität>(userId, …)` baut jeden Leseschlüssel und verlangt die
  Nutzer-Kennung als Parameter (an zweiter Stelle, damit beim Kontowechsel nichts
  gemischt wird); `INVALIDATE.<ereignis>` nennt je Schreib-Ereignis die
  aufzufrischenden Wurzeln – der Schreiber nennt das Ereignis, nicht die Schlüssel;
  aufgefrischt wird immer nur über die Wurzel ohne Kennung, weil TanStack Query nach
  Präfix vergleicht. Abgeleitete Ansichten (`useTrainingOverview`, `useCoachStatuses`)
  haben bewusst keinen eigenen Schlüssel: sie rechnen im Speicher aus den Hooks und
  ziehen automatisch nach, sobald eine ihrer Quellen aufgefrischt wird. Die Wurzelnamen
  sind zugleich der Vertrag mit dem Offline-Cache und werden nicht umbenannt.

### 4.4 Live-Training

- **Live-Training: der Store hält, `lib/live*` entscheidet.** Der geräte-lokale Store
  `src/hooks/useLiveSession.ts` hält den Zustand der laufenden Einheit, sichert ihn im
  Gerätespeicher und löst die Seiteneffekte aus (Ton, Pause, Uhr). Er enthält selbst keine
  Datenumformung mehr; bewusst dort geblieben sind nur `cyclePlateMode` (Anzeige, keine
  Fachregel) und die Skill-Uhr, die nur festhält, welche Uhr gerade läuft. Warum er **ein**
  Modul geblieben ist statt in mehrere Stores zerlegt zu werden: ADR-0020. Entschieden und
  umgeformt wird ausschließlich in reinen Funktionen ohne React-/DOM-/DB-Bezug, jede mit
  eigenen Vitest-Tests:
  - `liveFlow` – nächstes To-do, Pausen-Typ, Fortschritt. Das nächste To-do wird nicht
    stur linear gesucht: mit `focusEi` kennt die Funktion die Übung, an der gerade
    gearbeitet wird, damit ein Einstieg mitten in der Einheit Timer und Markierung richtig
    führt. Der Merker liegt in der Einheit, wird im Store beim Abhaken/Werteintragen
    gesetzt und fällt von selbst auf die lineare Reihenfolge zurück, sobald die Übung
    durch ist.
  - `liveEntries` – Sätze und Aufwärmsätze je Übung samt der Regeln „Gewicht weicht ab →
    Vermerk", „Bewertung 5 → gescheitert", Klemmen im 1RM-Test
  - `liveRest` – Pausen-Rechnung, die Zeit kommt als Parameter herein
  - `liveAutoRest` – Entscheidung nach einem abgehakten Satz: keine / abbrechen / starten
  - `liveWarmup` – allgemeines Aufwärmen
  - `liveSkillEdit` – Ändern der Skill-Übungen; der Aufbau liegt getrennt in
    `skillLiveBuild`
  - `durationTimer` – Stand des Dauer-Timers zu einem Zeitpunkt: Vorbereitung, Zielzeit,
    Extra-Runden und Multiplikator. Die Zeit kommt als Parameter herein, gezeichnet wird
    in `DurationTimerOverlay`
  - `liveStart` – die drei Startwege Kraft / Skill / 1RM-Test als Fabriken, Kennung und
    Startzeit kommen herein

### 4.5 UI und Sprache

- **Wiederverwendbare Primitives** in `src/components/ui` (Modal, DataTable, Sheet,
  MuscleMap, Chart). Genau das Ziel: einmal bauen, überall nutzen.
- **shadcn/ui als Fundament, nicht als Optik.** shadcn liefert die unsichtbare Mechanik
  (Fokus-Fang, Schließen-Verhalten, Tastatur, Barrierefreiheit, iOS-Verhalten) als
  eigenen, ins Projekt kopierten Code – kein mitgeschlepptes Paket. Das Aussehen kommt
  ausschließlich aus den eigenen Design-Tokens (Klar-Theme). Begründung und
  Beschaffungsweg in ADR-0005 und ADR-0006.
- **Zod-Schemas** als Quelle der Wahrheit für Datenformen; TypeScript-Typen daraus
  abgeleitet.
- **Domänensprache deutsch**, Code-/Architekturbegriffe englisch – die Begriffe stehen
  einmal bei den Leitprinzipien in Abschnitt 1.

---

## 5. Offline und PWA

Die Datenschicht ist offline-fähig (ADR-0001): Daten kommen offline aus der
TanStack-Persistenz (IndexedDB + pausierte Mutationen), nicht aus dem Service Worker.
Die beiden Mechanismen bleiben getrennt; Supabase wird nicht vom Service Worker gecacht.

Die Reihenfolge der Mutations-Registrierung ist eine harte Invariante: pausierbare
Mutationen müssen vor `resumePausedMutations` registriert sein, sonst überleben sie
keinen App-Neustart (ADR-0009).

Updates werden bewusst übernommen, nicht still eingespielt (ADR-0008). Der base-Pfad und
der SPA-Fallback für GitHub Pages sind in ADR-0007 festgehalten.
