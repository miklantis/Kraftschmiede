# Konzept: Workouts editierbar & Journey-Zuordnung (Version 1.3)

Grundlegende Anpassung im laufenden Betrieb. Ziel: Workouts (im Code „Vorlagen“ /
`templates`) bearbeitbar machen und die bisher fehlende Verbindung **Workout ↔ Journey**
einführen. Der globale Look (Klar-Theme) bleibt; der Coach-Rechenkern bleibt.

Verweise: Ist-Zustand in [`Architektur.md`](./Architektur.md), „eine aktive Journey“ in
[`adr/0004-eine-aktive-journey.md`](./adr/0004-eine-aktive-journey.md),
Offline-Mutationsreihenfolge in
[`adr/0009-mutationsreihenfolge.md`](./adr/0009-mutationsreihenfolge.md).

---

## 1. Ausgangslage (geprüft im Code)

- **Übungen** bilden einen Katalog und sind einzeln editierbar. Jede Übung trägt Typen:
  Kategorie (`barbell` / `core` / `bodyweight`) und Profil (`strength` / `core` /
  `bodyweight`).
- **Workouts** liegen als `templates` samt Zuordnung Übung→Workout (`template_exercises`
  mit Rolle `primary` / `secondary` / `core` und Reihenfolge) in der Datenbank – stammen
  aus dem einmaligen V1-Import, **haben aber keine Oberfläche**: nicht ansehbar, nicht
  anlegbar, nicht änderbar. Sichtbar nur als Empfehlungs-Karten auf der Trainingsseite.
- **Journey** trägt heute ausschließlich die Periodisierung (Phasen). Eine Verbindung zu
  Workouts existiert nicht. Die Trainingsseite bewertet über den Coach **alle** Workouts;
  die aktive Journey liefert nur Phasen-Fokus und Wochen-Fortschritt.
- **Skills** sind bereits vollständig getrennt (eigene Progression, keine Journey-Kopplung).
- Beim Start einer Einheit werden die Übungen in `session_exercises` kopiert; spätere
  Workout-Änderungen verändern den Verlauf daher **nicht rückwirkend**.

Es fehlen genau zwei Bausteine: Workouts editierbar machen und Workout ↔ Journey verbinden.

---

## 2. Zielbild

- Eine **globale Workout-Bibliothek**, voll bearbeitbar (neue Workouts-Seite + Editor).
- Eine **optionale Zuordnung** von Workouts zur aktiven Journey. Ein Workout muss keiner
  Journey zugewiesen sein; es bleibt in jedem Fall frei startbar.
- Der **Charakter** eines Workouts wird automatisch aus seinen Übungen abgeleitet – kein
  manueller Typ.
- Die **Journey-Periodisierung steuert nur die gewichtsbasierten Hauptübungen** eines
  Workouts. Assistenz-, Core- und Körpergewichtsübungen laufen wie bisher „mitgeführt“
  (keine Progression).
- Der **Coach empfiehlt immer** ein Workout: bei aktiver Journey aus deren zugewiesenen
  Workouts, sonst aus der ganzen Bibliothek.

---

## 3. Ableitung des Charakters (Regel)

- Ein Workout ist **journey-fähig (kraftbetont)**, wenn es mindestens eine **Hauptübung**
  (Rolle `primary`) enthält, die **mit Gewicht** arbeitet (Kategorie `barbell` bzw. Profil
  `strength`).
- Nur diese gewichtsbasierten Hauptübungen werden von der Periodisierung der aktiven Phase
  gesteuert (Repband, Satzzahl, Progression). Der Rest kommt unverändert mit.
- Ein Workout ohne solche Übung (z. B. reines Körpergewicht/Core) ist **nicht journey-fähig**:
  Es wird bei der Zuordnung nicht angeboten, bleibt aber frei startbar.

---

## 4. Datenmodell

- **`templates`**: bleibt, ergänzt um ein `active`-Feld (Soft-Archiv statt hartem Löschen,
  wie bei Übungen), damit der Verlauf und bestehende Sessions heil bleiben. Vom Nutzer
  angelegte Workouts haben `key = null`.
- **`template_exercises`**: bleibt (Rolle `primary`/`secondary`/`core`, Position). Voll
  editierbar.
- **NEU `journey_workouts`**: `user_id`, `journey_id` (FK), `template_id` (FK), `position`.
  RLS wie überall (vier Policies auf `auth.uid() = user_id`),
  `unique(user_id, journey_id, template_id)`. Verknüpft Workouts mit der aktiven Journey.
  Beim Entfernen einer Journey oder eines Workouts wird die Zuordnung mit aufgeräumt
  (ON DELETE CASCADE).
- **Migration**: neue Datei `supabase/migrations/0002_journey_workouts.sql` (Tabelle +
  `templates.active`).
- **`sessions.template_id`** bleibt gültig; da Übungen beim Start kopiert werden und
  Workouts nur archiviert statt gelöscht werden, bleibt der Verlauf stabil.

---

## 5. Oberfläche

### 5.1 Workouts-Seite (neu)
Liste der aktiven Workouts, Aufbau wie die Übungen-Seite (`List` / `ListRow`). Pro Workout:
Name, enthaltene Übungen in Kurzform, ein abgeleiteter Hinweis „journey-fähig“. Aktionen:
neues Workout anlegen, Workout öffnen/bearbeiten, archivieren. Archivierte separat/ausblendbar.

### 5.2 Workout-Editor (neu)
Name; geordnete Übungsliste mit: Übung hinzufügen (Auswähler über den Katalog), Rolle setzen
(Haupt/Assistenz/Core), Reihenfolge ändern, entfernen. Die Ableitung „journey-fähig ja/nein“
ist live sichtbar, während man Übungen setzt.

### 5.3 Journey-Seite (erweitert)
Abschnitt „Workouts in dieser Journey“: Aus den journey-fähigen Workouts an-/abwählen,
Reihenfolge optional. Nur bei aktiver Journey sichtbar.

### 5.4 Trainingsseite (angepasst)
Empfehlung (Hero + weitere) aus den zugewiesenen Workouts der aktiven Journey. Ohne Journey
oder ohne Zuordnung: Empfehlung aus der ganzen Bibliothek (Rückfall – nichts bricht). Der
Zugang zu allen Workouts (freies Starten) bleibt über die Bibliothek erhalten.

---

## 6. Komponentenschnitt (Wiederverwendbarkeit)

- **ExercisePicker** (neu): Auswahl einer Übung aus dem Katalog. Auch anderswo nutzbar.
- **WorkoutEditor**: nutzt `List`, `Sheet`/`Modal`, Formular-Primitives und den ExercisePicker.
- **Zuordnungs-Umschalter** auf der Journey-Seite: `List` mit Toggle.
- **Datenzugriff in Hooks gekapselt**: `useTemplateActions` (CRUD `templates` +
  `template_exercises`), `useJourneyWorkouts` samt Aktionen, `useWorkoutsView`,
  `useWorkoutEditor`. Offline-fest über pausierbare Mutationen; die
  Registrierungsreihenfolge aus ADR-0009 beachten.
- **Coach/Engine**: `rankWorkouts` nimmt bereits heute eine Workout-Liste entgegen. Wir
  übergeben die zugewiesene Teilmenge statt aller Workouts – **kein Umbau des Rechenkerns**.

---

## 7. Lieferungen (kleine, einzeln testbare Schritte), ab 1.3.0

1. Migration `journey_workouts` + `templates.active` + Schema + Lese-Hooks. Kaum/kein UI.
2. Workouts-Seite (lesend): Bibliothek sichtbar, Workout ansehen.
3. Workout-Editor: anlegen/bearbeiten/archivieren inkl. Übungen, Rollen, Reihenfolge –
   offline-fest.
4. Journey-Zuordnung der aktiven Journey.
5. Trainingsempfehlung auf die Zuordnung einschränken (mit Rückfall auf die Bibliothek).

Jede Lieferung schreibt `public/changelog.json` und `PLAN.md` fort; `docs/Designsystem.md`
bei neuen Primitives.

---

## 8. Bewusst unberührt

- Skills (getrennt, keine Journey-Kopplung).
- Journey-Vorlagen (`journey_templates`) bleiben reine Periodisierungs-Muster; sie tragen
  keine Workout-Daten.
- Klar-Theme / globaler Look.
- Coach-Rechenkern; nur die zu bewertende Workout-Menge ändert sich.

---

## 9. Offene Detailpunkte (im Bau zu klären)

- Übernahme der Zuordnung beim Journey-Wechsel. Vorschlag: die bisherige Auswahl beim Start
  einer neuen Journey zum Übernehmen anbieten.
- Navigationsplatz der Workouts-Seite: eigener Hauptpunkt (dann sechs Einträge, Reihenfolge
  Training · Journey · Workouts · Übungen · Körper · Skills) oder als Unterbereich bei den
  Übungen.
