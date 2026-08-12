/**
 * NEXUS ONE-LINE READINESS MODULE
 * ===============================
 *
 * Additive integration layer. This file does not replace the existing
 * diagram engine. It wraps NEXUS.OneLine.mount() after the engine loads.
 *
 * PRESENTATIONS
 * -------------
 * edit mode: existing white Bluebeam-style engineering workspace.
 * view + embedded=1: existing white desktop dashboard presentation.
 * view + viewer=1 or presentation=field: dark neon field presentation.
 *
 * READINESS COLORS
 * ----------------
 * 0%       gray
 * 1-25%    blue
 * 26-60%   orange
 * 61-99%   yellow
 * 100%     green (ready for energization)
 * energized red (manual SME/engineer state; never percentage-derived)
 *
 * SECURITY
 * --------
 * The editor-only button is a UI control, not the final security boundary.
 * Firebase security rules must restrict energized writes to authorized
 * engineering/SME roles when the Firebase adapter is enabled.
 */
(function initializeNexusOneLineReadiness() {
  "use strict";

  const COLORS = {
    gray: "#8b929b",
    blue: "#1f7dff",
    orange: "#ff7a00",
    yellow: "#ffe600",
    green: "#00f56a",
    red: "#ff2438"
  };

  /*
   * FIREBASE_CUTOVER_REMOVE:
   * This prefix and the local load/save/storage-event path below are
   * development-only. Replace them with the host energization data source,
   * then delete the localStorage implementation after migration.
   */
  const ENERGIZED_PREFIX = "nexus-one-line-energized-v1:";
  const mounted = new WeakMap();

  function getEquipmentId(item) {
    return String((item && (item.equipmentId || item.id)) || "");
  }

  function getPercent(item) {
    const candidates = [
      item && item.progress && item.progress.percent,
      item && item.completionPercent,
      item && item.percent,
      item && item.progress
    ];
    for (const value of candidates) {
      const number = Number(value);
      if (Number.isFinite(number)) return Math.max(0, Math.min(100, number));
    }
    return null;
  }

  function readinessFor(percent, energized) {
    if (energized) return { key: "red", color: COLORS.red, label: "ENERGIZED", rank: 5 };
    if (percent === null) return { key: "gray", color: COLORS.gray, label: "NO DATA", rank: 0 };
    if (percent <= 0) return { key: "gray", color: COLORS.gray, label: "NOT STARTED", rank: 0 };
    if (percent <= 25) return { key: "blue", color: COLORS.blue, label: "1–25%", rank: 1 };
    if (percent <= 60) return { key: "orange", color: COLORS.orange, label: "26–60%", rank: 2 };
    if (percent < 100) return { key: "yellow", color: COLORS.yellow, label: "61–99%", rank: 3 };
    return { key: "green", color: COLORS.green, label: "READY", rank: 4 };
  }

  function storageKey(context) {
    return ENERGIZED_PREFIX + context.projectId + ":" + context.buildingId;
  }

  function loadEnergized(context) {
    try {
      return JSON.parse(localStorage.getItem(storageKey(context)) || "{}") || {};
    } catch (error) {
      console.warn("[NEXUS One-Line] Energized-state load failed.", error);
      return {};
    }
  }

  function saveEnergized(context, records) {
    localStorage.setItem(storageKey(context), JSON.stringify(records));
    window.dispatchEvent(new CustomEvent("nexus-one-line-energized-change", {
      detail: { context, records }
    }));
  }

  function currentActor() {
    const auth = window.firebase && typeof window.firebase.auth === "function"
      ? window.firebase.auth().currentUser
      : null;
    return auth ? (auth.email || auth.uid) : "local-engineer";
  }

  function isFieldPresentation(options) {
    const params = new URLSearchParams(window.location.search);
    return options.mode === "view" && (
      options.viewerOnly === true ||
      params.get("viewer") === "1" ||
      params.get("presentation") === "field"
    );
  }

  function addLegend(root) {
    if (root.querySelector(".nx-readiness-legend")) return;
    const host = root;

    const legend = document.createElement("details");
    legend.className = "nx-readiness-legend";
    legend.open = !window.matchMedia("(max-width: 800px)").matches;
    legend.setAttribute("aria-label", "Completion percentage color key");
    legend.innerHTML = [
      '<summary><span>Completion color key</span>' +
        '<span class="nx-readiness-preview" aria-hidden="true">' +
        dot(COLORS.gray) + dot(COLORS.blue) + dot(COLORS.orange) +
        dot(COLORS.yellow) + dot(COLORS.green) + dot(COLORS.red) +
        "</span></summary>",
      '<div class="nx-readiness-items">',
      chip(COLORS.gray, "0% Not Started"),
      chip(COLORS.blue, "1–25%"),
      chip(COLORS.orange, "26–60%"),
      chip(COLORS.yellow, "61–99%"),
      chip(COLORS.green, "100% Ready"),
      chip(COLORS.red, "Energized (manual)"),
      "</div>"
    ].join("");
    host.appendChild(legend);
  }

  function chip(color, label) {
    return '<span class="nx-readiness-chip"><i style="--chip-color:' + color + '"></i>' + label + "</span>";
  }

  function dot(color) {
    return '<i style="--chip-color:' + color + '"></i>';
  }

  function selectedEquipmentId(root) {
    const selected = root.querySelector(".node.selected .id");
    return selected ? String(selected.textContent || "").trim() : "";
  }

  function addEngineerPanel(state) {
    const root = state.root;
    const properties = root.querySelector(".properties-wrap") || root.querySelector(".properties");
    if (!properties || properties.querySelector(".nx-energization-panel")) return;

    const panel = document.createElement("section");
    panel.className = "nx-energization-panel";
    panel.innerHTML = [
      "<h3>Engineer / SME Energization</h3>",
      "<p>Red is a manually confirmed energized state. It is not calculated from completion. Equipment must be 100% before it can be marked energized.</p>",
      '<button type="button" disabled>Select equipment first</button>',
      '<div class="nx-energization-audit"></div>'
    ].join("");

    const button = panel.querySelector("button");
    button.addEventListener("click", function handleEnergizationClick() {
      const equipmentId = selectedEquipmentId(root);
      if (!equipmentId) return;
      const equipment = state.equipmentById.get(equipmentId);
      const percent = getPercent(equipment);
      const records = loadEnergized(state.context);
      const existing = records[equipmentId];

      if (!existing && percent !== 100) {
        window.alert("This equipment must be 100% complete before it can be marked energized.");
        return;
      }

      const action = existing ? "remove the energized state from" : "mark as energized";
      if (!window.confirm("Confirm that you want to " + action + " " + equipmentId + "?")) return;

      if (existing) {
        delete records[equipmentId];
      } else {
        const note = window.prompt("Optional energization note:", "") || "";
        records[equipmentId] = {
          energized: true,
          equipmentId,
          projectId: state.context.projectId,
          buildingId: state.context.buildingId,
          updatedAt: new Date().toISOString(),
          updatedBy: currentActor(),
          note
        };
      }

      saveEnergized(state.context, records);
      decorate(state);
    });

    properties.appendChild(panel);
    state.engineerPanel = panel;
  }

  function updateEngineerPanel(state) {
    const panel = state.engineerPanel;
    if (!panel) return;
    const button = panel.querySelector("button");
    const audit = panel.querySelector(".nx-energization-audit");
    const equipmentId = selectedEquipmentId(state.root);

    if (!equipmentId) {
      button.disabled = true;
      button.textContent = "Select equipment first";
      button.dataset.state = "none";
      audit.textContent = "";
      return;
    }

    const equipment = state.equipmentById.get(equipmentId);
    const percent = getPercent(equipment);
    const record = loadEnergized(state.context)[equipmentId];
    button.disabled = !record && percent !== 100;
    button.dataset.state = record ? "energized" : "ready";
    button.textContent = record ? "Remove Energized State" : "Mark as Energized";
    audit.textContent = record
      ? "Energized by " + (record.updatedBy || "unknown") + " on " + new Date(record.updatedAt).toLocaleString()
      : (percent === 100 ? "100% complete and eligible for energization confirmation." : "Current completion: " + (percent === null ? "No data" : percent + "%"));
  }

  function nodeInfo(group, state) {
    const idElement = group.querySelector(".id");
    const id = idElement ? String(idElement.textContent || "").trim() : "";
    const equipment = state.equipmentById.get(id);
    const energized = Boolean(loadEnergized(state.context)[id]);
    return { id, equipment, readiness: readinessFor(getPercent(equipment), energized) };
  }

  function decorateNodes(state) {
    state.root.querySelectorAll(".node").forEach(function decorateNode(group) {
      const info = nodeInfo(group, state);
      group.dataset.equipmentId = info.id;
      group.dataset.readiness = info.readiness.key;
      group.style.setProperty("--nx-readiness-color", info.readiness.color);
      const pct = group.querySelector(".pct");
      if (pct && info.readiness.key === "red") pct.textContent = "ENERGIZED";
    });
  }

  function nearestNodeId(point, nodeGeometry) {
    let winner = "";
    let distance = Infinity;
    nodeGeometry.forEach(function compare(node) {
      const dx = point.x - node.x;
      const dy = point.y - node.y;
      const current = Math.sqrt(dx * dx + dy * dy);
      if (current < distance) {
        distance = current;
        winner = node.id;
      }
    });
    return winner;
  }

  function decorateConnections(state) {
    const nodes = Array.from(state.root.querySelectorAll(".node")).map(function mapNode(group) {
      const info = nodeInfo(group, state);
      const matrix = group.transform && group.transform.baseVal && group.transform.baseVal.consolidate();
      const bbox = group.getBBox();
      const tx = matrix ? matrix.matrix.e : 0;
      const ty = matrix ? matrix.matrix.f : 0;
      return { id: info.id, readiness: info.readiness, x: tx + bbox.x + bbox.width / 2, y: ty + bbox.y + bbox.height / 2 };
    });

    state.root.querySelectorAll(".connection").forEach(function decorateConnection(path) {
      try {
        const length = path.getTotalLength();
        const start = path.getPointAtLength(0);
        const end = path.getPointAtLength(length);
        const fromId = nearestNodeId(start, nodes);
        const toId = nearestNodeId(end, nodes);
        const from = nodes.find(function findNode(node) { return node.id === fromId; });
        const to = nodes.find(function findNode(node) { return node.id === toId; });
        if (!from || !to) return;

        let readiness;
        if (from.readiness.key === "red" && to.readiness.key === "red") {
          readiness = from.readiness;
        } else {
          const candidates = [from.readiness, to.readiness].filter(function notRed(item) { return item.key !== "red"; });
          readiness = candidates.sort(function byRank(a, b) { return a.rank - b.rank; })[0] || readinessFor(0, false);
        }
        path.dataset.fromEquipmentId = fromId;
        path.dataset.toEquipmentId = toId;
        path.dataset.readiness = readiness.key;
        path.style.setProperty("--nx-readiness-color", readiness.color);
      } catch (error) {
        // A partially rendered SVG may not expose path geometry yet.
      }
    });
  }

  function decorate(state) {
    if (!state.root.isConnected) return;
    decorateNodes(state);
    if (state.field) decorateConnections(state);
    updateEngineerPanel(state);
  }

  function install(root, options, controller) {
    const context = {
      projectId: options.projectId || "default-project",
      buildingId: options.buildingId || "default-building",
      diagramId: options.diagramId || "overall"
    };
    const state = {
      root,
      controller,
      context,
      field: isFieldPresentation(options),
      equipmentById: new Map(),
      observer: null,
      engineerPanel: null
    };

    (options.equipment || []).forEach(function addEquipment(item) {
      state.equipmentById.set(getEquipmentId(item), item);
    });

    root.classList.toggle("nexus-field-readiness", state.field);
    document.body.classList.toggle("nexus-field-readiness-page", state.field);
    if (state.field) addLegend(root);
    if (options.mode === "edit") addEngineerPanel(state);

    const originalSetEquipment = controller && controller.setEquipment;
    if (controller && typeof originalSetEquipment === "function") {
      controller.setEquipment = function setReadinessEquipment(equipment) {
        state.equipmentById.clear();
        (equipment || []).forEach(function addEquipment(item) {
          state.equipmentById.set(getEquipmentId(item), item);
        });
        const result = originalSetEquipment.call(controller, equipment);
        window.requestAnimationFrame(function afterEquipmentUpdate() { decorate(state); });
        return result;
      };
    }

    state.observer = new MutationObserver(function handleDiagramMutation() {
      window.requestAnimationFrame(function afterMutation() { decorate(state); });
    });
    state.observer.observe(root, { childList: true, subtree: true, attributes: true, attributeFilter: ["class", "transform"] });

    // FIREBASE_CUTOVER_REMOVE: replace this same-device listener with the
    // host energization subscription before deleting the localStorage path.
    window.addEventListener("storage", function handleEnergizedStorage(event) {
      if (event.key === storageKey(context)) decorate(state);
    });
    window.addEventListener("nexus-one-line-energized-change", function handleEnergizedChange() { decorate(state); });

    mounted.set(root, state);
    window.requestAnimationFrame(function initialDecoration() { decorate(state); });
  }

  function wrapMount() {
    if (!window.NEXUS || !window.NEXUS.OneLine || typeof window.NEXUS.OneLine.mount !== "function") return false;
    if (window.NEXUS.OneLine.__readinessWrapped) return true;

    const originalMount = window.NEXUS.OneLine.mount;
    window.NEXUS.OneLine.mount = function readinessMount(options) {
      const root = typeof options.container === "string" ? document.querySelector(options.container) : options.container;
      const controller = originalMount.call(window.NEXUS.OneLine, options);
      if (root) install(root, options || {}, controller || {});
      return controller;
    };
    window.NEXUS.OneLine.__readinessWrapped = true;
    return true;
  }

  if (!wrapMount()) {
    const timer = window.setInterval(function waitForEngine() {
      if (wrapMount()) window.clearInterval(timer);
    }, 25);
  }

  window.NexusOneLineReadiness = {
    colors: Object.assign({}, COLORS),
    getState: readinessFor,
    loadEnergized,
    saveEnergized
  };
})();
