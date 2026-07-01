# Konzept: Typ-Felder am Übungskatalog aufräumen (`category` / `kind`)

Aufräum-Vorhaben im laufenden Betrieb. Ziel: die zwei redundanten Typ-Felder `category`
und `kind` am Übungskatalog entfernen, ihre real gebrauchten Anteile in bestehende bzw. ein
klar benanntes Feld überführen. Der globale Look bleibt; der **Coach-Rechenkern bleibt
unangetastet** (kein verändertes Empfehlungsverhalten).

Dieses Vorhaben ist das im Workouts-Konzept angekündigte „eigene, separate Konzept" zum
Aufräumen dieser Felder (siehe [`Konzept-Workouts-und-Journey-Zuordnung.md`](../Konzept-Workouts-und-Journey-Zuordnung.md),
Abschnitt Ausgangslage).

Verweise: Ist-Zustand in [`Architektur.md`](../Architektur.md), Schema in
`supabase/migrations/0001_initial_schema.sql`, Offline-Mutationsreihenfolge in
[`adr/0009-mutationsreihenfolge.md`](../adr/0009-mutationsreihenfolge.md).

---

## 1. Ausgangslage (frisch im Code geprüft)

Jede Übung trägt heute vier typ-artige Felder plus `bar_id`. Die tatsächliche Nutzung
wurde für dieses Konzept neu am Code gegengeprüft, nicht aus früheren Notizen übernommen.

- **`profile`** (`strength` / `core` / `bodyweight`) — der echte Steuerschalter. Gelesen in
  `lib/coach.ts` (core/bodyweight → mitgeführt via `coreCarry`, sonst Doppelprogression),
  `lib/liveBuild.ts` (Phasen-Periodisierung nur bei `strength`, Satzzahl bei `core`),
  `lib/exercises.ts` (Gruppierung/Meta), `components/exercise/ExerciseEditModal.tsx`
  (Formularlogik), `hooks/useFinishSession.ts` und `hooks/useEditSession.ts`
  (1RM-Tracking nur wenn nicht bodyweight), `hooks/useExerciseDetail.ts` (Metrik).

- **`category`** (`barbell` / `core` / `bodyweight`) — faktisch nur „läuft an der
  Langhantel". Verzweigt wird ausschließlich auf `=== "barbell"`: `lib/coach.ts`
  (`suggestWithBar` Stangenwahl, `warmupFor` Aufwärmrampe) und
  `components/live/ExerciseLiveCard.tsx` (Plate-Loader-Anzeige). Die Werte `core`/`bodyweight`
  werden auf Live-Einträge geschrieben und mitgeschleift (`lib/liveSession.ts`), aber nirgends
  abgefragt — reine Dopplung des Profils.

- **`kind`** (`main` / `accessory` / `core` / `bodyweight`) — **nicht tot** (korrigiert eine
  frühere Notiz, die `kind` als ungelesen führte). Gelesen in `lib/exercises.ts`
  (`=== "accessory"` → Gruppe „Assistenz", Meta-Text, Unterzeile) und `engine/suitability.ts`
  (`=== "main"` → in Kraftphasen strength/power/test zählt jeder Hauptlift +0,6 auf die
  Workout-Eignung). Gebraucht wird also die Unterscheidung **main vs. accessory**; die Werte
  `core`/`bodyweight` sind toter Ballast (das Profil greift vorher).

- **`equipment`** (`barbell` / `plate` / `bar` / `band` / `bodyweight`) — an der Übung
  **inert**. Kein Code verzweigt je auf diese Spalte. Das Inventar-Gating „Gerät fehlt"
  hängt nur an Skills (über deren Phasen-Equipment), nie am Übungskatalog. Die Spalte wird
  nur migriert und exportiert/zurückgespielt.

- **`bar_id`** → `inventory_bars` — die eigentliche Stangen-Verknüpfung (Standard-Stange).

Zwei Randfakten für die Migration: Übungen werden **nicht per Code geseedet** — der Katalog
stammt aus der einmaligen V1-Migration und liegt in der DB; die konkreten Zeilenwerte sind
im Code nicht einsehbar. Alle vier Felder haben CHECK-Constraints in
`0001_initial_schema.sql`. Der Export macht `selectAll("exercises")`, spielt also die volle
Zeile mit.

**Fazit der Prüfung:** `category` ≈ ein Bit „ist Langhantel"; `kind` ≈ ein Bit „main vs.
accessory" (zwei von vier Werten sind Ballast); `equipment` an der Übung wird nicht gelesen.

---

## 2. Zielbild

Die typ-artigen Felder an der Übung nach dem Aufräumen:

- **`profile`** — `strength` · `core` · `bodyweight`. **Unverändert.** Steuert die Progression.
- **`equipment`** — `barbell` · `plate` · `bar` · `band` · `bodyweight`. Wertevorrat
  **unverändert**, aber erstmals real gelesen: `equipment === "barbell"` übernimmt die Rolle
  von `category` (Stangenwahl, Aufwärmrampe, Plate-Loader). Die übrigen Werte beschreiben das
  Gerät und sind Andockpunkt für ein späteres Übungs-Inventar-Gate (eigenes Vorhaben, hier
  kein Beschluss).
- **`tier`** — `main` · `accessory`. **Neu**, ersetzt `kind`. Text-Enum mit CHECK-Constraint,
  bewusst erweiterbar (etwa später isolation/prehab), ohne den Feldtyp anzufassen. Speist den
  Kraftphasen-Bonus (`engine/suitability.ts`) und die Gruppe „Assistenz" (`lib/exercises.ts`).
- **`bar_id`** — **unverändert**.

**Entfallen:** `category` und `kind`.

Warum kein Bool für `tier`: Ein Bool schließt Wachstum aus. Ein Enum kostet in Postgres
praktisch dasselbe und bleibt erweiterbar; Start mit zwei Werten. Warum nicht `role`: Das
Wort ist im Workouts-Vorhaben bereits für `template_exercises.role` (Rolle der Übung *in
einem konkreten Workout*) belegt — `tier` meint die Natur der Übung *im Katalog*. Zwei Ebenen,
darum zwei Wörter.

---

## 3. Migration (deterministisch aus den getrauten Altwerten)

Reihenfolge, alles in einer neuen SQL-Migration:

1. **`tier` anlegen** (`text not null default 'main' check (tier in ('main','accessory'))`).
2. **Backfill `tier`:** `kind = 'accessory'` → `tier = 'accessory'`; alles andere
   (`main` / `core` / `bodyweight`) → `tier = 'main'`. Sicher, weil core/bodyweight ihre
   Einordnung ohnehin aus `profile` ziehen.
3. **`equipment` an `category` angleichen (Barbell-Wahrheit sichern):** wo
   `category = 'barbell'`, sicherstellen, dass `equipment = 'barbell'`. `category` ist hier die
   getraute Quelle, nicht `equipment` (die Spalte war bisher tot).
4. **Verifikation vor dem Löschen:** Prüf-Query, dass nach Schritt 3 jede Zeile mit vormals
   `category = 'barbell'` nun `equipment = 'barbell'` trägt. Weicht etwas ab, wird die Migration
   gestoppt und der Datenstand sichtbar gemacht, bevor irgendetwas fällt. Grund: Sobald
   `category` weg ist, hängt die gesamte Stangen-/Rampen-/Plate-Logik allein an
   `equipment === "barbell"`; ein stiller Fehlwert würde einer Übung leise Rampe und
   Stangenwahl nehmen.
5. **`kind` streichen.**
6. **`category` streichen.**

---

## 4. Code-Änderungen (Lesestellen umhängen)

Klein und lokal, kein Eingriff in die Rechenlogik selbst.

- **`category === "barbell"` → `equipment === "barbell"`** in `lib/coach.ts`
  (`suggestWithBar`, `warmupFor`) und `components/live/ExerciseLiveCard.tsx`. In `lib/coach.ts`
  trägt `CoachBuildExercise` heute `category`; das Feld wird auf `equipment` umgestellt, ebenso
  die Mapper in `hooks/useCoachStatuses.ts`, `hooks/useLiveBuilder.ts` und `lib/liveBuild.ts`.
- **Live-Eintrag (`lib/liveSession.ts`):** das persistierte `category`-Feld am Live-Eintrag
  wird auf die neue Quelle umgestellt bzw. entfernt; Rückwärtskompatibilität beim Einlesen alter
  laufender Einträge beachten (Feld darf fehlen).
- **`kind` → `tier`** in `lib/exercises.ts` (`=== "accessory"`) und `engine/suitability.ts`
  (`=== "main"`). Die deutschen Beschriftungen liegen in `lib/labels.ts` (`kindLabel`) und
  werden zu `tierLabel` gezogen.
- **Schema `schemas/exercises.ts`:** `exerciseCategoryEnum` und `exerciseKindEnum` entfernen,
  `exerciseTierEnum` ergänzen; `exerciseRow`/`exerciseInsert` nachziehen.

---

## 5. Export / Restore & Altdaten

- **Alte Backups** enthalten `category` und `kind`. Der Restore muss diese Zusatzfelder
  tolerieren (ignorieren) und darf nicht an unbekannten Spalten scheitern; fehlt `tier` in
  einem alten Backup, greift der DB-Default `main` bzw. eine Ableitung beim Einlesen.
- **Neue Exporte** führen `tier` statt `category`/`kind`. Der Export-Schema-Marker
  (`EXPORT_SCHEMA_VERSION`) wird entsprechend hochgezogen, damit alt/neu unterscheidbar bleibt.
- **Verlauf bricht nicht:** `session_exercises` kopiert beim Einheit-Start die Übungsdaten; die
  Typ-Felder der Übung stecken nicht im Verlaufssatz, ein Schema-Wechsel am Katalog verändert
  bestehende Einheiten also nicht rückwirkend.

---

## 6. Editierbarkeit (bleibt wie sie ist)

Übungen bleiben **nicht frei editierbar**: anpassbar bleiben genau Arbeitsgewicht, Ziel-Score
und (wenn nicht durch die aktive Phase gesperrt) das Repband. `profile`, `equipment`, `tier`
und `bar_id` sind **nicht** über die Oberfläche änderbar — kein Anlegen, kein Umbenennen, kein
Typwechsel. Das ändert dieses Vorhaben nicht.

---

## 7. Versionierung (offener Punkt)

`1.3.0` ist bereits für die erste Lieferung des Workouts-Vorhabens reserviert. Dieses
Aufräumen ist davon unabhängig. Empfehlung: als eigenständige Patch-Lieferung auf dem
aktuellen Stand fahren (`1.2.x`), unabhängig davon, ob es vor oder nach dem Workouts-Vorhaben
umgesetzt wird — es berührt weder Nav noch sichtbare Features. Konkrete Nummer bei Baubeginn
festlegen.

---

## 8. Lieferungen (klein, einzeln testbar)

- [ ] Lieferung 1: SQL-Migration (Abschnitt 3) inkl. Verifikations-Query; Schema
      `schemas/exercises.ts` (Enums umstellen). Noch keine Lesestelle umgehängt — DB und Typen
      tragen beide Alt- und Neuform überlappend, damit der Code weiterläuft.
- [ ] Lieferung 2: Lesestellen umhängen (Abschnitt 4): `equipment === "barbell"` in coach/
      ExerciseLiveCard/Mapper, `kind` → `tier` in exercises/suitability, `tierLabel` in labels.
      Validierung grün (build, tsc, vitest).
- [ ] Lieferung 3: `category`/`kind` aus Export/Restore-Pfad und Live-Eintrag entfernen,
      Export-Schema-Marker hochziehen, Altdaten-Toleranz im Restore prüfen. Danach die alten
      Spalten in der DB löschen (Migrationsschritte 5–6).

---

## 9. Offene Punkte

- Genaue Versionsnummer (Abschnitt 7).
- Reihenfolge relativ zum Workouts-Vorhaben (unabhängig; kann davor oder danach laufen).
