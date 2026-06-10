/* Kraftschmiede – skills.js (Schema 0.14). Vanilla JS, framework-frei.
   Skills-Tab: Manager-Ansicht (alle Skills listen, aktivieren/deaktivieren,
   Phasen anpassen) samt Phasenliste und Fortschritts-Aktionen. Aus app.js
   ausgelagert. Die Skill-Karte im Training-Tab (skillTrainingCard) sowie die
   Live-Skill-Session (live.js) bleiben unberuehrt. Greift ueber window.KS auf
   State und Helfer zu: db() (Getter), KS.SKILLS, KS.UI, skillById/
   skillProgressFor, ownedEquipmentIds/equipmentLabel, esc/today/persist/
   render/toast. Setzt window.FSE (engine.js) voraus (E.skillAdvice). */
(function () {
  "use strict";
  var KS = (window.KS = window.KS || {});
  var E = window.FSE;

  /* duenne Wrapper auf geteilte Funktionen (window.KS) */
  function db() { return KS.db(); }
  function esc() { return KS.esc.apply(null, arguments); }
  function today() { return KS.today.apply(null, arguments); }
  function persist() { return KS.persist.apply(null, arguments); }
  function render() { return KS.render.apply(null, arguments); }
  function toast() { return KS.toast.apply(null, arguments); }
  function skillById() { return KS.skillById.apply(null, arguments); }
  function skillProgressFor() { return KS.skillProgressFor.apply(null, arguments); }
  function ownedEquipmentIds() { return KS.ownedEquipmentIds.apply(null, arguments); }
  function equipmentLabel() { return KS.equipmentLabel.apply(null, arguments); }

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
    html += '<div class="jlist">' + KS.SKILLS.map(function (def) {
      var p = skillProgressView(def.id);
      var adv = E.skillAdvice(def, p, owned);
      var ph = def.phases[adv.phaseIndex];
      var open = !!KS.UI.skillOpen[def.id];
      var badge = p.active ? '<span class="badge-active">aktiv</span>' : '<span class="badge-idle">inaktiv</span>';
      var masteredTag = p.mastered ? ' <span class="badge-active">gemeistert</span>' : '';
      var meta = 'Phase ' + (adv.phaseIndex + 1) + '/' + def.phases.length + ' · ' + esc(ph.label)
        + (p.mastered ? ' · Erhaltung' : ' · Serie ' + (p.consecutiveCount || 0) + '/' + ph.consecutiveSessions);
      var gate = adv.equipmentMissing
        ? '<div class="hint" style="color:var(--accent-2)">Gerät fehlt: ' + adv.missingEquipment.map(equipmentLabel).map(esc).join(", ") + ' – im Skills-Inventar (Einstellungen) aktivieren.</div>'
        : '';
      var canBack = (p.currentPhase || 0) > 0;
      var canFwd = !p.mastered;
      var canReset = (p.currentPhase || 0) > 0 || (p.consecutiveCount || 0) > 0 || (p.log && p.log.length);
      var head = '<div class="skill-head">'
        + '<div class="jr-main"><span class="jr-name">' + esc(def.name) + masteredTag + '</span>'
        + '<span class="jr-meta">' + meta + '</span></div>'
        + '<div class="jr-status">' + badge + '</div>'
        + '<div class="jr-actions">'
        + '<button class="btn tiny ghost" data-action="skill-toggle" data-id="' + def.id + '">' + (open ? "Details ▴" : "Details ▾") + '</button>'
        + (p.active
            ? '<button class="btn tiny ghost skill-act" data-action="skill-deactivate" data-id="' + def.id + '">deaktivieren</button>'
            : '<button class="btn tiny primary skill-act" data-action="skill-activate" data-id="' + def.id + '">aktivieren</button>')
        + '</div></div>';
      var controls = '<div class="sk-controls"><span class="sk-controls-lbl">Fortschritt anpassen</span>'
        + (canBack ? '<button class="btn tiny ghost" data-action="skill-phase-back" data-id="' + def.id + '">Phase −1</button>' : '')
        + (canFwd ? '<button class="btn tiny ghost" data-action="skill-phase-fwd" data-id="' + def.id + '">Phase +1</button>' : '')
        + (canReset ? '<button class="btn tiny ghost danger" data-action="skill-reset" data-id="' + def.id + '">zurücksetzen</button>' : '')
        + '</div>';
      var detailBody = open ? '<div class="skill-detail-body">' + gate
        + '<div class="sk-chart-wrap"><div class="sk-chart-head"><span class="sk-chart-title">Verlauf · trainierte Phase je Session</span>'
        + '<span class="sk-chart-legend"><span class="lg ok">geschafft</span><span class="lg miss">verfehlt</span></span></div>'
        + '<div class="ks-skillchart" data-skill="' + def.id + '"></div></div>'
        + skillPhasesList(def, p) + controls + '</div>' : '';
      return '<div class="skill-block' + (p.active ? ' active' : '') + (open ? ' open' : '') + '">' + head + detailBody + '</div>';
    }).join('') + '</div>';
    return html;
  }

  function skillCategoryLabel(c) {
    return ({ gymnastics: "Gymnastik", conditioning: "Kondition", strength: "Kraft", mobility: "Mobility" })[c] || c || "–";
  }
  // Read-only: vorhandenen Fortschritt holen oder einen transienten Default
  // liefern (NICHT in DB schreiben) – fuer Render ohne Seiteneffekt.
  function skillProgressView(id) {
    return (db().skillProgress || []).find(function (e) { return e.skillId === id; })
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
    persist(); render();
    toast("Skill \u201E" + def.name + "\u201C aktiviert.");
  }
  function deactivateSkill(id) { var p = skillProgressFor(id); p.active = false; persist(); render(); }
  function regressSkill(id) {
    var p = skillProgressFor(id); var from = p.currentPhase || 0;
    p.currentPhase = Math.max(0, from - 1); p.consecutiveCount = 0; p.mastered = false;
    p.log = p.log || []; p.log.push({ date: today(), type: "regress", from: from, to: p.currentPhase });
    persist(); render();
  }
  // Phase + (manuell): eine Phase vor; auf der letzten Phase -> als gemeistert markieren.
  function advanceSkill(id) {
    var def = skillById(id); if (!def) return;
    var p = skillProgressFor(id); var from = p.currentPhase || 0;
    if (from < def.phases.length - 1) {
      p.currentPhase = from + 1; p.consecutiveCount = 0; p.mastered = false;
      p.log = p.log || []; p.log.push({ date: today(), type: "advance", from: from, to: p.currentPhase });
    } else {
      p.mastered = true; p.consecutiveCount = 0;
      p.log = p.log || []; p.log.push({ date: today(), type: "advance", from: from, to: from, mastered: true });
    }
    persist(); render();
  }
  function resetSkill(id) {
    var p = skillProgressFor(id);
    p.currentPhase = 0; p.consecutiveCount = 0; p.mastered = false;
    p.log = p.log || []; p.log.push({ date: today(), type: "reset" });
    persist(); render();
  }

  KS.viewSkillsManager = viewSkillsManager;
  KS.activateSkill = activateSkill;
  KS.deactivateSkill = deactivateSkill;
  KS.regressSkill = regressSkill;
  KS.advanceSkill = advanceSkill;
  KS.resetSkill = resetSkill;
})();
