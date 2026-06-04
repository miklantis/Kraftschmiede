# Kraftschmiede – Skills-System: Konzeptdokument

## Kontext

Dieses Dokument beschreibt das geplante Skills-System für die App **Kraftschmiede** –
eine browserbasierte Trainings-App (Vanilla JS, kein Build-Schritt, localStorage + optionales Supabase).

Lokale Arbeitskopie: `/Users/kadir.karakadilar/Documents/Kraftschmiede/`
GitHub: `miklantis/Kraftschmiede` (Branch `main`, öffentlich)
Live: `https://miklantis.github.io/Kraftschmiede/`

### Bestehende Dateistruktur

| Datei | Rolle |
|---|---|
| `index.html` | Einstieg, lädt Skripte in fester Reihenfolge |
| `styles.css` | Industrial-Dark-Theme, CSS-Variablen, responsive |
| `engine.js` | Reine Rechen-Engine (`window.FSE`) – nur bei echter Logikänderung anfassen |
| `app.js` | Komplette App-Logik und Rendering (`window.KS_APP`), ~1400 Zeilen |
| `supabase.js` | Cloud-Sync-Schicht |
| `config.js` | Supabase-Zugangsdaten (nur anon-Key) |

localStorage-Schlüssel: `fs_db_v013` (gesamter App-Zustand)

### Bestehende relevante DB-Felder

```js
DB.bars        // Langhantel-Inventar (existiert, hat eigene Logik)
DB.live        // Laufende Session
DB.sessions    // Abgeschlossene Sessions
DB.journeys    // Journey-Definitionen
```

---

## Ziel des Skills-Systems

Nutzer können Bewegungsfertigkeiten (z. B. Strict Pull-Up, Pushup) als **Skill** aktivieren
und schrittweise durch Phasen entwickeln. Die Skill-Arbeit läuft **parallel zur Journey** –
entkoppelter Fortschritt – taucht aber **am Ende jedes Journey-Workouts** automatisch auf.

Referenz-UI: Freeletics „Skill Verbesserungen" (Screenshots liegen vor).

---

## Entschiedene Designprinzipien

### 1. Maximal ein aktiver Skill gleichzeitig
Neuen Skill aktivieren → vorheriger wird automatisch deaktiviert.
Fortschritt des deaktivierten Skills bleibt erhalten.

### 2. Kein Equipment = neutral, kein Rückschritt
Fehlt das Equipment für die aktuelle Phase, macht der Nutzer den Skill-Block einfach nicht.
Das wird **nicht** als „gescheitert" gewertet. Die Phase-Kriterien zählen nur
**abgeschlossene Sessions**. Fehlende Sessions werden ignoriert.
Es gibt keinen automatischen Rückschritt durch Auslassen.

### 3. Skill-Fortschritt ist von der Journey entkoppelt
Journey-Deload, Pause oder Wechsel haben keinen Einfluss auf den Skill-Fortschritt
und umgekehrt.

### 4. Skill-Block sitzt am Ende des Workouts
Nach dem letzten Hauptsatz, vor dem Abschluss der Session.

### 5. Manuelle Regression möglich
Nach einer langen Pause oder Leistungsabfall kann der Nutzer:
- Eine Phase manuell zurückgehen (−1)
- Den Skill komplett zurücksetzen (Phase 0)

Kein automatischer Rückstufungs-Mechanismus – volle Kontrolle beim Nutzer.

---

## Datenmodell

### `DB.skills` – Skill-Definitionen (statisch, eingebaut in `app.js`)

```js
[
  {
    id: "strict-pullup",
    name: "Strict Pull-Up",
    category: "gymnastics",   // gymnastics | strength | conditioning
    phases: [
      {
        index: 0,
        label: "Grundspannung",
        description: "Dead Hang & Skapula-Kontrolle",
        equipment: [],         // kein Equipment erforderlich
        exercises: [
          { name: "Dead Hang",        sets: 3, reps: null, duration: 20 },
          { name: "Scapular Pull-Up", sets: 3, reps: 5 }
        ],
        completionCriteria: {
          type: "reps",         // reps | duration | sessions
          target: 5,
          consecutiveSessions: 2  // 2 aufeinanderfolgende Workouts erfüllt = Phase abgeschlossen
        }
      },
      {
        index: 1,
        label: "Band-Unterstützung (stark)",
        equipment: ["band-heavy"],
        exercises: [
          { name: "Band Pull-Up (stark)", sets: 3, reps: 6 }
        ],
        completionCriteria: { type: "reps", target: 6, consecutiveSessions: 2 }
      },
      {
        index: 2,
        label: "Band-Unterstützung (mittel)",
        equipment: ["band-medium"],
        exercises: [
          { name: "Band Pull-Up (mittel)", sets: 3, reps: 6 }
        ],
        completionCriteria: { type: "reps", target: 6, consecutiveSessions: 2 }
      },
      {
        index: 3,
        label: "Band-Unterstützung (leicht)",
        equipment: ["band-light"],
        exercises: [
          { name: "Band Pull-Up (leicht)", sets: 3, reps: 8 }
        ],
        completionCriteria: { type: "reps", target: 8, consecutiveSessions: 2 }
      },
      {
        index: 4,
        label: "Negativs & Übergang",
        equipment: ["pullup-bar"],
        exercises: [
          { name: "Negative Pull-Up", sets: 3, reps: 5, tempo: "5 Sek. ablassen" }
        ],
        completionCriteria: { type: "reps", target: 5, consecutiveSessions: 2 }
      },
      {
        index: 5,
        label: "Freier Klimmzug",
        equipment: ["pullup-bar"],
        exercises: [
          { name: "Strict Pull-Up", sets: 3, reps: 3 }
        ],
        completionCriteria: { type: "reps", target: 12, consecutiveSessions: 2 }
        // Endkriterium: 3 × 12–13 freie Klimmzüge = Skill gemeistert
      }
    ]
  },
  {
    id: "pushup",
    name: "Pushup",
    category: "gymnastics",
    phases: [
      // analog aufgebaut, Phasen: Knie-Liegestütze → erhöhte Hände → volle Liegestütze → archer → etc.
    ]
  }
  // weitere Skills folgen
]
```

---

### `DB.equipment` – Skill-Equipment-Inventar (getrennt von `DB.bars`)

**Begründung für Trennung:** `DB.bars` hat Gewicht, Plate-Loading-Logik und Kalkulations-Engine.
Skill-Equipment hat keine Kiloangabe – nur eine Kategorie, die eine Phase definiert.

```js
DB.equipment = [
  { id: "band-heavy",   label: "Band stark",       active: true  },
  { id: "band-medium",  label: "Band mittel",       active: true  },
  { id: "band-light",   label: "Band leicht",       active: false },
  { id: "pullup-bar",   label: "Klimmzugstange",    active: true  },
  { id: "rings",        label: "Ringe",             active: false },
  { id: "parallettes",  label: "Parallettes",       active: false }
]
```

Der Nutzer pflegt im Inventar, was er besitzt (`active: true`).
Die Engine fragt nur: „Hat der User das Equipment für diese Phase?" → Ja/Nein.

---

### `DB.skillProgress` – Nutzer-Fortschritt (dynamisch, wird persistiert)

```js
DB.skillProgress = [
  {
    skillId: "strict-pullup",
    active: true,
    currentPhase: 1,
    consecutiveCount: 1,     // zählt aufeinanderfolgende erfolgreiche Sessions in aktueller Phase
    history: [
      {
        date: "2025-06-04",
        phase: 0,
        result: "completed",  // completed | skipped | reset
        sets: [
          { reps: 5, done: true },
          { reps: 5, done: true },
          { reps: 5, done: true }
        ]
      },
      {
        date: "2025-06-07",
        phase: 0,
        result: "completed",
        // → consecutiveCount erreicht 2 → Phase 0 abgeschlossen → currentPhase: 1
      },
      {
        date: "2025-10-01",
        phase: 1,
        result: "reset",      // manuelle Regression
        newPhase: 0
      }
    ]
  }
]
```

---

## Coach-Engine-Logik (in `engine.js`)

Neue Funktion: `FSE.skillAdvice(skillId, db)`

```
Eingabe:  aktiver Skill, aktueller DB-Zustand
Ausgabe:  { phase, exercises, equipmentMissing, readyToAdvance }

Logik:
1. Lade aktuellen skillProgress für skillId
2. Prüfe ob Equipment der aktuellen Phase vorhanden (DB.equipment)
   → equipmentMissing: true/false
3. Prüfe consecutiveCount gegen completionCriteria.consecutiveSessions
   → readyToAdvance: true/false
4. Gib Phase-Übungen zurück
```

**Phase-Fortschritt:**
- Session abgeschlossen + Kriterium erfüllt → `consecutiveCount++`
- `consecutiveCount >= completionCriteria.consecutiveSessions` → `currentPhase++`, `consecutiveCount = 0`
- Session abgebrochen oder nicht gemacht → `consecutiveCount` bleibt unverändert (kein Reset!)

---

## Integration in Workouts

### Wo es auftaucht

Am **Ende jedes Journey-Workouts**, nach dem letzten Hauptsatz.
Nur wenn ein Skill aktiv ist (`DB.skillProgress.find(s => s.active)`).

### Workout-Session-Eintrag (Erweiterung)

```js
// In DB.sessions[n] – bestehende Struktur wird erweitert
{
  id: "session-2025-06-04",
  workoutId: "...",
  // ... bestehende Felder ...
  skillWork: {
    skillId: "strict-pullup",
    phase: 1,
    sets: [
      { reps: 6, done: true },
      { reps: 6, done: true },
      { reps: 5, done: false }
    ],
    result: "completed"   // completed | skipped (kein Equipment) | partial
  }
}
```

`result: "skipped"` wenn Equipment fehlt → zählt nicht für `consecutiveCount`,
ist aber kein Rückschritt.

---

## UI-Komponenten (geplant)

### Skill-Verwaltung (neue Seite oder Modal)
- Liste aller verfügbaren Skills
- Aktiver Skill hervorgehoben
- Pro Skill: aktuelle Phase, Fortschritts-Anzeige, Aktivieren/Deaktivieren
- Regressions-Buttons: „Phase zurück" und „Komplett zurücksetzen"

### Skill-Block im Workout
- Karte am Ende des Workouts
- Zeigt: Skill-Name, aktuelle Phase, Übungen mit Set-/Wdh.-Vorschlag
- Satz-Checkboxen (wie bestehende Set-Rows)
- Wenn Equipment fehlt: Hinweistext, Block ist ausgeblendet oder als „nicht möglich" markiert

### Inventar-Erweiterung
- Neuer Abschnitt in den Einstellungen: „Skill-Equipment"
- Toggle pro Equipment-Item

---

## Implementierungsreihenfolge (empfohlen)

1. **Schema** – `DB.skills`, `DB.equipment`, `DB.skillProgress` in `app.js` anlegen,
   `migrate()` erweitern. Noch kein UI.

2. **Engine** – `FSE.skillAdvice()` in `engine.js`, Unit-Tests dazu.

3. **Inventar-UI** – Equipment-Verwaltung in den Einstellungen.

4. **Skill-Verwaltungs-UI** – Skill-Liste, Aktivieren/Deaktivieren, Regression.

5. **Workout-Integration** – Skill-Block am Ende der Workout-Ansicht,
   Erweiterung von `finishSession()` um `skillWork`.

6. **Skill-Detail** – Phasen-Übersicht, History, Fortschritts-Visualisierung.

---

## Konventionen (gelten weiterhin)

- Alle Kommunikation auf Deutsch, informell, echte Umlaute
- `engine.js` und Desktop-Layout nur bei expliziter Anforderung anfassen
- Vor Auslieferung: `node --check`, CSS-Klammerbalance, Engine-Tests grün
- CSS-Änderungen als versionierte Blöcke mit Kommentar
- Nach jeder Auslieferung automatisch Git-Commit-Message (Betreff + Body, zwei separate Blöcke)
- Dateien nie direkt in der lokalen Arbeitskopie bearbeiten –
  immer über Filesystem-MCP holen, in `/home/claude/` patchen, validieren, dann ausliefern
- `str_replace` muss exakt einmal greifen; Validierung mit `grep -c`

---

## Noch offen / Erweiterungsideen

- Weitere Skills definieren (Pistol Squat, Turkish Get-Up, Handstand, Dip, etc.)
- Skill-Erfolgs-Benachrichtigung wenn Phase abgeschlossen
- Langzeit-Fortschritts-Chart (D3, analog Journey-Chart)
- Skill-Empfehlung basierend auf aktuellem Journey-Typ
