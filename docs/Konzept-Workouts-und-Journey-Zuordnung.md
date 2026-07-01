# Konzept: Workouts editierbar & Journey-Zuordnung (Version 1.3)

Grundlegende Anpassung im laufenden Betrieb. Ziel: Workouts (im Code „Vorlagen“ /
`templates`) bearbeitbar machen und die bisher fehlende Verbindung **Workout ↔ Journey**
einführen. Der globale Look (Klar-Theme) bleibt; der Coach-Rechenkern bleibt.

Dieses Konzept ist auf den in der Konzeptphase besprochenen Stand fortgeschrieben; die
tragenden Entscheidungen stehen jeweils an Ort und Stelle. Der Versionssprung auf **1.3.0**
für die erste Lieferung ist freigegeben; die weiteren Lieferungen laufen als 1.3.1, 1.3.2 …

Verweise: Ist-Zustand in [`Architektur.md`](./Architektur.md), „eine aktive Journey“ in
[`adr/0004-eine-aktive-journey.md`](./adr/0004-eine-aktive-journey.md),
Offline-Mutationsreihenfolge in
[`adr/0009-mutationsreihenfolge.md`](./adr/0009-mutationsreihenfolge.md).

---

## 1. Ausgangslage (geprüft im Code)

- **Übungen** bilden einen Katalog. Sie sind **nicht frei editierbar**: anpassbar sind
  genau drei Felder pro Übung (Arbeitsgewicht, Ziel-Score und – wenn nicht durch die aktive
  Phase gesperrt – das Repband). **Anlegen, Umbenennen oder ein Wechsel von Profil, Gerät oder Art
  ist nicht vorgesehen; das bleibt in diesem Vorhaben unverändert.**
- Jede Übung trägt mehrere Typ-Felder. Der im Coach entscheidende Schalter ist das
  **Profil** (`strength` / `core` / `bodyweight`): `strength` wird progressiv gerechnet
  (Doppelprogression, Phasen-Repband), `core`/`bodyweight` werden ohne Progression
  „mitgeführt“ (`coreCarry`). Die weiteren Typ-Felder `equipment`
  (`barbell`/`plate`/`bar`/`band`/`bodyweight`) und `tier` (`main`/`accessory`) sind hier
  **bewusst nicht relevant**: `equipment === "barbell"` steuert nur die Langhantel-Mechanik
  (Stange/Scheiben/Aufwärmrampe), `tier` trennt Haupt- von Assistenzübung (Gruppierung,
  Kraftphasen-Bonus). Für Journey-Fähigkeit und Progression entscheidet allein das Profil.
  (Die früher redundanten Felder `category`/`kind` wurden inzwischen zu `equipment`/`tier`
  aufgeräumt – siehe `archive/Konzept-Typfelder-Aufraeumen.md`.)
- **Workouts** liegen als `templates` samt Zuordnung Übung→Workout (`template_exercises`
  mit Rolle `primary` / `secondary` / `core` und Reihenfolge) in der Datenbank – stammen
  aus dem einmaligen V1-Import, **haben aber keine Oberfläche**: nicht ansehbar, nicht
  anlegbar, nicht änderbar. Sichtbar nur als Empfehlungs-Karten auf der Trainingsseite.
- **Die Rolle `template_exercises.role` wird heute nirgends gelesen.** Der Lese-Hook
  `useTemplates` selektiert nur `exercise_id` und `position`. Die Rolle steuert derzeit
  nichts – weder Progression noch Anzeige.
- **Journey** trägt heute ausschließlich die Periodisierung (Phasen). Eine Verbindung zu
  Workouts existiert nicht. Die Trainingsseite bewertet über den Coach **alle** Workouts;
  die aktive Journey liefert nur Phasen-Fokus und Wochen-Fortschritt.
- **Skills** sind bereits vollständig getrennt (eigene Progression, keine Journey-Kopplung).
- Beim Start einer Einheit werden die Übungen in `session_exercises` kopiert; spätere
  Workout-Änderungen verändern den Verlauf daher **nicht rückwirkend**.
- IDs werden bereits **client-seitig** vergeben (`crypto.randomUUID()`); Eltern- und
  Kind-Datensätze werden mit fertigen IDs in einer gemeinsamen Mutation angelegt (Muster aus
  dem Beenden einer Einheit). Damit lässt sich ein neues Workout offline sicher anlegen.

Es fehlen genau zwei Bausteine: Workouts editierbar machen und Workout ↔ Journey verbinden.

---

## 2. Zielbild

- Eine **globale Workout-Bibliothek**, voll bearbeitbar (neue Workouts-Seite + Editor).
- Eine **optionale Zuordnung** von Workouts zur aktiven Journey. Ein Workout muss keiner
  Journey zugewiesen sein; es bleibt in jedem Fall frei startbar.
- Der **Charakter** eines Workouts wird automatisch aus seinen Übungen abgeleitet – kein
  manueller Typ, keine gespeicherte Charakter-Spalte.
- Die **Periodisierung steuert wie bisher profilbasiert**: alle Übungen mit Profil
  `strength` werden progressiv gerechnet, `core`/`bodyweight` werden mitgeführt. Das gilt
  unabhängig von der Rolle der Übung im Workout. Der Coach-Rechenkern bleibt unangetastet.
- Der **Coach empfiehlt immer** ein Workout: bei aktiver Journey aus deren zugewiesenen
  Workouts, sonst aus der ganzen Bibliothek.

---

## 3. Ableitung des Charakters (Regel)

- Ein Workout ist **journey-fähig**, wenn es **mindestens eine Übung mit Profil `strength`**
  enthält – unabhängig von deren Rolle (`primary`/`secondary`/`core`).
- „Arbeitet mit Gewicht“ meint Gewicht generell (Kurzhantel, Kettlebell, Gerät, Langhantel).
  Das konkrete Equipment ist nur Hilfsmittel/Inventar und **nicht** das Kriterium; maßgeblich
  ist allein das **Profil `strength`**. So deckt sich die Ableitung exakt mit dem, was der
  Coach tatsächlich periodisiert, und trägt auch künftige Nicht-Langhantel-Gewichtsübungen.
- Ein Workout ohne solche Übung (z. B. reines Körpergewicht/Core) ist **nicht journey-fähig**:
  Es wird bei der Zuordnung nicht angeboten, bleibt aber frei startbar.
- Die Journey-Fähigkeit ist rein **abgeleitet** (kein gespeichertes Feld) und wird im Editor
  live angezeigt, während man Übungen setzt.

---

## 4. Datenmodell

- **`templates`**: bleibt, ergänzt um ein `active`-Feld (Soft-Archiv statt hartem Löschen,
  wie bei Übungen; Default `true`, damit die bestehenden V1-Workouts aktiv bleiben), damit
  der Verlauf und bestehende Sessions heil bleiben. Vom Nutzer angelegte Workouts haben
  `key = null`. **Neuer Constraint `unique(user_id, name)`**: Workout-Namen sind pro Nutzer
  eindeutig – gegen **alle** Workouts inklusive archivierter (verhindert Namenskonflikte beim
  Reaktivieren). Dieser Namens-Constraint gilt vorerst nur für Workouts, nicht für Übungen.
- **`template_exercises`**: bleibt (Rolle `primary`/`secondary`/`core`, Position). Voll
  editierbar. Die Rolle dient künftig als **reines Ordnungs-/Anzeigeraster**
  (Haupt → Assistenz → Core) in Editor, Workout-Ansicht und aufgebauter Einheit – ohne
  Einfluss auf Progression oder Journey-Fähigkeit. Der Lese-Hook `useTemplates` muss `role`
  dafür künftig mitlesen (heute nicht der Fall).
- **NEU `journey_workouts`**: `user_id`, `journey_id` (FK), `template_id` (FK). RLS wie
  überall (vier Policies auf `auth.uid() = user_id`), `unique(user_id, journey_id, template_id)`.
  Verknüpft Workouts mit der aktiven Journey. **Bewusst ohne `position`**: die Empfehlung
  ordnet der Coach nach Eignung; eine parallele manuelle Reihenfolge würde entweder nichts
  steuern oder den Coach untergraben. Die Zuweisung ist eine reine Ja/Nein-Menge. Beim
  Entfernen einer Journey oder eines Workouts wird die Zuordnung mit aufgeräumt
  (ON DELETE CASCADE).
- **Migration**: neue Datei `supabase/migrations/0002_journey_workouts.sql` (Tabelle
  `journey_workouts` + `templates.active` + `unique(user_id, name)` auf `templates`).
- **`sessions.template_id`** bleibt gültig; da Übungen beim Start kopiert werden und
  Workouts nur archiviert statt gelöscht werden, bleibt der Verlauf stabil.

---

## 5. Oberfläche

### 5.1 Workouts-Seite (neu)
Liste der aktiven Workouts, Aufbau wie die Übungen-Seite (`List` / `ListRow`). Pro Workout:
Name, enthaltene Übungen in Kurzform, ein abgeleiteter Hinweis „journey-fähig“. Aktionen:
neues Workout anlegen, Workout öffnen/bearbeiten, archivieren. Archivierte werden – wie bei
den Übungen – separat/ausblendbar geführt und lassen sich **reaktivieren** (Reaktivieren
bringt eine zuvor bestehende Journey-Zuordnung verlustfrei zurück, siehe 5.3).

Die Seite bekommt einen **eigenen Hauptnavigations-Punkt** (`lib/nav.ts` ist die einzige
Quelle; Sidebar und Bottom-Nav ziehen automatisch nach; die Bottom-Nav zeigt nur Icons und
verteilt gleichmäßig, ein sechster Eintrag passt). Reihenfolge dann: Training · Journey ·
Workouts · Übungen · Körper · Skills (sechs Einträge).

### 5.2 Workout-Editor (neu)
Name; geordnete Übungsliste mit: Übung hinzufügen (Auswähler über den Katalog), Rolle setzen
(Haupt/Assistenz/Core – nur Ordnung/Anzeige), Reihenfolge ändern, entfernen. Die Ableitung
„journey-fähig ja/nein“ ist live sichtbar, während man Übungen setzt.

- **Gültigkeit:** Ein Workout ist speicherbar, wenn es einen **nicht leeren, pro Nutzer
  eindeutigen Namen** und **mindestens eine Übung** hat. Der Editor meldet einen Namenskonflikt
  vorab verständlich; die harte Absicherung ist der DB-Constraint (auch offline nachgereicht).
- **Rollen-Vorbelegung:** die erste hinzugefügte Übung als `primary`, jede weitere als
  `secondary`, beides frei änderbar.
- **Speichern:** bewusster Speichern-Schritt (Formular-Charakter). Bis dahin ist nichts
  geschrieben; „Zurück ohne Speichern“ verwirft. Ein Speichervorgang schreibt Workout und
  Übungsliste zusammen (client-seitige IDs, eine gemeinsame Mutation) – robust offline.
- **Verlust der Journey-Fähigkeit durch Editieren:** Entfernt man die letzte
  `strength`-Übung eines zugewiesenen Workouts, bleibt die Zuordnungszeile bestehen, das
  Workout fällt aber automatisch aus der Journey-Empfehlung (Lesefilter). Ein dezenter Hinweis
  im Editor macht das sichtbar („nicht mehr journey-fähig – aus der Journey-Empfehlung
  ausgenommen, bleibt frei startbar“). Fügt man wieder eine `strength`-Übung hinzu, ist es
  sofort zurück. Kein stummes Löschen, keine Editier-Blockade.

### 5.3 Journey-Seite (erweitert)
Abschnitt „Workouts in dieser Journey“: Aus den journey-fähigen Workouts an-/abwählen. Nur
bei aktiver Journey sichtbar. Die Zuweisung erfolgt über **An/Aus-Schalter**, die je Schalter
sofort speichern (natürlicher Toggle-Fall, offline unkritisch). Die zugewiesenen Workouts
werden nach `templates.position` gelistet (keine eigene Reihenfolge, siehe §4).

- **Übernahme beim Journey-Wechsel:** Beim Start einer neuen Journey wird **einmalig**
  angeboten, die Zuweisung der **unmittelbar zuvor aktiven** Journey zu übernehmen (Ja/Nein).
  Bei „Ja“ werden nur die weiterhin zuweisbaren (journey-fähigen, aktiven) Workouts kopiert;
  bei „Nein“ startet die neue Journey leer (dann greift der Bibliotheks-Rückfall aus 5.4).

### 5.4 Trainingsseite (angepasst)
Empfehlung (Hero + weitere) aus den zugewiesenen Workouts der aktiven Journey. Zwei
Rückfall-Auslöser, bewusst getrennt:

- **Nichts zugewiesen** (keine aktive Journey oder aktive Journey ohne Zuweisung):
  Empfehlung aus der ganzen Bibliothek, damit der Coach immer empfiehlt und eine frische
  Journey sofort brauchbar ist. Greift der Rückfall wegen leerer Zuweisung, erscheint ein
  dezenter, transparenter Hinweis („Keine Workouts dieser Journey zugewiesen – Empfehlung aus
  der ganzen Bibliothek“).
- **Alles ausgeschlossen** (Journey hat Zuweisungen, aber alle sind heute vom Coach
  ausgeschlossen, z. B. Kater/Frequenz): **kein** Rückfall auf die Bibliothek. Das
  bestplatzierte zugewiesene Workout wird mit seinem Ausschlussgrund gezeigt. Ausschluss ist
  eine Tagesaussage des Coachs, kein Grund, die Journey zu verlassen.

Der Zugang zu allen Workouts (freies Starten) bleibt über die Bibliothek erhalten.

---

## 6. Komponentenschnitt (Wiederverwendbarkeit)

- **ExercisePicker** (neu): Auswahl einer Übung aus dem Katalog. Auch anderswo nutzbar.
- **WorkoutEditor**: nutzt `List`, `Sheet`/`Modal`, Formular-Primitives und den ExercisePicker.
- **Zuordnungs-Umschalter** auf der Journey-Seite: `List` mit Toggle.
- **Datenzugriff in Hooks gekapselt**: `useTemplateActions` (CRUD `templates` +
  `template_exercises`, Speichern als gemeinsame Mutation mit client-seitigen IDs),
  `useJourneyWorkouts` samt Aktionen (Toggle je Zeile, Übernahme beim Journey-Wechsel),
  `useWorkoutsView`, `useWorkoutEditor`. `useTemplates` wird um das Feld `role` erweitert.
  Offline-fest über pausierbare Mutationen; die Registrierungsreihenfolge aus ADR-0009
  beachten (Workout-Aktionen vor Journey-Zuordnungs-Aktionen, damit ein offline neu angelegtes
  Workout beim Resume vor seiner Zuordnung landet).
- **Coach/Engine**: `rankWorkouts` nimmt bereits heute eine Workout-Liste entgegen. Wir
  übergeben die zugewiesene Teilmenge statt aller Workouts – **kein Umbau des Rechenkerns**.
  Der Lesefilter (nur aktive und journey-fähige Zuweisungen) sitzt im Daten-Hook, nicht im
  Rechenkern.

---

## 7. Lieferungen (kleine, einzeln testbare Schritte)

Versionsschema: Lieferung 1 ist **1.3.0** (mittlere Stelle, freigegeben), die weiteren
Lieferungen laufen als 1.3.1, 1.3.2 … (Patch-Stelle). Lieferung 1–4 fügen Fähigkeiten hinzu,
ohne bestehendes Verhalten zu ändern (die Empfehlung rankt bis dahin weiter alle Workouts);
erst Lieferung 5 schaltet die Einschränkung auf die Zuweisung scharf.

1. Migration `journey_workouts` + `templates.active` + `unique(user_id, name)` + Schema +
   Lese-Hooks (inkl. `role` in `useTemplates`). Kaum/kein UI. — **1.3.0**
2. Workouts-Seite (lesend): Bibliothek sichtbar, Workout ansehen; neuer Nav-Punkt.
3. Workout-Editor: anlegen/bearbeiten/archivieren/reaktivieren inkl. Übungen, Rollen,
   Reihenfolge, Gültigkeitsregeln – offline-fest.
4. Journey-Zuordnung der aktiven Journey (Toggles, Übernahme beim Journey-Wechsel).
5. Trainingsempfehlung auf die Zuordnung einschränken (mit den beiden Rückfall-Regeln aus 5.4).

Jede Lieferung schreibt `public/changelog.json` und `PLAN.md` fort; `docs/Designsystem.md`
bei neuen Primitives (u. a. ExercisePicker).

---

## 8. Bewusst unberührt

- Skills (getrennt, keine Journey-Kopplung).
- Journey-Vorlagen (`journey_templates`) bleiben reine Periodisierungs-Muster; sie tragen
  keine Workout-Daten.
- Klar-Theme / globaler Look.
- Coach-Rechenkern; nur die zu bewertende Workout-Menge ändert sich (die profilbasierte
  Progression bleibt exakt wie heute).

---

## 9. Geklärte Detailpunkte

- **Übernahme der Zuordnung beim Journey-Wechsel:** einmaliges Angebot, die Zuweisung der
  unmittelbar zuvor aktiven Journey zu übernehmen (siehe 5.3).
- **Workouts-Seite als eigener Hauptnavigations-Punkt** (siehe 5.1).
- **Steuerung profilbasiert, Rolle nur Ordnung** (siehe §2/§3, 5.2).
- **Journey-Fähigkeit = mindestens eine `strength`-Übung**, Equipment egal (siehe §3).
- **Namens-Eindeutigkeit** pro Nutzer gegen alle Workouts inkl. Archiv (siehe §4).
- **`journey_workouts` ohne `position`** (siehe §4).
- **Archiv/Journey-Fähigkeit:** Zeile behalten, beim Lesen filtern, reversibel (siehe 5.2/5.3).
- **Rückfall-Regeln** der Trainingsseite (siehe 5.4).
