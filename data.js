/* Kraftschmiede – data.js (Schema 0.14). Vanilla JS, framework-frei.
   Seed-Daten, Domaenen-Helfer (Uebungen/Templates/Phasen), kuratierte
   Journey-Vorlagen und die Schema-Migration. Aus app.js ausgelagert.
   Greift ueber window.KS nur auf SCHEMA und today() zu (beides aus app.js,
   dort frueh exportiert, da seed()/migrate() bereits beim Init laufen).
   Reine Datenschicht: keine DOM-, Engine- oder Sync-Abhaengigkeit. */
(function () {
  "use strict";
  var KS = (window.KS = window.KS || {});

  /* duenner Wrapper auf geteilten Helfer aus app.js (window.KS) */
  function today() { return KS.today(); }

  /* =========================================================
     Seed-Daten + Domaenen-Helfer
     ========================================================= */
  function seed() {
    return {
      schemaVersion: KS.SCHEMA,
      settings: {
        rmFormula: "mean",
        recoveryWindows: { default: 48, squat: 48, deadlift: 72 },
        weeklyFrequencyTarget: 3,
        step: 2.5,
        unit: "kg",
        timers: { setRestSec: 120, exerciseRestSec: 180, autoStart: true, sound: true, vibrate: true }
      },
      inventory: {
        bars: [
          { id: "bar_std", name: "Standard", weight: 20, default: true },
          { id: "bar_short", name: "Kurz / Leicht", weight: 15, default: false }
        ],
        plates: [1.25, 2.5, 5, 10, 15, 20, 25]
      },
      exercises: [
        ex("back_squat", "Back Squat", "strength", "lift1", "bar_std", ["legs", "glutes"], [6, 10], 40, 48),
        ex("bench_press", "Bench Press", "strength", "lift2", "bar_std", ["chest", "triceps", "shoulders"], [8, 12], 30),
        ex("deadlift", "Deadlift", "strength", "lift1", "bar_std", ["back", "legs", "glutes"], [4, 8], 50, 72),
        ex("bent_row", "Bent Row", "strength", "lift2", "bar_std", ["back", "biceps"], [8, 12], 30),
        ex("push_press", "Push Press", "strength", "lift1", "bar_std", ["shoulders", "triceps"], [5, 10], 25),
        ex("barbell_curl", "Barbell Curl", "strength", "lift2", "bar_std", ["biceps"], [8, 12], 20),
        core("plate_situps", "Plate Situps", [12, 20], 5),
        core("plate_twist", "Plate Twist", [12, 20], 5),
        core("plate_cocoon", "Plate Cocoon", [10, 16], 5),
        ex("lunge", "Lunge", "strength", "lift1", "bar_std", ["legs", "glutes"], [8, 12], 30, 48, false),
        ex("pull_over", "Pull Over", "strength", "lift2", "bar_std", ["back", "chest"], [8, 12], 20, 48)
      ],
      templates: [
        tpl("t_a", "A", "back_squat", "bench_press", "plate_situps"),
        tpl("t_b", "B", "deadlift", "bent_row", "plate_twist"),
        tpl("t_c", "C", "back_squat", "push_press", "pull_over"),
        tpl("t_d", "D", "deadlift", "barbell_curl", "plate_situps"),
        tpl("t_e", "E", "push_press", "barbell_curl", "pull_over"),
        tpl("t_f", "F", "bench_press", "bent_row", "plate_cocoon")
      ],
      journeys: [
        {
          id: "j_2026_aufbau", name: "Aufbau 2026", active: true,
          startDate: today(), currentPhaseId: "p0", currentWeek: 1,
          phases: [
            phase("p0", "Wiedereinstieg", "reentry", 2, 2, 2, null),
            phase("p1", "Hypertrophie", "hypertrophy", 5, 2, 4, 4),
            phase("p2", "Maximalkraft", "strength", 5, 3, 5, 4),
            phase("p3", "Übergang / Test", "test", 1, 2, 2, null)
          ]
        }
      ],
      sessions: [],
      bodyLog: []
    };
  }
  // Funktions-Kategorie einer Uebung (was sie ist), unabhaengig von der Position im Workout.
  // Initialklassifikation der bekannten Uebungen; eigene/unbekannte defaulten auf "main".
  function kindOf(id, profile) {
    if (profile === "core") return "core";
    if (id === "barbell_curl" || id === "pull_over") return "accessory";
    return "main";
  }
  function kindLabel(k) { return ({ main: "Hauptübung", accessory: "Assistenz", core: "Core" })[k] || k || "–"; }
  function ex(id, name, profile, slot, barId, mg, repRange, w, rec, active) {
    return {
      id: id, name: name, category: profile === "core" ? "core" : "barbell",
      profile: profile, kind: kindOf(id, profile), equipment: "barbell", barId: barId,
      metrics: ["weight", "reps", "volume", "score", "est1RM"],
      muscleGroups: mg, repRange: repRange, targetScore: 3, workWeight: w,
      recoveryHours: rec || 48, rm: null, rmAsOf: null, rmStale: false,
      active: active === false ? false : true
    };
  }
  function core(id, name, repRange, w) {
    return {
      id: id, name: name, category: "core", profile: "core", kind: "core",
      equipment: "plate", barId: null, metrics: ["weight", "reps", "volume", "score"],
      muscleGroups: ["core"], repRange: repRange, targetScore: 3, workWeight: w,
      recoveryHours: 24, rm: null, rmAsOf: null, rmStale: false, active: true
    };
  }
  function tpl(id, name, l1, l2, c) {
    var items = [];
    if (l1) items.push({ exerciseId: l1, role: "primary" });
    if (l2) items.push({ exerciseId: l2, role: "secondary" });
    if (c) items.push({ exerciseId: c, role: "core" });
    return { id: id, name: name, items: items };
  }
  function phase(id, name, focus, weeks, s0, s1, dl, rt) {
    return { id: id, name: name, focus: focus, weeks: weeks, setsStart: s0, setsEnd: s1, deloadWeek: dl, repTarget: rt || repTargetForFocus(focus) };
  }
  // Phasen-Fokus -> Ziel-Wiederholungsband (steuert Doppelprogression im Training).
  function repTargetForFocus(focus) {
    switch (focus) {
      case "reentry": return [5, 8];
      case "hypertrophy": return [8, 12];
      case "strength": return [4, 6];
      case "power": return [3, 5];
      case "endurance": return [12, 18];
      case "test": return [2, 4];
      default: return null; // maintenance/unbekannt -> Übungs-repRange
    }
  }
  function focusLabel(f) {
    return ({ reentry: "Wiedereinstieg", hypertrophy: "Hypertrophie", strength: "Maximalkraft", power: "Schnellkraft", endurance: "Kraftausdauer", test: "Test/Peak", maintenance: "Erhaltung" })[f] || f;
  }

  /* Kuratierte Journey-Vorlagen. Phasen: n=Name f=Fokus w=Wochen s0/s1=Satz-Rampe dl=Deload-Woche rt=Repband */
  var JOURNEY_TEMPLATES = [
    {
      id: "reentry_build", name: "Wiedereinstieg & Aufbau",
      tagline: "Sauber zurück und systematisch zu mehr Kraft",
      forWhom: "Nach Pause, Verletzung oder als Einstieg ins strukturierte Langhanteltraining.",
      summary: "Beginnt bewusst leicht, um Technik und Belastbarkeit aufzubauen, steigert dann Volumen für Muskelaufbau, schaltet auf Maximalkraft um und schließt mit einer Testwoche für neue Bestwerte.",
      phases: [
        { n: "Wiedereinstieg", f: "reentry", w: 2, s0: 2, s1: 2, dl: null, rt: [5, 8] },
        { n: "Hypertrophie", f: "hypertrophy", w: 5, s0: 2, s1: 4, dl: 4, rt: [8, 12] },
        { n: "Maximalkraft", f: "strength", w: 5, s0: 3, s1: 5, dl: 4, rt: [4, 6] },
        { n: "Übergang / Test", f: "test", w: 1, s0: 2, s1: 2, dl: null, rt: [2, 4] }
      ]
    },
    {
      id: "hypertrophy_block", name: "Hypertrophie-Block",
      tagline: "Maximaler Muskelaufbau über höheres Volumen",
      forWhom: "Grundtechnik sitzt, Ziel ist Muskelmasse. Setzt regelmäßiges Training voraus.",
      summary: "Zwei Akkumulationsblöcke mit ansteigendem Volumen im Bereich 8–12 Wiederholungen, getrennt durch eine Entlastung. Fokus auf Reizsetzung und Wachstum, ohne in den schweren Maximalkraftbereich zu gehen.",
      phases: [
        { n: "Akkumulation I", f: "hypertrophy", w: 4, s0: 3, s1: 5, dl: null, rt: [8, 12] },
        { n: "Deload", f: "maintenance", w: 1, s0: 2, s1: 2, dl: 1, rt: [8, 10] },
        { n: "Akkumulation II", f: "hypertrophy", w: 4, s0: 4, s1: 6, dl: 4, rt: [8, 12] }
      ]
    },
    {
      id: "strength_peak", name: "Maximalkraft / Peaking",
      tagline: "Schwere Lasten, gezielt zum 1RM",
      forWhom: "Fortgeschritten, Technik stabil. Ziel ist messbar mehr Kraft auf den Hauptübungen.",
      summary: "Baut eine Kraftbasis im Bereich 4–6 Wiederholungen, intensiviert auf 3–5 mit höherer Last und reduziertem Volumen und gipfelt in einer Peak- und Testphase für neue Maxima.",
      phases: [
        { n: "Kraftbasis", f: "strength", w: 4, s0: 3, s1: 5, dl: null, rt: [4, 6] },
        { n: "Intensivierung", f: "power", w: 3, s0: 3, s1: 4, dl: 3, rt: [3, 5] },
        { n: "Peak & Test", f: "test", w: 2, s0: 2, s1: 3, dl: null, rt: [2, 4] }
      ]
    },
    {
      id: "conditioning", name: "Kraftausdauer / Kondition",
      tagline: "Work Capacity und allgemeine Fitness",
      forWhom: "Wer Ausdauer in der Kraft, höhere Wiederholungen und Konditionierung sucht.",
      summary: "Höhere Wiederholungszahlen (12–18) bei kürzeren Pausen über zwei Blöcke. Verbessert muskuläre Ausdauer und Belastungstoleranz, gute Brücke zu funktionellem Training und Kettlebell-Arbeit.",
      phases: [
        { n: "Aufbau Kapazität", f: "endurance", w: 3, s0: 3, s1: 5, dl: null, rt: [12, 18] },
        { n: "Verdichtung", f: "endurance", w: 3, s0: 4, s1: 6, dl: 3, rt: [12, 15] }
      ]
    },
    {
      id: "maintenance", name: "Erhaltung / Minimaldosis",
      tagline: "Form halten mit wenig Zeit",
      forWhom: "Stressige Phasen, Reisen, wenig Zeit. Ziel ist Erhalt statt Fortschritt.",
      summary: "Konstantes, geringes Volumen ohne Progressionsdruck. Hält Kraft und Technik mit minimalem Aufwand. Beliebig wiederholbar, bis wieder ein Aufbau- oder Kraftblock ansteht.",
      phases: [
        { n: "Erhaltung", f: "maintenance", w: 4, s0: 2, s1: 2, dl: null, rt: [6, 10] }
      ]
    },
    {
      id: "block_3m", name: "3-Monats-Block (Aufbau → Kraft)",
      tagline: "Rund 3 Monate: erst Masse, dann Kraft, dann Test",
      forWhom: "Solide Grundlage vorhanden, klares Quartalsziel. Regelmäßiges Training über drei Monate.",
      summary: "Ein kompletter Quartalszyklus: ein Hypertrophie-Block für Muskelmasse, ein Maximalkraft-Block für Last und eine kurze Peak- und Testphase. Jeweils mit Entlastungswoche, sodass der Fortschritt planbar bleibt.",
      phases: [
        { n: "Hypertrophie", f: "hypertrophy", w: 6, s0: 3, s1: 6, dl: 6, rt: [8, 12] },
        { n: "Maximalkraft", f: "strength", w: 5, s0: 3, s1: 5, dl: 5, rt: [4, 6] },
        { n: "Peak & Test", f: "test", w: 2, s0: 2, s1: 3, dl: null, rt: [2, 4] }
      ]
    },
    {
      id: "periodized_6m", name: "6-Monats-Periodisierung",
      tagline: "Rund 6 Monate: langfristiger, blockweiser Aufbau",
      forWhom: "Wer langfristig plant und über ein halbes Jahr strukturiert auf deutlich mehr Kraft und Masse hinarbeiten will.",
      summary: "Ein langfristiger Plan über sechs Monate: sanfter Einstieg, zwei Hypertrophie-Blöcke und zwei Kraftblöcke im Wechsel, abgeschlossen durch eine Peak- und Testphase. Mehrere Entlastungswochen halten die Belastung nachhaltig.",
      phases: [
        { n: "Wiedereinstieg", f: "reentry", w: 2, s0: 2, s1: 2, dl: null, rt: [5, 8] },
        { n: "Hypertrophie I", f: "hypertrophy", w: 5, s0: 3, s1: 5, dl: 5, rt: [8, 12] },
        { n: "Kraft I", f: "strength", w: 4, s0: 3, s1: 5, dl: 4, rt: [4, 6] },
        { n: "Hypertrophie II", f: "hypertrophy", w: 5, s0: 4, s1: 6, dl: 5, rt: [8, 12] },
        { n: "Maximalkraft", f: "strength", w: 6, s0: 3, s1: 5, dl: 6, rt: [3, 5] },
        { n: "Peak & Test", f: "test", w: 2, s0: 2, s1: 3, dl: null, rt: [2, 4] }
      ]
    }
  ];
  function templateWeeks(t) { return t.phases.reduce(function (a, p) { return a + p.w; }, 0); }

  /* =========================================================
     Schema-Migration (non-destruktiv, feldweise)
     ========================================================= */
  function migrate(db) {
    db.schemaVersion = KS.SCHEMA;
    db.sessions = db.sessions || [];
    db.journeys = db.journeys || [];
    db.exercises = db.exercises || [];
    db.bodyLog = db.bodyLog || [];
    db.templates = db.templates || [];
    // Pausen-Timer-Settings nachruesten (non-destruktiv, feldweise)
    db.settings = db.settings || {};
    if (!db.settings.timers) db.settings.timers = {};
    var TMR = db.settings.timers;
    if (TMR.setRestSec == null) TMR.setRestSec = 120;
    if (TMR.exerciseRestSec == null) TMR.exerciseRestSec = 180;
    if (TMR.autoStart == null) TMR.autoStart = true;
    if (TMR.sound == null) TMR.sound = true;
    if (TMR.vibrate == null) TMR.vibrate = true;
    // Journey-/Phasen-Felder nachrüsten (non-destruktiv)
    db.journeys.forEach(function (j) {
      if (!j.status) j.status = "active";
      (j.phases || []).forEach(function (p) { if (!p.repTarget) p.repTarget = repTargetForFocus(p.focus); });
    });
    // genau eine aktive Journey sicherstellen
    if (db.journeys.length) {
      var act = db.journeys.filter(function (j) { return j.active; });
      if (act.length === 0) {
        var cand = db.journeys.find(function (j) { return j.status !== "archived"; }) || db.journeys[0];
        cand.active = true;
      } else if (act.length > 1) {
        act.slice(1).forEach(function (j) { j.active = false; });
      }
    }
    // Einmalige Migration (2026): Pull Over aktivieren und in den Einheiten C und E
    // den Core-Slot durch Pull Over ersetzen. Greift genau einmal; spaetere manuelle
    // Aenderungen werden nicht zurueckgesetzt.
    db.migrations = db.migrations || {};
    if (!db.migrations.pulloverSlots) {
      var po = db.exercises.find(function (e) { return e.id === "pull_over"; });
      if (!po) db.exercises.push(ex("pull_over", "Pull Over", "strength", "lift2", "bar_std", ["back", "chest"], [8, 12], 20, 48));
      else po.active = true;
      db.templates.forEach(function (t) {
        if (t.id !== "t_c" && t.id !== "t_e") return;
        if (Array.isArray(t.items)) {
          var ci = t.items.find(function (it) { return it.role === "core"; });
          if (ci) ci.exerciseId = "pull_over"; else t.items.push({ exerciseId: "pull_over", role: "core" });
        } else { t.core = "pull_over"; }
      });
      db.migrations.pulloverSlots = true;
    }
    // Einmalige Migration: Templates von festen Slots (lift1/lift2/core) auf die
    // geordnete items-Liste umstellen. Laeuft nach pulloverSlots, damit die korrekten
    // Slot-Werte uebernommen werden. role ist ein beschreibender Default, frei aenderbar.
    if (!db.migrations.templateItems) {
      db.templates.forEach(function (t) {
        if (Array.isArray(t.items)) return;
        var items = [];
        if (t.lift1) items.push({ exerciseId: t.lift1, role: "primary" });
        if (t.lift2) items.push({ exerciseId: t.lift2, role: "secondary" });
        if (t.core) items.push({ exerciseId: t.core, role: "core" });
        t.items = items;
        delete t.lift1; delete t.lift2; delete t.core;
      });
      db.migrations.templateItems = true;
    }
    // Einmalige Migration: Uebungseigenschaft slot (lift1/lift2/core, eine Position)
    // durch kind ersetzen (main/accessory/core, eine Kategorie). Position steckt jetzt
    // im Template-Item, nicht mehr an der Uebung.
    if (!db.migrations.exerciseKind) {
      db.exercises.forEach(function (e) {
        if (!e.kind) e.kind = kindOf(e.id, e.profile);
        delete e.slot;
      });
      db.migrations.exerciseKind = true;
    }
  }

  /* Export an den geteilten Namespace. seed/migrate werden beim Init
     gebraucht; die uebrigen von Views/Journey-Logik in app.js. */
  KS.seed = seed;
  KS.migrate = migrate;
  KS.kindLabel = kindLabel;
  KS.phase = phase;
  KS.repTargetForFocus = repTargetForFocus;
  KS.focusLabel = focusLabel;
  KS.templateWeeks = templateWeeks;
  KS.JOURNEY_TEMPLATES = JOURNEY_TEMPLATES;
})();
