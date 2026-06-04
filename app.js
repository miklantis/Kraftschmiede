/* Fitness-System – App (Schema 0.14). Vanilla JS, framework-frei.
   Setzt window.FSE (engine.js) voraus. */
(function () {
  "use strict";
  var E = window.FSE;
  var KS = (window.KS = window.KS || {});
  var SCHEMA = "0.14";
  /* Frueh-Export: seed()/migrate() aus data.js laufen bereits beim Init
     und brauchen SCHEMA + today() (today ist als Funktionsdeklaration gehoistet). */
  KS.SCHEMA = SCHEMA;
  KS.today = today;

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
     Seed-Daten, Domaene, Journey-Vorlagen, Migration -> data.js.
     Lokale Delegates auf window.KS, damit Init und Aufrufstellen
     unveraendert bleiben. JOURNEY_TEMPLATES als Alias auf die in
     data.js gehaltene Vorlagenliste.
     ========================================================= */
  function seed() { return KS.seed.apply(null, arguments); }
  function migrate() { return KS.migrate.apply(null, arguments); }
  function kindLabel() { return KS.kindLabel.apply(null, arguments); }
  function phase() { return KS.phase.apply(null, arguments); }
  function repTargetForFocus() { return KS.repTargetForFocus.apply(null, arguments); }
  function focusLabel() { return KS.focusLabel.apply(null, arguments); }
  function templateWeeks() { return KS.templateWeeks.apply(null, arguments); }
  function skillById() { return KS.skillById.apply(null, arguments); }
  function skillProgressFor() { return KS.skillProgressFor.apply(null, arguments); }
  var JOURNEY_TEMPLATES = KS.JOURNEY_TEMPLATES;
  var SKILLS = KS.SKILLS;

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
  var UI = { tab: "training", detail: null, live: null, importPreview: null, journeyPicker: false, skillsPicker: false, skillOpen: {}, calMonth: null, plateShow: {}, menuOpen: false, woView: "calendar", bodyDraft: null };
  // Laufende Session nach Browser-/App-Neustart wiederherstellen. Die Uhr
  // laeuft ueber den gespeicherten startedAt-Zeitstempel korrekt weiter.
  if (DB.live && DB.live.status === "live") { UI.live = DB.live; UI.tab = "training"; }

  /* =========================================================
     State – der einzige Ort fuer "lesen / speichern / aus Cloud ersetzen".
     Der Zustand liegt weiterhin in der Variable DB; State kapselt die
     Persistenz (localStorage via Store) und das verzoegerte Hochladen
     (KSSync). Die bisherigen drei Zugaenge (persist, KS.db, KS_APP)
     zeigen alle hierher, damit es kuenftig nur eine Stelle zu pflegen gibt.
     Das Dashboard (DASH) bleibt bewusst getrennt und unsynchronisiert.
     ========================================================= */
  var State = {
    // aktuellen Zustand lesen
    get: function () { return DB; },
    // lokal sichern + (falls eingerichtet) verzoegert in die Cloud schieben
    persist: function () {
      if (!Store.save(DB)) flashStore();
      if (window.KSSync) window.KSSync.schedulePush();
    },
    // kompletten Zustand ersetzen (Cloud-Pull): migrieren, laufende Session
    // wiederherstellen, lokal sichern, neu rendern (kein sofortiges Hochladen)
    replace: function (db) {
      DB = db;
      if (typeof migrate === "function") migrate(DB);
      UI.live = (DB.live && DB.live.status === "live") ? DB.live : null;
      Store.save(DB);
      render();
    },
    persistent: function () { return Store.persistent; }
  };

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
  // Erste Stange der Liste – wird im Workout pro Uebung vorausgewaehlt.
  function firstBar() { return DB.inventory.bars[0]; }
  function tplById(id) { return DB.templates.find(function (t) { return t.id === id; }); }
  // Lese-Adapter: liefert fuer ein Template immer eine geordnete Item-Liste [{ exerciseId, role }].
  // Liest die neue items-Form, faellt non-destruktiv auf die alten Felder lift1/lift2/core zurueck.
  // role ist optional und rein beschreibend – Logik haengt weiter an Reihenfolge bzw. exercise.profile.
  function tplItems(t) {
    if (!t) return [];
    if (Array.isArray(t.items)) {
      return t.items
        .map(function (it) { return (typeof it === "string") ? { exerciseId: it } : { exerciseId: it.exerciseId, role: it.role }; })
        .filter(function (it) { return it.exerciseId; });
    }
    var out = [];
    if (t.lift1) out.push({ exerciseId: t.lift1, role: "primary" });
    if (t.lift2) out.push({ exerciseId: t.lift2, role: "secondary" });
    if (t.core) out.push({ exerciseId: t.core, role: "core" });
    return out;
  }
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
  // Aufwaermsaetze fuer eine Uebung an EINER Stelle: nur Langhantel bekommt eine
  // Rampe, Deadlift weniger Volumen, erste Uebung (isFirst) gruendlicher. Genutzt
  // von buildLive (Session-Aufbau) und onBarPick (Stangenwechsel), damit die Logik
  // nicht auseinanderlaeuft. Gibt fuer Nicht-Langhantel/ohne Stange [] zurueck.
  function warmupFor(exo, workWeight, bar, isFirst) {
    if (!exo || exo.category !== "barbell" || !bar) return [];
    return E.generateWarmup(workWeight, bar.weight, DB.inventory.plates, { isLift1: !!isFirst, isDeadlift: /deadlift/i.test(exo.id) });
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
     Coach – das deterministische "Gehirn". Buendelt die Aufrufe an die
     reine Engine (FSE): baut aus dem aktuellen Zustand (Phase, Verlauf,
     Koerper, Inventar) die noetigen Kontexte zusammen, sodass Views in
     Domaenensprache fragen und die FSE-Kontextformen nicht kennen muessen.
     Implementierung in den Glue-Funktionen oben; hier nur die Fassade.
     ========================================================= */
  var Coach = {
    // Gewichts-/Wdh.-Vorschlag fuer eine Uebung; Phase optional (Default: aktuelle).
    suggestionFor: function (exo, ph) { return suggestForExercise(exo, ph === undefined ? currentPhase() : ph); },
    // Aufwaermsaetze fuer eine Uebung an einer Stange (nur Langhantel).
    warmupFor: warmupFor,
    // Workouts nach Eignung sortiert (Recency, Erholung, Kater, Wochenbalance).
    rankedWorkouts: rankWorkouts,
    // Empfohlene Arbeitssatzzahl der Woche aus Phasen-Rampe + Erholung.
    plannedSets: plannedSetCount
  };

  /* =========================================================
     Charts (SVG) – Implementierung ausgelagert nach charts.js.
     Lokale Delegates auf window.KS, damit alle Aufrufstellen
     unveraendert bleiben.
     ========================================================= */
  function lineChart() { return KS.lineChart.apply(null, arguments); }
  function barChart() { return KS.barChart.apply(null, arguments); }
  function emptyChart() { return KS.emptyChart.apply(null, arguments); }
  function plateLoaderSVG() { return KS.plateLoaderSVG.apply(null, arguments); }
  function timerIcon() { return KS.timerIcon.apply(null, arguments); }
  function xIcon() { return KS.xIcon.apply(null, arguments); }
  function plateIcon() { return KS.plateIcon.apply(null, arguments); }
  function plateHint() { return KS.plateHint.apply(null, arguments); }
  function plateColor() { return KS.plateColor.apply(null, arguments); }
  function plateChips() { return KS.plateChips.apply(null, arguments); }
  function drawJourneyChart() { return KS.drawJourneyChart.apply(null, arguments); }
  function drawExerciseCharts() { return KS.drawExerciseCharts.apply(null, arguments); }
  function drawSkillCharts() { return KS.drawSkillCharts.apply(null, arguments); }

  /* =========================================================
     Rendering – Shell & Nav
     ========================================================= */
  var TABS = [
    { id: "training", label: "Training" },
    { id: "body", label: "Körper" },
    { id: "workouts", label: "Verlauf" },
    { id: "journey", label: "Journey" },
    { id: "skills", label: "Skills" },
    { id: "exercises", label: "Übungen" },
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
    var banner = State.persistent() ? '' : '<div class="banner">Kein dauerhafter Speicher in dieser Umgebung. Daten gehen beim Schließen verloren – nutze <strong>Export</strong> in den Einstellungen. Lokal gespeicherte Datei am Rechner speichert normal.</div>';
    var body = '';
    switch (UI.tab) {
      case "training": body = viewTraining(); break;
      case "body": body = viewBody(); break;
      case "workouts": body = viewWorkouts(); break;
      case "journey": body = UI.journeyPicker ? viewJourneyPicker() : viewJourneyManager(); break;
      case "skills": body = viewSkillsManager(); break;
      case "exercises": body = UI.detail ? viewExerciseDetail(UI.detail) : viewExercises(); break;
      case "settings": body = viewSettings(); break;
    }
    root.innerHTML = head + nav + banner + '<main class="content">' + body + '</main>';
    if (window.KSSync) window.KSSync.mountPanel();
    if (UI.tab === "training" && UI.live) {
      if (UI.live.kind === "skill") bindSkillLiveInputs();
      else { bindLiveInputs(); syncActiveSet(); }
    }
    if (UI.tab === "journey" && !UI.journeyPicker) drawJourneyChart();
    if (UI.tab === "exercises") drawExerciseCharts();
    if (UI.tab === "skills") drawSkillCharts();
    manageClock();
    syncRestBar();
  }

  /* =========================================================
     View: Training (Live)
     ========================================================= */
  // Pfad zum Vorschaubild: Dateiname aus dem Template-JSON (t.image), aufgeloest im
  // images/-Ordner. Beliebige Namen moeglich; Leerzeichen werden URL-codiert.
  function woImage(file) { return "images/" + encodeURIComponent(file); }
  function viewTraining() {
    if (UI.live) return UI.live.kind === "skill" ? liveSkillSession() : liveSession();
    var ranked = Coach.rankedWorkouts();
    var cards = ranked.map(function (r, i) {
      var t = r.tpl;
      var names = tplItems(t).map(function (it) { var e = exById(it.exerciseId); return e ? esc(e.name) : it.exerciseId; });
      return '<div class="wo-card' + (i === 0 ? ' rec' : '') + (r.excluded ? ' excl' : '') + '">'
        + '<div class="wo-thumb">'
        + '<img class="wo-img" src="' + woImage(t.image || ("Workout " + t.name + ".jpeg")) + '" alt="Workout ' + esc(t.name) + '" loading="lazy" onerror="this.remove()">'
        + '<span class="wo-grad"></span>'
        + '<span class="wo-name">Workout ' + esc(t.name) + '</span>'
        + '<span class="score-badge" title="Suitability-Score">' + fmtNum(r.score) + '</span>'
        + '</div>'
        + '<div class="wo-body">'
        + '<div class="wo-lifts">' + names[0] + ' › ' + names[1] + ' › ' + names[2] + '</div>'
        + (r.excluded ? '<div class="wo-excl">ausgeschlossen (Muskelkater)</div>' : '')
        + '<div class="wo-reasons">' + r.reasons.slice(0, 3).map(esc).join(" · ") + '</div>'
        + '<button class="btn ' + (i === 0 ? 'primary' : 'ghost') + '" data-action="start" data-tpl="' + t.id + '"' + (r.excluded ? ' disabled' : '') + '>' + (i === 0 ? 'Empfehlung starten' : 'starten') + '</button>'
        + '</div>'
        + '</div>';
    }).join("");
    return '<div class="section-title">Heute trainieren</div>'
      + '<div class="wo-grid">' + cards + yogaCard() + skillTrainingCard() + '</div>';
  }
  // Skill-Kacheln im Training: eine Karte je aktivem Skill, optisch wie die
  // Yoga-Karte (blau, 16:9-Farbverlauf statt Bild). 0 aktive -> Hinweis-Karte.
  // Auswahl-Tor: fehlt ein Geraet, ist die Karte ausgegraut und nicht startbar.
  function skillTrainingCard() {
    var active = (DB.skillProgress || []).filter(function (p) { return p.active; });
    if (!active.length) {
      return '<div class="wo-card skill-wo">'
        + '<div class="wo-thumb"><span class="wo-grad"></span><span class="wo-name">Skills</span></div>'
        + '<div class="wo-body">'
        + '<div class="wo-lifts">Eigenständige Skill-Einheit</div>'
        + '<div class="wo-reasons">Kein aktiver Skill · im Skills-Tab aktivieren</div>'
        + '<button class="btn ghost skill-btn" data-action="goto-skills">Zu den Skills</button>'
        + '</div></div>';
    }
    var owned = ownedEquipmentIds();
    return active.map(function (p) {
      var def = skillById(p.skillId); if (!def) return '';
      var adv = E.skillAdvice(def, p, owned);
      var ph = def.phases[adv.phaseIndex];
      var gated = adv.equipmentMissing;
      var exNames = ph.exercises.map(function (e) { return esc(e.name); }).join(" › ");
      var img = def.image ? '<img class="wo-img" src="' + woImage(def.image) + '" alt="' + esc(def.name) + '" loading="lazy" onerror="this.remove()">' : '';
      var sub = esc(ph.label) + (p.mastered ? ' · Erhaltung' : ' · Serie ' + (p.consecutiveCount || 0) + '/' + ph.consecutiveSessions)
        + (gated ? ' · Gerät fehlt: ' + adv.missingEquipment.map(equipmentLabel).map(esc).join(", ") : '');
      return '<div class="wo-card skill-wo' + (gated ? ' excl' : '') + '">'
        + '<div class="wo-thumb">' + img + '<span class="wo-grad"></span>'
        + '<span class="wo-name">' + esc(def.name) + '</span>'
        + '<span class="score-badge" title="Phase">P' + (adv.phaseIndex + 1) + '/' + def.phases.length + '</span>'
        + '</div>'
        + '<div class="wo-body">'
        + '<div class="wo-lifts">' + exNames + '</div>'
        + '<div class="wo-reasons">' + sub + '</div>'
        + (gated
            ? '<button class="btn ghost skill-btn" disabled>Gerät fehlt</button>'
            : '<button class="btn ghost skill-btn" data-action="start-skill" data-id="' + p.skillId + '">Starten</button>')
        + '</div></div>';
    }).join("");
  }
  // Yoga als Karte im Training-Stil, am Ende der Workout-Liste. Blau (accent-2)
  // statt orange. Ein Klick traegt sofort eine Einheit fuer heute ein (80 min).
  function yogaCard() {
    return '<div class="wo-card yoga-wo">'
      + '<div class="wo-thumb">'
      + '<img class="wo-img" src="images/Yoga.jpeg" alt="Yoga" loading="lazy" onerror="this.remove()">'
      + '<span class="wo-grad"></span>'
      + '<span class="wo-name">Yoga</span>'
      + '<span class="score-badge" title="Standarddauer">80 min</span>'
      + '</div>'
      + '<div class="wo-body">'
      + '<div class="wo-lifts">Erholungs- / Mobility-Tag</div>'
      + '<div class="wo-reasons">Getrennt vom Krafttraining · trägt für heute ein</div>'
      + '<button class="btn ghost yoga-btn" data-action="open-yoga">Eintragen</button>'
      + '</div>'
      + '</div>';
  }
  // Yoga-Einheit eintragen. Ohne Argumente: heute, 80 min, ohne Notiz.
  function addYoga(dateStr, min) {
    var d = dateStr || today();
    var m = (min != null && !isNaN(min)) ? min : 80;
    DB.sessions.push({ id: "y_" + d.replace(/-/g, "") + "_" + Math.floor(Math.random() * 1000), date: d, type: "yoga", minutes: m, notes: "", status: "done", entries: [] });
    State.persist(); render(); toast("Yoga-Einheit eingetragen (" + d + ").");
  }
  // Popup zum Eintragen einer Yoga-Einheit (Datum + Dauer). Wird ueber die
  // Yoga-Karte im Training-Tab geoeffnet.
  function ensureYogaModal() {
    if (document.getElementById("ks-yoga-modal")) return;
    var ov = document.createElement("div");
    ov.id = "ks-yoga-modal"; ov.className = "ks-modal-overlay";
    ov.innerHTML = '<div class="ks-modal" role="dialog" aria-modal="true" aria-label="Yoga eintragen">'
      + '<div class="ks-modal-head"><span class="ks-modal-title">Yoga / Mobility eintragen</span>'
      + '<button class="ks-modal-x" data-action="yoga-cancel" aria-label="Schließen">\u2715</button></div>'
      + '<div class="yoga-modal-form">'
      + '<label class="yf-date">Datum <input type="date" id="ks-yoga-date"></label>'
      + '<label class="yf-dur">Dauer <input type="number" class="num mini" id="ks-yoga-min" value="80"> min</label>'
      + '</div>'
      + '<div class="end-btns">'
      + '<button class="btn primary" data-action="yoga-save">Eintragen</button>'
      + '<button class="btn ghost" data-action="yoga-cancel">Abbrechen</button>'
      + '</div></div>';
    ov.addEventListener("click", function (e) { if (e.target === ov) closeYogaModal(); });
    document.body.appendChild(ov);
  }
  function openYogaModal() {
    ensureYogaModal();
    var dEl = document.getElementById("ks-yoga-date"); if (dEl) dEl.value = today();
    var mEl = document.getElementById("ks-yoga-min"); if (mEl) mEl.value = 80;
    document.getElementById("ks-yoga-modal").classList.add("open");
  }
  function closeYogaModal() { var m = document.getElementById("ks-yoga-modal"); if (m) m.classList.remove("open"); }
  function saveYoga() {
    var d = (document.getElementById("ks-yoga-date") || {}).value || today();
    var m = parseInt((document.getElementById("ks-yoga-min") || {}).value, 10);
    closeYogaModal();
    addYoga(d, isNaN(m) ? 80 : m);
  }
  /* =========================================================
     Live-Session/Timer/Audio/Dialoge -> live.js.
     Lokale Delegates auf window.KS; Aufrufstellen und Event-Dispatcher
     bleiben unveraendert.
     ========================================================= */
  function adjustRest() { return KS.RestTimer.adjust.apply(null, arguments); }
  function bindLiveInputs() { return KS.bindLiveInputs.apply(null, arguments); }
  function cancelStart() { return KS.cancelStart.apply(null, arguments); }
  function closeEndModal() { return KS.closeEndModal.apply(null, arguments); }
  function confirmStart() { return KS.confirmStart.apply(null, arguments); }
  function discardWorkout() { return KS.discardWorkout.apply(null, arguments); }
  function endWorkout() { return KS.endWorkout.apply(null, arguments); }
  function finishSession() { return KS.finishSession.apply(null, arguments); }
  function fmtDur() { return KS.fmtDur.apply(null, arguments); }
  function liveSession() { return KS.liveSession.apply(null, arguments); }
  function liveSkillSession() { return KS.liveSkillSession.apply(null, arguments); }
  function bindSkillLiveInputs() { return KS.bindSkillLiveInputs.apply(null, arguments); }
  function openSkillStartModal() { return KS.openSkillStartModal.apply(null, arguments); }
  function finishSkillSession() { return KS.finishSkillSession.apply(null, arguments); }
  function manageClock() { return KS.manageClock.apply(null, arguments); }
  function openStartModal() { return KS.openStartModal.apply(null, arguments); }
  function skipRest() { return KS.RestTimer.skip.apply(null, arguments); }
  function startToBody() { return KS.startToBody.apply(null, arguments); }
  function syncActiveSet() { return KS.syncActiveSet.apply(null, arguments); }
  function syncRestBar() { return KS.RestTimer.syncBar.apply(null, arguments); }
  function toggleTimers() { return KS.RestTimer.toggle.apply(null, arguments); }
  function sorePicker(key, label, val) {
    return '<div class="bfield"><span>' + label + ' (Kater)</span><select data-body="' + key + '">'
      + [0, 1, 2, 3].map(function (v) { return '<option value="' + v + '"' + (val === v ? " selected" : "") + '>' + v + '</option>'; }).join("") + '</select></div>';
  }
  function decLabel(d) {
    return ({ increase: "steigern", "increase-reps": "Wdh. steigern", hold: "halten", decrease: "senken" })[d] || "halten";
  }

  // Live-Inputs binden (ohne Voll-Re-Render, um Fokus zu halten)
  function scrollToTop() {
    try { window.scrollTo(0, 0); } catch (e) {}
    try { if (document.scrollingElement) document.scrollingElement.scrollTop = 0; } catch (e) {}
    var app = document.getElementById("app"); if (app) app.scrollTop = 0;
  }

  function journeyDashboardHTML() {
    var j = activeJourney();
    if (!j) return '';
    var idx = j.phases.findIndex(function (p) { return p.id === j.currentPhaseId; });
    var cp = currentPhase();
    return '<div class="card journey">'
        + '<div class="journey-head"><strong>' + esc(j.name) + '</strong>' + (j.goal ? '<span class="jgoal">' + esc(j.goal) + '</span>' : '') + '<span class="hint">Start ' + esc(j.startDate) + '</span></div>'
        + '<div class="journey-chart" id="ks-journey-chart" style="width:100%;margin:6px 0 2px;overflow-x:auto;-webkit-overflow-scrolling:touch"></div>'
        + '<div class="phase-ctrl"><span>Aktuelle Phase: <strong>' + esc((cp || {}).name || "—") + '</strong>' + (cp && cp.repTarget ? ' · Ziel ' + cp.repTarget[0] + '–' + cp.repTarget[1] + ' Wdh' : '') + '</span>'
        + '<div class="wk-ctrl">Woche <button class="btn tiny ghost" data-action="wk" data-d="-1">−</button><strong class="wk-val">' + (j.currentWeek || 1) + '</strong><button class="btn tiny ghost" data-action="wk" data-d="1">+</button> / ' + ((cp || {}).weeks || "?") + '</div>'
        + '<button class="btn tiny ghost" data-action="phase-next">nächste Phase ›</button></div>'
        + '<div class="hint">Volumen-Empfehlung diese Woche: <strong>' + Coach.plannedSets() + ' Arbeitssätze</strong>/Übung'
        + (cp && cp.deloadWeek === (j.currentWeek) ? ' · <span class="warn-inline">Deload-Woche</span>' : '')
        + (!recoveryGreenNow() ? ' · <span class="warn-inline">Erholungsmarker gelb/rot → konservativ</span>' : '') + '</div>'
        + (idx >= j.phases.length - 1 ? '<div class="last-phase">Letzte Phase erreicht. <button class="btn tiny" data-action="journey-finish" data-id="' + j.id + '">Journey abschließen</button> <button class="btn tiny ghost" data-action="journey-picker">neue Journey starten</button></div>' : '')
        + '</div>';
  }
  // D3-Periodisierungsgrafik der aktiven Journey (Container #ks-journey-chart).
  function viewWorkouts() {
    var html = '<div class="section-title">Verlauf</div>';

    // Kalender / Liste – nur eine Ansicht gleichzeitig (Umschalter)
    var ss = doneSessions().slice().reverse();
    var view = UI.woView || "calendar";
    html += '<div class="wo-viewbar">'
      + '<div class="seg">'
      + '<button class="seg-btn' + (view === "calendar" ? " on" : "") + '" data-action="wo-view" data-v="calendar">Kalender</button>'
      + '<button class="seg-btn' + (view === "list" ? " on" : "") + '" data-action="wo-view" data-v="list">Liste (' + ss.length + ')</button>'
      + '</div></div>';

    if (view === "calendar") {
      html += calendarHTML();
    } else if (!ss.length) {
      html += '<div class="empty">Noch keine Sessions. Starte ein Workout im Training-Tab.</div>';
    } else {
      html += '<div class="log-list">' + ss.map(function (s) {
        if (s.type === "yoga") {
          return '<div class="log-item yoga">'
            + '<div class="log-date">' + esc(s.date) + '</div>'
            + '<div class="log-body">'
            + '<div class="log-top"><span class="log-wo"><span class="yoga-tag sm">YOGA</span> Yoga / Mobility</span></div>'
            + '<div class="log-sub">' + (s.minutes || 0) + ' min' + (s.notes ? ' · ' + esc(s.notes) : '') + '</div>'
            + '</div>'
            + '<button class="btn tiny ghost log-del" data-action="del-session" data-id="' + s.id + '">löschen</button>'
            + '</div>';
        }
        if (s.type === "skill") {
          var sw = s.skillWork || {};
          var sdef = skillById(sw.skillId);
          var sname = sdef ? sdef.name : (sw.skillId || "Skill");
          var phLabel = (sdef && sdef.phases[sw.phase]) ? sdef.phases[sw.phase].label : ("Phase " + ((sw.phase || 0) + 1));
          var resLabel = ({ completed: "geschafft", missed: "verfehlt", skipped: "abgebrochen" })[sw.result] || sw.result || "";
          var resCls = sw.result === "completed" ? "ok-badge" : (sw.result === "missed" ? "dev-badge" : "");
          var exSummary = (sw.exercises || []).map(function (we) {
            var dn = (we.sets || []).filter(function (x) { return x.done; }).length;
            var unit = we.metric === "duration" ? "s" : "Wdh";
            return esc(we.name) + " " + dn + "×" + (we.target || "") + unit;
          }).join(" · ");
          return '<div class="log-item skill">'
            + '<div class="log-date">' + esc(s.date) + '</div>'
            + '<div class="log-body">'
            + '<div class="log-top"><span class="log-wo"><span class="skill-tag sm">SKILL</span> ' + esc(sname) + '</span>'
            + (resLabel ? '<span class="' + resCls + '">' + esc(resLabel) + '</span>' : '') + '</div>'
            + '<div class="log-sub">' + esc(phLabel) + (exSummary ? ' · ' + exSummary : '') + '</div>'
            + (s.durationSec ? '<div class="log-meta"><span class="log-dur">Dauer ' + fmtDur(s.durationSec) + '</span></div>' : '')
            + '</div>'
            + '<button class="btn tiny ghost log-del" data-action="del-session" data-id="' + s.id + '">löschen</button>'
            + '</div>';
        }
        var t = tplById(s.templateId);
        var dev = (s.entries || []).some(function (e) { return e.hadDeviation; });
        var vol = (s.entries || []).reduce(function (a, e) { return a + workVol(e); }, 0);
        return '<div class="log-item">'
          + '<div class="log-date">' + esc(s.date) + '</div>'
          + '<div class="log-body">'
          + '<div class="log-top"><span class="log-wo">Workout ' + esc(t ? t.name : "?") + '</span>'
          + (dev ? '<span class="dev-badge" title="Abweichung: geplant nicht erreicht / runterkorrigiert">Δ Abweichung</span>' : '<span class="ok-badge">im Plan</span>') + '</div>'
          + '<div class="log-sub">' + (s.entries || []).map(function (e) { var ex = exById(e.exerciseId); return esc(ex ? ex.name : e.exerciseId) + ' ' + setSummary(e); }).join(" · ") + '</div>'
          + '<div class="log-meta"><span class="log-vol">Vol ' + fmtNum(Math.round(vol)) + '</span>' + (s.durationSec ? '<span class="log-dur">Dauer ' + fmtDur(s.durationSec) + '</span>' : '') + '</div>'
          + '</div>'
          + '<button class="btn tiny ghost log-del" data-action="del-session" data-id="' + s.id + '">löschen</button>'
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
          if (s.type === "skill") { var sd = skillById((s.skillWork || {}).skillId); return '<span class="cal-dot skill">' + esc(sd ? sd.name : "Skill") + '</span>'; }
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
  function detailChartCard(ex, metric) {
    var pinned = dashHas(ex.id, metric);
    return '<div class="card chart-card"><div class="sets-title chart-head"><span>' + METRIC_LABELS[metric] + '</span>'
      + '<button class="btn tiny ghost pin' + (pinned ? ' on' : '') + '" data-action="pin-chart" data-ex="' + ex.id + '" data-metric="' + metric + '">' + (pinned ? 'Angeheftet' : 'Anheften') + '</button></div>'
      + '<div class="ks-exchart" data-ex="' + ex.id + '" data-metric="' + metric + '" style="overflow-x:auto;-webkit-overflow-scrolling:touch"></div></div>';
  }
  function dashboardHTML() {
    if (!DASH.length) {
      return '<div class="section-title">Dashboard</div><div class="dash-empty">Noch keine Graphen angeheftet. Öffne eine Übung und tippe bei einem Diagramm auf „Anheften" – es erscheint dann hier oben.</div>';
    }
    var html = '<div class="section-title">Dashboard</div><div class="dash-grid">';
    DASH.forEach(function (it, i) {
      var ex = exById(it.exerciseId); if (!ex) return;
      html += '<div class="dash-tile" draggable="true" data-dash-idx="' + i + '">'
        + '<div class="dash-tile-head"><span class="dt-grip" title="Ziehen zum Sortieren">⠿</span>'
        + '<span class="dt-title">' + esc(ex.name) + ' · ' + METRIC_LABELS[it.metric] + '</span>'
        + '<span class="dt-actions">'
        + '<button class="btn tiny ghost" data-action="dash-up" data-i="' + i + '" title="nach oben">↑</button>'
        + '<button class="btn tiny ghost" data-action="dash-down" data-i="' + i + '" title="nach unten">↓</button>'
        + '<button class="btn tiny ghost danger" data-action="dash-del" data-i="' + i + '" title="entfernen">×</button>'
        + '</span></div>'
        + '<div class="ks-exchart" data-ex="' + ex.id + '" data-metric="' + it.metric + '" style="overflow-x:auto;-webkit-overflow-scrolling:touch"></div></div>';
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
        + '<div class="ex-main"><span class="ex-name">' + esc(e.name) + '</span><span class="ex-tags">' + esc(e.profile) + ' · ' + esc(kindLabel(e.kind)) + (bar ? ' · ' + esc(bar.name) : '') + '</span></div>'
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

    var bar = e.barId ? barById(e.barId) : null;
    var sug = e.profile !== "core" ? Coach.suggestionFor(e) : null;

    var html = '<button class="btn ghost small back" data-action="ex-back">‹ Übungen</button>';
    html += '<div class="detail-head"><h2>' + esc(e.name) + '</h2><span class="ex-tags">' + esc(e.profile) + ' · ' + esc(kindLabel(e.kind)) + (bar ? ' · ' + esc(bar.name) + ' ' + fmtW(bar.weight) : '') + ' · ' + esc(e.muscleGroups.join(", ")) + '</span></div>';

    html += '<div class="metric-row">'
      + metric("Arbeitsgewicht", fmtW(e.workWeight))
      + metric("Repband", e.repRange[0] + "–" + e.repRange[1])
      + metric("1RM (geschätzt)", e.rm ? fmtW(e.rm) : "–")
      + metric("Sessions", h.length)
      + '</div>';

    if (sug) html += '<div class="card"><div class="sets-title">Nächster Vorschlag</div><div class="suggest-line big">' + fmtW(sug.weight) + ' · ' + sug.targetReps + ' Wdh <span class="dec dec-' + sug.decision + '">' + decLabel(sug.decision) + '</span></div><div class="note">' + esc(sug.note) + '</div></div>';

    html += detailChartCard(e, "rm");
    html += detailChartCard(e, "weight");
    html += detailChartCard(e, "reps");
    html += detailChartCard(e, "volume");
    html += detailChartCard(e, "score");
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
    var hasToday = !!todayBody();
    // Entwurf: was im Formular steht. Geladen aus heutigem Eintrag (falls
    // vorhanden), sonst leer. Wird erst per "Eintragen" gespeichert.
    if (!UI.bodyDraft) UI.bodyDraft = todayBody() ? cloneBody(todayBody()) : blankBody();
    var t = UI.bodyDraft;
    var adv = restAdvice();
    var lvlTitle = { rest: "Rest-Tag empfohlen", caution: "Vorsicht – reduziert trainieren", ok: "Bereit fürs Training", unknown: "Heute noch nicht erfasst" }[adv.level];
    var html = '<div class="section-title">Körperzustand</div>';
    html += '<p class="hint body-lead">Werte einstellen und „Eintragen" tippen – der Eintrag erscheint dann unten im Verlauf.</p>';
    html += '<div class="rest-card ' + adv.level + '"><div class="rc-main"><strong>' + lvlTitle + '</strong>' + (adv.reasons.length ? '<span>' + esc(adv.reasons.join(" · ")) + '</span>' : '<span>Körperzustand grün.</span>') + '</div></div>';
    html += '<div class="card body-form"><div class="sets-title">Heute (' + today() + ')' + (hasToday ? ' – erfasst, bearbeiten' : ' – noch nicht erfasst') + '</div>'
      + '<div class="body-grid">'
      + sorePicker("legs", "Beine", t.legs) + sorePicker("upper_body", "Oberkörper", t.upper_body) + sorePicker("overall", "Gesamt", t.overall)
      + '<div class="bfield"><span>Readiness</span><select data-body="readiness">' + [1, 2, 3, 4, 5].map(function (v) { return '<option value="' + v + '"' + (t.readiness === v ? " selected" : "") + '>' + v + '</option>'; }).join("") + '</select></div>'
      + '<label class="chk bfield"><input type="checkbox" data-body="pain.flag"' + (t.pain && t.pain.flag ? " checked" : "") + '> Schmerz (warnt)</label>'
      + '</div>'
      + '<textarea class="notes body-notes" data-body="notes" rows="4" placeholder="Notiz (optional, mehrzeilig)">' + esc(t.notes || "") + '</textarea>'
      + '<div class="hint scale-hint">Kater 0 keine · 1 leicht · 2 deutlich · 3 stark (Region wird im Vorschlag ausgeschlossen). Readiness 1 mies … 5 top.</div>'
      + '<div class="body-actions"><button class="btn primary" data-action="body-save">' + (hasToday ? 'Aktualisieren' : 'Eintragen') + '</button></div>'
      + '</div>';
    var log = sortedBodyLog().slice().reverse();
    html += '<div class="section-title">Verlauf (' + log.length + ')</div>';
    if (!log.length) html += '<div class="empty">Noch kein Eintrag. Stelle oben deine Werte ein und tippe „Eintragen".</div>';
    else html += '<div class="blog-list">' + log.map(function (e) {
      var isToday = e.date === today();
      return '<div class="blog-item' + (isToday ? ' today' : '') + '"><span class="bl-date">' + esc(e.date) + (isToday ? ' <span class="bl-today">heute</span>' : '') + '</span>'
        + '<span class="bl-vals">Beine ' + (e.legs || 0) + ' · OK ' + (e.upper_body || 0) + ' · Ges ' + (e.overall || 0) + ' · Rdy ' + (e.readiness || 3) + (e.pain && e.pain.flag ? ' · Schmerz' : '') + '</span>'
        + (e.notes ? '<span class="bl-note">' + esc(e.notes) + '</span>' : '')
        + '<button class="btn tiny ghost danger" data-action="body-del" data-d="' + esc(e.date) + '">×</button></div>';
    }).join("") + '</div>';
    return html;
  }
  function cloneBody(e) { return { date: e.date, legs: e.legs || 0, upper_body: e.upper_body || 0, overall: e.overall || 0, pain: { flag: !!(e.pain && e.pain.flag), note: (e.pain && e.pain.note) || "" }, readiness: e.readiness || 3, notes: e.notes || "" }; }
  // Formular-Aenderung wirkt nur auf den Entwurf, ohne Re-Render (Fokus halten),
  // und wird erst per body-save als heutiger Eintrag gespeichert.
  function onBodyChange(el) {
    var e = UI.bodyDraft || (UI.bodyDraft = blankBody()); var k = el.getAttribute("data-body");
    if (k === "pain.flag") { e.pain = e.pain || {}; e.pain.flag = el.checked; }
    else if (k === "notes") e.notes = el.value;
    else if (k === "readiness") e.readiness = +el.value;
    else e[k] = +el.value;
  }
  // Entwurf aktiv als heutigen Eintrag speichern (anlegen oder ueberschreiben).
  function saveBodyToday() {
    var d = UI.bodyDraft || blankBody();
    var e = todayBody();
    if (!e) { e = blankBody(); e.date = today(); DB.bodyLog.push(e); }
    e.legs = d.legs || 0; e.upper_body = d.upper_body || 0; e.overall = d.overall || 0;
    e.readiness = d.readiness || 3; e.pain = { flag: !!(d.pain && d.pain.flag), note: (d.pain && d.pain.note) || "" }; e.notes = d.notes || "";
    UI.bodyDraft = cloneBody(e);
    State.persist(); render(); toast("Körperzustand eingetragen (" + today() + ").");
  }
  function onBarPick(el) {
    var ei = +el.getAttribute("data-ei"); var barId = el.value;
    var en = UI.live && UI.live.entries[ei]; if (!en) return;
    en.barId = barId;
    var exo = exById(en.exerciseId);
    if (en.suggestion) {
      en.warmupSets = Coach.warmupFor(exo, en.suggestion.weight, barById(barId), ei === 0);
    }
    State.persist(); render();
  }

  /* =========================================================
     View: Journey-Verwaltung (eigener Tab)
     ========================================================= */
  function viewJourneyManager() {
    var act = activeJourney();
    var html = journeyDashboardHTML();
    html += '<div class="section-title jl-title">Journeys<button class="btn primary addj" data-action="journey-picker">+ Neue aus Vorlage</button></div>';
    html += '<p class="hint jm-lead">Verwalte hier deine Trainingszyklen. Die aktive Journey steuert Phasen, Volumen und Wiederholungen im Training; ihr Verlauf ist im Verlauf-Tab sichtbar.</p>';
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

  /* =========================================================
     View: Skills-Tab (Manager + Katalog/Picker)
     ========================================================= */
  // Phasenliste eines Skills: nummeriert (Phase 1..x), aktuelle Phase gerahmt.
  function skillPhasesList(def, prog) {
    return '<ol class="sk-phaselist">' + def.phases.map(function (ph) {
      var cur = ph.index === prog.currentPhase;
      var ex = ph.exercises.map(function (e) {
        var t = e.metric === "duration" ? (e.target + " s") : (e.target + " Wdh");
        return esc(e.name) + " " + e.sets + "×" + t + (e.tempo ? " (" + esc(e.tempo) + ")" : "");
      }).join(" · ");
      var eq = (ph.equipment && ph.equipment.length) ? ph.equipment.map(equipmentLabel).map(esc).join(", ") : "Körpergewicht";
      return '<li class="sk-ph' + (cur ? ' current' : '') + '">'
        + '<span class="sk-ph-n">' + (ph.index + 1) + '</span>'
        + '<div class="sk-ph-body">'
        + '<div class="sk-ph-title">' + esc(ph.label) + (cur ? ' <span class="sk-ph-cur">aktuell</span>' : '') + '</div>'
        + '<div class="sk-ph-meta">' + ex + ' · ' + eq + ' · ' + ph.consecutiveSessions + '× sauber</div>'
        + '</div></li>';
    }).join('') + '</ol>';
  }

  // Liste ALLER Skills im System. Kein Hinzufuegen – jeder Skill ist da und
  // standardmaessig deaktiviert; per Toggle aktivieren/deaktivieren. Aktive
  // Skills erscheinen als Karte im Training. Fortschritt bleibt beim Deaktivieren.
  function viewSkillsManager() {
    var owned = ownedEquipmentIds();
    var html = '<div class="section-title">Skills</div>';
    html += '<p class="hint jm-lead">Alle Skills sind hier gelistet. Aktiviere die, die du gerade trainierst – sie erscheinen dann als Karte im Training. Deaktivieren behält den Fortschritt.</p>';
    html += '<div class="jlist">' + SKILLS.map(function (def) {
      var p = skillProgressView(def.id);
      var adv = E.skillAdvice(def, p, owned);
      var ph = def.phases[adv.phaseIndex];
      var open = !!UI.skillOpen[def.id];
      var hasProgress = p.active || (p.currentPhase || 0) > 0 || (p.consecutiveCount || 0) > 0 || (p.log && p.log.length);
      var badge = p.active ? '<span class="badge-active">aktiv</span>' : '<span class="badge-idle">inaktiv</span>';
      var masteredTag = p.mastered ? ' <span class="badge-active">gemeistert</span>' : '';
      var meta = 'Phase ' + (adv.phaseIndex + 1) + '/' + def.phases.length + ' · ' + esc(ph.label)
        + (p.mastered ? ' · Erhaltung' : ' · Serie ' + (p.consecutiveCount || 0) + '/' + ph.consecutiveSessions);
      var gate = adv.equipmentMissing
        ? '<div class="hint" style="color:var(--accent-2)">Gerät fehlt: ' + adv.missingEquipment.map(equipmentLabel).map(esc).join(", ") + ' – im Skills-Inventar (Einstellungen) aktivieren.</div>'
        : '';
      var head = '<div class="skill-head">'
        + '<div class="jr-main"><span class="jr-name">' + esc(def.name) + masteredTag + '</span>'
        + '<span class="jr-meta">' + meta + '</span></div>'
        + '<div class="jr-status">' + badge + '</div>'
        + '<div class="jr-actions">'
        + '<button class="btn tiny ghost" data-action="skill-toggle" data-id="' + def.id + '">' + (open ? "Details ▴" : "Details ▾") + '</button>'
        + (p.active
            ? '<button class="btn tiny ghost skill-act" data-action="skill-deactivate" data-id="' + def.id + '">deaktivieren</button>'
            : '<button class="btn tiny primary skill-act" data-action="skill-activate" data-id="' + def.id + '">aktivieren</button>')
        + (hasProgress ? '<button class="btn tiny ghost" data-action="skill-phase-back" data-id="' + def.id + '">Phase −1</button>'
                         + '<button class="btn tiny ghost danger" data-action="skill-reset" data-id="' + def.id + '">zurücksetzen</button>' : '')
        + '</div></div>';
      var detailBody = open ? '<div class="skill-detail-body">' + gate
        + '<div class="sk-chart-wrap"><div class="sk-chart-head"><span class="sk-chart-title">Verlauf · trainierte Phase je Session</span>'
        + '<span class="sk-chart-legend"><span class="lg ok">geschafft</span><span class="lg miss">verfehlt</span></span></div>'
        + '<div class="ks-skillchart" data-skill="' + def.id + '"></div></div>'
        + skillPhasesList(def, p) + '</div>' : '';
      return '<div class="skill-block' + (p.active ? ' active' : '') + (open ? ' open' : '') + '">' + head + detailBody + '</div>';
    }).join('') + '</div>';
    return html;
  }

  function inventoryCards() {
    var html = '';
    html += '<div class="card"><div class="sets-title">Inventar · Stangen</div><div class="hint">Die erste Stange ist im Workout vorausgewählt. Reihenfolge zählt – Namen frei wählbar.</div><div class="bar-list">';
    DB.inventory.bars.forEach(function (b, i) {
      html += '<div class="bar-card">'
        + '<div class="bar-card-main"><input type="text" class="bar-name-inp" data-bar="name" data-i="' + i + '" value="' + esc(b.name) + '" placeholder="Stangenname">'
        + (i === 0 ? '<span class="def">Vorausgewählt</span>' : '') + '</div>'
        + '<div class="bar-card-controls">'
        + '<span class="bar-weight"><input type="number" step="0.5" class="num" data-bar="weight" data-i="' + i + '" value="' + b.weight + '"><span class="bar-unit">' + DB.settings.unit + '</span></span>'
        + (i === 0 ? '' : '<button class="btn tiny ghost bar-del" data-action="bar-del" data-i="' + i + '" title="Stange entfernen">×</button>')
        + '</div></div>';
    });
    html += '</div><button class="btn tiny ghost" data-action="bar-add">+ Stange</button></div>';

    html += '<div class="card"><div class="sets-title">Inventar · Scheiben (pro Stück, kg)</div><div class="plate-chips">';
    DB.inventory.plates.slice().sort(function (a, b) { return a - b; }).forEach(function (p) {
      html += '<span class="plate-chip">' + fmtNum(p) + ' <button data-action="plate-del" data-p="' + p + '">×</button></span>';
    });
    html += '</div><div class="plate-add"><input type="number" step="0.25" class="num" id="plate-new" placeholder="z.B. 0.5"><button class="btn tiny ghost" data-action="plate-add">+ Scheibe</button></div>';
    html += '<div class="hint">Kleinster Sprung gesamt: <strong>' + fmtW(2 * E.plateGrid(DB.inventory.plates)) + '</strong></div></div>';

    // Inventar · Geraete (Skills). Wirkt nur als Auswahl-Tor: ein Skill ist nur
    // startbar, wenn alle in seiner aktuellen Phase geforderten Geraete aktiv sind.
    var EQ = DB.inventory.equipment || [];
    html += '<div class="card"><div class="sets-title">Inventar · Geräte (Skills)</div>'
      + '<div class="hint">Auswahl-Tor für Skills: ist ein in der aktuellen Phase gefordertes Gerät nicht aktiv, lässt sich der Skill nicht starten.</div>'
      + '<div class="timer-switches">';
    EQ.forEach(function (e) {
      html += '<label class="chk"><input type="checkbox" data-equip="' + esc(e.id) + '"' + (e.active ? ' checked' : '') + '> ' + esc(e.label) + '</label>';
    });
    html += '</div></div>';

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

    html += inventoryCards();

    var T = s.timers || {};
    html += '<div class="card"><div class="sets-title">Pausen-Timer</div>'
      + '<div class="settings-grid">'
      + timerNum("Satz-Pause (Sek.)", "setRestSec", T.setRestSec)
      + timerNum("Übungs-Pause (Sek.)", "exerciseRestSec", T.exerciseRestSec)
      + '</div>'
      + '<div class="timer-switches">'
      + timerChk("Pause automatisch starten", "autoStart", T.autoStart)
      + timerChk("Ton am Pausenende", "sound", T.sound)
      + timerChk("Vibration am Pausenende", "vibrate", T.vibrate)
      + '</div>'
      + '<div class="hint">Standardvorgaben für die Pausen zwischen Sätzen und zwischen Übungen. Im laufenden Training lässt sich eine Pause per Tippen für diesen einen Durchgang anpassen. Auto-Start startet die Pause automatisch nach einem erledigten Satz; Ton und Vibration quittieren jeden erledigten Satz und melden das Pausenende. Vibration ist nicht auf allen Geräten verfügbar (auf iPhone-Safari nur Ton, und nur bei aktivem Display).</div>'
      + '</div>';

    html += '<div class="card"><div class="sets-title">Daten</div>'
      + '<div class="io-grid">'
      + '<section class="io-section">'
      +   '<div class="io-head"><span class="io-tag io-out">Export</span>'
      +     '<span class="io-sub">Backup sichern oder Stand an Claude übergeben</span></div>'
      +   '<div class="io-actions">'
      +     '<button class="btn ghost" data-action="export">Als Datei laden</button>'
      +     '<button class="btn ghost" data-action="export-copy">In Zwischenablage</button>'
      +   '</div>'
      + '</section>'
      + '<section class="io-section">'
      +   '<div class="io-head"><span class="io-tag io-in">Import</span>'
      +     '<span class="io-sub">JSON-Text einfügen oder Datei wählen</span></div>'
      +   '<textarea id="import-text" placeholder="JSON hier einfügen…"></textarea>'
      +   '<input type="file" id="import-file" class="io-file" accept="application/json,.json">'
      +   '<div class="io-modes">'
      +     '<label class="io-mode"><input type="radio" name="impmode" value="append" checked>'
      +       '<span class="io-mode-body"><span class="io-mode-t">Anhängen</span>'
      +       '<span class="io-mode-d">Nur neue Einträge ergänzen</span></span></label>'
      +     '<label class="io-mode"><input type="radio" name="impmode" value="update">'
      +       '<span class="io-mode-body"><span class="io-mode-t">Aktualisieren</span>'
      +       '<span class="io-mode-d">Bestehende nach ID überschreiben</span></span></label>'
      +     '<label class="io-mode io-mode-danger"><input type="radio" name="impmode" value="replace">'
      +       '<span class="io-mode-body"><span class="io-mode-t">Ersetzen</span>'
      +       '<span class="io-mode-d">Voll-Restore, alles überschreiben</span></span></label>'
      +   '</div>'
      +   '<button class="btn primary io-import" data-action="import">Importieren</button>'
      + '</section>'
      + '</div>'
      + '</div>';

    html += '<div class="card"><div class="sets-title">Score ↔ RIR ↔ RPE</div><div class="score-table">'
      + [1, 2, 3, 4, 5].map(function (v) { var i = E.scoreInfo(v); return '<div class="score-cell"><strong>' + v + '</strong><span>RIR ' + i.rir + '</span><span>RPE ' + i.rpe + '</span><span class="sl">' + i.label + '</span></div>'; }).join("")
      + '</div><div class="hint">Ziel Arbeitssätze: Score 3–4 (RIR 1–3). Wiedereinstieg ≤ 3.</div></div>';
    return html;
  }
  function numSetting(label, field, val, step) { return '<label class="edit-field"><span>' + label + '</span><input type="number" step="' + step + '" class="num" data-set-setting="' + field + '" value="' + val + '"></label>'; }
  function timerNum(label, field, val) { return '<label class="edit-field"><span>' + label + '</span><input type="number" step="5" min="0" class="num" data-set-timer="' + field + '" value="' + (val == null ? "" : val) + '"></label>'; }
  function timerChk(label, field, val) { return '<label class="chk"><input type="checkbox" data-set-timer="' + field + '"' + (val ? " checked" : "") + '> ' + label + '</label>'; }

  /* =========================================================
     Import / Export
     ========================================================= */
  // Export-Anreicherung: score (1-5) bleibt einzige gepflegte Groesse;
  // rir/rpe/scoreLabel werden je Arbeitssatz aus SCORE_MAP abgeleitet, nur fuer den Export.
  function enrichExport(db) {
    var out = clone(db);
    (out.sessions || []).forEach(function (s) {
      (s.entries || []).forEach(function (en) {
        (en.sets || []).forEach(function (st) {
          var info = (st && st.score != null) ? E.scoreInfo(st.score) : null;
          if (info) { st.rir = info.rir; st.rpe = info.rpe; st.scoreLabel = info.label; }
        });
      });
    });
    out._scoreScale = {
      note: "score (1-5) ist die gepflegte Groesse; rir/rpe/scoreLabel je Satz sind daraus abgeleitet und werden beim Re-Import verworfen.",
      map: clone(E.SCORE_MAP)
    };
    return out;
  }
  // Abgeleitete Felder vor dem Import entfernen, damit der Live-Zustand sauber bleibt.
  function stripDerived(data) {
    if (!data || typeof data !== "object") return data;
    delete data._scoreScale;
    (data.sessions || []).forEach(function (s) {
      (s.entries || []).forEach(function (en) {
        (en.sets || []).forEach(function (st) { delete st.rir; delete st.rpe; delete st.scoreLabel; });
      });
    });
    return data;
  }
  function exportText() { return JSON.stringify(enrichExport(DB), null, 2); }
  function download() {
    var blob = new Blob([exportText()], { type: "application/json" });
    var a = document.createElement("a"); a.href = URL.createObjectURL(blob);
    a.download = "fitness-system_" + today() + ".json"; document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 0);
  }
  function importJSON(text, mode) {
    var data; try { data = JSON.parse(text); } catch (e) { alert("Ungültiges JSON: " + e.message); return; }
    data = stripDerived(data);
    if (mode === "replace") {
      if (!confirm("Ersetzen: alle aktuellen Daten werden überschrieben. Fortfahren?")) return;
      DB = data; migrate(DB); State.persist(); UI.detail = null; render(); toast("Ersetzt."); return;
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
    State.persist(); render(); toast(added + " hinzugefügt, " + updated + " aktualisiert.");
  }

  /* =========================================================
     Events (Delegation)
     ========================================================= */
  document.addEventListener("click", function (ev) {
    var el = ev.target.closest("[data-action]"); if (!el) return;
    var a = el.getAttribute("data-action");
    switch (a) {
      case "tab": UI.tab = el.getAttribute("data-tab"); UI.detail = null; UI.journeyPicker = false; UI.skillsPicker = false; UI.menuOpen = false; UI.bodyDraft = null; render(); break;
      case "menu-toggle": UI.menuOpen = !UI.menuOpen; render(); break;
      case "auth-open": openAuthModal(); break;
      case "auth-close": closeAuthModal(); break;
      case "start": openStartModal(el.getAttribute("data-tpl")); break;
      case "start-skill": openSkillStartModal(el.getAttribute("data-id")); break;
      case "goto-skills": UI.tab = "skills"; UI.skillsPicker = false; UI.menuOpen = false; render(); break;
      case "start-go": confirmStart(); break;
      case "start-cancel": cancelStart(); break;
      case "start-to-body": startToBody(); break;
      case "finish-workout": endWorkout(); break;
      case "end-save": closeEndModal(); if (UI.live && UI.live.kind === "skill") finishSkillSession(); else finishSession(); break;
      case "end-discard": closeEndModal(); discardWorkout(); break;
      case "end-cancel": closeEndModal(); break;
      case "rest-minus": adjustRest(-15); break;
      case "rest-plus": adjustRest(15); break;
      case "rest-skip": skipRest(); break;
      case "toggle-timers": toggleTimers(); break;
      case "add-set": addSet(+el.getAttribute("data-ei")); break;
      case "del-set": delSet(+el.getAttribute("data-ei")); break;
      case "detail": UI.detail = el.getAttribute("data-id"); render(); break;
      case "ex-back": UI.detail = null; render(); break;
      case "del-session": if (confirm("Session löschen?")) { DB.sessions = DB.sessions.filter(function (s) { return s.id !== el.getAttribute("data-id"); }); State.persist(); render(); } break;
      case "wk": adjustWeek(+el.getAttribute("data-d")); break;
      case "phase-next": nextPhase(); break;
      case "body-save": saveBodyToday(); break;
      case "body-del": var bd = el.getAttribute("data-d"); DB.bodyLog = DB.bodyLog.filter(function (e) { return e.date !== bd; }); if (bd === today()) UI.bodyDraft = blankBody(); State.persist(); render(); break;
      case "wo-view": UI.woView = el.getAttribute("data-v"); render(); break;
      case "cal-prev": calShift(-1); break;
      case "cal-next": calShift(1); break;
      case "cal-today": calToday(); break;
      case "toggle-plate": { var pe = el.getAttribute("data-ei"); if (!UI.plateShow) UI.plateShow = {}; UI.plateShow[pe] = !UI.plateShow[pe]; render(); break; }
      case "open-yoga": openYogaModal(); break;
      case "yoga-save": saveYoga(); break;
      case "yoga-cancel": closeYogaModal(); break;
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
      case "skill-activate": activateSkill(el.getAttribute("data-id")); break;
      case "skill-deactivate": deactivateSkill(el.getAttribute("data-id")); break;
      case "skill-phase-back": if (confirm("Eine Phase zurück? Der Fortschritt der aktuellen Phase wird zurückgesetzt.")) regressSkill(el.getAttribute("data-id")); break;
      case "skill-reset": if (confirm("Skill auf Phase 1 zurücksetzen? Der Fortschritt geht verloren (Verlauf bleibt erhalten).")) resetSkill(el.getAttribute("data-id")); break;
      case "skill-toggle": var sid = el.getAttribute("data-id"); UI.skillOpen[sid] = !UI.skillOpen[sid]; render(); break;
      case "bar-add": DB.inventory.bars.push({ id: uid("bar_"), name: "Stange", weight: 20, default: false }); State.persist(); render(); break;
      case "bar-del": var bi = +el.getAttribute("data-i"); if (bi === 0) { toast("Die erste Stange ist die Vorauswahl und kann nicht gelöscht werden."); } else { DB.inventory.bars.splice(bi, 1); State.persist(); render(); } break;
      case "plate-del": DB.inventory.plates = DB.inventory.plates.filter(function (p) { return p !== parseFloat(el.getAttribute("data-p")); }); State.persist(); render(); break;
      case "plate-add": addPlate(); break;
      case "loader-calc": loaderCalc(); break;
      case "export": download(); break;
      case "export-copy": copyExport(); break;
      case "import": doImport(); break;
    }
  });

  // Übungs-Edit & Settings-Inputs (Delegation auf change)
  document.addEventListener("change", function (ev) {
    var el = ev.target;
    if (el.hasAttribute && el.hasAttribute("data-exedit")) { exEdit(el); }
    else if (el.hasAttribute && el.hasAttribute("data-set-setting")) { settingEdit(el); }
    else if (el.hasAttribute && el.hasAttribute("data-set-timer")) { timerEdit(el); }
    else if (el.hasAttribute && el.hasAttribute("data-body")) { onBodyChange(el); }
    else if (el.hasAttribute && el.hasAttribute("data-barpick")) { onBarPick(el); }
    else if (el.hasAttribute && el.hasAttribute("data-bar")) {
      var i = +el.getAttribute("data-i"); var field = el.getAttribute("data-bar");
      if (field === "name") DB.inventory.bars[i].name = el.value;
      else DB.inventory.bars[i].weight = parseFloat(el.value) || 0;
      State.persist();
    }
    else if (el.hasAttribute && el.hasAttribute("data-equip")) {
      var eqId = el.getAttribute("data-equip");
      var eq = (DB.inventory.equipment || []).find(function (x) { return x.id === eqId; });
      if (eq) { eq.active = el.checked; State.persist(); }
    }
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
    State.persist(); render();
  }
  function delSet(ei) { var en = UI.live.entries[ei]; if (en.sets.length > 1) { en.sets.pop(); en.plannedSets.pop(); State.persist(); render(); } }
  function adjustWeek(d) { var j = activeJourney(); var ph = currentPhase(); j.currentWeek = Math.max(1, Math.min(ph ? ph.weeks : 99, (j.currentWeek || 1) + d)); State.persist(); render(); }
  function nextPhase() {
    var j = activeJourney(); if (!j) return;
    var idx = j.phases.findIndex(function (p) { return p.id === j.currentPhaseId; });
    if (idx < j.phases.length - 1) { j.currentPhaseId = j.phases[idx + 1].id; j.currentWeek = 1; State.persist(); render(); }
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
    State.persist(); render();
    toast("Journey \u201E" + t.name + "\u201C gestartet \u2013 Startbasis sind deine aktuellen Arbeitsgewichte.");
  }
  function activateJourney(id) {
    DB.journeys.forEach(function (j) { j.active = (j.id === id); if (j.id === id && j.status === "archived") j.status = "active"; });
    State.persist(); render();
  }
  function finishJourney(id) {
    var j = DB.journeys.find(function (x) { return x.id === id; }); if (!j) return;
    j.status = "archived"; j.active = false; j.endDate = today();
    var next = DB.journeys.find(function (x) { return x.status !== "archived"; });
    if (next) next.active = true;
    State.persist(); render();
    toast("Journey abgeschlossen und archiviert.");
  }
  function deleteJourney(id) {
    var wasActive = (DB.journeys.find(function (x) { return x.id === id; }) || {}).active;
    DB.journeys = DB.journeys.filter(function (x) { return x.id !== id; });
    if (wasActive) { var next = DB.journeys.find(function (x) { return x.status !== "archived"; }) || DB.journeys[0]; if (next) next.active = true; }
    State.persist(); render();
  }

  /* ===== Skills: Equipment-Helfer + Aktionen (Skills-Tab) ===== */
  function ownedEquipmentIds() {
    return (DB.inventory.equipment || []).filter(function (e) { return e.active; }).map(function (e) { return e.id; });
  }
  function equipmentLabel(id) {
    var e = (DB.inventory.equipment || []).find(function (x) { return x.id === id; });
    return e ? e.label : id;
  }
  function skillCategoryLabel(c) {
    return ({ gymnastics: "Gymnastik", conditioning: "Kondition", strength: "Kraft", mobility: "Mobility" })[c] || c || "–";
  }
  // Read-only: vorhandenen Fortschritt holen oder einen transienten Default
  // liefern (NICHT in DB schreiben) – fuer Render ohne Seiteneffekt.
  function skillProgressView(id) {
    return (DB.skillProgress || []).find(function (e) { return e.skillId === id; })
      || { skillId: id, active: false, currentPhase: 0, consecutiveCount: 0, mastered: false, log: [] };
  }
  // Aktivieren: legt bei Bedarf den Fortschritt an bzw. setzt active:true
  // (vorhandener Fortschritt wird fortgesetzt). activate-Log nur beim ersten Mal.
  function activateSkill(id) {
    var def = skillById(id); if (!def) return;
    var p = skillProgressFor(id);
    var firstTime = !p.active && (!p.log || !p.log.length);
    p.active = true;
    if (firstTime) { p.log = p.log || []; p.log.push({ date: today(), type: "activate" }); }
    State.persist(); render();
    toast("Skill \u201E" + def.name + "\u201C aktiviert.");
  }
  function deactivateSkill(id) { var p = skillProgressFor(id); p.active = false; State.persist(); render(); }
  function regressSkill(id) {
    var p = skillProgressFor(id); var from = p.currentPhase || 0;
    p.currentPhase = Math.max(0, from - 1); p.consecutiveCount = 0; p.mastered = false;
    p.log = p.log || []; p.log.push({ date: today(), type: "regress", from: from, to: p.currentPhase });
    State.persist(); render();
  }
  function resetSkill(id) {
    var p = skillProgressFor(id);
    p.currentPhase = 0; p.consecutiveCount = 0; p.mastered = false;
    p.log = p.log || []; p.log.push({ date: today(), type: "reset" });
    State.persist(); render();
  }
  function exEdit(el) {
    var id = el.getAttribute("data-id"); var e = exById(id); if (!e) return; var f = el.getAttribute("data-exedit");
    if (f === "active") e.active = el.checked;
    else if (f === "workWeight") e.workWeight = parseFloat(el.value) || 0;
    else if (f === "targetScore") e.targetScore = parseInt(el.value, 10) || 3;
    else if (f === "repmin") e.repRange[0] = parseInt(el.value, 10) || 1;
    else if (f === "repmax") e.repRange[1] = parseInt(el.value, 10) || 1;
    State.persist(); render();
  }
  function settingEdit(el) {
    var f = el.getAttribute("data-set-setting"); var s = DB.settings;
    if (f === "rmFormula" || f === "unit") s[f] = el.value;
    else if (f === "rec_squat") s.recoveryWindows.squat = parseInt(el.value, 10) || 48;
    else if (f === "rec_deadlift") s.recoveryWindows.deadlift = parseInt(el.value, 10) || 72;
    else s[f] = parseFloat(el.value) || s[f];
    State.persist(); render();
  }
  function timerEdit(el) {
    var f = el.getAttribute("data-set-timer"); var T = DB.settings.timers = DB.settings.timers || {};
    if (f === "setRestSec" || f === "exerciseRestSec") { var v = parseInt(el.value, 10); T[f] = (isNaN(v) || v < 0) ? 0 : v; }
    else T[f] = el.checked;
    State.persist();
  }
  function addPlate() { var inp = document.getElementById("plate-new"); var v = parseFloat(inp.value); if (v > 0 && DB.inventory.plates.indexOf(v) < 0) { DB.inventory.plates.push(v); State.persist(); render(); } }
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

  /* geteilte Helfer/State fuer ausgelagerte Module (charts.js u.a.).
     db() ist ein Getter, damit die Referenz nach setDB() korrekt bleibt. */
  KS.db = State.get;
  KS.esc = esc;
  KS.fmtNum = fmtNum;
  KS.fmtW = fmtW;
  KS.activeJourney = activeJourney;
  KS.UI = UI;

  /* zusaetzliche Helfer fuer live.js */
  KS.barById = barById;
  KS.currentPhase = currentPhase;
  KS.entryBar = entryBar;
  KS.exById = exById;
  KS.exerciseChartData = exerciseChartData;
  KS.firstBar = firstBar;
  KS.latestBody = latestBody;
  KS.pad = pad;
  KS.persist = State.persist;
  KS.render = render;
  KS.restAdvice = restAdvice;
  KS.scrollToTop = scrollToTop;
  KS.snapshotBody = snapshotBody;
  KS.todayBody = todayBody;
  KS.tplById = tplById;
  KS.tplItems = tplItems;

  /* Coach – gebuendeltes Interface fuer live.js (Vorschlag, Aufwaermen, Satzzahl) */
  KS.Coach = Coach;

  /* init */
  window.KS_APP = {
    getDB: State.get,
    setDB: State.replace,
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
