# Kraftschmiede – Skills-System: Konzept v3.1

Konsolidierte Neufassung nach dem Grilling. Löst v2 ab. Gegen den echten Code
geprüft (app.js, data.js, engine.js, live.js, charts.js, index.html, Stand Schema 0.14).

> **Architektur-Stand aktualisiert (04.06.2026, v3.1):** Nach einem internen
> Umbau (ohne Verhaltens- oder Schema-Änderung) gibt es in app.js zusätzlich die
> Fassade `Coach` (Vorschlag/Aufwärmen/Ranking/Satzzahl) und den Baustein `State`
> (lesen/speichern/aus Cloud ersetzen), und in live.js ist der Pausen-Timer samt
> Audio als `RestTimer` gebündelt (interne Helfer privat). Die Nähte, auf denen
> dieses Konzept ruht (`window.KS`, `db()`, `UI.live`, `DB.sessions`, `migrate`,
> Timer-Infrastruktur in live.js), bestehen unverändert weiter – das Skills-Design
> bleibt davon unberührt. Die betroffenen Stellen sind unten präzisiert.

Die zentrale Verschiebung gegenüber v2: Skill-Arbeit ist **keine** an die Journey
gekoppelte Anhängsel-Karte am Workout-Ende mehr, sondern eine **eigenständige,
geschlossene Trainingseinheit** mit eigenem Live-Screen und eigenem Verwaltungs-Tab.
Damit wird der Fortschritt nicht nur logisch, sondern auch zeitlich von der Journey
entkoppelt – konsequent zur Leitidee „strikt entkoppelt".

---

## 0. Entscheidungs-Log (Ergebnis des Grillings)

| # | Verzweigung | Entscheidung |
|---|---|---|
| 1 | Taktung / Ausführung | Eigenständige Einheit unter **Training** (neben Workout- und Yoga-Kachel), eigener Live-Screen. Nicht am Workout-Ende. |
| 2 | Live-Slot | **Ein** Slot mit `UI.live.kind = "workout" \| "skill"`. Renderer verzweigt. Immer nur eine Einheit live. |
| 3 | Speicherung | Fertige Skill-Session = Zeile in `DB.sessions`, `type:"skill"`, `entries:[]`, Aufzeichnung in `s.skillWork`. Sichtbar in Kalender + Verlauf wie Yoga. `missed` wird gespeichert; nur Verwerfen erzeugt keine Zeile. |
| 4 | Anzahl aktiver Skills | **Mehrere aktiv erlaubt** (Default einer). Aktivieren deaktiviert die anderen nicht mehr. |
| 5 | Aufstiegskriterium | **Strikt** (wie v2): `completed` = alle Sätze im Ziel; lückenlos; `missed` → Reset auf 0; `skipped` neutral. |
| 6 | Metrik-Modell | **Erweiterbare Naht**: v1 nur `reps`/`duration`, aber offener `metric`-String, `target` skalar **oder** Objekt, gekapseltes `skillSetMet`. Konditionierung/Distanz/Pace später gemeinsam + recherchiert. |
| 7 | Equipment | **Nur Auswahl-Tor**: fehlt das Gerät, ist der Skill nicht startbar (ausgegraut + Hinweis). Eine laufende Session kennt kein Equipment-Problem mehr. |
| 8 | Nach Meisterung | Bleibt **aktiv** mit „gemeistert"-Zustand, als Erhaltung trainierbar (kein Aufstieg mehr, kein Auto-Deaktivieren). |
| 9 | Verortung Verwaltung | **Eigener „Skills"-Tab** analog Journey-Tab. Training-Tab behält die Skill-Kachel zum Trainieren. |
| 10 | Entfernen | Nur **deaktivieren** (Fortschritt bleibt, resumebar). Kein Hard-Delete. Plus Zurücksetzen (Phase 0) und Phase zurück (−1). |

---

## 1. Ist-Architektur (verbindlich, codegeprüft)

`window.KS` ist der geteilte Namespace; die Engine lebt unter `window.FSE`.

| Datei | Rolle | Relevant fürs Skills-System |
|---|---|---|
| `app.js` | Schema-Konstante (`"0.14"`), geteilte Helfer, Views, Nav (`TABS`), Settings, Journey-Logik; `State`-Baustein (Persistenz) und `Coach`-Fassade (Engine-Glue) | Equipment-Inventar-UI, **neuer Skills-Tab**, Skill-Kachel im Training, Kalender-/Verlauf-Zweig |
| `data.js` | `seed()`, `migrate(db)`, statische `JOURNEY_TEMPLATES`, Domänen-Helfer | **statische `SKILLS`**, `defaultEquipment()`, Migration, Exporte |
| `engine.js` | reine Rechenfunktionen (`window.FSE`), keine DB-Kenntnis | `skillSetMet`, `skillSessionResult`, `skillAdvice` |
| `live.js` | Live-Session, Timer, Audio, Rest-Bar, Start-/Ende-Dialoge; Pausen-Timer als `RestTimer` gebündelt (Interna privat) | **Skill-Live-Screen** + Abschluss als zweiter Renderpfad neben dem Workout |
| `charts.js` | Diagramme | Skill-Langzeit-Chart |
| `supabase.js` | Cloud-Sync (gesamter Zustand als jsonb) | zieht `skillProgress` + `inventory.equipment` automatisch mit |

Codegeprüfte Fakten, auf denen das Konzept ruht:
- `var DB = Store.load() || seed();` gefolgt von `migrate(DB);` → `migrate()` läuft auch
  über eine frische `seed()`-DB. Eine rein additive Migration genügt; `seed()` muss nicht
  angefasst werden.
- Yoga ist bereits eine Zeile in `DB.sessions` (`type:"yoga"`, `entries:[]`); Kalender
  (`cal-dot yoga`) und Verlauf (`log-item yoga`) verzweigen über `s.type`. **Das ist das
  Muster, dem Skills folgen.**
- Statistik-Verbraucher (`lastByExercise`, `weekCounts`, 1RM/Volumen) iterieren über
  `s.entries`. Bei leerem `entries` tragen sie nichts bei → `type:"skill"`-Zeilen
  verfälschen keine Statistik.
- `TABS` ist ein flaches Array; Mobile-Nav ist ein aufklappbares Menü (`nav-toggle`).
  Ein zusätzlicher Tab ist nur ein Listeneintrag mehr.
- Der Live-Begriff ist genau **einer**: `UI.live` (gespiegelt nach `DB.live`,
  Resume über `if (DB.live && DB.live.status === "live")`). Trainings-Uhr, Pausen-Bar
  (`#ks-rest-bar`, ein Element im `body`, fest an `KS.UI.live.rest`) und `manageClock()`
  hängen alle daran. Der Pausen-Timer wird über `KS.RestTimer`
  (`start`/`adjust`/`skip`/`syncBar`/`toggle`) gesteuert; die Helfer dahinter
  (`playBeep`, `buzz`, `clickTick`, `ensureRestBar`, `restTick`, `startRest` …) sind
  jetzt **privat in live.js** und nicht mehr einzeln über `KS` veröffentlicht.
  `manageClock`/`fmtDur` (Uhr/Format) bleiben exportiert.
- Persistenz läuft über einen einzigen `State`-Baustein in app.js: `KS.db` →
  `State.get`, `window.KS_APP.getDB`/`setDB` → `State.get`/`State.replace`, und das
  frühere `persist()` ist app.js-seitig durch `State.persist()` ersetzt. In live.js
  bleibt der `persist()`-Wrapper bestehen (→ `KS.persist` → `State.persist`), daher
  funktionieren die Pseudocode-Aufrufe `persist()` unten weiter unverändert.
- `Coach` (app.js) ist das deterministische Brain der Langhantel-Journey
  (`suggestionFor`/`warmupFor`/`rankedWorkouts`/`plannedSets`). Skills nutzen parallel
  direkt die reinen `FSE.skill*`-Funktionen – gleiches Prinzip, eigene Naht.

---

## 2. Grundprinzip: Definition vs. Fortschritt strikt trennen

**Skill-Definitionen sind Code, kein Nutzerzustand.** Statische Konstante `SKILLS` in
data.js – wie `JOURNEY_TEMPLATES`. Nicht im DB, nicht synchronisiert. Korrekturen greifen
sofort, ohne Migration.

**Im DB landet nur der dynamische Fortschritt:** `DB.skillProgress` (Array, ein Eintrag
pro „hinzugefügtem" Skill) und das Skill-Equipment-Inventar `DB.inventory.equipment`.

---

## 3. Datenmodell

### 3.1 `SKILLS` – statische Definition (data.js, Konstante)

Aufbau analog zu `JOURNEY_TEMPLATES`, mit kompakten Helfern (`skill()`, `skillPhase()`,
`skEx()`).

**Die Metrik sitzt auf der Übung, nicht auf der Phase.** Jede Skill-Übung trägt `metric`
und ein eigenes `target`. Der Phasenaufstieg (`consecutiveSessions`) bleibt phasenweit.

**Erweiterbare Naht (Entscheidung 6):**
- `metric` ist ein **offener String**, kein in die Engine eingebrannter Enum. v1 nutzt
  `"reps"` und `"duration"`.
- `target` darf **Skalar oder kleines Objekt** sein:
  - `metric "reps"` → `target` = Ziel-Wiederholungen (Skalar).
  - `metric "duration"` → `target` = Ziel-Sekunden (Skalar).
  - später z. B. `metric "distance"` → `target = { distance: 4 }`,
    `metric "distance_time"` → `target = { distance: 4, timeSec: 1500 }`.
- `equipment` ist **immer ein Array** von Equipment-IDs (leeres Array = Körpergewicht).

```js
// Skill-Uebung: { name, metric, sets, target, tempo? }
//   target: Skalar (reps/duration) ODER Objekt (spaetere Metriken)
var SKILLS = [
  {
    id: "strict_pullup",
    name: "Strict Pull-Up",
    category: "gymnastics",
    phases: [
      { index: 0, label: "Grundspannung",
        description: "Dead Hang und Skapula-Kontrolle aufbauen.",
        equipment: ["pullup-bar"], consecutiveSessions: 2,
        exercises: [
          { name: "Dead Hang",        metric: "duration", sets: 3, target: 30 },
          { name: "Scapular Pull-Up", metric: "reps",     sets: 3, target: 5  }
        ] },
      { index: 1, label: "Band stark",  consecutiveSessions: 2,
        equipment: ["pullup-bar", "band-heavy"],
        exercises: [{ name: "Band Pull-Up (stark)",  metric: "reps", sets: 3, target: 6 }] },
      { index: 2, label: "Band mittel", consecutiveSessions: 2,
        equipment: ["pullup-bar", "band-medium"],
        exercises: [{ name: "Band Pull-Up (mittel)", metric: "reps", sets: 3, target: 6 }] },
      { index: 3, label: "Band leicht", consecutiveSessions: 2,
        equipment: ["pullup-bar", "band-light"],
        exercises: [{ name: "Band Pull-Up (leicht)", metric: "reps", sets: 3, target: 8 }] },
      { index: 4, label: "Negativs",
        description: "Sauber und langsam ablassen, Spannung halten.",
        equipment: ["pullup-bar"], consecutiveSessions: 2,
        exercises: [{ name: "Negative Pull-Up", metric: "reps", sets: 3, target: 5, tempo: "5 Sek. ablassen" }] },
      { index: 5, label: "Freier Klimmzug", equipment: ["pullup-bar"], consecutiveSessions: 2,
        exercises: [{ name: "Strict Pull-Up", metric: "reps", sets: 3, target: 8 }] }
    ]
  },
  {
    id: "pushup", name: "Pushup", category: "gymnastics",
    phases: [
      { index: 0, label: "Knie-Liegestütze", equipment: [], consecutiveSessions: 2,
        exercises: [{ name: "Knee Push-Up",   metric: "reps", sets: 3, target: 10 }] },
      { index: 1, label: "Hände erhöht",      equipment: [], consecutiveSessions: 2,
        exercises: [{ name: "Incline Push-Up", metric: "reps", sets: 3, target: 10 }] },
      { index: 2, label: "Volle Liegestütze", equipment: [], consecutiveSessions: 2,
        exercises: [{ name: "Full Push-Up",   metric: "reps", sets: 3, target: 8 }] },
      { index: 3, label: "Tempo / eng",       equipment: [], consecutiveSessions: 2,
        exercises: [{ name: "Tempo Push-Up",  metric: "reps", sets: 3, target: 6, tempo: "3 Sek. ablassen" }] },
      { index: 4, label: "Archer",            equipment: [], consecutiveSessions: 2,
        exercises: [{ name: "Archer Push-Up", metric: "reps", sets: 3, target: 5 }] }
    ]
  }
  // Plank, Pistol Squat, Dip, Handstand, Turkish Get-Up, Lauf/Kondition ... folgen
];
```

Start-Katalog für v1: zunächst **Pull-Up und Push-Up** (beide rein bewegungsbasiert,
keine Spezialfälle), Plank als reiner Zeit-Skill kann direkt mit. Weitere Skills (vor
allem Konditionierung/Laufen mit Distanz/Pace und ggf. Nicht-Satz-Modell) definieren wir
einzeln, jeweils mit Recherche zum aktuellen evidenzbasierten Progressionsmodell für
genau diesen Skill.

### 3.2 `DB.inventory.equipment` – Skill-Equipment (persistiert)

Unter `inventory`, parallel zu `bars`/`plates`.

```js
DB.inventory.equipment = [
  { id: "band-heavy",  label: "Band stark",     active: true  },
  { id: "band-medium", label: "Band mittel",    active: true  },
  { id: "band-light",  label: "Band leicht",    active: false },
  { id: "pullup-bar",  label: "Klimmzugstange", active: true  },
  { id: "rings",       label: "Ringe",          active: false },
  { id: "parallettes", label: "Parallettes",    active: false }
];
```

Wirkt **ausschließlich als Auswahl-Tor** (Entscheidung 7): Sind nicht alle in der
aktuellen Phase geforderten IDs aktiv, ist der Skill nicht startbar. Eine laufende
Session prüft kein Equipment mehr.

### 3.3 `DB.skillProgress` – dynamischer Zustand (persistiert)

Hält **keine Satz-Rohdaten**. Mehrere Einträge dürfen `active:true` sein.

```js
DB.skillProgress = [
  {
    skillId: "strict_pullup",
    active: true,
    currentPhase: 1,
    consecutiveCount: 1,   // saubere Sessions in Folge in der aktuellen Phase
    mastered: false,       // true ab Abschluss der letzten Phase; Skill bleibt aktiv
    log: [                 // nur Nicht-Session-Ereignisse
      { date: "2026-06-04", type: "activate" },
      { date: "2026-10-01", type: "regress", from: 1, to: 0 }
    ]
  }
];
```

Kein `genau-ein-aktiver`-Zwang mehr. Aktivieren legt den Eintrag an bzw. setzt
`active:true` (vorhandener Fortschritt wird **fortgesetzt**). Deaktivieren setzt
`active:false`; Eintrag und Fortschritt bleiben.

### 3.4 Quelle der Wahrheit (Drift vermeiden)

- **`sessions[n].skillWork`** (auf `type:"skill"`-Zeilen) = unveränderliche Aufzeichnung
  pro Skill-Session: Phase, Übungen/Sätze, Ergebnis. Quelle für Verlauf und Chart.
- **`DB.skillProgress`** = gepflegter Laufzeit-Zustand. Wird beim Abschluss der
  Skill-Session und bei manuellen Aktionen fortgeschrieben.

`skillProgress` dupliziert keine Satz-Daten → kann nicht mit `skillWork` driften.
Trade-off: Löscht man eine Skill-Session über `del-session`, wird `skillProgress` nicht
zurückgerechnet (betrifft nur Verlauf/Chart). Bewusst akzeptiert; optional später
`recomputeSkillProgress()`.

---

## 4. Engine (engine.js, reine Funktionen)

Keine Funktion bekommt den `db`. Reine Eingaben.

```js
// Erfuellt EIN Satz sein Ziel? Kapselt das Urteil je Metrik (erweiterbare Naht).
FSE.skillSetMet(metric, target, set)
//   reps:     set.done && set.value >= target
//   duration: set.done && set.value >= target
//   (spaeter: distance / distance_time -> target als Objekt, hier neuer Fall)
//   -> bool

// Wie ist die Skill-Session ausgegangen? Bewertet ALLE Uebungen der Phase.
FSE.skillSessionResult(phaseExercises, workExercises)
//   "skipped"   : kein Satz in keiner Uebung done (defensiv; normal verworfen, nicht gespeichert)
//   "completed" : alle Saetze ALLER Uebungen done und alle erfuellen ihr Ziel
//   "missed"    : versucht (>=1 Satz done), aber nicht alles erfuellt
//   -> string   (KEIN Equipment-Eingang mehr)

// Beratung fuer einen Skill (rein, ohne DB). Auch fuer das Auswahl-Tor.
FSE.skillAdvice(skillDef, progress, ownedEquipmentIds)
//   -> { phase, phaseIndex, exercises,
//        equipmentMissing,   // nur fuer das Auswahl-Tor (ausgrauen)
//        missingEquipment,   // [ "Band leicht", ... ] fuer den Hinweis
//        readyToAdvance, mastered }
```

Unit-Tests: drei Ergebnis-Fälle, gemischte Phase (eine Übung erfüllt, andere nicht →
`missed`), Phasen-Grenze (Aufstieg), Meisterung, `skillAdvice` mit fehlendem Equipment
(`equipmentMissing:true`). Engine-Suite grün halten.

---

## 5. Fortschrittslogik (strikt, Entscheidung 5)

| Ergebnis | Bedeutung | Wirkung auf `consecutiveCount` |
|---|---|---|
| `completed` | alle Sätze aller Phasenübungen done und im Ziel | `+1`; bei `>= phase.consecutiveSessions` → `currentPhase++`, `consecutiveCount = 0` |
| `missed` | versucht, aber nicht alles erfüllt | **`= 0`** (Serie reißt, lückenlos gefordert) |
| `skipped` | kein Satz done (normal verworfen) | unverändert |

- Phasenaufstieg über die letzte Phase hinaus → `mastered = true`. Der Skill **bleibt
  aktiv** und zeigt einen „gemeistert"-Zustand; weitere saubere Sessions zählen als
  `completed`, steigen aber nicht mehr auf (Erhaltung).
- Manuelle Regression (außerhalb von Sessions):
  - **Phase zurück (−1):** `currentPhase = max(0, currentPhase-1)`, `consecutiveCount = 0`,
    `mastered = false`, Log `{type:"regress"}`.
  - **Zurücksetzen:** `currentPhase = 0`, `consecutiveCount = 0`, `mastered = false`,
    Log `{type:"reset"}`.
- **Aktivieren/Deaktivieren** ändert nur `active`; der Fortschritt bleibt unberührt.

---

## 6. Skill-Session (live.js – eigener Renderpfad)

Ein Live-Slot, unterschieden über `kind` (Entscheidung 2). Workout und Skill sind nie
gleichzeitig live.

### 6.1 Start

Eintrittspunkt ist die **Skill-Kachel im Training-Tab**:
- 0 aktive Skills → Hinweis „Skill im Skills-Tab hinzufügen".
- genau 1 aktiver Skill → öffnet direkt.
- mehrere aktive Skills → kleine Auswahl. Ein Skill, dessen aktuelle Phase nicht aktives
  Equipment verlangt, ist **ausgegraut + Hinweis**, nicht startbar (Auswahl-Tor).

`buildSkillLive(skillId)` erzeugt analog zu `buildLive`, aber mit `kind:"skill"`:

```js
var def  = KS.skillById(skillId);
var prog = KS.skillProgressFor(skillId);
var adv  = FSE.skillAdvice(def, prog, ownedEquipmentIds()); // hier nie equipmentMissing,
                                                            // weil das Tor schon vorne greift
var live = {
  id: "sk_" + today().replace(/-/g,"") + "_" + Math.floor(Math.random()*1000),
  kind: "skill",
  date: today(), status: "live", startedAt: Date.now(),
  skillId: skillId, phase: prog.currentPhase,
  exercises: adv.exercises.map(function (e) {
    var sets = [];
    for (var i = 0; i < e.sets; i++) sets.push({ value: null, done: false, met: false });
    return { name: e.name, metric: e.metric, target: e.target, tempo: e.tempo || null, sets: sets };
  }),
  result: null
};
// -> UI.live = live; DB.live = live; (Resume nach Neustart inklusive)
```

Start-Vorschau und Beenden-Dialog (Speichern / Verwerfen / Abbrechen) werden vom Workout
**geerbt**, nur mit Skill-Inhalt befüllt. Verwerfen erzeugt keine Session-Zeile.

### 6.2 Live-Screen (`liveSkillSession()`)

Zweiter Renderpfad neben `liveSession()`. Trainings-Uhr, Pausen-Bar und Audio kommen
unverändert aus der vorhandenen Infrastruktur (jetzt als `RestTimer` gebündelt; da der
Skill-Screen in live.js liegt, sind dessen interne Helfer direkt erreichbar). Die Set-Rows
richten sich nach `metric` (Abschnitt 7). Die Langhantel-Felder (Gewicht, Plate-Hint,
Vorschlag) entfallen.

### 6.3 Abschluss (`finishSkillSession()`)

```js
var s = KS.UI.live; // kind === "skill"
var def = KS.skillById(s.skillId);
var ph  = def.phases[s.phase];

s.exercises.forEach(function (we, i) {
  var pe = ph.exercises[i];
  we.sets = (we.sets || []).filter(function (x) { return x.done; });
  we.sets.forEach(function (x) { x.met = E.skillSetMet(pe.metric, pe.target, x); });
});
s.result = E.skillSessionResult(ph.exercises, s.exercises);

var prog = KS.skillProgressFor(s.skillId);
if (s.result === "completed") {
  prog.consecutiveCount += 1;
  if (prog.consecutiveCount >= ph.consecutiveSessions) {
    prog.currentPhase += 1;
    prog.consecutiveCount = 0;
    if (prog.currentPhase >= def.phases.length) {
      prog.currentPhase = def.phases.length - 1; // bleibt auf letzter Phase
      prog.mastered = true;
    }
  }
} else if (s.result === "missed") {
  prog.consecutiveCount = 0;
} // skipped -> unveraendert

// als type:"skill"-Zeile ablegen (Yoga-Muster): entries leer, Aufzeichnung in skillWork
db().sessions.push({
  id: s.id, date: s.date, type: "skill", status: "done",
  durationSec: s.startedAt ? Math.round((Date.now()-s.startedAt)/1000) : 0,
  entries: [],
  skillWork: { skillId: s.skillId, phase: s.phase, result: s.result, exercises: s.exercises }
});
KS.UI.live = null; db().live = null; persist();
// danach in den Verlauf oder zurueck ins Training
```

`missed` wird also gespeichert und ist im Kalender/Verlauf sichtbar; nur Verwerfen lässt
keine Zeile entstehen.

---

## 7. Set-Row-Varianten (im Skill-Live-Screen)

Pro Phasenübung ein Unterblock; die Rows richten sich nach `metric`. Beide Varianten sind
reduzierte Rows, optisch an `.set-row.work` angelehnt.

**Variante A – `metric: "reps"`** (Band Pull-Up, Push-Up, Negativs …): pro Satz
Ziel-Anzeige, Zahleneingabe für geleistete Wiederholungen, Done-Checkbox.

**Variante B – `metric: "duration"`** (Dead Hang, Plank …): pro Satz Ziel-Zeit, Stoppuhr
+ Sekundenwert, Done-Checkbox. Die Stoppuhr nutzt die vorhandene Timer-/Audio-Infrastruktur
aus live.js (`playBeep`, `buzz`, `clickTick` – seit dem RestTimer-Umbau private Helfer in
live.js, direkt nutzbar; Pausen-Steuerung über `RestTimer`) – kein neuer Apparat.
Gestoppte Zeit landet in `value`, bleibt manuell überschreibbar.

**Gemischte Phase** (Pull-Up Phase 0): zwei Unterblöcke untereinander, jeder mit seiner
Variante.

**Equipment fehlt:** kommt im Skill-Live-Screen **nicht mehr** vor – das Tor greift schon
in der Auswahl (Abschnitt 6.1).

**Mastered:** der Skill ist weiter startbar (Erhaltung); der Screen zeigt einen dezenten
„gemeistert"-Hinweis, trainiert aber die letzte Phase normal.

Styling: neuer versionierter CSS-Block, Mobile sauber (720/560/430), Desktop unangetastet.

---

## 8. Migration (data.js, in `migrate(db)`)

Rein additiv – kein `db.migrations.<flag>` nötig:

```js
db.inventory = db.inventory || {};
if (!db.inventory.equipment) {
  db.inventory.equipment = defaultEquipment();
} else {
  var have = db.inventory.equipment.map(function (e) { return e.id; });
  defaultEquipment().forEach(function (d) { if (have.indexOf(d.id) < 0) db.inventory.equipment.push(d); });
}
db.skillProgress = db.skillProgress || [];
```

Der Equipment-Merge lässt später eingeführte Gerätetypen bei bestehenden Nutzern
auftauchen, ohne deren Auswahl zu überschreiben.

---

## 9. UI-Komponenten (Verortung)

| Komponente | Datei | Anlehnung an Bestehendes |
|---|---|---|
| Equipment-Inventar (Toggle pro Gerät) | `app.js`, Settings-View | Bars-Verwaltung |
| **Neuer „Skills"-Tab** | `app.js`, `TABS` + Views | **Journey-Tab** (Picker + Liste + Detail) |
| – Katalog/Picker (Skills durchblättern, „+ hinzufügen" = aktivieren) | `app.js` | `viewJourneyPicker` |
| – „Meine Skills"-Liste (aktuelle Phase, Fortschritt; deaktivieren / Phase zurück / zurücksetzen) | `app.js` | `viewJourneyManager` |
| – Skill-Detail (Phasen + Ziele wie feste Journey, Stand) | `app.js` | Journey-Dashboard / Detail |
| Skill-Kachel zum Trainieren (Auswahl, Auswahl-Tor) | `app.js`, Training-View | Workout-/Yoga-Kachel |
| Skill-Live-Screen + Abschluss | `live.js` | `liveSession` + Timer/Audio |
| Kalender-/Verlauf-Zweig `type:"skill"` | `app.js` | `type:"yoga"`-Zweig |
| Skill-Langzeit-Chart | `charts.js` | Journey-Chart |

**Skills-Tab, Liste:** kompakte Zusammenfassung je Skill, **aufklappbar (Akkordeon)** für
volle Phasen-/Ziel-Details, damit die Seite keine Phasen-Wand wird.

---

## 10. Sync (supabase.js)

Keine eigene Logik. `DB.skillProgress` und `DB.inventory.equipment` fließen automatisch in
`app_state.data` (jsonb). `type:"skill"`-Zeilen in `DB.sessions` ebenso. Die statische
`SKILLS` ist Code und wird nicht synchronisiert.

---

## 11. Implementierungsreihenfolge

Daten → testbare Engine → UI von unten nach oben → Integration → Visualisierung. Jeder
Schritt eine eigene Auslieferung mit eigenem Commit.

1. **data.js** – `SKILLS` (Pull-Up, Push-Up, optional Plank; `metric`/`target` pro Übung,
   `equipment`-Arrays), Helfer `skill()`/`skillPhase()`/`skEx()`, `defaultEquipment()`,
   Migration (Abschnitt 8), Exporte `KS.skillById`, `KS.skillProgressFor`. Kein UI.
2. **engine.js** – `FSE.skillSetMet` (reps/duration, Naht für Objekt-`target`),
   `FSE.skillSessionResult` (ohne Equipment-Eingang), `FSE.skillAdvice` (inkl.
   `equipmentMissing` fürs Tor) + Unit-Tests. Suite grün.
3. **app.js** – Equipment-Inventar-UI in den Einstellungen.
4. **app.js** – neuer **Skills-Tab**: Katalog/Picker + „Meine Skills"-Liste (Akkordeon,
   aktivieren/deaktivieren/Phase zurück/zurücksetzen) + Skill-Detail. `TABS` erweitern.
5. **live.js + app.js** – Skill-Kachel im Training (Auswahl + Auswahl-Tor),
   `buildSkillLive`, `liveSkillSession` (Set-Row-Varianten, Stoppuhr über vorhandene
   Timer-Infrastruktur: `RestTimer` + private Audio-Helfer in live.js), Start-/Ende-Dialog
   wiederverwenden, `finishSkillSession` (`type:"skill"`-Zeile + `skillProgress`-Fortschreibung).
6. **app.js** – Kalender- und Verlauf-Zweig für `type:"skill"`.
7. **charts.js / app.js** – Skill-Langzeit-Chart im Detail.

---

## 12. Konventionen (gelten weiter)

- Kommunikation Deutsch, informell, echte Umlaute, keine Emojis, nichts als „final"
  bezeichnen, außer ausdrücklich angefordert.
- `engine.js` reine Logik ohne DB-Kenntnis. Desktop-Layout unangetastet, Mobile sauber
  (720/560/430).
- Vor Auslieferung: `node --check` für berührte Skripte, Engine-Tests grün,
  CSS-Klammerbalance. CSS-Änderungen als versionierte Blöcke mit Kommentar.
- Non-destruktiv versionieren; `migrate(db)` feldweise erweitern, `db.migrations.<flag>`
  nur für echte Strukturumbauten.
- Dateien nie direkt in der Arbeitskopie bearbeiten – über Filesystem holen, in
  `/home/claude/` patchen, validieren, ausliefern. `str_replace` muss exakt einmal greifen
  (`grep -c`).
- Nach jeder Auslieferung automatisch Git-Commit-Message (Betreff + Body, zwei separate
  Blöcke).

---

## 13. Offen / Erweiterungsideen

- **Konditionierung/Laufen**: eigene Design-Runde, gemeinsam + recherchiert. Bringt neue
  Metrik(en) (`distance`, `distance_time`/Pace), Objekt-`target`, und vermutlich ein
  Nicht-Satz-Modell (ein Effort bzw. Intervalle statt „N gleiche Sätze").
- Weitere Skills: Pistol Squat, Dip, Handstand, Turkish Get-Up.
- Pro-Satz-Ziele statt einheitlichem `target` je Übung (z. B. Plank 30/40/50s).
- Benachrichtigung bei Phasenabschluss und bei Meisterung.
- `recomputeSkillProgress()` zur Rückrechnung aus `sessions[].skillWork`.
- Skill-Empfehlung passend zum Journey-Fokus.
