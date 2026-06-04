# Kraftschmiede – Skills-System: Konzept v2

Neufassung, nachgeschärft. Ersetzt die erste Version (veraltete Monolith-Annahme,
Schema 0.13, mehrere Logiklücken). Gegen den echten Code geprüft (app.js, data.js,
engine.js, live.js, Stand Schema 0.14).

Nachschärfung gegenüber dem ersten v2-Entwurf: Die Set-Metrik (Wiederholungen vs.
Zeit) sitzt jetzt auf der **Übung**, nicht auf der Phase. Dadurch sind gemischte
Phasen (z. B. Dead Hang nach Zeit + Scapular Pull-Up nach Reps) sauber abbildbar,
ebenso reine Zeit-Skills wie Plank. Die zwei Set-Row-Varianten sind als eigener
UI-Abschnitt ausgearbeitet (Abschnitt 7).

---

## Überblick: Worum es geht

Neben dem gewichtsbasierten Langhanteltraining (Journeys) soll Kraftschmiede den
gezielten Aufbau von **Bewegungsfertigkeiten** unterstützen – „Skills". Ein Skill ist
eine Körpergewichts- oder Gymnastics-Übung, die man nicht über mehr Gewicht steigert,
sondern über schwierigere Varianten: der strikte Klimmzug, der Liegestütz, der Plank,
später Pistol Squat, Dip oder Handstand.

Jeder Skill ist in **Phasen** gegliedert, die vom machbaren Einstieg bis zur
gemeisterten Bewegung führen. Beim Klimmzug etwa: Dead Hang und Skapula-Kontrolle →
Klimmzug am Band (stark, mittel, leicht) → Negativwiederholungen → freier Klimmzug.
Der Nutzer aktiviert einen Skill, trainiert die aktuelle Phase und steigt auf, sobald
er deren Ziel über mehrere Sessions stabil erreicht. Vorbild für die Mechanik ist die
Funktion „Skill-Verbesserungen" in Freeletics.

Die Skill-Arbeit läuft **parallel und entkoppelt** zur Journey: Sie hat einen eigenen
Fortschritt, der von Deload, Pause oder Journey-Wechsel unberührt bleibt. Praktisch
erscheint der **Skill-Block am Ende jedes Journey-Workouts**, nach dem letzten
Hauptsatz – als kurze Karte mit den Übungen der aktuellen Phase.

Leitende Designentscheidungen (im Rest des Dokuments technisch ausgeführt):

- **Maximal ein aktiver Skill** gleichzeitig. Aktiviert man einen neuen, wird der alte
  deaktiviert; dessen Fortschritt bleibt erhalten.
- **Phasen mit Equipment-Voraussetzung.** Manche Phasen brauchen Gerät (Stange, Band).
  Fehlt es, wird der Block nicht angeboten – das gilt als neutral ausgelassen, **nicht**
  als Fehlversuch. **Kein Rückschritt durchs Auslassen.**
- **Fortschritt strikt von der Journey entkoppelt** und umgekehrt.
- **Manuelle Kontrolle:** der Nutzer kann jederzeit eine Phase zurückgehen oder den
  Skill ganz zurücksetzen. Kein automatischer Rückstufungs-Mechanismus.
- **Definition ist Code, Fortschritt ist Zustand** – die zentrale Architektur­regel,
  siehe Abschnitt 2.

---

## 1. Ist-Architektur (verbindlich)

Die App ist mehrteilig. Alle Module außer der Engine teilen sich den Namespace
`window.KS`; die Engine lebt eigenständig unter `window.FSE`.

| Datei | Rolle | Relevant fürs Skills-System |
|---|---|---|
| `app.js` | Schema-Konstante, geteilte Helfer, `db()`, Views, Settings, Journey-Logik | Inventar-UI, Skill-Verwaltungs-UI |
| `data.js` | `seed()`, `migrate(db)`, statische `JOURNEY_TEMPLATES`, Domänen-Helfer | **statische `SKILLS`**, `defaultEquipment()`, Migration |
| `engine.js` | reine Rechenfunktionen (`window.FSE`), keine DB-Kenntnis | `skillAdvice`, `skillSessionResult`, `skillSetMet` |
| `live.js` | Live-Session (`buildLive`, `finishSession`), Timer, Audio | Skill-Block im Workout, Fortschritt fortschreiben |
| `charts.js` | Diagramme | Skill-Langzeit-Chart |
| `supabase.js` | Cloud-Sync (gesamter Zustand als jsonb) | zieht `skillProgress` automatisch mit |

Fakten, die das alte Konzept falsch hatte:

- Schema-Konstante ist `"0.14"` (nicht 0.13). Der localStorage-Key bleibt bewusst
  `fs_db_v013`; die Versionierung läuft über `db.schemaVersion` und die feldweise
  Migration, nicht über den Key.
- Es gibt **kein** `DB.bars`. Inventar liegt unter `DB.inventory.bars` und
  `DB.inventory.plates`.
- `seed()` und `migrate(db)` stehen in **data.js**, nicht app.js.
- `finishSession()` steht in **live.js** (`KS.finishSession`), nicht app.js.
- `migrate(db)` nimmt den Store als Argument, ist feldweise non-destruktiv und nutzt
  `db.migrations.<flag>` nur für einmalige *struktur­ändernde* Migrationen.

---

## 2. Grundprinzip: Definition vs. Fortschritt strikt trennen

**Skill-Definitionen sind Code, kein Nutzerzustand.** Sie gehören als statische
Konstante `SKILLS` in data.js – genau wie `JOURNEY_TEMPLATES`. Sie werden **nicht**
in den DB geschrieben und **nicht** synchronisiert.

Begründung (aus dem bestehenden Muster abgeleitet):
- `exercises` und `templates` werden geseedet *und* persistiert. Jede spätere
  Korrektur daran braucht eine eigene `db.migrations.<flag>`-Migration (siehe
  `pulloverSlots`, `templateItems`, `exerciseKind`). Aufwand, den man für reine
  Definitionsdaten nicht will.
- `JOURNEY_TEMPLATES` zeigt den sauberen Weg: statische Vorlage im Code, nur die
  *aktivierte* Instanz landet im DB. Korrekturen greifen sofort, ohne Migration.
- Persistierte Definitionen würden bei jedem Sync als großer Block über Supabase
  geschoben.

**Im DB landet nur der dynamische Fortschritt:** `DB.skillProgress` und das
Skill-Equipment-Inventar `DB.inventory.equipment`.

---

## 3. Datenmodell

### 3.1 `SKILLS` – statische Definition (data.js, Konstante)

Aufbau analog zu `JOURNEY_TEMPLATES`, mit kompakten Helfern (`skill()`,
`skillPhase()`, `skEx()`), parallel zu `phase()`/`ex()`/`tpl()`.

**Die Metrik sitzt auf der Übung, nicht auf der Phase.** Jede Skill-Übung trägt
`metric: "reps" | "duration"` und ein eigenes `target`. Eine Phase kann darum
Übungen mit unterschiedlichen Metriken bündeln. Der Phasenaufstieg (`consecutiveSessions`)
bleibt phasenweit.

```js
// Skill-Uebung: metric + eigenes Ziel pro Satz
// { name, metric: "reps"|"duration", sets, target, tempo? }
//   metric "reps":     target = Ziel-Wiederholungen pro Satz
//   metric "duration": target = Ziel-Sekunden pro Satz

var SKILLS = [
  {
    id: "strict_pullup",
    name: "Strict Pull-Up",
    category: "gymnastics",          // gymnastics | strength | conditioning
    phases: [
      {
        index: 0,
        label: "Grundspannung",
        description: "Dead Hang und Skapula-Kontrolle aufbauen.",
        equipment: ["pullup-bar"],   // Dead Hang braucht eine Stange (v1 hatte [] – falsch)
        consecutiveSessions: 2,
        exercises: [
          { name: "Dead Hang",        metric: "duration", sets: 3, target: 30 },
          { name: "Scapular Pull-Up", metric: "reps",     sets: 3, target: 5  }
        ]
        // gemischte Phase: Zeit + Wiederholungen nebeneinander
      },
      {
        index: 1, label: "Band stark", consecutiveSessions: 2,
        equipment: ["pullup-bar", "band-heavy"],
        exercises: [{ name: "Band Pull-Up (stark)", metric: "reps", sets: 3, target: 6 }]
      },
      {
        index: 2, label: "Band mittel", consecutiveSessions: 2,
        equipment: ["pullup-bar", "band-medium"],
        exercises: [{ name: "Band Pull-Up (mittel)", metric: "reps", sets: 3, target: 6 }]
      },
      {
        index: 3, label: "Band leicht", consecutiveSessions: 2,
        equipment: ["pullup-bar", "band-light"],
        exercises: [{ name: "Band Pull-Up (leicht)", metric: "reps", sets: 3, target: 8 }]
      },
      {
        index: 4, label: "Negativs",
        description: "Sauber und langsam ablassen, Spannung halten.",
        consecutiveSessions: 2, equipment: ["pullup-bar"],
        exercises: [{ name: "Negative Pull-Up", metric: "reps", sets: 3, target: 5, tempo: "5 Sek. ablassen" }]
      },
      {
        index: 5, label: "Freier Klimmzug", consecutiveSessions: 2,
        equipment: ["pullup-bar"],
        // Meisterung: 3 saubere Saetze à 8. Wert frei waehlbar.
        exercises: [{ name: "Strict Pull-Up", metric: "reps", sets: 3, target: 8 }]
      }
    ]
  },

  {
    id: "pushup",
    name: "Pushup",
    category: "gymnastics",
    phases: [
      { index: 0, label: "Knie-Liegestütze", consecutiveSessions: 2, equipment: [],
        exercises: [{ name: "Knee Push-Up",  metric: "reps", sets: 3, target: 10 }] },
      { index: 1, label: "Hände erhöht", consecutiveSessions: 2, equipment: [],
        exercises: [{ name: "Incline Push-Up", metric: "reps", sets: 3, target: 10 }] },
      { index: 2, label: "Volle Liegestütze", consecutiveSessions: 2, equipment: [],
        exercises: [{ name: "Full Push-Up", metric: "reps", sets: 3, target: 8 }] },
      { index: 3, label: "Tempo / eng", consecutiveSessions: 2, equipment: [],
        exercises: [{ name: "Tempo Push-Up", metric: "reps", sets: 3, target: 6, tempo: "3 Sek. ablassen" }] },
      { index: 4, label: "Archer", consecutiveSessions: 2, equipment: [],
        exercises: [{ name: "Archer Push-Up", metric: "reps", sets: 3, target: 5 }] }
    ]
  },

  {
    id: "plank",
    name: "Plank",
    category: "conditioning",
    // Reiner Zeit-Skill: jede Uebung metric "duration", kein Equipment.
    phases: [
      { index: 0, label: "Grundstabilität", consecutiveSessions: 2, equipment: [],
        exercises: [{ name: "Knee Plank", metric: "duration", sets: 3, target: 30 }] },
      { index: 1, label: "Standard-Plank", consecutiveSessions: 2, equipment: [],
        exercises: [{ name: "Forearm Plank", metric: "duration", sets: 3, target: 45 }] },
      { index: 2, label: "Langer Plank", consecutiveSessions: 2, equipment: [],
        exercises: [{ name: "Forearm Plank", metric: "duration", sets: 3, target: 60 }] },
      { index: 3, label: "RKC-Plank", consecutiveSessions: 2, equipment: [],
        // RKC: maximale Ganzkoerperspannung, bewusst kurz und hart.
        exercises: [{ name: "RKC Plank", metric: "duration", sets: 3, target: 20 }] }
    ]
  }
  // weitere Skills folgen (Pistol Squat, Dip, Handstand, Turkish Get-Up ...)
];
```

Die drei Beispiele decken die Fälle ab:
- **Plank** – reiner Zeit-Skill, kein Equipment (nur `duration`).
- **Pushup** – reiner Wiederholungs-Skill, kein Equipment (nur `reps`).
- **Strict Pull-Up** – gemischte Phase (`duration` + `reps`) und Equipment-Abhängigkeit
  (Stange, Bänder).

Hinweise:
- **`equipment` ist immer ein Array** von Equipment-IDs. Weicht bewusst von der
  Übungseigenschaft `equipment: "barbell"` (String) ab – eine Skill-Phase kann mehrere
  Geräte fordern (Stange *und* Band). Leeres Array = Körpergewicht, überall verfügbar.
- `consecutiveSessions` steht jetzt direkt auf der Phase (in v1 in `criteria`
  verschachtelt). Das alte phasenweite `criteria.type` entfällt komplett – die Metrik
  steckt in der Übung.

### 3.2 `DB.inventory.equipment` – Skill-Equipment (persistiert)

Liegt **unter `inventory`**, parallel zu `bars` und `plates` – nicht als Top-Level
`DB.equipment` (das hätte die Inventar-Struktur gebrochen).

```js
// Default aus data.js, defaultEquipment()
DB.inventory.equipment = [
  { id: "band-heavy",  label: "Band stark",     active: true  },
  { id: "band-medium", label: "Band mittel",    active: true  },
  { id: "band-light",  label: "Band leicht",    active: false },
  { id: "pullup-bar",  label: "Klimmzugstange", active: true  },
  { id: "rings",       label: "Ringe",          active: false },
  { id: "parallettes", label: "Parallettes",    active: false }
];
```

Die Engine fragt nur: „Sind alle in der Phase geforderten Equipment-IDs aktiv?" →
Ja/Nein. Kein Gewicht, keine Plate-Logik – bewusst getrennt von `bars`. Skills ohne
Equipment (Plank, Pushup) sind davon nie betroffen.

### 3.3 `DB.skillProgress` – dynamischer Zustand (persistiert)

Hält **keine Satz-Rohdaten**. Nur den abgeleiteten Laufzeit-Zustand plus Ereignisse,
die *nicht* aus Sessions kommen (Aktivierung, manuelle Regression).

```js
DB.skillProgress = [
  {
    skillId: "strict_pullup",
    active: true,
    currentPhase: 1,
    consecutiveCount: 1,   // erfuellte Sessions in Folge in der AKTUELLEN Phase
    mastered: false,       // true, sobald die letzte Phase abgeschlossen ist
    log: [                 // nur Nicht-Session-Ereignisse
      { date: "2026-06-04", type: "activate" },
      { date: "2026-10-01", type: "regress", from: 1, to: 0 }
    ]
  }
];
```

### 3.4 Quelle der Wahrheit (Drift vermeiden)

- **`sessions[n].skillWork`** = unveränderliche Aufzeichnung pro Workout: welche
  Phase, welche Übungen/Sätze, welches Ergebnis. Quelle für Verlauf und Charts.
- **`DB.skillProgress`** = gepflegter Laufzeit-Zustand: `currentPhase`,
  `consecutiveCount`, `active`, `mastered`. Wird bei `finishSession` und bei manuellen
  Aktionen fortgeschrieben.

Weil `skillProgress` **keine Satz-Daten dupliziert**, kann es nicht mit `skillWork`
driften. Trade-off: Wird eine Session via `del-session` gelöscht, wird `skillProgress`
nicht automatisch zurückgerechnet (betrifft nur Verlauf/Chart, nicht den Zustand).
Bewusst akzeptiert; optional später `recomputeSkillProgress()`.

---

## 4. Engine (engine.js, reine Funktionen)

Keine Funktion bekommt den `db` gereicht – das bräche das FSE-Muster. Reine Eingaben.
Die DB-Auflösung bleibt in app.js/live.js.

```js
// Erfuellt EIN Satz sein Ziel? (Metrik kommt von der Uebung)
FSE.skillSetMet(metric, target, set)
//   reps:     set.done && set.value >= target
//   duration: set.done && set.value >= target
//   (value = geleistete Wiederholungen bzw. Sekunden)
//   -> bool

// Wie ist die Skill-Session ausgegangen? Bewertet ALLE Uebungen der Phase.
FSE.skillSessionResult(phaseExercises, workExercises)
//   "skipped"   : kein Satz in keiner Uebung done (ausgelassen ODER Equipment fehlte)
//   "completed" : alle Saetze ALLER Uebungen done und alle erfuellen ihr Ziel
//   "missed"    : versucht (>=1 Satz done), aber nicht alles erfuellt
//   -> string

// Beratung fuer den aktiven Skill (rein, ohne DB)
FSE.skillAdvice(skillDef, progress, ownedEquipmentIds)
//   -> {
//        phase, phaseIndex,
//        exercises,             // Uebungen der Phase, inkl. metric/target/sets
//        equipmentMissing,      // bool
//        missingEquipment,      // [ "Band leicht", ... ] fuer den UI-Hinweis
//        readyToAdvance,        // consecutiveCount >= phase.consecutiveSessions
//        mastered
//      }
```

Unit-Tests für alle drei Funktionen (Engine-Suite grün halten): die drei
Ergebnis-Fälle, gemischte Phase (eine Übung erfüllt, die andere nicht → `missed`),
Phasen-Grenze, Equipment-fehlt.

---

## 5. Fortschrittslogik

Vollständige Regel (in v1 fehlte der Fall „gemacht, aber Ziel verfehlt"):

| Ergebnis | Bedeutung | Wirkung auf `consecutiveCount` |
|---|---|---|
| `completed` | alle Sätze aller Phasenübungen done und im Ziel | `+1`; bei `>= phase.consecutiveSessions` → `currentPhase++`, `consecutiveCount = 0` |
| `missed` | versucht, aber nicht alles erfüllt | **`= 0`** (Serie reißt) |
| `skipped` | ausgelassen oder Equipment fehlte | unverändert (kein Fortschritt, kein Rückschritt) |

- **Auslassen kostet nichts** (`skipped` neutral).
- **Fehlversuch unterbricht die Serie** (`missed`).
- **Equipment fehlt → `skipped`**, nie `missed`. Der Block wird gar nicht als
  ausführbar angeboten, also entstehen keine `done`-Sätze.

Phasenaufstieg über die letzte Phase hinaus → `mastered = true`; der Block zeigt dann
einen Erfolgszustand.

Manuelle Regression (außerhalb von Sessions):
- **Phase zurück (−1):** `currentPhase = max(0, currentPhase - 1)`, `consecutiveCount = 0`,
  `mastered = false`, Log `{type:"regress"}`.
- **Komplett zurücksetzen:** `currentPhase = 0`, `consecutiveCount = 0`,
  `mastered = false`, Log `{type:"reset"}`.

Genau ein aktiver Skill: beim Aktivieren wird der bisher aktive `active:false` gesetzt;
dessen Fortschritt bleibt erhalten.

---

## 6. Integration in die Live-Session (live.js)

### 6.1 Aufbau in `buildLive(templateId)`

Nach den Übungs-Entries wird – nur wenn ein Skill aktiv ist – ein `skillWork`-Block
erzeugt. Struktur analog zu `session.entries`: pro Phasenübung ein Eintrag mit eigenen
Sätzen und der Metrik. So lässt sich die Darstellung pro Übung sauber je nach `metric`
rendern (Abschnitt 7).

```js
// in buildLive, am Ende, nur wenn aktiver Skill:
var adv = FSE.skillAdvice(def, prog, ownedEquipmentIds());
session.skillWork = {
  skillId: prog.skillId,
  phase: prog.currentPhase,
  equipmentMissing: adv.equipmentMissing,   // true -> Block als "nicht moeglich"
  exercises: adv.equipmentMissing ? [] : adv.exercises.map(function (e) {
    var sets = [];
    for (var i = 0; i < e.sets; i++) {
      sets.push({ value: null, done: false, met: false });
    }
    return { name: e.name, metric: e.metric, target: e.target, tempo: e.tempo || null, sets: sets };
  }),
  result: null                              // in finishSession gesetzt
};
// Satz: { value, done, met }  – value = Wiederholungen oder Sekunden, je nach metric
```

### 6.2 Abschluss in `finishSession()`

Analog zur bestehenden Entry-Verarbeitung (ungemachte Sätze verfallen), zusätzlich:

```js
// nach der entries-Schleife, vor db().sessions.push(s):
if (s.skillWork) {
  var sw  = s.skillWork;
  var def = KS.skillById(sw.skillId);
  var ph  = def.phases[sw.phase];

  sw.exercises.forEach(function (we, i) {
    var pe = ph.exercises[i];
    we.sets = (we.sets || []).filter(function (x) { return x.done; });
    we.sets.forEach(function (x) { x.met = E.skillSetMet(pe.metric, pe.target, x); });
  });

  sw.result = sw.equipmentMissing
    ? "skipped"
    : E.skillSessionResult(ph.exercises, sw.exercises);

  var prog = KS.skillProgressFor(sw.skillId);
  if (sw.result === "completed") {
    prog.consecutiveCount += 1;
    if (prog.consecutiveCount >= ph.consecutiveSessions) {
      prog.currentPhase += 1;
      prog.consecutiveCount = 0;
      if (prog.currentPhase >= def.phases.length) prog.mastered = true;
    }
  } else if (sw.result === "missed") {
    prog.consecutiveCount = 0;
  } // "skipped" -> unveraendert
}
```

`s.skillWork` bleibt als historische Aufzeichnung in der Session; `prog` ist der
fortgeschriebene Zustand. Kein Doppelhalten von Satz-Daten.

---

## 7. Darstellung des Skill-Blocks (Set-Row-Varianten)

Der Skill-Block sitzt als Karte am **Ende des Workouts**, nach dem letzten Hauptsatz.
Pro Phasenübung ein Unterblock; die Set-Rows richten sich nach `metric`. Die
Langhantel-Felder (Gewicht, Plate-Hint, Gewichtsvorschlag) entfallen hier komplett –
beide Varianten sind reduzierte Rows.

### Variante A – `metric: "reps"` (Band Pull-Up, Push-Up, Negativs …)

Eine Zeile pro Satz: Ziel-Anzeige, Zahleneingabe für die geleisteten Wiederholungen,
Done-Checkbox. Verhält sich wie die bestehende Arbeitssatz-Row, nur ohne Gewicht.

```
Band Pull-Up (stark)            Ziel 6 Wdh.
┌─────────────────────────────────────────┐
│ Satz 1   Ziel 6     [   6 ] Wdh.    [✓] │
│ Satz 2   Ziel 6     [   6 ] Wdh.    [✓] │
│ Satz 3   Ziel 6     [   5 ] Wdh.    [ ] │
└─────────────────────────────────────────┘
```

### Variante B – `metric: "duration"` (Dead Hang, Plank, RKC-Plank …)

Eine Zeile pro Satz: Ziel-Zeit, eine Stoppuhr und ein Sekundenwert, Done-Checkbox.
Die Stoppuhr **nutzt die vorhandene Timer-/Audio-Infrastruktur aus live.js**
(Rest-Bar-Mechanik, `playBeep`, `buzz`, `clickTick`) – kein neuer Apparat. Beim Stoppen
wird die gemessene Zeit in `value` übernommen; der Wert bleibt manuell überschreibbar
(z. B. wenn man ohne Stoppuhr trainiert hat).

```
Dead Hang                       Ziel 30 Sek.
┌─────────────────────────────────────────┐
│ Satz 1   Ziel 30s   [ 00:30 ] [▶ Start]  [✓] │
│ Satz 2   Ziel 30s   [ 00:28 ] [▶ Start]  [✓] │
│ Satz 3   Ziel 30s   [ 00:00 ] [▶ Start]  [ ] │
└─────────────────────────────────────────┘
```

### Gemischte Phase (Pull-Up Phase 0)

Zwei Unterblöcke untereinander, jeder mit seiner Variante:

```
Skill: Strict Pull-Up — Phase: Grundspannung        Serie 1/2
┌───────────────────────────────────────────────────┐
│ Dead Hang                            Ziel 30 Sek.   │  ← Variante B
│   Satz 1 … [00:30] [▶]  [✓]                          │
│   …                                                  │
│ Scapular Pull-Up                     Ziel 5 Wdh.    │  ← Variante A
│   Satz 1 … [ 5 ] Wdh.  [✓]                            │
│   …                                                  │
└───────────────────────────────────────────────────┘
```

### Equipment fehlt

Statt Set-Rows ein Hinweis aus `skillAdvice().missingEquipment`, der Block ist nicht
abhakbar:

```
Skill: Strict Pull-Up — Phase: Band leicht
┌───────────────────────────────────────────────────┐
│  Diese Phase erfordert: Band leicht                 │
│  Im Inventar aktivieren, um den Block zu trainieren.│
└───────────────────────────────────────────────────┘
```

### Mastered

Ist der Skill gemeistert, zeigt der Block einen Abschluss-Zustand statt Sätzen
(kurzer Hinweis, optional Anstoß zum nächsten Skill).

Styling: neuer versionierter CSS-Block, Mobile sauber (Breakpoints 720/560/430),
Desktop-Layout unangetastet. Set-Rows orientieren sich optisch an den bestehenden
`.set-row.work`-Zeilen, damit der Block sich nahtlos einfügt.

---

## 8. Migration (data.js, in `migrate(db)`)

Rein additiv – kein `db.migrations.<flag>` nötig:

```js
// Skill-Equipment-Inventar feldweise nachruesten (vorhandene Auswahl bleibt)
db.inventory = db.inventory || {};
if (!db.inventory.equipment) {
  db.inventory.equipment = defaultEquipment();
} else {
  var have = db.inventory.equipment.map(function (e) { return e.id; });
  defaultEquipment().forEach(function (d) {
    if (have.indexOf(d.id) < 0) db.inventory.equipment.push(d);
  });
}
// Skill-Fortschritt nachruesten
db.skillProgress = db.skillProgress || [];
```

Die Merge-Variante beim Equipment lässt später eingeführte Gerätetypen bei
bestehenden Nutzern auftauchen, ohne deren Auswahl zu überschreiben.

---

## 9. UI-Komponenten (Verortung)

| Komponente | Datei | Anlehnung an Bestehendes |
|---|---|---|
| Equipment-Inventar (Toggle pro Gerät) | `app.js`, Settings-View | Bars-Verwaltung |
| Skill-Verwaltung (Liste, aktivieren/deaktivieren, Regression) | `app.js`, View/Modal | Journey-Liste/-Aktivierung |
| Skill-Block im Workout (Abschnitt 7) | `live.js`, `liveSession`-Rendering | `.set-row.work` + Timer/Audio |
| Skill-Detail (Phasen, Verlauf) | `app.js` | Detail-View-Muster |
| Skill-Langzeit-Chart | `charts.js` | Journey-Chart |

---

## 10. Sync (supabase.js)

Keine eigene Logik nötig. `DB.skillProgress` und `DB.inventory.equipment` sind Teil des
Zustands und fließen automatisch in `app_state.data` (jsonb). Die statische `SKILLS`
ist Code und wird nicht synchronisiert. Ein angehefteter Skill-Chart im Dashboard
(`fs_dash_v013`) bliebe wie alles dort bewusst lokal und außerhalb des JSON-Exports.

---

## 11. Implementierungsreihenfolge

Daten → testbare Engine → UI von unten nach oben → Integration → Visualisierung. Jeder
Schritt eine eigene Auslieferung mit eigenem Commit.

1. **data.js** – `SKILLS`-Konstante (mit `metric`/`target` pro Übung),
   `skill()`/`skillPhase()`/`skEx()`-Helfer, `defaultEquipment()`, Migration,
   Exporte `KS.skillById`, `KS.skillProgressFor`. Noch kein UI.
2. **engine.js** – `FSE.skillSetMet`, `FSE.skillSessionResult`, `FSE.skillAdvice` plus
   Unit-Tests (drei Ergebnis-Fälle, gemischte Phase, Equipment-fehlt). Suite grün.
3. **app.js** – Equipment-Inventar-UI in den Settings.
4. **app.js** – Skill-Verwaltungs-UI: Liste, aktivieren/deaktivieren, Regression.
5. **live.js** – `buildLive` um `skillWork` erweitern, Block-Rendering mit beiden
   Row-Varianten (Stoppuhr über vorhandene Timer-Infrastruktur), `finishSession` um
   Auswertung und Fortschritt.
6. **charts.js / app.js** – Skill-Detail und Langzeit-Chart.

---

## 12. Konventionen (gelten weiter)

- Kommunikation Deutsch, informell, echte Umlaute, keine Emojis, nichts als „final"
  bezeichnen, außer ausdrücklich angefordert.
- `engine.js` ist reine Logik ohne DB-Kenntnis – Skill-Funktionen folgen dem Muster
  (reine Eingaben). Desktop-Layout unangetastet, Mobile sauber (720/560/430).
- Vor Auslieferung: `node --check` für berührte Skripte, Engine-Tests grün,
  CSS-Klammerbalance. CSS-Änderungen als versionierte Blöcke mit Kommentar.
- Non-destruktiv versionieren; `migrate(db)` feldweise erweitern,
  `db.migrations.<flag>` nur für echte Strukturumbauten.
- Dateien nie direkt in der Arbeitskopie bearbeiten – über Filesystem holen, in
  `/home/claude/` patchen, validieren, ausliefern. `str_replace` muss exakt einmal
  greifen (`grep -c`).
- Nach jeder Auslieferung automatisch Git-Commit-Message (Betreff + Body, zwei
  separate Blöcke).

---

## 13. Offen / Erweiterungsideen

- Weitere Skills: Pistol Squat, Dip, Handstand, Turkish Get-Up.
- Benachrichtigung bei Phasenabschluss und bei Meisterung.
- Optionale `recomputeSkillProgress()` zur Rückrechnung aus `sessions[].skillWork`,
  falls Sessions gelöscht werden.
- Skill-Empfehlung passend zum Journey-Fokus (Gymnastics in Hypertrophie, Kraft in
  Maximalkraft).
- Pro Satz eigenes Ziel (statt einheitlichem `target` je Übung), falls eine Phase
  ansteigende Sätze braucht (z. B. Plank 30/40/50s).
