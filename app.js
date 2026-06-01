/* Fitness-System – App v0.1 (Schema 0.13). Vanilla JS, framework-frei.
   Setzt window.FSE (engine.js) voraus. */
(function () {
  "use strict";
  var E = window.FSE;
  var SCHEMA = "0.13";

  /* =========================================================
     Persistenz: localStorage mit In-Memory-Fallback
     ========================================================= */
  var KEY = "fs_db_v013";
  var Store = {
    persistent: true,
    mem: null,
    test: function () {
      try { localStorage.setItem("__fs_t", "1"); localStorage.removeItem("__fs_t"); return true; }
      catch (e) { return false; }
    },
    load: function () {
      if (!this.test()) { this.persistent = false; return this.mem; }
      try { var raw = localStorage.getItem(KEY); return raw ? JSON.parse(raw) : null; }
      catch (e) { return null; }
    },
    save: function (db) {
      this.mem = db;
      if (!this.persistent) return false;
      try { localStorage.setItem(KEY, JSON.stringify(db)); return true; }
      catch (e) { this.persistent = false; return false; }
    },
    wipe: function () { try { localStorage.removeItem(KEY); } catch (e) {} this.mem = null; }
  };

  /* =========================================================
     Seed-Daten
     ========================================================= */
  function seed() {
    return {
      schemaVersion: SCHEMA,
      settings: {
        rmFormula: "mean",
        recoveryWindows: { default: 48, squat: 48, deadlift: 72 },
        weeklyFrequencyTarget: 3,
        step: 2.5,
        unit: "kg"
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
  function ex(id, name, profile, slot, barId, mg, repRange, w, rec, active) {
    return {
      id: id, name: name, category: profile === "core" ? "core" : "barbell",
      profile: profile, slot: slot, equipment: "barbell", barId: barId,
      metrics: ["weight", "reps", "volume", "score", "est1RM"],
      muscleGroups: mg, repRange: repRange, targetScore: 3, workWeight: w,
      recoveryHours: rec || 48, rm: null, rmAsOf: null, rmStale: false,
      active: active === false ? false : true
    };
  }
  function core(id, name, repRange, w) {
    return {
      id: id, name: name, category: "core", profile: "core", slot: "core",
      equipment: "plate", barId: null, metrics: ["weight", "reps", "volume", "score"],
      muscleGroups: ["core"], repRange: repRange, targetScore: 3, workWeight: w,
      recoveryHours: 24, rm: null, rmAsOf: null, rmStale: false, active: true
    };
  }
  function tpl(id, name, l1, l2, c) { return { id: id, name: name, lift1: l1, lift2: l2, core: c }; }
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
     State
     ========================================================= */
  var DB = Store.load() || seed();

  /* Dashboard: angeheftete Graphen. Bewusst SEPARAT gespeichert (eigener Key),
     daher NICHT Teil von DB und nicht im JSON-Export/Import. */
  var DASH_KEY = "fs_dash_v013";
  var DASH = (function () { try { if (!Store.persistent) return []; var r = localStorage.getItem(DASH_KEY); return r ? JSON.parse(r) : []; } catch (e) { return []; } })();
  function dashSave() { try { if (Store.persistent) localStorage.setItem(DASH_KEY, JSON.stringify(DASH)); } catch (e) {} }
  function dashHas(exId, metric) { return DASH.some(function (d) { return d.exerciseId === exId && d.metric === metric; }); }
  function dashToggle(exId, metric) { var i = DASH.findIndex(function (d) { return d.exerciseId === exId && d.metric === metric; }); if (i >= 0) DASH.splice(i, 1); else DASH.push({ exerciseId: exId, metric: metric }); dashSave(); }
  function dashMove(i, dir) { var j = i + dir; if (j < 0 || j >= DASH.length) return; var t = DASH[i]; DASH[i] = DASH[j]; DASH[j] = t; dashSave(); }
  function dashRemove(i) { if (i >= 0 && i < DASH.length) { DASH.splice(i, 1); dashSave(); } }
  function dashReorder(from, to) { if (from === to || from < 0 || to < 0 || from >= DASH.length || to >= DASH.length) return; var item = DASH.splice(from, 1)[0]; DASH.splice(to, 0, item); dashSave(); }

  migrate(DB);
  var UI = { tab: "training", detail: null, live: null, importPreview: null, journeyPicker: false, calMonth: null, plateHide: {}, menuOpen: false };

  function migrate(db) {
    if (!db.schemaVersion) db.schemaVersion = SCHEMA;
    db.sessions = db.sessions || [];
    db.journeys = db.journeys || [];
    db.exercises = db.exercises || [];
    db.bodyLog = db.bodyLog || [];
    db.templates = db.templates || [];
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
      db.templates.forEach(function (t) { if (t.id === "t_c" || t.id === "t_e") t.core = "pull_over"; });
      db.migrations.pulloverSlots = true;
    }
  }
  function persist() { var okp = Store.save(DB); if (!okp) flashStore(); if (window.KSSync) window.KSSync.schedulePush(); }

  /* =========================================================
     Utils
     ========================================================= */
  function uid(p) { return (p || "id_") + Date.now().toString(36) + Math.floor(Math.random() * 1e4).toString(36); }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function today() { var d = new Date(); return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); }
  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function fmtW(x) { if (x == null) return "–"; return (Math.round(x * 100) / 100).toString().replace(/\.0+$/, "") + " " + DB.settings.unit; }
  function fmtNum(x) { if (x == null) return "–"; return (Math.round(x * 100) / 100).toString().replace(/\.0+$/, ""); }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]; }); }
  function exById(id) { return DB.exercises.find(function (e) { return e.id === id; }); }
  function barById(id) { return DB.inventory.bars.find(function (b) { return b.id === id; }) || DB.inventory.bars.find(function (b) { return b.default; }) || DB.inventory.bars[0]; }
  function tplById(id) { return DB.templates.find(function (t) { return t.id === id; }); }
  function activeJourney() {
    var js = DB.journeys || [];
    return js.find(function (j) { return j.active; }) || js.find(function (j) { return j.status !== "archived"; }) || js[0] || null;
  }
  function currentPhase() { var j = activeJourney(); if (!j) return null; return (j.phases || []).find(function (p) { return p.id === j.currentPhaseId; }) || (j.phases || [])[0]; }
  function dateMs(s) { return new Date(s + "T12:00:00").getTime(); }
  function isoWeek(dateStr) {
    var d = new Date(dateStr + "T00:00:00"); var t = new Date(d.valueOf());
    var day = (d.getDay() + 6) % 7; t.setDate(t.getDate() - day + 3);
    var first = new Date(t.getFullYear(), 0, 4);
    var wk = 1 + Math.round(((t - first) / 86400000 - 3 + ((first.getDay() + 6) % 7)) / 7);
    return t.getFullYear() + "-W" + pad(wk);
  }

  /* =========================================================
     Engine-Glue
     ========================================================= */
  function doneSessions() { return DB.sessions.filter(function (s) { return s.status === "done"; }).sort(function (a, b) { return dateMs(a.date) - dateMs(b.date); }); }
  function lastEntryForExercise(exId) {
    var ss = doneSessions();
    for (var i = ss.length - 1; i >= 0; i--) {
      var en = (ss[i].entries || []).find(function (e) { return e.exerciseId === exId; });
      if (en) return { entry: en, session: ss[i] };
    }
    return null;
  }
  function lastByExercise() {
    var map = {}; doneSessions().forEach(function (s) {
      (s.entries || []).forEach(function (en) { map[en.exerciseId] = dateMs(s.date); });
    }); return map;
  }
  function weekCounts() {
    var wk = isoWeek(today()), map = {};
    doneSessions().forEach(function (s) {
      if (isoWeek(s.date) !== wk) return;
      (s.entries || []).forEach(function (en) { map[en.exerciseId] = (map[en.exerciseId] || 0) + 1; });
    }); return map;
  }
  function suggestForExercise(exo, ph) {
    var focus = ph ? ph.focus : null;
    var le = lastEntryForExercise(exo.id);
    var exUse = exo;
    var rt = ph ? (ph.repTarget || repTargetForFocus(ph.focus)) : null;
    if (rt && exo.profile !== "core") { exUse = clone(exo); exUse.repRange = rt.slice(); }
    return E.suggestWeight(exUse, le ? le.entry : null, {
      bar: barById(exo.barId), plates: DB.inventory.plates,
      reentry: focus === "reentry"
    });
  }
  function plannedSetCount() {
    var ph = currentPhase(); var j = activeJourney();
    if (!ph) return 3;
    var green = recoveryGreenNow();
    return E.volumeForWeek(ph, (j.currentWeek || 1) - 1, green);
  }
  function blankBody() { return { legs: 0, upper_body: 0, overall: 0, pain: { flag: false, note: "" }, readiness: 3, notes: "" }; }
  function sortedBodyLog() { return (DB.bodyLog || []).slice().sort(function (a, b) { return a.date < b.date ? -1 : 1; }); }
  function todayBody() { return (DB.bodyLog || []).find(function (e) { return e.date === today(); }) || null; }
  function latestBody() {
    var log = sortedBodyLog();
    if (log.length) return log[log.length - 1];
    return blankBody();
  }
  function snapshotBody() { var b = todayBody() || latestBody(); return { legs: b.legs || 0, upper_body: b.upper_body || 0, overall: b.overall || 0, pain: { flag: !!(b.pain && b.pain.flag) }, readiness: b.readiness || 3, notes: b.notes || "" }; }
  function entryBar(en) { return barById(en.barId || (exById(en.exerciseId) || {}).barId); }
  // Rest-Empfehlung aus dem aktuellen Körperzustand (heute, sonst letzter Eintrag)
  function restAdvice() {
    var t = todayBody();
    var b = t || latestBody();
    var reasons = [];
    if (!t) return { level: "unknown", reasons: ["Heute noch kein Körperzustand erfasst"] };
    var pain = !!(b.pain && b.pain.flag);
    var legs = b.legs || 0, upper = b.upper_body || 0, overall = b.overall || 0, rdy = b.readiness || 3;
    if (pain) reasons.push("Schmerz gemeldet");
    if (overall >= 3) reasons.push("Gesamt-Muskelkater hoch");
    if (legs >= 3) reasons.push("Beine stark");
    if (upper >= 3) reasons.push("Oberkörper stark");
    if (rdy <= 1) reasons.push("Readiness sehr niedrig");
    if (reasons.length) return { level: "rest", reasons: reasons };
    var cautions = [];
    if (rdy === 2) cautions.push("Readiness niedrig");
    if (overall === 2) cautions.push("Gesamt-Muskelkater mittel");
    if ((legs >= 2 ? 1 : 0) + (upper >= 2 ? 1 : 0) >= 2) cautions.push("mehrere Regionen mittel");
    if (cautions.length) return { level: "caution", reasons: cautions };
    return { level: "ok", reasons: [] };
  }
  function recoveryGreenNow() {
    var b = latestBody();
    return (b.legs || 0) < 2 && (b.upper_body || 0) < 2 && (b.overall || 0) < 2 && (b.readiness || 3) >= 3;
  }
  function rankWorkouts() {
    var b = latestBody(); var exMap = {}; DB.exercises.forEach(function (e) { exMap[e.id] = e; });
    var ctx = { now: Date.now(), lastByExercise: lastByExercise(), soreness: { legs: b.legs, upper_body: b.upper_body, overall: b.overall }, weekCounts: weekCounts(), phase: currentPhase(), freqTarget: DB.settings.weeklyFrequencyTarget };
    return DB.templates.map(function (t) {
      var s = E.suitability(t, ctx, { exMap: exMap });
      return { tpl: t, score: s.score, excluded: s.excluded, reasons: s.reasons };
    }).sort(function (a, b) { if (a.excluded !== b.excluded) return a.excluded ? 1 : -1; return b.score - a.score; });
  }

  /* =========================================================
     Charts (SVG)
     ========================================================= */
  function lineChart(points, opts) {
    opts = opts || {}; var w = opts.w || 460, h = opts.h || 150, pad = 26;
    if (!points.length) return emptyChart(w, h);
    var ys = points.map(function (p) { return p.y; });
    var min = Math.min.apply(null, ys), max = Math.max.apply(null, ys);
    if (min === max) { min -= 1; max += 1; }
    var n = points.length;
    function X(i) { return pad + (n === 1 ? (w - 2 * pad) / 2 : i * (w - 2 * pad) / (n - 1)); }
    function Y(v) { return h - pad - (v - min) / (max - min) * (h - 2 * pad); }
    var d = points.map(function (p, i) { return (i ? "L" : "M") + X(i).toFixed(1) + "," + Y(p.y).toFixed(1); }).join(" ");
    var dots = points.map(function (p, i) {
      var c = p.flag ? "var(--bad)" : "var(--accent)";
      return '<circle cx="' + X(i).toFixed(1) + '" cy="' + Y(p.y).toFixed(1) + '" r="' + (p.flag ? 4 : 3) + '" fill="' + c + '"/>';
    }).join("");
    var grid = '<line x1="' + pad + '" y1="' + (h - pad) + '" x2="' + (w - pad) + '" y2="' + (h - pad) + '" class="axis"/>'
      + '<line x1="' + pad + '" y1="' + pad + '" x2="' + pad + '" y2="' + (h - pad) + '" class="axis"/>';
    var labels = '<text x="' + (pad - 4) + '" y="' + (Y(max) + 4) + '" class="ctick" text-anchor="end">' + fmtNum(max) + '</text>'
      + '<text x="' + (pad - 4) + '" y="' + (Y(min) + 4) + '" class="ctick" text-anchor="end">' + fmtNum(min) + '</text>';
    return '<svg viewBox="0 0 ' + w + ' ' + h + '" class="chart" preserveAspectRatio="xMidYMid meet">' + grid + labels
      + '<path d="' + d + '" fill="none" stroke="var(--accent)" stroke-width="2"/>' + dots + '</svg>';
  }
  function barChart(items, opts) {
    opts = opts || {}; var w = opts.w || 460, h = opts.h || 150, pad = 26;
    if (!items.length) return emptyChart(w, h);
    var max = Math.max.apply(null, items.map(function (i) { return i.value; })); if (max <= 0) max = 1;
    var n = items.length, gap = 6, bw = (w - 2 * pad - gap * (n - 1)) / n;
    var bars = items.map(function (it, i) {
      var bh = (it.value / max) * (h - 2 * pad); var x = pad + i * (bw + gap); var y = h - pad - bh;
      return '<rect x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" width="' + bw.toFixed(1) + '" height="' + bh.toFixed(1) + '" rx="2" fill="var(--accent)"/>'
        + (n <= 10 ? '<text x="' + (x + bw / 2).toFixed(1) + '" y="' + (h - pad + 12) + '" class="ctick" text-anchor="middle">' + esc(it.label) + '</text>' : '');
    }).join("");
    var axis = '<line x1="' + pad + '" y1="' + (h - pad) + '" x2="' + (w - pad) + '" y2="' + (h - pad) + '" class="axis"/>';
    return '<svg viewBox="0 0 ' + w + ' ' + h + '" class="chart" preserveAspectRatio="xMidYMid meet">' + axis
      + '<text x="' + (pad - 4) + '" y="' + (pad + 4) + '" class="ctick" text-anchor="end">' + fmtNum(max) + '</text>' + bars + '</svg>';
  }
  function emptyChart(w, h) { return '<svg viewBox="0 0 ' + w + ' ' + h + '" class="chart"><text x="' + (w / 2) + '" y="' + (h / 2) + '" class="ctick" text-anchor="middle">noch keine Daten</text></svg>'; }

  /* =========================================================
     Plate-Loader
     ========================================================= */
  function plateLoaderSVG(total, bar) {
    var pb = E.plateBreakdown(total, bar.weight, DB.inventory.plates);
    var colors = { "25": "#ef5b5b", "20": "#3f7fff", "15": "#f5b53d", "10": "#5ec26a", "5": "#e8e8ea", "2.5": "#9aa0aa", "1.25": "#6b7280" };
    var seq = []; pb.plates.forEach(function (p) { for (var i = 0; i < p.count; i++) seq.push(p.plate); });
    var w = 300, h = 90, cx = 150, sleeveY = h / 2;
    var s = '<svg viewBox="0 0 ' + w + ' ' + h + '" class="plate-svg">';
    s += '<rect x="' + (cx - 6) + '" y="' + (sleeveY - 4) + '" width="' + (w / 2 - 10) + '" height="8" rx="2" fill="#3a3d44"/>'; // sleeve
    var x = cx + 6;
    seq.forEach(function (p) {
      var ph = 18 + (p / 25) * 56; var pw = Math.max(7, 6 + p / 4);
      var col = colors[String(p)] || "#888";
      s += '<rect x="' + x.toFixed(1) + '" y="' + (sleeveY - ph / 2).toFixed(1) + '" width="' + pw.toFixed(1) + '" height="' + ph.toFixed(1) + '" rx="2" fill="' + col + '" stroke="#0008"/>';
      s += '<text x="' + (x + pw / 2).toFixed(1) + '" y="' + (sleeveY + ph / 2 + 10).toFixed(1) + '" class="ptick" text-anchor="middle">' + fmtNum(p) + '</text>';
      x += pw + 3;
    });
    s += '<rect x="' + (cx - 14) + '" y="' + (sleeveY - 10) + '" width="14" height="20" rx="2" fill="#2a2d33"/>'; // collar/inner
    s += '</svg>';
    var label = pb.remainder > 0
      ? '<span class="warn-inline">nicht exakt ladbar (Rest ' + fmtW(pb.remainder * 2) + ')</span>'
      : (seq.length ? 'pro Seite: ' + pb.plates.map(function (p) { return p.count + "×" + fmtNum(p.plate); }).join(" + ") : 'nur Stange');
    return { svg: s, label: label, perSide: pb.perSide };
  }

  // Dezente Scheiben-Anzeige: kleines Icon + Scheiben pro Seite (Zahl). Kein großer SVG.
  function plateHint(total, bar) {
    if (!bar) return "";
    var pb = E.plateBreakdown(total, bar.weight, DB.inventory.plates);
    var icon = '<svg class="phint-ic" viewBox="0 0 16 16" aria-hidden="true"><rect x="6.7" y="2" width="2.6" height="12" rx="1"/><rect x="3.6" y="4.4" width="2" height="7.2" rx="1"/><rect x="10.4" y="4.4" width="2" height="7.2" rx="1"/></svg>';
    var txt;
    if (pb.remainder > 0) txt = '<span class="phint-warn">nicht exakt ladbar (Rest ' + fmtW(pb.remainder * 2) + ')</span>';
    else if (!pb.plates.length) txt = 'nur Stange';
    else txt = pb.plates.reduce(function (acc, p) { for (var i = 0; i < p.count; i++) acc.push(fmtNum(p.plate)); return acc; }, []).join(' \u00B7 ');
    return '<span class="phint" title="Scheiben pro Seite">' + icon + '<span class="phint-t">' + txt + '</span></span>';
  }

  // Heat-Farbe je Scheibengewicht: leicht=gelb -> schwer=rot
  function plateColor(p) {
    var ps = DB.inventory.plates; var mn = Math.min.apply(null, ps), mx = Math.max.apply(null, ps);
    var r = mx > mn ? (p - mn) / (mx - mn) : 0; r = Math.max(0, Math.min(1, r));
    var hue = Math.round(52 - 52 * r);
    var light = Math.round(60 - 12 * r);
    return "hsl(" + hue + ",80%," + light + "%)";
  }
  // Farbige Scheiben-Boxen (pro Scheibe eine Box), nur Zahl. Ersetzt Lesen durch Schauen.
  function plateChips(total, bar) {
    if (!bar) return "";
    var pb = E.plateBreakdown(total, bar.weight, DB.inventory.plates);
    if (pb.remainder > 0) return '<span class="pchips"><span class="pchip rest" title="nicht exakt ladbar">Rest ' + fmtNum(pb.remainder * 2) + '</span></span>';
    if (!pb.plates.length) return '<span class="pchips"><span class="pchip bar">nur Stange</span></span>';
    var chips = [];
    pb.plates.forEach(function (p) { for (var i = 0; i < p.count; i++) { chips.push('<span class="pchip" style="background:' + plateColor(p.plate) + '">' + fmtNum(p.plate) + '</span>'); } });
    return '<span class="pchips" title="Scheiben pro Seite – Reihenfolge von innen nach außen">' + chips.join("") + '</span>';
  }

  /* =========================================================
     Rendering – Shell & Nav
     ========================================================= */
  var TABS = [
    { id: "training", label: "Training" },
    { id: "body", label: "Körper" },
    { id: "workouts", label: "Workouts" },
    { id: "journey", label: "Journey" },
    { id: "exercises", label: "Übungen" },
    { id: "inventory", label: "Inventar" },
    { id: "settings", label: "Einstellungen" }
  ];
  function authBtn() {
    var s = (window.KSSync && window.KSSync.status) ? window.KSSync.status() : { loggedIn: false, email: "" };
    var icon = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="4"></circle><path d="M4 21c0-4 3.6-6 8-6s8 2 8 6"></path></svg>';
    return '<button class="auth-btn' + (s.loggedIn ? ' in' : '') + '" data-action="auth-open" title="' + (s.loggedIn ? esc("Angemeldet: " + (s.email || "")) : "Konto / Anmelden") + '" aria-label="Konto">' + icon + (s.loggedIn ? '<span class="auth-dot"></span>' : '') + '</button>';
  }
  function refreshAuthIcon() { var b = document.querySelector(".auth-btn"); if (b) b.outerHTML = authBtn(); }

  function ensureAuthModal() {
    if (document.getElementById("ks-auth-modal")) return;
    var ov = document.createElement("div");
    ov.id = "ks-auth-modal";
    ov.className = "ks-modal-overlay";
    ov.innerHTML = '<div class="ks-modal" role="dialog" aria-modal="true" aria-label="Konto">'
      + '<div class="ks-modal-head"><span class="ks-modal-title">Konto &amp; Cloud-Sync</span>'
      + '<button class="ks-modal-x" data-action="auth-close" aria-label="Schließen">\u2715</button></div>'
      + '<div id="ks-sync-panel"></div></div>';
    ov.addEventListener("click", function (e) { if (e.target === ov) closeAuthModal(); });
    document.body.appendChild(ov);
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeAuthModal(); });
  }
  function openAuthModal() { ensureAuthModal(); if (window.KSSync) window.KSSync.mountPanel(); document.getElementById("ks-auth-modal").classList.add("open"); }
  function closeAuthModal() { var m = document.getElementById("ks-auth-modal"); if (m) m.classList.remove("open"); }

  function render() {
    var root = document.getElementById("app");
    var phase = currentPhase(), j = activeJourney();
    var head = '<header class="topbar">'
      + '<div class="brand"><span class="logo">▦</span><span>KRAFTSCHMIEDE</span><span class="ver">Schema ' + SCHEMA + '</span></div>'
      + '<div class="topbar-right"><div class="phasechip">' + (j ? esc(j.name) : "—") + (phase ? ' · <strong>' + esc(phase.name) + '</strong> · W' + (j.currentWeek || 1) + '/' + phase.weeks : '') + '</div>' + authBtn() + '</div>'
      + '</header>';
    var curTab = TABS.find(function (t) { return t.id === UI.tab; }) || TABS[0];
    var nav = '<nav class="tabs' + (UI.menuOpen ? ' menu-open' : '') + '">'
      + '<button class="nav-toggle" data-action="menu-toggle" aria-expanded="' + (UI.menuOpen ? 'true' : 'false') + '"><span class="nav-burger">' + (UI.menuOpen ? '\u2715' : '\u2630') + '</span><span class="nav-current">' + esc(curTab.label) + '</span></button>'
      + '<div class="tab-list">' + TABS.map(function (t) {
        return '<button class="tab' + (UI.tab === t.id ? ' active' : '') + '" data-action="tab" data-tab="' + t.id + '">' + t.label + '</button>';
      }).join("") + '</div></nav>';
    var banner = Store.persistent ? '' : '<div class="banner">Kein dauerhafter Speicher in dieser Umgebung. Daten gehen beim Schließen verloren – nutze <strong>Export</strong> in den Einstellungen. Lokal gespeicherte Datei am Rechner speichert normal.</div>';
    var body = '';
    switch (UI.tab) {
      case "training": body = viewTraining(); break;
      case "body": body = viewBody(); break;
      case "workouts": body = viewWorkouts(); break;
      case "journey": body = UI.journeyPicker ? viewJourneyPicker() : viewJourneyManager(); break;
      case "exercises": body = UI.detail ? viewExerciseDetail(UI.detail) : viewExercises(); break;
      case "inventory": body = viewInventory(); break;
      case "settings": body = viewSettings(); break;
    }
    root.innerHTML = head + nav + banner + '<main class="content">' + body + '</main>';
    if (window.KSSync) window.KSSync.mountPanel();
    if (UI.tab === "training" && UI.live) bindLiveInputs();
  }

  /* =========================================================
     View: Training (Live)
     ========================================================= */
  function viewTraining() {
    if (UI.live) return liveSession();
    var ranked = rankWorkouts();
    var top = ranked[0];
    var phase = currentPhase();
    var cards = ranked.map(function (r, i) {
      var t = r.tpl;
      var names = [t.lift1, t.lift2, t.core].map(function (id) { var e = exById(id); return e ? esc(e.name) : id; });
      return '<div class="wo-card' + (i === 0 ? ' rec' : '') + (r.excluded ? ' excl' : '') + '">'
        + '<div class="wo-head"><span class="wo-name">Workout ' + esc(t.name) + '</span>'
        + '<span class="score-badge" title="Suitability-Score">' + fmtNum(r.score) + '</span></div>'
        + '<div class="wo-lifts">' + names[0] + ' › ' + names[1] + ' › ' + names[2] + '</div>'
        + (r.excluded ? '<div class="wo-excl">ausgeschlossen (Muskelkater)</div>' : '')
        + '<div class="wo-reasons">' + r.reasons.slice(0, 3).map(esc).join(" · ") + '</div>'
        + '<button class="btn ' + (i === 0 ? 'primary' : 'ghost') + '" data-action="start" data-tpl="' + t.id + '"' + (r.excluded ? ' disabled' : '') + '>' + (i === 0 ? 'Empfehlung starten' : 'starten') + '</button>'
        + '</div>';
    }).join("");
    return '<div class="section-title">Heute trainieren</div>'
      + restBanner()
      + '<div class="hint">Coach-Empfehlung nach Erholung, Recency, Wochenbalance und Phase. Geplante Arbeitssätze pro Übung: <strong>' + plannedSetCount() + '</strong> (' + (phase ? esc(phase.name) : '—') + ').</div>'
      + '<div class="wo-grid">' + cards + '</div>'
      + yogaBox();
  }
  function yogaBox() {
    return '<div class="section-title">Yoga / Mobility</div>'
      + '<div class="yoga-card">'
      + '<div class="yoga-main"><span class="yoga-tag">YOGA</span><div class="yoga-txt"><strong>Einheit eintragen</strong><span>Erholungs- oder Mobility-Tag, getrennt vom Krafttraining.</span></div></div>'
      + '<div class="yoga-form">'
      + '<label>Datum <input type="date" id="yoga-date" value="' + today() + '"></label>'
      + '<label>Dauer <input type="number" class="num mini" id="yoga-min" value="80"> min</label>'
      + '<input type="text" class="yoga-note" id="yoga-note" placeholder="Notiz (optional)">'
      + '<button class="btn" data-action="add-yoga">Eintragen</button>'
      + '</div></div>';
  }
  function addYoga() {
    var d = (document.getElementById("yoga-date") || {}).value || today();
    var min = parseInt((document.getElementById("yoga-min") || {}).value, 10) || 80;
    var note = (document.getElementById("yoga-note") || {}).value || "";
    DB.sessions.push({ id: "y_" + d.replace(/-/g, "") + "_" + Math.floor(Math.random() * 1000), date: d, type: "yoga", minutes: min, notes: note, status: "done", entries: [] });
    persist(); render(); toast("Yoga-Einheit eingetragen (" + d + ").");
  }
  function restBanner() {
    var a = restAdvice();
    if (a.level === "unknown") {
      return '<div class="rest-card unknown"><div class="rc-main"><strong>Körperzustand heute noch nicht erfasst</strong><span>Für eine passende Empfehlung kurz im Körper-Tab eintragen.</span></div><button class="btn" data-action="tab" data-tab="body">Körperzustand erfassen</button></div>';
    }
    if (a.level === "rest") {
      return '<div class="rest-card rest"><div class="rc-main"><strong>Rest-Tag empfohlen</strong><span>' + esc(a.reasons.join(" · ")) + '. Heute lieber Erholung oder lockere Mobility. Du kannst trotzdem trainieren – dann konservativ.</span></div></div>';
    }
    if (a.level === "caution") {
      return '<div class="rest-card caution"><div class="rc-main"><strong>Vorsicht – reduziert trainieren</strong><span>' + esc(a.reasons.join(" · ")) + '. Volumen/Intensität ggf. zurücknehmen.</span></div></div>';
    }
    return '<div class="rest-card ok"><div class="rc-main"><strong>Bereit fürs Training</strong><span>Körperzustand grün.</span></div></div>';
  }

  function buildLive(templateId) {
    var t = tplById(templateId); var phase = currentPhase(); var j = activeJourney();
    var entries = [t.lift1, t.lift2, t.core].map(function (id, idx) {
      var exo = exById(id);
      var sug = suggestForExercise(exo, phase);
      // Core-Uebungen fix 3 Saetze; Kraftuebungen folgen der Phasen-Satzrampe.
      var setN = exo.profile === "core" ? 3 : plannedSetCount();
      var warm = [];
      if (exo.category === "barbell") {
        warm = E.generateWarmup(sug.weight, barById(exo.barId).weight, DB.inventory.plates, { isLift1: idx === 0, isDeadlift: /deadlift/i.test(exo.id) });
      }
      var planned = []; for (var k = 0; k < setN; k++) planned.push({ reps: sug.targetReps, weight: sug.weight, targetScore: exo.targetScore });
      var sets = planned.map(function (p) {
        return { reps: p.reps, weight: p.weight, score: exo.targetScore, failed: false, done: false, targetReps: p.reps, targetWeight: p.weight, adjusted: false, adjustNote: "" };
      });
      return { exerciseId: id, barId: exo.barId, slot: idx === 0 ? "lift1" : (idx === 1 ? "lift2" : "core"), warmupSets: warm, plannedSets: planned, sets: sets, suggestion: sug, tested1RM: null };
    });
    var b = latestBody();
    return {
      id: "s_" + today().replace(/-/g, "") + "_" + Math.floor(Math.random() * 1000),
      date: today(), journeyId: j ? j.id : null, phaseId: phase ? phase.id : null, templateId: templateId,
      status: "live", generalWarmup: { done: false, minutes: 7, mode: "bike" },
      entries: entries, body: { legs: b.legs || 0, upper_body: b.upper_body || 0, overall: b.overall || 0, pain: {}, readiness: b.readiness || 3, notes: "" }
    };
  }

  function liveSession() {
    var s = UI.live; var t = tplById(s.templateId);
    var gw = s.generalWarmup;
    var html = '<div class="live-head">'
      + '<div><div class="section-title">Training · Workout ' + esc(t.name) + '</div></div>'
      + '<button class="btn ghost small" data-action="cancel-live">verwerfen</button></div>';

    // Allgemeines Aufwärmen
    html += '<div class="card exercise-live gw-card">'
      + '<div class="ex-live-head"><div class="ehl"><span class="ex-name">Aufwärmen</span><span class="slot-tag warm">WARM</span></div></div>'
      + '<div class="gw-body">'
      + '<label class="chk"><input type="checkbox" data-live="gw.done"' + (gw.done ? ' checked' : '') + '> erledigt</label>'
      + '<span class="gw-fields"><input type="number" class="num mini" data-live="gw.minutes" value="' + gw.minutes + '"> min ·'
      + ' <select data-live="gw.mode"><option value="bike"' + (gw.mode === "bike" ? " selected" : "") + '>Rad</option><option value="row"' + (gw.mode === "row" ? " selected" : "") + '>Rudern</option><option value="walk"' + (gw.mode === "walk" ? " selected" : "") + '>Gehen</option><option value="other"' + (gw.mode === "other" ? " selected" : "") + '>Sonstiges</option></select></span>'
      + '</div></div>';

    s.entries.forEach(function (en, ei) {
      var exo = exById(en.exerciseId); var bar = entryBar(en);
      var sug = en.suggestion || {};
      var showPlate = !UI.plateHide[ei];
      html += '<div class="card exercise-live" data-ei="' + ei + '">';
      var barOpts = exo.category === "barbell" ? DB.inventory.bars.map(function (bb) { return '<option value="' + bb.id + '"' + (bb.id === (en.barId || exo.barId) ? " selected" : "") + '>' + esc(bb.name) + ' ' + fmtW(bb.weight) + '</option>'; }).join("") : "";
      html += '<div class="ex-live-head"><div class="ehl"><span class="ex-name">' + esc(exo.name) + '</span><span class="slot-tag">' + en.slot.toUpperCase() + '</span></div>'
        + (exo.category === "barbell" ? '<div class="ehr"><label class="barpick">Stange <select data-barpick data-ei="' + ei + '">' + barOpts + '</select></label><button class="btn tiny ghost plate-toggle" data-action="toggle-plate" data-ei="' + ei + '">' + (showPlate ? 'Scheiben aus' : 'Scheiben ein') + '</button></div>' : '') + '</div>';

      // Sätze: Aufwärmen (A1..) und Arbeit (S1..) in einer Liste
      html += '<div class="sets-block">';
      html += '<div class="set-row head"><span class="set-i">Satz</span><span>Wdh</span><span>kg</span><span>RIR</span><span class="h-done">\u2713</span></div>';
      en.warmupSets.forEach(function (ws, wi) {
        html += '<div class="set-row warm' + (ws.done ? ' done' : '') + '">'
          + '<span class="set-i">A' + (wi + 1) + '</span>'
          + '<span class="ro">' + ws.reps + '</span>'
          + '<span class="ro">' + fmtNum(ws.weight) + '</span>'
          + '<span class="rir-empty"></span>'
          + '<label class="field f-done done-chk" title="Aufwärmsatz erledigt"><input type="checkbox" data-set="w" data-ei="' + ei + '" data-si="' + wi + '"' + (ws.done ? ' checked' : '') + '></label>'
          + '</div>'
          + (showPlate && bar ? '<div class="set-sub">' + plateHint(ws.weight, bar) + '</div>' : '');
      });
      en.sets.forEach(function (st, si) {
        html += workSetRow(ei, si, st, bar, showPlate && exo.category === "barbell");
      });
      html += '<div class="set-actions"><button class="btn tiny ghost" data-action="add-set" data-ei="' + ei + '">+ Satz</button>'
        + (en.sets.length > 1 ? '<button class="btn tiny ghost" data-action="del-set" data-ei="' + ei + '">– Satz</button>' : '') + '</div>';
      html += '</div></div>';
    });

    // Körperzustand: Eingabe im Körper-Tab, hier nur Kontext
    html += '<div class="card body-context"><span class="bc-l">Körperzustand heute:</span> <span class="bc-v">' + bodyContextText() + '</span> <button class="btn tiny ghost" data-action="tab" data-tab="body">erfassen / ändern</button></div>';

    html += '<div class="finish-bar"><button class="btn primary big" data-action="finish">Session speichern</button></div>';
    return html;
  }
  function bodyContextText() {
    var t = todayBody();
    if (!t) return '<span class="bc-none">noch nicht erfasst</span>';
    var adv = restAdvice();
    var lvl = adv.level === "rest" ? '<span class="bc-rest">Rest empfohlen</span>' : (adv.level === "caution" ? '<span class="bc-caut">Vorsicht</span>' : '<span class="bc-ok">grün</span>');
    return 'Beine ' + (t.legs || 0) + ' · OK ' + (t.upper_body || 0) + ' · Gesamt ' + (t.overall || 0) + ' · Readiness ' + (t.readiness || 3) + (t.pain && t.pain.flag ? ' · Schmerz' : '') + ' — ' + lvl;
  }

  function workSetRow(ei, si, st, bar, showChips) {
    var rirCls = "rir-sel" + (st.score === 5 ? " fail" : "") + (st.done ? " set" : "");
    var rirOpts = [1, 2, 3, 4, 5].map(function (v) { var i = E.scoreInfo(v); return '<option value="' + v + '"' + (st.score === v ? " selected" : "") + '>' + i.rir + '</option>'; }).join("");
    var sub = (showChips && bar) ? '<div class="set-sub" data-sub-ei="' + ei + '" data-sub-si="' + si + '">' + plateHint(st.weight, bar) + '</div>' : "";
    return '<div class="set-row work' + (st.done ? ' done' : '') + '" data-ei="' + ei + '" data-si="' + si + '">'
      + '<span class="set-i">S' + (si + 1) + '</span>'
      + '<div class="field f-reps"><input type="number" inputmode="numeric" class="num" data-set="reps" data-ei="' + ei + '" data-si="' + si + '" value="' + st.reps + '"></div>'
      + '<div class="field f-weight"><input type="number" step="0.25" inputmode="decimal" class="num" data-set="weight" data-ei="' + ei + '" data-si="' + si + '" value="' + st.weight + '"></div>'
      + '<div class="field f-rir"><select class="' + rirCls + '" data-set="score" data-ei="' + ei + '" data-si="' + si + '" title="RIR / Score je Satz">' + rirOpts + '</select></div>'
      + '<label class="field f-done done-chk" title="Satz erledigt"><input type="checkbox" data-set="done" data-ei="' + ei + '" data-si="' + si + '"' + (st.done ? " checked" : "") + '></label>'
      + '</div>' + sub;
  }
  function sorePicker(key, label, val) {
    return '<div class="bfield"><span>' + label + ' (Kater)</span><select data-body="' + key + '">'
      + [0, 1, 2, 3].map(function (v) { return '<option value="' + v + '"' + (val === v ? " selected" : "") + '>' + v + '</option>'; }).join("") + '</select></div>';
  }
  function decLabel(d) {
    return ({ increase: "steigern", "increase-reps": "Wdh. steigern", hold: "halten", decrease: "senken" })[d] || "halten";
  }

  // Live-Inputs binden (ohne Voll-Re-Render, um Fokus zu halten)
  function bindLiveInputs() {
    var root = document.getElementById("app");
    root.querySelectorAll("[data-live]").forEach(function (el) {
      el.addEventListener("change", function () { setLivePath(el.getAttribute("data-live"), el.type === "checkbox" ? el.checked : (el.type === "number" ? parseFloat(el.value) : el.value)); });
    });
    root.querySelectorAll(".set-row [data-set]").forEach(function (el) {
      var ev = (el.type === "checkbox" || el.tagName === "SELECT") ? "change" : "input";
      el.addEventListener(ev, function () { onSetChange(el); });
    });
  }
  function setLivePath(path, val) {
    var parts = path.split("."); var o = UI.live;
    for (var i = 0; i < parts.length - 1; i++) { if (o[parts[i]] == null) o[parts[i]] = {}; o = o[parts[i]]; }
    o[parts[parts.length - 1]] = val;
  }
  function onSetChange(el) {
    var ei = +el.getAttribute("data-ei"), si = +el.getAttribute("data-si"), kind = el.getAttribute("data-set");
    if (kind === "w") { UI.live.entries[ei].warmupSets[si].done = el.checked; return; }
    var st = UI.live.entries[ei].sets[si];
    if (kind === "reps") st.reps = parseInt(el.value, 10) || 0;
    else if (kind === "weight") { var nw = parseFloat(el.value); if (nw !== st.targetWeight) markAdjust(st, "Gewicht angepasst"); st.weight = isNaN(nw) ? 0 : nw; }
    else if (kind === "score") { st.score = +el.value; st.failed = (st.score === 5); }
    else if (kind === "failed") st.failed = el.checked;
    else if (kind === "done") st.done = el.checked;
    if (kind === "reps" && st.reps < st.targetReps && st.done) { /* verfehlt – kein Auto-Fail, Nutzer entscheidet */ }
    refreshSetStatus(ei, si);
  }
  function markAdjust(st, note) { st.adjusted = true; st.adjustNote = note; }
  function refreshSetStatus(ei, si) {
    var row = document.querySelector('.set-row.work[data-ei="' + ei + '"][data-si="' + si + '"]');
    if (!row) return;
    var st = UI.live.entries[ei].sets[si];
    row.classList.toggle("done", !!st.done);
    var sel = row.querySelector(".rir-sel");
    if (sel) { sel.classList.toggle("fail", st.score === 5); sel.classList.toggle("set", !!st.done); }
    var enX = UI.live.entries[ei];
    if ((exById(enX.exerciseId) || {}).category === "barbell") {
      var sub = document.querySelector('.set-sub[data-sub-ei="' + ei + '"][data-sub-si="' + si + '"]');
      if (sub) sub.innerHTML = plateHint(st.weight, entryBar(enX));
    }
  }

  function finishSession() {
    var s = UI.live;
    s.status = "done";
    s.entries.forEach(function (en) {
      var exo = exById(en.exerciseId);
      en.sets.forEach(function (st) { st.metTarget = E.metTarget(st); });
      en.hadDeviation = E.hadDeviation(en.sets.filter(function (x) { return x.type !== "warmup"; }));
      var best = E.best1RMFromSets(en.sets, DB.settings.rmFormula);
      en.est1RM = best.value;
      // Übung aktualisieren: nächstes Arbeitsgewicht = höchstes geleistetes Arbeitsgewicht
      var ws = en.sets.filter(function (x) { return x.type !== "warmup" && x.done; });
      if (ws.length) { exo.workWeight = Math.max.apply(null, ws.map(function (x) { return x.weight; })); }
      if (best.value && (exo.metrics.indexOf("est1RM") >= 0)) { exo.rm = best.value; exo.rmAsOf = s.date; exo.rmStale = false; }
    });
    delete s.suggestionMeta;
    s.body = snapshotBody();
    s.entries.forEach(function (en) { delete en.suggestion; });
    DB.sessions.push(s);
    UI.live = null;
    persist();
    UI.tab = "workouts"; render();
  }

  /* =========================================================
     View: Workouts (Liste + Kalender + Journey)
     ========================================================= */
  function viewWorkouts() {
    var j = activeJourney();
    var html = '<div class="section-title">Journey & Periodisierung</div>';
    if (j) {
      var idx = j.phases.findIndex(function (p) { return p.id === j.currentPhaseId; });
      var cp = currentPhase();
      html += '<div class="card journey">'
        + '<div class="journey-head"><strong>' + esc(j.name) + '</strong>' + (j.goal ? '<span class="jgoal">' + esc(j.goal) + '</span>' : '') + '<span class="hint">Start ' + esc(j.startDate) + '</span></div>'
        + '<div class="phase-track">' + j.phases.map(function (p, i) {
          return '<div class="phase-pill' + (p.id === j.currentPhaseId ? ' cur' : (i < idx ? ' past' : '')) + '">'
            + '<span class="pn">' + esc(p.name) + '</span><span class="pmeta">' + p.weeks + ' Wo · ' + (p.repTarget ? p.repTarget[0] + '–' + p.repTarget[1] + ' Wdh · ' : '') + 'Sätze ' + p.setsStart + '→' + p.setsEnd + (p.deloadWeek ? ' · Deload W' + p.deloadWeek : '') + '</span></div>';
        }).join('<span class="phase-arrow">›</span>') + '</div>'
        + '<div class="phase-ctrl"><span>Aktuelle Phase: <strong>' + esc((cp || {}).name || "—") + '</strong>' + (cp && cp.repTarget ? ' · Ziel ' + cp.repTarget[0] + '–' + cp.repTarget[1] + ' Wdh' : '') + '</span>'
        + '<div class="wk-ctrl">Woche <button class="btn tiny ghost" data-action="wk" data-d="-1">−</button><strong class="wk-val">' + (j.currentWeek || 1) + '</strong><button class="btn tiny ghost" data-action="wk" data-d="1">+</button> / ' + ((cp || {}).weeks || "?") + '</div>'
        + '<button class="btn tiny ghost" data-action="phase-next">nächste Phase ›</button></div>'
        + '<div class="hint">Volumen-Empfehlung diese Woche: <strong>' + plannedSetCount() + ' Arbeitssätze</strong>/Übung'
        + (cp && cp.deloadWeek === (j.currentWeek) ? ' · <span class="warn-inline">Deload-Woche</span>' : '')
        + (!recoveryGreenNow() ? ' · <span class="warn-inline">Erholungsmarker gelb/rot → konservativ</span>' : '') + '</div>'
        + (idx >= j.phases.length - 1 ? '<div class="last-phase">Letzte Phase erreicht. <button class="btn tiny" data-action="journey-finish" data-id="' + j.id + '">Journey abschließen</button> <button class="btn tiny ghost" data-action="journey-picker">neue Journey starten</button></div>' : '')
        + '</div>';
    } else {
      html += '<div class="card empty-journey"><p class="ej-lead">Keine aktive Journey.</p><p class="hint">Starte im <strong>Journey</strong>-Tab eine Journey aus einer Vorlage.</p><button class="btn primary" data-action="journey-picker">Journey wählen</button></div>';
    }

    // Kalender (aktueller Monat)
    html += '<div class="section-title">Kalender</div>' + calendarHTML();

    // Verlauf
    var ss = doneSessions().slice().reverse();
    html += '<div class="section-title">Verlauf (' + ss.length + ')</div>';
    if (!ss.length) html += '<div class="empty">Noch keine Sessions. Starte ein Workout im Training-Tab.</div>';
    else {
      html += '<div class="log-list">' + ss.map(function (s) {
        if (s.type === "yoga") {
          return '<div class="log-item yoga">'
            + '<div class="log-main"><span class="log-date">' + esc(s.date) + '</span> <span class="log-wo"><span class="yoga-tag sm">YOGA</span> Yoga / Mobility</span></div>'
            + '<div class="log-sub">' + (s.minutes || 0) + ' min' + (s.notes ? ' · ' + esc(s.notes) : '') + '</div>'
            + '<button class="btn tiny ghost" data-action="del-session" data-id="' + s.id + '">löschen</button>'
            + '</div>';
        }
        var t = tplById(s.templateId);
        var dev = (s.entries || []).some(function (e) { return e.hadDeviation; });
        var vol = (s.entries || []).reduce(function (a, e) { return a + workVol(e); }, 0);
        return '<div class="log-item">'
          + '<div class="log-main"><span class="log-date">' + esc(s.date) + '</span> <span class="log-wo">Workout ' + esc(t ? t.name : "?") + '</span>'
          + (dev ? '<span class="dev-badge" title="Abweichung: geplant nicht erreicht / runterkorrigiert">Δ Abweichung</span>' : '<span class="ok-badge">im Plan</span>') + '</div>'
          + '<div class="log-sub">' + (s.entries || []).map(function (e) { var ex = exById(e.exerciseId); return esc(ex ? ex.name : e.exerciseId) + ' ' + setSummary(e); }).join(" · ")
          + ' <span class="log-vol">Vol ' + fmtNum(Math.round(vol)) + '</span></div>'
          + '<button class="btn tiny ghost" data-action="del-session" data-id="' + s.id + '">löschen</button>'
          + '</div>';
      }).join("") + '</div>';
    }
    return html;
  }
  function workVol(entry) { return (entry.sets || []).filter(function (s) { return s.type !== "warmup"; }).reduce(function (a, s) { return a + (s.reps || 0) * (s.weight || 0); }, 0); }
  function setSummary(entry) {
    var ws = (entry.sets || []).filter(function (s) { return s.type !== "warmup"; });
    if (!ws.length) return "";
    var top = Math.max.apply(null, ws.map(function (s) { return s.weight || 0; }));
    return ws.length + "×" + (ws[0].reps) + "@" + fmtNum(top);
  }
  function calMonth() { if (!UI.calMonth) { var n = new Date(); UI.calMonth = { y: n.getFullYear(), m: n.getMonth() }; } return UI.calMonth; }
  function calShift(d) { var c = calMonth(); var nm = c.m + d, ny = c.y; if (nm < 0) { nm = 11; ny--; } else if (nm > 11) { nm = 0; ny++; } UI.calMonth = { y: ny, m: nm }; render(); }
  function calToday() { var n = new Date(); UI.calMonth = { y: n.getFullYear(), m: n.getMonth() }; render(); }
  function calendarHTML() {
    var cm = calMonth(); var y = cm.y, m = cm.m;
    var first = new Date(y, m, 1); var startDay = (first.getDay() + 6) % 7; var days = new Date(y, m + 1, 0).getDate();
    var byDate = {}; doneSessions().forEach(function (s) { (byDate[s.date] = byDate[s.date] || []).push(s); });
    var names = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
    var cells = names.map(function (n) { return '<div class="cal-dow">' + n + '</div>'; }).join("");
    for (var i = 0; i < startDay; i++) cells += '<div class="cal-cell empty"></div>';
    for (var d = 1; d <= days; d++) {
      var ds = y + "-" + pad(m + 1) + "-" + pad(d);
      var has = byDate[ds];
      var dot = "";
      if (has) {
        dot = has.map(function (s) {
          if (s.type === "yoga") return '<span class="cal-dot yoga">Yoga</span>';
          var t = tplById(s.templateId); var dev = (s.entries || []).some(function (e) { return e.hadDeviation; });
          return '<span class="cal-dot' + (dev ? ' dev' : '') + '">' + (t ? t.name : "•") + '</span>';
        }).join("");
      }
      cells += '<div class="cal-cell' + (ds === today() ? ' today' : '') + '"><span class="cal-d">' + d + '</span>' + dot + '</div>';
    }
    var mn = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"][m];
    return '<div class="card"><div class="cal-head">'
      + '<button class="btn tiny ghost" data-action="cal-prev" title="Vormonat">‹</button>'
      + '<span class="cal-title">' + mn + ' ' + y + '</span>'
      + '<div class="cal-nav-r"><button class="btn tiny ghost" data-action="cal-today">Heute</button><button class="btn tiny ghost" data-action="cal-next" title="Folgemonat">›</button></div>'
      + '</div><div class="calendar">' + cells + '</div></div>';
  }

  /* =========================================================
     View: Exercises (Liste + Detail)
     ========================================================= */
  var METRIC_LABELS = { rm: "1RM-Verlauf", weight: "Arbeitsgewicht (Top-Satz)", reps: "Wiederholungen (Summe Arbeitssätze)", volume: "Wochenvolumen", score: "Score-Verlauf" };
  function exerciseChartData(ex) {
    var h = exerciseHistory(ex.id);
    var bw = {}; h.forEach(function (x) { bw[x.week] = (bw[x.week] || 0) + x.vol; });
    var wk = Object.keys(bw).sort();
    return {
      rm: h.filter(function (x) { return x.est1RM; }).map(function (x) { return { y: x.est1RM, flag: x.dev }; }),
      weight: h.map(function (x) { return { y: x.topW, flag: x.dev }; }),
      reps: h.map(function (x) { return { y: x.reps, flag: x.dev }; }),
      score: h.map(function (x) { return { y: x.score, flag: x.dev }; }),
      volume: wk.map(function (w) { return { label: w.slice(-3), value: bw[w] }; })
    };
  }
  function exerciseChartSVG(data, metric) { return metric === "volume" ? barChart(data.volume, {}) : lineChart(data[metric] || [], {}); }
  function detailChartCard(ex, metric, svg) {
    var pinned = dashHas(ex.id, metric);
    return '<div class="card chart-card"><div class="sets-title chart-head"><span>' + METRIC_LABELS[metric] + '</span>'
      + '<button class="btn tiny ghost pin' + (pinned ? ' on' : '') + '" data-action="pin-chart" data-ex="' + ex.id + '" data-metric="' + metric + '">' + (pinned ? 'Angeheftet' : 'Anheften') + '</button></div>' + svg + '</div>';
  }
  function dashboardHTML() {
    if (!DASH.length) {
      return '<div class="section-title">Dashboard</div><div class="dash-empty">Noch keine Graphen angeheftet. Öffne eine Übung und tippe bei einem Diagramm auf „Anheften" – es erscheint dann hier oben.</div>';
    }
    var html = '<div class="section-title">Dashboard</div><div class="dash-grid">';
    DASH.forEach(function (it, i) {
      var ex = exById(it.exerciseId); if (!ex) return;
      var data = exerciseChartData(ex);
      html += '<div class="dash-tile" draggable="true" data-dash-idx="' + i + '">'
        + '<div class="dash-tile-head"><span class="dt-grip" title="Ziehen zum Sortieren">⠿</span>'
        + '<span class="dt-title">' + esc(ex.name) + ' · ' + METRIC_LABELS[it.metric] + '</span>'
        + '<span class="dt-actions">'
        + '<button class="btn tiny ghost" data-action="dash-up" data-i="' + i + '" title="nach oben">↑</button>'
        + '<button class="btn tiny ghost" data-action="dash-down" data-i="' + i + '" title="nach unten">↓</button>'
        + '<button class="btn tiny ghost danger" data-action="dash-del" data-i="' + i + '" title="entfernen">×</button>'
        + '</span></div>' + exerciseChartSVG(data, it.metric) + '</div>';
    });
    html += '</div>';
    return html;
  }

  function viewExercises() {
    var groups = { strength: [], core: [], inactive: [] };
    DB.exercises.forEach(function (e) { if (!e.active) groups.inactive.push(e); else if (e.profile === "core") groups.core.push(e); else groups.strength.push(e); });
    function row(e) {
      var bar = e.barId ? barById(e.barId) : null;
      var rm = e.rm ? fmtW(e.rm) + (e.rmStale ? ' <span class="stale">veraltet</span>' : '') : '–';
      return '<div class="ex-row" data-action="detail" data-id="' + e.id + '">'
        + '<div class="ex-main"><span class="ex-name">' + esc(e.name) + '</span><span class="ex-tags">' + esc(e.profile) + ' · ' + esc(e.slot) + (bar ? ' · ' + esc(bar.name) : '') + '</span></div>'
        + '<div class="ex-stats"><span>Arbeit ' + fmtW(e.workWeight) + '</span><span>1RM ' + rm + '</span><span class="ex-reps">' + e.repRange[0] + '–' + e.repRange[1] + '</span></div>'
        + '<span class="chev">›</span></div>';
    }
    var html = dashboardHTML();
    html += '<div class="section-title">Übungen</div>';
    html += '<div class="ex-group"><div class="grp-title">Kraft</div>' + groups.strength.map(row).join("") + '</div>';
    html += '<div class="ex-group"><div class="grp-title">Core</div>' + groups.core.map(row).join("") + '</div>';
    if (groups.inactive.length) html += '<div class="ex-group"><div class="grp-title">Inaktiv / Swaps</div>' + groups.inactive.map(row).join("") + '</div>';
    return html;
  }

  function exerciseHistory(exId) {
    var out = [];
    doneSessions().forEach(function (s) {
      (s.entries || []).forEach(function (en) {
        if (en.exerciseId !== exId) return;
        var ws = (en.sets || []).filter(function (x) { return x.type !== "warmup"; });
        if (!ws.length) return;
        var topW = Math.max.apply(null, ws.map(function (x) { return x.weight || 0; }));
        var reps = ws.reduce(function (a, x) { return a + (x.reps || 0); }, 0);
        var vol = ws.reduce(function (a, x) { return a + (x.reps || 0) * (x.weight || 0); }, 0);
        var sc = ws.reduce(function (a, x) { return a + (x.score || 0); }, 0) / ws.length;
        out.push({ date: s.date, topW: topW, reps: reps, vol: vol, score: sc, est1RM: en.est1RM, dev: !!en.hadDeviation, week: isoWeek(s.date) });
      });
    });
    return out;
  }

  function viewExerciseDetail(exId) {
    var e = exById(exId); if (!e) { UI.detail = null; return viewExercises(); }
    var h = exerciseHistory(exId);
    var rmPts = h.filter(function (x) { return x.est1RM; }).map(function (x) { return { y: x.est1RM, flag: x.dev }; });
    var wPts = h.map(function (x) { return { y: x.topW, flag: x.dev }; });
    var rPts = h.map(function (x) { return { y: x.reps, flag: x.dev }; });
    var sPts = h.map(function (x) { return { y: x.score, flag: x.dev }; });
    // Wochenvolumen
    var byWeek = {}; h.forEach(function (x) { byWeek[x.week] = (byWeek[x.week] || 0) + x.vol; });
    var weeks = Object.keys(byWeek).sort(); var volItems = weeks.map(function (w) { return { label: w.slice(-3), value: byWeek[w] }; });

    var bar = e.barId ? barById(e.barId) : null;
    var sug = e.profile !== "core" ? suggestForExercise(e, currentPhase()) : null;

    var html = '<button class="btn ghost small back" data-action="ex-back">‹ Übungen</button>';
    html += '<div class="detail-head"><h2>' + esc(e.name) + '</h2><span class="ex-tags">' + esc(e.profile) + ' · ' + esc(e.slot) + (bar ? ' · ' + esc(bar.name) + ' ' + fmtW(bar.weight) : '') + ' · ' + esc(e.muscleGroups.join(", ")) + '</span></div>';

    html += '<div class="metric-row">'
      + metric("Arbeitsgewicht", fmtW(e.workWeight))
      + metric("Repband", e.repRange[0] + "–" + e.repRange[1])
      + metric("1RM (geschätzt)", e.rm ? fmtW(e.rm) : "–")
      + metric("Sessions", h.length)
      + '</div>';

    if (sug) html += '<div class="card"><div class="sets-title">Nächster Vorschlag</div><div class="suggest-line big">' + fmtW(sug.weight) + ' · ' + sug.targetReps + ' Wdh <span class="dec dec-' + sug.decision + '">' + decLabel(sug.decision) + '</span></div><div class="note">' + esc(sug.note) + '</div></div>';

    html += detailChartCard(e, "rm", lineChart(rmPts, {}));
    html += detailChartCard(e, "weight", lineChart(wPts, {}));
    html += detailChartCard(e, "reps", lineChart(rPts, {}));
    html += detailChartCard(e, "volume", barChart(volItems, {}));
    html += detailChartCard(e, "score", lineChart(sPts, {}));
    html += '<div class="hint">Rote Punkte = Session mit Abweichung (Ziel verfehlt / runterkorrigiert). Über „Anheften" landet ein Diagramm oben im Dashboard.</div>';

    // Einstellungen je Übung
    html += '<div class="card"><div class="sets-title">Übung anpassen</div><div class="ex-edit">'
      + editNum("Arbeitsgewicht", "workWeight", e.workWeight, 0.25)
      + editNum("Repband min", "repmin", e.repRange[0], 1)
      + editNum("Repband max", "repmax", e.repRange[1], 1)
      + editNum("Ziel-Score", "targetScore", e.targetScore, 1)
      + '<label class="chk"><input type="checkbox" data-exedit="active" data-id="' + e.id + '"' + (e.active ? " checked" : "") + '> aktiv</label>'
      + '</div></div>';
    return html;
  }
  function metric(label, val) { return '<div class="metric"><span class="m-val">' + val + '</span><span class="m-label">' + label + '</span></div>'; }
  function chartCard(title, svg) { return '<div class="card chart-card"><div class="sets-title">' + title + '</div>' + svg + '</div>'; }
  function editNum(label, field, val, step) { return '<label class="edit-field"><span>' + label + '</span><input type="number" step="' + step + '" class="num" data-exedit="' + field + '" data-id="' + UI.detail + '" value="' + val + '"></label>'; }

  /* =========================================================
     View: Inventar
     ========================================================= */
  /* =========================================================
     View: Körper (eigener Bereich, 1×/Tag)
     ========================================================= */
  function viewBody() {
    var t = todayBody() || blankBody();
    var hasToday = !!todayBody();
    var adv = restAdvice();
    var lvlTitle = { rest: "Rest-Tag empfohlen", caution: "Vorsicht – reduziert trainieren", ok: "Bereit fürs Training", unknown: "Heute noch nicht erfasst" }[adv.level];
    var html = '<div class="section-title">Körperzustand</div>';
    html += '<p class="hint body-lead">Einmal pro Tag erfassen, unabhängig vom Training. Diese Angaben fließen in die Workout-Empfehlung und den Rest-Tag-Hinweis ein.</p>';
    html += '<div class="rest-card ' + adv.level + '"><div class="rc-main"><strong>' + lvlTitle + '</strong>' + (adv.reasons.length ? '<span>' + esc(adv.reasons.join(" · ")) + '</span>' : '<span>Körperzustand grün.</span>') + '</div></div>';
    html += '<div class="card body-form"><div class="sets-title">' + (hasToday ? 'Heute (' + today() + ') – bearbeiten' : 'Heute (' + today() + ')') + '</div>'
      + '<div class="body-grid">'
      + sorePicker("legs", "Beine", t.legs) + sorePicker("upper_body", "Oberkörper", t.upper_body) + sorePicker("overall", "Gesamt", t.overall)
      + '<div class="bfield"><span>Readiness</span><select data-body="readiness">' + [1, 2, 3, 4, 5].map(function (v) { return '<option value="' + v + '"' + (t.readiness === v ? " selected" : "") + '>' + v + '</option>'; }).join("") + '</select></div>'
      + '<label class="chk bfield"><input type="checkbox" data-body="pain.flag"' + (t.pain && t.pain.flag ? " checked" : "") + '> Schmerz (warnt)</label>'
      + '</div>'
      + '<textarea class="notes body-notes" data-body="notes" rows="4" placeholder="Notiz (optional, mehrzeilig)">' + esc(t.notes || "") + '</textarea>'
      + '<div class="hint scale-hint">Kater 0 keine · 1 leicht · 2 deutlich · 3 stark (Region wird im Vorschlag ausgeschlossen). Readiness 1 mies … 5 top.</div>'
      + '</div>';
    var log = sortedBodyLog().slice().reverse().filter(function (e) { return e.date !== today(); });
    html += '<div class="section-title">Verlauf</div>';
    if (!log.length) html += '<div class="empty">Noch keine früheren Einträge.</div>';
    else html += '<div class="blog-list">' + log.map(function (e) {
      return '<div class="blog-item"><span class="bl-date">' + esc(e.date) + '</span>'
        + '<span class="bl-vals">Beine ' + (e.legs || 0) + ' · OK ' + (e.upper_body || 0) + ' · Ges ' + (e.overall || 0) + ' · Rdy ' + (e.readiness || 3) + (e.pain && e.pain.flag ? ' · Schmerz' : '') + '</span>'
        + (e.notes ? '<span class="bl-note">' + esc(e.notes) + '</span>' : '')
        + '<button class="btn tiny ghost danger" data-action="body-del" data-d="' + esc(e.date) + '">×</button></div>';
    }).join("") + '</div>';
    return html;
  }
  function ensureTodayBody() { var e = todayBody(); if (!e) { e = blankBody(); e.date = today(); DB.bodyLog.push(e); } return e; }
  function onBodyChange(el) {
    var e = ensureTodayBody(); var k = el.getAttribute("data-body");
    if (k === "pain.flag") { e.pain = e.pain || {}; e.pain.flag = el.checked; }
    else if (k === "notes") e.notes = el.value;
    else if (k === "readiness") e.readiness = +el.value;
    else e[k] = +el.value;
    persist(); render();
  }
  function onBarPick(el) {
    var ei = +el.getAttribute("data-ei"); var barId = el.value;
    var en = UI.live && UI.live.entries[ei]; if (!en) return;
    en.barId = barId;
    var exo = exById(en.exerciseId); if (exo) exo.barId = barId;
    if (exo && exo.category === "barbell" && en.suggestion) {
      en.warmupSets = E.generateWarmup(en.suggestion.weight, barById(barId).weight, DB.inventory.plates, { isLift1: en.slot === "lift1", isDeadlift: /deadlift/i.test(en.exerciseId) });
    }
    persist(); render();
  }

  /* =========================================================
     View: Journey-Verwaltung (eigener Tab)
     ========================================================= */
  function viewJourneyManager() {
    var act = activeJourney();
    var html = '<div class="section-title jl-title">Journeys<button class="btn primary addj" data-action="journey-picker">+ Neue aus Vorlage</button></div>';
    html += '<p class="hint jm-lead">Verwalte hier deine Trainingszyklen. Die aktive Journey steuert Phasen, Volumen und Wiederholungen im Training; ihr Verlauf ist unter Workouts sichtbar.</p>';
    if (!DB.journeys.length) {
      html += '<div class="card empty-journey"><p class="ej-lead">Noch keine Journey.</p><p class="hint">Wähle eine Vorlage, die zu deinem aktuellen Ziel passt.</p><button class="btn primary" data-action="journey-picker">Journey aus Vorlage wählen</button></div>';
      return html;
    }
    html += '<div class="jlist">' + DB.journeys.map(function (jj) {
      var wks = jj.phases.reduce(function (a, p) { return a + p.weeks; }, 0);
      var cur = jj.phases.find(function (p) { return p.id === jj.currentPhaseId; });
      var badge = jj.active ? '<span class="badge-active">aktiv</span>'
        : (jj.status === "archived" ? '<span class="badge-arch">archiviert' + (jj.endDate ? ' · ' + esc(jj.endDate) : '') + '</span>' : '<span class="badge-idle">inaktiv</span>');
      return '<div class="jrow' + (jj.active ? ' active' : '') + (jj.status === "archived" ? ' archived' : '') + '">'
        + '<div class="jr-main"><span class="jr-name">' + esc(jj.name) + '</span>'
        + '<span class="jr-meta">' + jj.phases.length + ' Phasen · ' + wks + ' Wo' + (jj.goal ? ' · ' + esc(jj.goal) : '') + (jj.active && cur ? ' · jetzt: ' + esc(cur.name) + ' W' + (jj.currentWeek || 1) : '') + '</span></div>'
        + '<div class="jr-status">' + badge + '</div>'
        + '<div class="jr-actions">'
        + (jj.active ? '' : '<button class="btn tiny ghost" data-action="journey-activate" data-id="' + jj.id + '">aktivieren</button>')
        + (jj.status !== "archived" ? '<button class="btn tiny ghost" data-action="journey-finish" data-id="' + jj.id + '">abschließen</button>' : '')
        + '<button class="btn tiny ghost danger" data-action="journey-del" data-id="' + jj.id + '">löschen</button>'
        + '</div></div>';
    }).join('') + '</div>';
    return html;
  }

  /* =========================================================
     View: Journey-Vorlagen-Auswahl
     ========================================================= */
  function viewJourneyPicker() {
    var html = '<button class="btn ghost small back" data-action="journey-picker-close">‹ Zurück</button>';
    html += '<div class="section-title">Journey wählen</div>';
    html += '<p class="hint pick-lead">Eine Journey gibt dir über mehrere Wochen einen roten Faden mit aufeinander aufbauenden Phasen. Wähle die, die zu deinem aktuellen Ziel passt – die aktuellen Arbeitsgewichte werden als Startbasis übernommen.</p>';
    html += '<div class="tpl-grid">' + JOURNEY_TEMPLATES.map(function (t) {
      var wks = templateWeeks(t);
      var track = t.phases.map(function (p) {
        return '<div class="tpl-pill"><span class="tp-n">' + esc(p.n) + '</span><span class="tp-m">' + p.w + ' Wo · ' + esc(focusLabel(p.f)) + (p.rt ? ' · ' + p.rt[0] + '–' + p.rt[1] + ' Wdh' : '') + '</span></div>';
      }).join('<span class="phase-arrow">›</span>');
      return '<div class="card tpl-card">'
        + '<div class="tpl-head"><h3>' + esc(t.name) + '</h3><span class="tpl-dur">' + wks + ' Wochen · ' + t.phases.length + ' Phasen</span></div>'
        + '<div class="tpl-tag">' + esc(t.tagline) + '</div>'
        + '<div class="tpl-for"><strong>Für:</strong> ' + esc(t.forWhom) + '</div>'
        + '<div class="tpl-summary">' + esc(t.summary) + '</div>'
        + '<div class="tpl-track">' + track + '</div>'
        + '<button class="btn primary" data-action="journey-create" data-tpl="' + t.id + '">Diese Journey starten</button>'
        + '</div>';
    }).join('') + '</div>';
    return html;
  }

  function viewInventory() {
    var html = '<div class="section-title">Inventar</div>';
    html += '<div class="card"><div class="sets-title">Stangen</div><div class="bar-list">';
    DB.inventory.bars.forEach(function (b, i) {
      html += '<div class="bar-card' + (b.default ? ' is-default' : '') + '">'
        + '<div class="bar-card-main"><span class="bar-name">' + esc(b.name) + '</span>'
        + (b.default ? '<span class="def">Standard</span>' : '') + '</div>'
        + '<div class="bar-card-controls">'
        + '<span class="bar-weight"><input type="number" step="0.5" class="num" data-bar="weight" data-i="' + i + '" value="' + b.weight + '"><span class="bar-unit">' + DB.settings.unit + '</span></span>'
        + (b.default ? '' : '<button class="btn tiny ghost" data-action="bar-default" data-i="' + i + '">Als Standard</button>')
        + '<button class="btn tiny ghost bar-del" data-action="bar-del" data-i="' + i + '" title="Stange entfernen">×</button>'
        + '</div></div>';
    });
    html += '</div><button class="btn tiny ghost" data-action="bar-add">+ Stange</button></div>';

    html += '<div class="card"><div class="sets-title">Scheiben (pro Stück, kg)</div><div class="plate-chips">';
    DB.inventory.plates.slice().sort(function (a, b) { return a - b; }).forEach(function (p) {
      html += '<span class="plate-chip">' + fmtNum(p) + ' <button data-action="plate-del" data-p="' + p + '">×</button></span>';
    });
    html += '</div><div class="plate-add"><input type="number" step="0.25" class="num" id="plate-new" placeholder="z.B. 0.5"><button class="btn tiny ghost" data-action="plate-add">+ Scheibe</button></div>';
    html += '<div class="hint">Kleinster Sprung gesamt: <strong>' + fmtW(2 * E.plateGrid(DB.inventory.plates)) + '</strong></div></div>';

    return html;
  }

  /* =========================================================
     View: Einstellungen
     ========================================================= */
  function viewSettings() {
    var s = DB.settings;
    var html = '<div class="section-title">Einstellungen</div>';
    html += '<div class="card"><div class="sets-title">Engine & Einheiten</div><div class="settings-grid">'
      + '<label class="edit-field"><span>1RM-Formel</span><select data-set-setting="rmFormula">'
      + ["mean", "brzycki", "epley", "wathan"].map(function (f) { return '<option value="' + f + '"' + (s.rmFormula === f ? " selected" : "") + '>' + (f === "mean" ? "Mittelwert (B+E+W)" : f) + '</option>'; }).join("") + '</select></label>'
      + numSetting("Wochen-Frequenzziel", "weeklyFrequencyTarget", s.weeklyFrequencyTarget, 1)
      + numSetting("Schrittweite", "step", s.step, 0.25)
      + numSetting("Erholung Squat (h)", "rec_squat", s.recoveryWindows.squat, 1)
      + numSetting("Erholung Deadlift (h)", "rec_deadlift", s.recoveryWindows.deadlift, 1)
      + '<label class="edit-field"><span>Einheit</span><select data-set-setting="unit"><option value="kg"' + (s.unit === "kg" ? " selected" : "") + '>kg</option><option value="lb"' + (s.unit === "lb" ? " selected" : "") + '>lb</option></select></label>'
      + '</div></div>';

    html += '<div class="card"><div class="sets-title">Daten – Export / Import</div>'
      + '<div class="hint">JSON ist Backup und additive Schnittstelle zu Claude. Import in drei Modi.</div>'
      + '<div class="data-btns"><button class="btn ghost" data-action="export">Export (Download)</button>'
      + '<button class="btn ghost" data-action="export-copy">Export in Zwischenablage</button></div>'
      + '<div class="import-box"><textarea id="import-text" placeholder="JSON hier einfügen oder Datei wählen…"></textarea>'
      + '<input type="file" id="import-file" accept="application/json,.json">'
      + '<div class="import-modes">Modus: '
      + '<label><input type="radio" name="impmode" value="append" checked> Anhängen (additiv)</label>'
      + '<label><input type="radio" name="impmode" value="update"> Aktualisieren (nach ID)</label>'
      + '<label><input type="radio" name="impmode" value="replace"> Ersetzen (Voll-Restore)</label></div>'
      + '<button class="btn primary" data-action="import">Importieren</button></div>'
      + '</div>';

    html += '<div class="card"><div class="sets-title">Demo & Zurücksetzen</div>'
      + '<div class="data-btns"><button class="btn ghost" data-action="demo">Demo-Daten laden</button>'
      + '<button class="btn danger" data-action="reset">Alles zurücksetzen</button></div>'
      + '<div class="hint">Demo-Daten erzeugen Beispiel-Sessions, damit Grafiken/Kalender befüllt sind.</div></div>';

    html += '<div class="card"><div class="sets-title">Score ↔ RIR ↔ RPE</div><div class="score-table">'
      + [1, 2, 3, 4, 5].map(function (v) { var i = E.scoreInfo(v); return '<div class="score-cell"><strong>' + v + '</strong><span>RIR ' + i.rir + '</span><span>RPE ' + i.rpe + '</span><span class="sl">' + i.label + '</span></div>'; }).join("")
      + '</div><div class="hint">Ziel Arbeitssätze: Score 3–4 (RIR 1–3). Wiedereinstieg ≤ 3.</div></div>';
    return html;
  }
  function numSetting(label, field, val, step) { return '<label class="edit-field"><span>' + label + '</span><input type="number" step="' + step + '" class="num" data-set-setting="' + field + '" value="' + val + '"></label>'; }

  /* =========================================================
     Demo-Daten
     ========================================================= */
  function loadDemo() {
    DB.sessions = [];
    var order = ["t_a", "t_b", "t_c", "t_a", "t_b", "t_c"];
    var base = new Date(); base.setDate(base.getDate() - 18);
    order.forEach(function (tid, k) {
      var t = tplById(tid); var d = new Date(base); d.setDate(base.getDate() + k * 3);
      var ds = d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
      var entries = [t.lift1, t.lift2, t.core].map(function (id, idx) {
        var exo = exById(id); var grow = 1 + k * 0.04;
        var w = E.nearestLoadable((exo.workWeight) * grow, exo.barId ? barById(exo.barId).weight : 0, DB.inventory.plates, false);
        var tr = exo.repRange[1];
        var sets = []; var n = 3;
        for (var i = 0; i < n; i++) {
          var fail = (k === 2 && idx === 0 && i === n - 1);
          var reps = fail ? tr - 3 : tr; var sc = fail ? 5 : (3 + (i === n - 1 ? 1 : 0));
          sets.push({ reps: reps, weight: w, score: sc, failed: fail, done: true, type: "work", targetReps: tr, targetWeight: w, metTarget: !fail, adjusted: false });
        }
        var best = E.best1RMFromSets(sets, DB.settings.rmFormula);
        return { exerciseId: id, slot: idx === 0 ? "lift1" : idx === 1 ? "lift2" : "core", warmupSets: [], plannedSets: sets.map(function (s) { return { reps: s.targetReps, weight: s.targetWeight, targetScore: exo.targetScore }; }), sets: sets, hadDeviation: E.hadDeviation(sets), est1RM: best.value, tested1RM: null };
      });
      DB.sessions.push({ id: "s_demo_" + k, date: ds, journeyId: "j_2026_aufbau", phaseId: "p1", templateId: tid, status: "done", generalWarmup: { done: true, minutes: 7, mode: "bike" }, entries: entries, body: { legs: k === 2 ? 2 : 1, upper_body: 1, overall: 1, pain: {}, readiness: k === 2 ? 2 : 4, notes: "" } });
    });
    var yd = new Date(); yd.setDate(yd.getDate() - 1); var yds = yd.getFullYear() + "-" + pad(yd.getMonth() + 1) + "-" + pad(yd.getDate());
    DB.bodyLog = [
      { date: yds, legs: 2, upper_body: 1, overall: 1, pain: { flag: false }, readiness: 4, notes: "gut erholt" },
      { date: today(), legs: 1, upper_body: 1, overall: 1, pain: { flag: false }, readiness: 4, notes: "" }
    ];
    persist(); render();
  }

  /* =========================================================
     Import / Export
     ========================================================= */
  function exportText() { return JSON.stringify(DB, null, 2); }
  function download() {
    var blob = new Blob([exportText()], { type: "application/json" });
    var a = document.createElement("a"); a.href = URL.createObjectURL(blob);
    a.download = "fitness-system_" + today() + ".json"; document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 0);
  }
  function importJSON(text, mode) {
    var data; try { data = JSON.parse(text); } catch (e) { alert("Ungültiges JSON: " + e.message); return; }
    if (mode === "replace") {
      if (!confirm("Ersetzen: alle aktuellen Daten werden überschrieben. Fortfahren?")) return;
      DB = data; migrate(DB); persist(); UI.detail = null; render(); toast("Ersetzt."); return;
    }
    // additiv / update – Teil-JSON erlaubt
    var sections = ["exercises", "templates", "journeys", "sessions"];
    var added = 0, updated = 0;
    sections.forEach(function (sec) {
      if (!Array.isArray(data[sec])) return;
      DB[sec] = DB[sec] || [];
      data[sec].forEach(function (item) {
        var existing = DB[sec].find(function (x) { return x.id === item.id; });
        if (existing) {
          if (mode === "update") { Object.assign(existing, item); updated++; }
          else { // append: ID-Kollision -> neue ID
            var copy = clone(item); copy.id = uid(sec.slice(0, 3) + "_"); DB[sec].push(copy); added++;
          }
        } else { DB[sec].push(clone(item)); added++; }
      });
    });
    // settings/inventory: nur bei update/replace übernehmen
    if (mode === "update") {
      if (data.settings) Object.assign(DB.settings, data.settings);
      if (data.inventory) Object.assign(DB.inventory, data.inventory);
    }
    persist(); render(); toast(added + " hinzugefügt, " + updated + " aktualisiert.");
  }

  /* =========================================================
     Events (Delegation)
     ========================================================= */
  document.addEventListener("click", function (ev) {
    var el = ev.target.closest("[data-action]"); if (!el) return;
    var a = el.getAttribute("data-action");
    switch (a) {
      case "tab": UI.tab = el.getAttribute("data-tab"); UI.detail = null; UI.journeyPicker = false; UI.menuOpen = false; render(); break;
      case "menu-toggle": UI.menuOpen = !UI.menuOpen; render(); break;
      case "auth-open": openAuthModal(); break;
      case "auth-close": closeAuthModal(); break;
      case "start": UI.live = buildLive(el.getAttribute("data-tpl")); render(); break;
      case "cancel-live": if (confirm("Laufende Session verwerfen?")) { UI.live = null; render(); } break;
      case "finish": finishSession(); break;
      case "add-set": addSet(+el.getAttribute("data-ei")); break;
      case "del-set": delSet(+el.getAttribute("data-ei")); break;
      case "detail": UI.detail = el.getAttribute("data-id"); render(); break;
      case "ex-back": UI.detail = null; render(); break;
      case "del-session": if (confirm("Session löschen?")) { DB.sessions = DB.sessions.filter(function (s) { return s.id !== el.getAttribute("data-id"); }); persist(); render(); } break;
      case "wk": adjustWeek(+el.getAttribute("data-d")); break;
      case "phase-next": nextPhase(); break;
      case "body-del": DB.bodyLog = DB.bodyLog.filter(function (e) { return e.date !== el.getAttribute("data-d"); }); persist(); render(); break;
      case "cal-prev": calShift(-1); break;
      case "cal-next": calShift(1); break;
      case "cal-today": calToday(); break;
      case "toggle-plate": { var pe = el.getAttribute("data-ei"); UI.plateHide[pe] = !UI.plateHide[pe]; render(); break; }
      case "add-yoga": addYoga(); break;
      case "pin-chart": dashToggle(el.getAttribute("data-ex"), el.getAttribute("data-metric")); render(); break;
      case "dash-up": dashMove(+el.getAttribute("data-i"), -1); render(); break;
      case "dash-down": dashMove(+el.getAttribute("data-i"), 1); render(); break;
      case "dash-del": dashRemove(+el.getAttribute("data-i")); render(); break;
      case "journey-picker": UI.tab = "journey"; UI.journeyPicker = true; render(); break;
      case "journey-picker-close": UI.journeyPicker = false; render(); break;
      case "journey-create": createJourneyFromTemplate(el.getAttribute("data-tpl")); break;
      case "journey-activate": activateJourney(el.getAttribute("data-id")); break;
      case "journey-finish": if (confirm("Journey abschließen und archivieren? Der Verlauf bleibt erhalten.")) finishJourney(el.getAttribute("data-id")); break;
      case "journey-del": if (confirm("Journey wirklich löschen? Sessions bleiben erhalten.")) deleteJourney(el.getAttribute("data-id")); break;
      case "bar-add": DB.inventory.bars.push({ id: uid("bar_"), name: "Stange", weight: 20, default: false }); persist(); render(); break;
      case "bar-del": DB.inventory.bars.splice(+el.getAttribute("data-i"), 1); persist(); render(); break;
      case "bar-default": DB.inventory.bars.forEach(function (b, i) { b.default = i === +el.getAttribute("data-i"); }); persist(); render(); break;
      case "plate-del": DB.inventory.plates = DB.inventory.plates.filter(function (p) { return p !== parseFloat(el.getAttribute("data-p")); }); persist(); render(); break;
      case "plate-add": addPlate(); break;
      case "loader-calc": loaderCalc(); break;
      case "export": download(); break;
      case "export-copy": copyExport(); break;
      case "import": doImport(); break;
      case "demo": if (confirm("Demo-Daten laden (überschreibt Sessions)?")) loadDemo(); break;
      case "reset": if (confirm("Wirklich alles zurücksetzen?")) { Store.wipe(); DASH = []; dashSave(); try { localStorage.removeItem(DASH_KEY); } catch (e) {} DB = seed(); UI = { tab: "settings", detail: null, live: null }; persist(); render(); } break;
    }
  });

  // Übungs-Edit & Settings-Inputs (Delegation auf change)
  document.addEventListener("change", function (ev) {
    var el = ev.target;
    if (el.hasAttribute && el.hasAttribute("data-exedit")) { exEdit(el); }
    else if (el.hasAttribute && el.hasAttribute("data-set-setting")) { settingEdit(el); }
    else if (el.hasAttribute && el.hasAttribute("data-body")) { onBodyChange(el); }
    else if (el.hasAttribute && el.hasAttribute("data-barpick")) { onBarPick(el); }
    else if (el.hasAttribute && el.hasAttribute("data-bar")) { var i = +el.getAttribute("data-i"); DB.inventory.bars[i].weight = parseFloat(el.value) || 0; persist(); }
  });

  // Dashboard: Drag-and-drop zum Sortieren (Desktop); Pfeile als Fallback für Touch
  var dashDragFrom = null;
  document.addEventListener("dragstart", function (ev) {
    var t = ev.target.closest && ev.target.closest(".dash-tile"); if (!t) return;
    dashDragFrom = +t.getAttribute("data-dash-idx");
    if (ev.dataTransfer) { ev.dataTransfer.effectAllowed = "move"; try { ev.dataTransfer.setData("text/plain", String(dashDragFrom)); } catch (e) {} }
  });
  document.addEventListener("dragover", function (ev) {
    var t = ev.target.closest && ev.target.closest(".dash-tile"); if (!t || dashDragFrom === null) return;
    ev.preventDefault(); t.classList.add("drop-target");
  });
  document.addEventListener("dragleave", function (ev) {
    var t = ev.target.closest && ev.target.closest(".dash-tile"); if (t) t.classList.remove("drop-target");
  });
  document.addEventListener("drop", function (ev) {
    var t = ev.target.closest && ev.target.closest(".dash-tile"); if (!t || dashDragFrom === null) return;
    ev.preventDefault(); var to = +t.getAttribute("data-dash-idx");
    dashReorder(dashDragFrom, to); dashDragFrom = null; render();
  });
  document.addEventListener("dragend", function () { dashDragFrom = null; });

  function addSet(ei) {
    var en = UI.live.entries[ei]; var last = en.sets[en.sets.length - 1] || { reps: 8, weight: barById(exById(en.exerciseId).barId).weight, score: 3 };
    en.sets.push({ reps: last.targetReps || last.reps, weight: last.targetWeight || last.weight, score: exById(en.exerciseId).targetScore, failed: false, done: false, targetReps: last.targetReps || last.reps, targetWeight: last.targetWeight || last.weight, adjusted: false, adjustNote: "" });
    en.plannedSets.push({ reps: last.targetReps || last.reps, weight: last.targetWeight || last.weight, targetScore: exById(en.exerciseId).targetScore });
    render();
  }
  function delSet(ei) { var en = UI.live.entries[ei]; if (en.sets.length > 1) { en.sets.pop(); en.plannedSets.pop(); render(); } }
  function adjustWeek(d) { var j = activeJourney(); var ph = currentPhase(); j.currentWeek = Math.max(1, Math.min(ph ? ph.weeks : 99, (j.currentWeek || 1) + d)); persist(); render(); }
  function nextPhase() {
    var j = activeJourney(); if (!j) return;
    var idx = j.phases.findIndex(function (p) { return p.id === j.currentPhaseId; });
    if (idx < j.phases.length - 1) { j.currentPhaseId = j.phases[idx + 1].id; j.currentWeek = 1; persist(); render(); }
    else toast("Letzte Phase erreicht. Journey abschließen oder eine neue starten.");
  }
  /* ---- Journey-Verwaltung ---- */
  function createJourneyFromTemplate(tplId) {
    var t = JOURNEY_TEMPLATES.find(function (x) { return x.id === tplId; }); if (!t) return;
    var phases = t.phases.map(function (p, i) { return phase("p" + i, p.n, p.f, p.w, p.s0, p.s1, p.dl, p.rt); });
    DB.journeys.forEach(function (j) { j.active = false; });
    var nj = {
      id: uid("j_"), name: t.name, goal: t.tagline, templateId: t.id,
      active: true, status: "active", startDate: today(),
      currentPhaseId: phases[0].id, currentWeek: 1, phases: phases
    };
    DB.journeys.push(nj);
    UI.journeyPicker = false; UI.tab = "workouts";
    persist(); render();
    toast("Journey \u201E" + t.name + "\u201C gestartet \u2013 Startbasis sind deine aktuellen Arbeitsgewichte.");
  }
  function activateJourney(id) {
    DB.journeys.forEach(function (j) { j.active = (j.id === id); if (j.id === id && j.status === "archived") j.status = "active"; });
    persist(); render();
  }
  function finishJourney(id) {
    var j = DB.journeys.find(function (x) { return x.id === id; }); if (!j) return;
    j.status = "archived"; j.active = false; j.endDate = today();
    var next = DB.journeys.find(function (x) { return x.status !== "archived"; });
    if (next) next.active = true;
    persist(); render();
    toast("Journey abgeschlossen und archiviert.");
  }
  function deleteJourney(id) {
    var wasActive = (DB.journeys.find(function (x) { return x.id === id; }) || {}).active;
    DB.journeys = DB.journeys.filter(function (x) { return x.id !== id; });
    if (wasActive) { var next = DB.journeys.find(function (x) { return x.status !== "archived"; }) || DB.journeys[0]; if (next) next.active = true; }
    persist(); render();
  }
  function exEdit(el) {
    var id = el.getAttribute("data-id"); var e = exById(id); if (!e) return; var f = el.getAttribute("data-exedit");
    if (f === "active") e.active = el.checked;
    else if (f === "workWeight") e.workWeight = parseFloat(el.value) || 0;
    else if (f === "targetScore") e.targetScore = parseInt(el.value, 10) || 3;
    else if (f === "repmin") e.repRange[0] = parseInt(el.value, 10) || 1;
    else if (f === "repmax") e.repRange[1] = parseInt(el.value, 10) || 1;
    persist(); render();
  }
  function settingEdit(el) {
    var f = el.getAttribute("data-set-setting"); var s = DB.settings;
    if (f === "rmFormula" || f === "unit") s[f] = el.value;
    else if (f === "rec_squat") s.recoveryWindows.squat = parseInt(el.value, 10) || 48;
    else if (f === "rec_deadlift") s.recoveryWindows.deadlift = parseInt(el.value, 10) || 72;
    else s[f] = parseFloat(el.value) || s[f];
    persist(); render();
  }
  function addPlate() { var inp = document.getElementById("plate-new"); var v = parseFloat(inp.value); if (v > 0 && DB.inventory.plates.indexOf(v) < 0) { DB.inventory.plates.push(v); persist(); render(); } }
  function loaderCalc() {
    var tgt = parseFloat(document.getElementById("loader-target").value);
    var barId = document.getElementById("loader-bar").value; var bar = barById(barId);
    var ld = E.nearestLoadable(tgt, bar.weight, DB.inventory.plates, false);
    var pl = plateLoaderSVG(ld, bar);
    document.getElementById("loader-out").innerHTML = '<div class="plate-wrap">' + pl.svg + '<div class="plate-label">Ziel ' + fmtW(tgt) + ' → ladbar <strong>' + fmtW(ld) + '</strong> · ' + pl.label + '</div></div>';
  }
  function doImport() {
    var mode = (document.querySelector('input[name="impmode"]:checked') || {}).value || "append";
    var ta = document.getElementById("import-text"); var fileInp = document.getElementById("import-file");
    if (fileInp.files && fileInp.files[0]) {
      var r = new FileReader(); r.onload = function () { importJSON(r.result, mode); }; r.readAsText(fileInp.files[0]); return;
    }
    if (ta.value.trim()) importJSON(ta.value, mode);
    else alert("Bitte JSON einfügen oder Datei wählen.");
  }
  function copyExport() {
    var txt = exportText();
    if (navigator.clipboard) navigator.clipboard.writeText(txt).then(function () { toast("In Zwischenablage kopiert."); }, function () { fallbackCopy(txt); });
    else fallbackCopy(txt);
  }
  function fallbackCopy(txt) { var ta = document.createElement("textarea"); ta.value = txt; document.body.appendChild(ta); ta.select(); try { document.execCommand("copy"); toast("kopiert."); } catch (e) {} ta.remove(); }

  /* =========================================================
     Toast / Store-Hinweis
     ========================================================= */
  function toast(msg) {
    var t = document.createElement("div"); t.className = "toast"; t.textContent = msg; document.body.appendChild(t);
    setTimeout(function () { t.classList.add("show"); }, 10);
    setTimeout(function () { t.classList.remove("show"); setTimeout(function () { t.remove(); }, 300); }, 2200);
  }
  function flashStore() { toast("Speichern fehlgeschlagen – bitte exportieren."); }

  /* init */
  window.KS_APP = {
    getDB: function () { return DB; },
    setDB: function (db) { DB = db; if (typeof migrate === "function") migrate(DB); Store.save(DB); render(); },
    schema: SCHEMA
  };
  render();
  if (window.KSSync) {
    window.KSSync.onAuthChange = function () { refreshAuthIcon(); };
    window.KSSync.boot();
  }
  ensureAuthModal();
  window.__FS = { DB: function () { return DB; }, E: E }; // Debug-Hook
})();
