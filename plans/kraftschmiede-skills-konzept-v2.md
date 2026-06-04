# Kraftschmiede – Skills-System: Konzept v2

Neufassung. Ersetzt die erste Version, die auf einer veralteten Monolith-Annahme
(app.js ~1400 Zeilen, Schema 0.13) beruhte und mehrere Logiklücken hatte. Diese
Fassung ist gegen den echten Code geprüft (app.js, data.js, engine.js, live.js,
Stand Schema 0.14).

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

Das ist die zentrale Korrektur gegenüber v1.

**Skill-Definitionen sind Code, kein Nutzerzustand.** Sie gehören als statische
Konstante `SKILLS` in data.js – genau wie `JOURNEY_TEMPLATES`. Sie werden **nicht**
in den DB geschrieben und **nicht** synchronisiert.

Begründung (aus dem bestehenden Muster abgeleitet):
- `exercises` und `templates` werden geseedet *und* persistiert. Jede spätere
  Korrektur daran braucht eine eigene `db.migrations.<flag>`-Migration (siehe
  `pulloverSlots`, `templateItems`, `exerciseKind`). Das ist Aufwand, den man für
  reine Definitionsdaten nicht will.
- `JOURNEY_TEMPLATES` zeigt den sauberen Weg: statische Vorlage im Code, nur die
  *aktivierte* Instanz landet im DB. Korrekturen an der Vorlage greifen sofort für
  alle Nutzer, ohne Migration.
- Persistierte Definitionen würden bei jedem Sync als großer, unveränderlicher
  Block über Supabase geschoben.

**Im DB landet nur der dynamische Fortschritt:** `DB.skillProgress` und das
Skill-Equipment-Inventar `DB.inventory.equipment`.

---

## 3. Datenmodell

### 3.1 `SKILLS` – statische Definition (data.js, Konstante)

Aufbau analog zu `JOURNEY_TEMPLATES`, mit kompakten Helfern (`skill()`,
`skillPhase()`), parallel zu `phase()`/`ex()`/`tpl()`.

```js
// data.js – statische Konstante, NICHT im DB, NICHT synchronisiert
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
        equipment: ["pullup-bar"],   // KORREKTUR: Dead Hang braucht eine Stange
        exercises: [
          { name: "Dead Hang",        sets: 3, reps: null, duration: 20 },
          { name: "Scapular Pull-Up", sets: 3, reps: 5,    duration: null }
        ],
        criteria: { type: "duration", target: 30, requireAllSets: true, consecutiveSessions: 2 }
      },
      {
        index: 1, label: "Band stark",
        equipment: ["pullup-bar", "band-heavy"],
        exercises: [{ name: "Band Pull-Up (stark)", sets: 3, reps: 6 }],
        criteria: { type: "reps", target: 6, requireAllSets: true, consecutiveSessions: 2 }
      },
      {
        index: 2, label: "Band mittel",
        equipment: ["pullup-bar", "band-medium"],
        exercises: [{ name: "Band Pull-Up (mittel)", sets: 3, reps: 6 }],
        criteria: { type: "reps", target: 6, requireAllSets: true, consecutiveSessions: 2 }
      },
      {
        index: 3, label: "Band leicht",
        equipment: ["pullup-bar", "band-light"],
        exercises: [{ name: "Band Pull-Up (leicht)", sets: 3, reps: 8 }],
        criteria: { type: "reps", target: 8, requireAllSets: true, consecutiveSessions: 2 }
      },
      {
        index: 4, label: "Negativs",
        description: "Sauber und langsam ablassen, Spannung halten.",
        equipment: ["pullup-bar"],
        exercises: [{ name: "Negative Pull-Up", sets: 3, reps: 5, tempo: "5 Sek. ablassen" }],
        criteria: { type: "reps", target: 5, requireAllSets: true, consecutiveSessions: 2 }
      },
      {
        index: 5, label: "Freier Klimmzug",
        equipment: ["pullup-bar"],
        exercises: [{ name: "Strict Pull-Up", sets: 3, reps: 5 }],
        // Meisterung: 3 saubere Saetze à 8. Wert frei waehlbar; 8 ist solide,
        // 12-13 (v1) ist eher fortgeschritten, nicht "gerade gemeistert".
        criteria: { type: "reps", target: 8, requireAllSets: true, consecutiveSessions: 2 }
      }
    ]
  },
  {
    id: "pushup",
    name: "Pushup",
    category: "gymnastics",
    phases: [
      { index: 0, label: "Knie-Liegestütze", equipment: [],
        exercises: [{ name: "Knee Push-Up", sets: 3, reps: 8 }],
        criteria: { type: "reps", target: 10, requireAllSets: true, consecutiveSessions: 2 } },
      { index: 1, label: "Hände erhöht", equipment: [],
        exercises: [{ name: "Incline Push-Up", sets: 3, reps: 8 }],
        criteria: { type: "reps", target: 10, requireAllSets: true, consecutiveSessions: 2 } },
      { index: 2, label: "Volle Liegestütze", equipment: [],
        exercises: [{ name: "Full Push-Up", sets: 3, reps: 5 }],
        criteria: { type: "reps", target: 8, requireAllSets: true, consecutiveSessions: 2 } },
      { index: 3, label: "Tempo / eng", equipment: [],
        exercises: [{ name: "Tempo Push-Up", sets: 3, reps: 5, tempo: "3 Sek. ablassen" }],
        criteria: { type: "reps", target: 6, requireAllSets: true, consecutiveSessions: 2 } },
      { index: 4, label: "Archer", equipment: [],
        exercises: [{ name: "Archer Push-Up", sets: 3, reps: 3 }],
        criteria: { type: "reps", target: 5, requireAllSets: true, consecutiveSessions: 2 } }
    ]
  }
  // weitere Skills folgen (Pistol Squat, Dip, Handstand, Turkish Get-Up ...)
];
```

Hinweise:
- **`equipment` ist immer ein Array** von Equipment-IDs. Das weicht bewusst von der
  Übungseigenschaft `equipment: "barbell"` (String) ab – im Skill-Kontext kann eine
  Phase mehrere Geräte fordern (Stange *und* Band). Leeres Array = Körpergewicht,
  überall verfügbar.
- **`pushup` braucht kein Equipment** – zeigt den `equipment: []`-Fall sauber.
  **`strict_pullup`** zeigt den Equipment-Fall; jede Phase fordert mindestens die
  Stange (in v1 war `equipment: []` für Dead Hang schlicht falsch).
- Der unklare `type: "sessions"` aus v1 entfällt. Das Zählen erledigt allein
  `consecutiveSessions` (siehe Fortschrittslogik).

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
Ja/Nein. Kein Gewicht, keine Plate-Logik – bewusst getrennt von `bars`.

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

Klare Trennung, damit nichts doppelt und inkonsistent gehalten wird:

- **`sessions[n].skillWork`** = unveränderliche Aufzeichnung pro Workout: welche
  Phase, welche Sätze, welches Ergebnis. Quelle für Verlauf und Charts.
- **`DB.skillProgress`** = gepflegter Laufzeit-Zustand: `currentPhase`,
  `consecutiveCount`, `active`, `mastered`. Wird bei `finishSession` und bei
  manuellen Aktionen fortgeschrieben.

Weil `skillProgress` **keine Satz-Daten dupliziert**, kann es nicht mit
`skillWork` driften. Trade-off: Wird eine Session via `del-session` gelöscht, wird
`skillProgress` nicht automatisch zurückgerechnet. Das betrifft nur den Verlauf/Chart
(eine Session weniger), nicht den Zustand. Bewusst akzeptiert; optional kann später
eine `recomputeSkillProgress()`-Funktion ergänzt werden.

---

## 4. Engine (engine.js, reine Funktionen)

Keine Funktion bekommt den `db` gereicht – das bräche das FSE-Muster (alle bestehenden
Funktionen arbeiten auf übergebenen Daten). Stattdessen reine Eingaben. Die
DB-Auflösung (welcher Skill aktiv, Equipment-Lookup) bleibt in app.js/live.js.

```js
// Erfuellt EIN Satz das Kriterium?
FSE.skillSetMet(criteria, set)
//   reps:     set.done && set.reps     >= criteria.target
//   duration: set.done && set.duration >= criteria.target
//   -> bool

// Wie ist die Skill-Session ausgegangen?
FSE.skillSessionResult(phase, sets)
//   "skipped"   : kein Satz done (ausgelassen ODER Equipment fehlte)
//   "completed" : alle geforderten Saetze done und alle erfuellen das Kriterium
//                 (bei requireAllSets:true; sonst genuegt die geforderte Anzahl)
//   "missed"    : versucht (>=1 Satz done), aber Kriterium nicht voll erreicht
//   -> string

// Beratung fuer den aktiven Skill (rein, ohne DB)
FSE.skillAdvice(skillDef, progress, ownedEquipmentIds)
//   -> {
//        phase,                 // aktuelles Phasen-Objekt (oder null wenn gemeistert)
//        phaseIndex,
//        exercises,             // Uebungsvorschlaege der Phase
//        equipmentMissing,      // bool: fehlt mindestens ein gefordertes Geraet?
//        missingEquipment,      // [ "Band leicht", ... ] fuer den UI-Hinweis
//        readyToAdvance,        // consecutiveCount >= criteria.consecutiveSessions
//        mastered               // currentPhase ueber die letzte Phase hinaus
//      }
```

Alle drei bekommen **Unit-Tests** (Engine-Suite muss grün bleiben), insbesondere die
drei Ergebnis-Fälle und die Phasen-Grenzen.

---

## 5. Fortschrittslogik (die geschlossene Lücke aus v1)

v1 definierte nur „erfüllt" und „nicht gemacht". Der Fall **gemacht, aber Ziel
verfehlt** fehlte – dadurch hätte man nie erfüllte Sessions ansammeln und trotzdem
aufsteigen können. Vollständige Regel:

| Ergebnis (`skillSessionResult`) | Bedeutung | Wirkung auf `consecutiveCount` |
|---|---|---|
| `completed` | Block gemacht, Kriterium voll erfüllt | `+1`; bei `>= consecutiveSessions` → `currentPhase++`, `consecutiveCount = 0` |
| `missed` | Block versucht, Kriterium verfehlt | **`= 0`** (Serie reißt) |
| `skipped` | Block ausgelassen oder Equipment fehlte | unverändert (kein Fortschritt, kein Rückschritt) |

Damit gelten die v1-Prinzipien weiter und sind sauber definiert:
- **Auslassen kostet nichts** (`skipped` ist neutral) – Prinzip „kein Rückschritt
  durch Auslassen".
- **Fehlversuch unterbricht die Serie** (`missed`) – sonst wäre der Aufstieg sinnlos.
- **Equipment fehlt → `skipped`**, nie `missed`. Der Block wird gar nicht erst als
  ausführbar angeboten, also entstehen keine `done`-Sätze.

Phasenaufstieg über die letzte Phase hinaus setzt `mastered = true`; der Skill-Block
zeigt dann einen Erfolgszustand statt weiterer Sätze.

Manuelle Regression (außerhalb von Sessions):
- **Phase zurück (−1):** `currentPhase = max(0, currentPhase - 1)`, `consecutiveCount = 0`,
  `mastered = false`, Log-Eintrag `{type:"regress"}`.
- **Komplett zurücksetzen:** `currentPhase = 0`, `consecutiveCount = 0`,
  `mastered = false`, Log-Eintrag `{type:"reset"}`.

Genau ein aktiver Skill: beim Aktivieren wird der bisher aktive auf `active:false`
gesetzt; dessen Fortschritt bleibt erhalten.

---

## 6. Integration in die Live-Session (live.js)

### 6.1 Aufbau in `buildLive(templateId)`

Nach den Übungs-Entries wird – nur wenn ein Skill aktiv ist – ein `skillWork`-Skelett
erzeugt. Die Set-Struktur lehnt sich ans bestehende Set-Schema an (gleiche Felder
`done`/`reps`, plus `duration` für Zeit-Phasen), damit die vorhandenen Set-Rows und die
`done`-Filterung wiederverwendbar sind.

```js
// in buildLive, am Ende, nur wenn aktiver Skill + alle Geraete aktiv:
session.skillWork = {
  skillId: prog.skillId,
  phase: prog.currentPhase,
  criteriaType: phase.criteria.type,   // "reps" | "duration"
  target: phase.criteria.target,
  equipmentMissing: false,             // true -> Block als "nicht moeglich" rendern
  sets: phase.exercises[0] ? buildSkillSets(phase) : [],
  result: null                         // wird in finishSession gesetzt
};
// Set-Beispiel: { reps: 6, duration: null, targetReps: 6, done: false, met: false }
```

Fehlt Equipment (`FSE.skillAdvice(...).equipmentMissing`), wird `equipmentMissing:true`
gesetzt, der Block ohne Checkboxen als Hinweis gerendert, und `finishSession` wertet ihn
als `skipped`.

### 6.2 Abschluss in `finishSession()`

Analog zur bestehenden Entry-Verarbeitung (ungemachte Sätze verfallen), zusätzlich:

```js
// nach der bestehenden entries-Schleife, vor db().sessions.push(s):
if (s.skillWork) {
  var sw = s.skillWork;
  sw.sets = (sw.sets || []).filter(function (x) { return x.done; });
  var def  = KS.skillById(sw.skillId);
  var ph   = def.phases[sw.phase];
  sw.sets.forEach(function (x) { x.met = E.skillSetMet(ph.criteria, x); });
  sw.result = sw.equipmentMissing ? "skipped" : E.skillSessionResult(ph, sw.sets);

  var prog = KS.skillProgressFor(sw.skillId);
  if (sw.result === "completed") {
    prog.consecutiveCount += 1;
    if (prog.consecutiveCount >= ph.criteria.consecutiveSessions) {
      prog.currentPhase += 1;
      prog.consecutiveCount = 0;
      if (prog.currentPhase >= def.phases.length) prog.mastered = true;
    }
  } else if (sw.result === "missed") {
    prog.consecutiveCount = 0;
  } // "skipped" -> unveraendert
}
```

`s.skillWork` bleibt in der Session als historische Aufzeichnung; `prog` ist der
fortgeschriebene Zustand. Kein Doppelhalten von Satz-Daten.

---

## 7. Migration (data.js, in `migrate(db)`)

Rein additiv – kein `db.migrations.<flag>` nötig, weil nichts Bestehendes umgebaut
wird. Einzufügen im bestehenden feldweisen Block:

```js
// Skill-Equipment-Inventar feldweise nachruesten (vorhandene Auswahl bleibt)
db.inventory = db.inventory || {};
if (!db.inventory.equipment) {
  db.inventory.equipment = defaultEquipment();
} else {
  // fehlende Default-Geraete ergaenzen, vorhandene unangetastet lassen
  var have = db.inventory.equipment.map(function (e) { return e.id; });
  defaultEquipment().forEach(function (d) {
    if (have.indexOf(d.id) < 0) db.inventory.equipment.push(d);
  });
}
// Skill-Fortschritt nachruesten
db.skillProgress = db.skillProgress || [];
```

Die Merge-Variante beim Equipment sorgt dafür, dass später eingeführte Gerätetypen bei
bestehenden Nutzern auftauchen, ohne deren Auswahl zu überschreiben.

---

## 8. UI-Komponenten (Verortung)

| Komponente | Datei | Anlehnung an Bestehendes |
|---|---|---|
| Equipment-Inventar (Toggle pro Gerät) | `app.js`, Settings-View | wie die Bars-Verwaltung (`bar-add`/`bar-del`/Felder) |
| Skill-Verwaltung (Liste, aktivieren/deaktivieren, Regression) | `app.js`, eigene View oder Modal | wie die Journey-Liste/-Aktivierung |
| Skill-Block im Workout (Karte am Ende, Set-Rows) | `live.js`, `liveSession`-Rendering | wie die bestehenden `work`-Set-Rows + Checkbox |
| Skill-Detail (Phasenübersicht, Verlauf) | `app.js` | Detail-View-Muster |
| Skill-Langzeit-Chart | `charts.js` | analog Journey-Chart |

Equipment-Hinweis im Block: Fehlt ein gefordertes Gerät, zeigt der Block den Text aus
`skillAdvice().missingEquipment` („Phase erfordert Band leicht – im Inventar
aktivieren") statt eines stummen Stillstands.

---

## 9. Sync (supabase.js)

Keine eigene Logik nötig. `DB.skillProgress` und `DB.inventory.equipment` sind Teil des
Zustands und fließen automatisch in `app_state.data` (jsonb). Die statische `SKILLS`
ist Code und wird – korrekt – nicht synchronisiert. Ein angehefteter Skill-Chart im
Dashboard (`fs_dash_v013`) bliebe wie alles dort bewusst lokal und außerhalb des
JSON-Exports.

---

## 10. Implementierungsreihenfolge

Daten → testbare Engine → UI von unten nach oben → Integration → Visualisierung. Jeder
Schritt ist eine eigene Auslieferung mit eigenem Commit.

1. **data.js** – `SKILLS`-Konstante, `skill()`/`skillPhase()`-Helfer,
   `defaultEquipment()`, Migration (`inventory.equipment`, `skillProgress`),
   Helfer-Exports `KS.skillById`, `KS.skillProgressFor`. Noch kein UI.
2. **engine.js** – `FSE.skillSetMet`, `FSE.skillSessionResult`, `FSE.skillAdvice` plus
   Unit-Tests (drei Ergebnis-Fälle, Phasen-Grenze, Equipment-fehlt). Engine-Suite grün.
3. **app.js** – Equipment-Inventar-UI in den Settings.
4. **app.js** – Skill-Verwaltungs-UI: Liste, aktivieren/deaktivieren, Regression
   (−1 / Reset).
5. **live.js** – `buildLive` um `skillWork` erweitern, Block-Rendering, `finishSession`
   um Auswertung und Fortschritt.
6. **charts.js / app.js** – Skill-Detail und Langzeit-Chart.

---

## 11. Konventionen (gelten weiter)

- Kommunikation Deutsch, informell, echte Umlaute, keine Emojis, nichts als „final"
  bezeichnen, außer ausdrücklich angefordert.
- `engine.js` ist reine Logik ohne DB-Kenntnis – Skill-Funktionen fügen sich diesem
  Muster (reine Eingaben). Desktop-Layout unangetastet, Mobile sauber
  (Breakpoints 720/560/430).
- Vor Auslieferung: `node --check` für die berührten Skripte, Engine-Tests grün,
  CSS-Klammerbalance. CSS-Änderungen als versionierte Blöcke mit Kommentar.
- Non-destruktiv versionieren; `migrate(db)` feldweise erweitern,
  `db.migrations.<flag>` nur für echte Strukturumbauten.
- Dateien nie direkt in der Arbeitskopie bearbeiten – über Filesystem holen, in
  `/home/claude/` patchen, validieren, ausliefern. `str_replace` muss exakt einmal
  greifen (`grep -c`).
- Nach jeder Auslieferung automatisch Git-Commit-Message (Betreff + Body, zwei
  separate Blöcke).

---

## 12. Offen / Erweiterungsideen

- Weitere Skills: Pistol Squat, Dip, Handstand, Turkish Get-Up.
- Benachrichtigung bei Phasenabschluss und bei Meisterung.
- Optionale `recomputeSkillProgress()` zur Rückrechnung aus `sessions[].skillWork`,
  falls Sessions gelöscht werden.
- Skill-Empfehlung passend zum aktuellen Journey-Fokus (z. B. Gymnastics-Skill in
  Hypertrophie-Phasen, Kraft-Skill in Maximalkraft-Phasen).
