/**
 * ================================================================
 * NEXUS ONE-LINE DIAGRAM ENGINE
 * FILE: one_line_diagram.js
 * ================================================================
 *
 * PURPOSE
 * -------
 * Provides one reusable electrical one-line diagram engine that can
 * operate in two modes:
 *
 * 1. EDIT MODE
 *    Used by one_line_diagram.html.
 *
 *    Includes:
 *    - equipment pool
 *    - move and resize tools
 *    - connections
 *    - labels and zones
 *    - properties
 *    - save controls
 *    - undo and redo
 *
 * 2. VIEW MODE
 *    Used by the main NEXUS dashboard pane.
 *
 *    Includes:
 *    - diagram display
 *    - zoom and pan
 *    - fit-to-pane
 *    - equipment navigation
 *    - no layout editing
 *
 * IMPORTANT ARCHITECTURE RULE
 * ---------------------------
 * Equipment records remain owned by the NEXUS dashboard.
 *
 * Diagram storage contains only:
 * - node positions
 * - node sizes
 * - node shape overrides
 * - connections
 * - labels
 * - grouping zones
 * - phase-collapse state
 *
 * Do not duplicate full equipment records in diagram storage.
 *
 * CURRENT STORAGE
 * ---------------
 * localStorage through one_line_storage.js.
 *
 * FUTURE STORAGE
 * --------------
 * Firebase can replace the storage adapter without rebuilding the
 * diagram interface.
 *
 * PUBLIC API
 * ----------
 * window.NEXUS.OneLine.mount(options)
 * window.NEXUS.OneLine.unmount(container)
 * window.NEXUS.OneLine.setContext(container, options)
 * window.NEXUS.OneLine.setEquipment(container, equipment)
 * window.NEXUS.OneLine.setDiagram(container, diagramId)
 * window.NEXUS.OneLine.fitDiagram(container)
 * window.NEXUS.OneLine.saveDiagram(container)
 * window.NEXUS.OneLine.refresh(container)
 *
 * ================================================================
 */

(function initializeNexusOneLineModule() {
  "use strict";

  // ==============================================================
  // 01. MODULE CONSTANTS
  // ==============================================================

  const SVG_NAMESPACE = "http://www.w3.org/2000/svg";

  const DEFAULT_NODE_WIDTH = 180;
  const DEFAULT_NODE_HEIGHT = 100;

  const MIN_NODE_WIDTH = 70;
  const MIN_NODE_HEIGHT = 45;

  const GRID_SIZE = 20;
  const MAX_HISTORY = 80;
  const AUTOSAVE_DELAY = 650;

  const MIN_ZOOM = 0.18;
  const MAX_ZOOM = 2.8;

  /**
   * Each mounted component receives an independent instance.
   *
   * WeakMap allows the browser to release the instance when its host
   * element is removed.
   */
  const instances = new WeakMap();

  let instanceSequence = 0;

  /*
   * FIREBASE_CUTOVER_REMOVE:
   * Sections 02 and 04 contain standalone sample equipment/layouts. Remove
   * them after the host always supplies equipment and Firestore supplies the
   * initial layout. Replace an absent production layout with an explicit empty
   * state, not the Ohio demonstration diagram.
   */
  // ==============================================================
  // 02. REALISTIC SAMPLE EQUIPMENT
  // ==============================================================

  /**
   * FUTURE DASHBOARD INTEGRATION
   * ----------------------------
   * The dashboard will supply dashboardEquipment through mount():
   *
   * NEXUS.OneLine.mount({
   *   equipment: dashboardEquipment
   * });
   *
   * This sample data exists only so the standalone workspace can be
   * developed and tested without the Ohio dashboard.
   */
  const sampleEquipment = [
    {
      equipmentId: "1A01A",
      type: "Transformer",
      building: "A",
      phase: 1,
      pod: "POD/ROMP 1",
      progress: { percent: 100 }
    },
    {
      equipmentId: "1A02A",
      type: "ATS",
      building: "A",
      phase: 1,
      pod: "POD/ROMP 1",
      progress: { percent: 75 }
    },
    {
      equipmentId: "1A03A",
      type: "Switchgear",
      building: "A",
      phase: 1,
      pod: "POD/ROMP 1",
      progress: { percent: 50 }
    },
    {
      equipmentId: "1A04A",
      type: "Panelboard",
      building: "A",
      phase: 1,
      pod: "POD/ROMP 1",
      progress: { percent: 100 }
    },
    {
      equipmentId: "2A01A",
      type: "Switchgear",
      building: "A",
      phase: 2,
      pod: "POD/ROMP 2",
      progress: { percent: 25 }
    },
    {
      equipmentId: "2A02A",
      type: "Panelboard",
      building: "A",
      phase: 2,
      pod: "POD/ROMP 2",
      progress: { percent: 75 }
    },
    {
      equipmentId: "2A03A",
      type: "PDU",
      building: "A",
      phase: 2,
      pod: "POD/ROMP 2",
      progress: { percent: 50 }
    },
    {
      equipmentId: "2A04A",
      type: "UPS",
      building: "A",
      phase: 2,
      pod: "POD/ROMP 2",
      progress: { percent: 100 }
    },
    {
      equipmentId: "2A05A",
      type: "Meter",
      building: "A",
      phase: 2,
      pod: "POD/ROMP 2",
      progress: { percent: 100 }
    },
    {
      equipmentId: "2A06A",
      type: "Load Bank",
      building: "A",
      phase: 2,
      pod: "POD/ROMP 2",
      progress: { percent: 0 }
    },
    {
      equipmentId: "3B01A",
      type: "ATS",
      building: "A",
      phase: 3,
      pod: "POD/ROMP 3",
      progress: { percent: 75 }
    },
    {
      equipmentId: "3B02A",
      type: "Switchgear",
      building: "A",
      phase: 3,
      pod: "POD/ROMP 3",
      progress: { percent: 50 }
    },
    {
      equipmentId: "3B03A",
      type: "Panelboard",
      building: "A",
      phase: 3,
      pod: "POD/ROMP 3",
      progress: { percent: 75 }
    },
    {
      equipmentId: "3B04A",
      type: "Generator",
      building: "A",
      phase: 3,
      pod: "POD/ROMP 3",
      progress: { percent: 100 }
    },
    {
      equipmentId: "3B05A",
      type: "PDU",
      building: "A",
      phase: 3,
      pod: "POD/ROMP 3",
      progress: { percent: 100 }
    },
    {
      equipmentId: "3B06A",
      type: "UPS",
      building: "A",
      phase: 3,
      pod: "POD/ROMP 3",
      progress: { percent: 50 }
    },
    {
      equipmentId: "3B07A",
      type: "Busway",
      building: "A",
      phase: 3,
      pod: "POD/ROMP 3",
      progress: {}
    },
    {
      equipmentId: "3B08A",
      type: "Disconnect",
      building: "A",
      phase: 3,
      pod: "POD/ROMP 3",
      progress: { percent: 0 }
    }
  ];

  // ==============================================================
  // 03. BASIC FACTORY FUNCTIONS
  // ==============================================================

  function createNode(id, x, y) {
    return {
      id,
      x,
      y,
      w: DEFAULT_NODE_WIDTH,
      h: DEFAULT_NODE_HEIGHT,
      shape: "auto",
      locked: false
    };
  }

  function createZone(id, text, x, y, width, height) {
    return {
      id,
      text,
      x,
      y,
      w: width,
      h: height,
      locked: false
    };
  }

  function createConnection(from, to, arrow) {
    return {
      id: createUniqueId("connection"),
      from,
      to,
      arrow: Boolean(arrow),
      bends: []
    };
  }

  function createUniqueId(prefix) {
    return (
      prefix +
      "-" +
      Date.now() +
      "-" +
      Math.random().toString(36).slice(2, 8)
    );
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  // ==============================================================
  // 04. DEFAULT SAMPLE LAYOUTS
  // ==============================================================

  /**
   * Building and phase layouts are intentionally independent.
   *
   * Moving equipment in Phase 1 must not reposition it in the full
   * building diagram.
   */
  function createDefaultLayouts() {
    const layouts = {
      overall: {
        nodes: [
          createNode("1A01A", 250, 180),
          createNode("1A02A", 610, 180),
          createNode("1A03A", 900, 180),
          createNode("1A04A", 900, 360),

          createNode("2A01A", 300, 660),
          createNode("2A02A", 220, 870),
          createNode("2A03A", 470, 870),
          createNode("2A04A", 720, 870),
          createNode("2A05A", 220, 1060),
          createNode("2A06A", 470, 1060),

          createNode("3B01A", 1040, 660),
          createNode("3B02A", 900, 870),
          createNode("3B03A", 1160, 870),
          createNode("3B04A", 1450, 
                     870),
          createNode("3B05A", 900, 1060),
          createNode("3B06A", 1160, 1060)
        ],

        zones: [
          createZone("zone-phase-1", "PHASE 1", 540, 90, 570, 430),
          createZone("zone-phase-2", "PHASE 2", 150, 560, 680, 650),
          createZone("zone-phase-3", "PHASE 3", 850, 560, 780, 650)
        ],

        labels: [
          {
            id: "utility-label",
            text: "UTILITY SERVICE",
            x: 40,
            y: 230,
            locked: false
          }
        ],

        connections: [],

        collapsed: false
      },

      "phase-1": {
        nodes: [
          createNode("1A01A", 250, 260),
          createNode("1A02A", 600, 260),
          createNode("1A03A", 920, 260),
          createNode("1A04A", 920, 500)
        ],

        zones: [],
        labels: [],
        connections: [],
        collapsed: false
      },

      "phase-2": {
        nodes: [
          createNode("2A01A", 520, 220),
          createNode("2A02A", 230, 500),
          createNode("2A03A", 500, 500),
          createNode("2A04A", 770, 500),
          createNode("2A05A", 230, 760),
          createNode("2A06A", 500, 760)
        ],

        zones: [],
        labels: [],
        connections: [],
        collapsed: false
      },

      "phase-3": {
        nodes: [
          createNode("3B01A", 590, 220),
          createNode("3B02A", 300, 500),
          createNode("3B03A", 590, 500),
          createNode("3B04A", 900, 500),
          createNode("3B05A", 300, 760),
          createNode("3B06A", 590, 760)
        ],

        zones: [],
        labels: [],
        connections: [],
        collapsed: false
      }
    };

    layouts.overall.connections = [
      createConnection("1A01A", "1A02A"),
      createConnection("1A02A", "1A03A"),
      createConnection("1A03A", "1A04A"),

      createConnection("1A01A", "2A01A"),
      createConnection("1A01A", "3B01A"),

      createConnection("2A01A", "2A02A"),
      createConnection("2A01A", "2A03A"),
      createConnection("2A01A", "2A04A"),
      createConnection("2A02A", "2A05A"),
      createConnection("2A03A", "2A06A"),

      createConnection("3B01A", "3B02A"),
      createConnection("3B01A", "3B03A"),
      createConnection("3B03A", "3B04A", true),
      createConnection("3B02A", "3B05A"),
      createConnection("3B03A", "3B06A")
    ];

    layouts["phase-1"].connections = [
      createConnection("1A01A", "1A02A"),
      createConnection("1A02A", "1A03A"),
      createConnection("1A03A", "1A04A")
    ];

    layouts["phase-2"].connections = [
      createConnection("2A01A", "2A02A"),
      createConnection("2A01A", "2A03A"),
      createConnection("2A01A", "2A04A"),
      createConnection("2A02A", "2A05A"),
      createConnection("2A03A", "2A06A")
    ];

    layouts["phase-3"].connections = [
      createConnection("3B01A", "3B02A"),
      createConnection("3B01A", "3B03A"),
      createConnection("3B03A", "3B04A", true),
      createConnection("3B02A", "3B05A"),
      createConnection("3B03A", "3B06A")
    ];

    return layouts;
  }

  const defaultLayouts = createDefaultLayouts();

  // ==============================================================
  // 05. PUBLIC MOUNT FUNCTION
  // ==============================================================

  /**
   * Mounts one independent diagram component.
   *
   * @param {Object} options
   * @param {string|HTMLElement} options.container
   * @param {"edit"|"view"} [options.mode]
   * @param {string} [options.projectId]
   * @param {string} [options.buildingId]
   * @param {string} [options.diagramId]
   * @param {Array} [options.equipment]
   * @param {Function} [options.onOpenEquipment]
   * @param {Function} [options.onOpenWorkspace]
   * @param {Function} [options.onSave]
   * @param {Function} [options.onError]
   */
  function mount(options) {
    const normalizedOptions = normalizeMountOptions(options);
    const root = resolveContainer(normalizedOptions.container);

    if (!root) {
      throw new Error(
        "NEXUS One-Line could not find the requested container."
      );
    }

    /**
     * Prevent duplicate component instances inside one host.
     */
    unmount(root);

    instanceSequence += 1;

    const instance = createInstance(root, normalizedOptions);

    instances.set(root, instance);

    try {
      buildInterface(instance);
      collectElements(instance);
      bindEvents(instance);
      loadDiagram(instance, instance.diagramId);
      startLiveUpdates(instance);

      return createInstanceController(instance);
    } catch (error) {
      reportError(instance, error);
      throw error;
    }
  }

  function normalizeMountOptions(options) {
    const supplied = options || {};

    return {
      container: supplied.container,
      mode: supplied.mode === "view" ? "view" : "edit",
      projectId: supplied.projectId || "sample-project",
      buildingId: supplied.buildingId || "A",
      diagramId: supplied.diagramId || "overall",

      /*
       * viewerOnly removes every path back into the editor. Use this
       * for QR-code access and other field-facing read-only screens.
       */
      viewerOnly: Boolean(supplied.viewerOnly),

      /*
       * embedded tells the renderer that it is being hosted inside a
       * dashboard pane. It keeps the visual compact and avoids
       * workspace-style chrome.
       */
      embedded: Boolean(supplied.embedded),

      /*
       * autoRefreshMs is a compatibility fallback. A Firebase storage
       * adapter should use subscribe() for true real-time updates.
       */
      autoRefreshMs: Math.max(
        0,
        toFiniteNumber(supplied.autoRefreshMs, 0)
      ),

      equipment: Array.isArray(supplied.equipment)
        ? supplied.equipment
        : sampleEquipment,
      onOpenEquipment:
        typeof supplied.onOpenEquipment === "function"
          ? supplied.onOpenEquipment
          : null,
      onOpenWorkspace:
        typeof supplied.onOpenWorkspace === "function"
          ? supplied.onOpenWorkspace
          : null,
      onSave:
        typeof supplied.onSave === "function"
          ? supplied.onSave
          : null,
      onError:
        typeof supplied.onError === "function"
          ? supplied.onError
          : null
    };
  }

  function resolveContainer(container) {
    if (container instanceof HTMLElement) {
      return container;
    }

    if (typeof container === "string") {
      return document.querySelector(container);
    }

    return null;
  }

  function createInstance(root, options) {
    return {
      instanceId: "nexus-one-line-" + instanceSequence,

      root,

      mode: options.mode,

      projectId: options.projectId,

      buildingId: options.buildingId,

      diagramId: options.diagramId,

      viewerOnly: options.viewerOnly,

      embedded: options.embedded,

      autoRefreshMs: options.autoRefreshMs,

      equipment: normalizeEquipment(options.equipment),

      callbacks: {
        onOpenEquipment: options.onOpenEquipment,
        onOpenWorkspace: options.onOpenWorkspace,
        onSave: options.onSave,
        onError: options.onError
      },

      elements: {},

      state: createEmptyLayout(),

      tool: "select",

      poolTab: "all",

      visibleFilter: "all",

      selection: [],

      history: [],

      future: [],

      transform: {
        x: 0,
        y: 0,
        scale: 1
      },

      drag: null,

      pan: null,

      /*
       * Active touch pointers used for phone and iPad navigation.
       * One finger pans in view mode. Two fingers pinch/spread around
       * their midpoint while preserving the world point beneath them.
       */
      touchPointers: new Map(),

      pinch: null,

      connectStart: null,

      gridOn: true,

      snapOn: true,

      poolHidden: false,

      saveTimer: null,

      toastTimer: null,

      resizeObserver: null,

      /*
       * Storage subscriptions are used by the viewer-only QR page and
       * dashboard panes. Firebase adapters should return an unsubscribe
       * function from subscribe(context, callback).
       */
      storageUnsubscribe: null,

      refreshTimer: null,

      eventCleanup: []
    };
  }

  function normalizeEquipment(equipment) {
    return equipment
      .filter(function filterValidEquipment(item) {
        return item && getEquipmentId(item);
      })
      .map(function copyEquipment(item) {
        return item;
      });
  }

  function createEmptyLayout() {
    return {
      nodes: [],
      zones: [],
      labels: [],
      connections: [],
      collapsed: false
    };
  }

  // ==============================================================
  // 06. COMPONENT MARKUP
  // ==============================================================

  function buildInterface(instance) {
    instance.root.innerHTML =
      instance.mode === "edit"
        ? createEditMarkup(instance)
        : createViewMarkup(instance);
  }

  function createEditMarkup(instance) {
    const arrowMarkerId = instance.instanceId + "-arrow";
    const glowFilterId = instance.instanceId + "-selected-glow";
    const smallGridId = instance.instanceId + "-small-grid";
    const gridId = instance.instanceId + "-grid";

    return `
      <div
        class="nexus-one-line"
        data-mode="edit"
        data-instance="${escapeHtml(instance.instanceId)}"
      >
        <header class="nx-header">
          <div class="brand">
            <div class="brand-mark">
              NE<span>X</span>US
            </div>

            <div class="brand-sub">
              DATA SCIENCE LLC
            </div>
          </div>

          <div class="title-block">
            <h1>One-Line Workspace</h1>
            <p data-role="diagram-subtitle">
              Building ${escapeHtml(instance.buildingId)} • Overall
            </p>
          </div>

          <div class="header-actions">
            <span class="editing-pill">
              <span class="dot"></span>
              Edit Mode
            </span>

            <span
              class="save-state"
              data-role="save-state"
            >
              Saved
            </span>

            <button
              type="button"
              class="btn ghost"
              data-action="undo"
              title="Undo (Ctrl+Z)"
            >
              ↶ Undo
            </button>

            <button
              type="button"
              class="btn ghost"
              data-action="redo"
              title="Redo (Ctrl+Y)"
            >
              ↷ Redo
            </button>

            <button
              type="button"
              class="btn ghost"
              data-action="viewer-qr"
              title="Create a viewer-only QR code"
            >
              Viewer QR
            </button>

            <button
              type="button"
              class="btn primary"
              data-action="save"
            >
              Save Diagram
            </button>
          </div>
        </header>

        <section class="control-strip">
          <label>
            Project / Building

            <select data-role="building-select">
              <option value="${escapeHtml(instance.buildingId)}">
                Building ${escapeHtml(instance.buildingId)}
              </option>
            </select>
          </label>

          <label>
            Diagram

            <select data-role="diagram-select">
              ${createDiagramOptions(instance)}
            </select>
          </label>

          <label>
            Visible Equipment

            <select data-role="view-select">
              ${createVisibleEquipmentOptions(instance)}
            </select>
          </label>

          <div class="tool-group primary-tools">
            <button
              type="button"
              class="btn tool active"
              data-tool="select"
              title="Select and move"
            >
              Pointer
            </button>

            <button
              type="button"
              class="btn tool"
              data-tool="connect"
              title="Select two equipment items"
            >
              Connect
            </button>

            <button
              type="button"
              class="btn tool"
              data-action="add-label"
            >
              + Label
            </button>

            <button
              type="button"
              class="btn tool"
              data-action="add-zone"
            >
              + Zone
            </button>

            <button
              type="button"
              class="btn tool"
              data-action="fit"
            >
              Fit
            </button>

            <button
              type="button"
              class="btn tool"
              data-action="zoom-out"
              aria-label="Zoom out"
            >
              −
            </button>

            <button
              type="button"
              class="btn tool"
              data-action="zoom-in"
              aria-label="Zoom in"
            >
              +
            </button>

            <button
              type="button"
              class="btn tool"
              data-action="fullscreen"
            >
              Full Screen
            </button>
          </div>

          <details class="more-menu">
            <summary class="btn tool">
              Arrange ▾
            </summary>

            <div class="menu-panel">
              <button
                type="button"
                data-action="auto-arrange"
              >
                Auto Arrange
              </button>

              <button
                type="button"
                data-action="align-left"
              >
                Align Left
              </button>

              <button
                type="button"
                data-action="align-top"
              >
                Align Top
              </button>

              <button
                type="button"
                data-action="distribute-horizontal"
              >
                Space Horizontally
              </button>

              <button
                type="button"
                data-action="distribute-vertical"
              >
                Space Vertically
              </button>

              <button
                type="button"
                data-action="toggle-lock"
              >
                Lock / Unlock
              </button>

              <button
                type="button"
                data-action="collapse-phases"
              >
                Collapse Phases
              </button>

              <button
                type="button"
                data-action="toggle-grid"
              >
                Grid: On
              </button>
            </div>
          </details>
        </section>

        <main
          class="workspace"
          data-role="workspace"
        >
          ${createPoolMarkup()}

          ${createCanvasMarkup({
            instance,
            arrowMarkerId,
            glowFilterId,
            smallGridId,
            gridId,
            mode: "edit"
          })}

          ${createPropertiesMarkup()}
        </main>

        <div
          class="toast hidden"
          data-role="toast"
          aria-live="polite"
        ></div>
      </div>
    `;
  }

  function createViewMarkup(instance) {
    const arrowMarkerId = instance.instanceId + "-arrow";
    const glowFilterId = instance.instanceId + "-selected-glow";
    const smallGridId = instance.instanceId + "-small-grid";
    const gridId = instance.instanceId + "-grid";

    return `
      <div
        class="nexus-one-line${instance.embedded ? " is-embedded" : ""}${instance.viewerOnly ? " is-viewer-only" : ""}"
        data-mode="view"
        data-instance="${escapeHtml(instance.instanceId)}"
      >
        <section class="one-line-view-shell">
          <div class="one-line-view-toolbar">
            <div class="one-line-view-title">
              <strong>One-Line Diagram</strong>

              <span data-role="diagram-subtitle">
                Building ${escapeHtml(instance.buildingId)} • Overall
              </span>
            </div>

            <div class="one-line-view-actions">
              <button
                type="button"
                class="btn tool"
                data-action="fit"
              >
                Fit
              </button>

              <button
                type="button"
                class="btn tool"
                data-action="zoom-out"
                aria-label="Zoom out"
              >
                −
              </button>

              <button
                type="button"
                class="btn tool"
                data-action="zoom-in"
                aria-label="Zoom in"
              >
                +
              </button>

              ${
                instance.viewerOnly
                  ? ""
                  : `
                    <button
                      type="button"
                      class="btn primary"
                      data-action="open-workspace"
                    >
                      Open Workspace
                    </button>
                  `
              }
            </div>
          </div>

          ${createCanvasMarkup({
            instance,
            arrowMarkerId,
            glowFilterId,
            smallGridId,
            gridId,
            mode: "view"
          })}
        </section>

        <div
          class="toast hidden"
          data-role="toast"
          aria-live="polite"
        ></div>
      </div>
    `;
  }

  function createPoolMarkup() {
    return `
      <aside
        class="pool panel"
        data-role="pool-panel"
      >
        <div class="panel-head">
          <div>
            <strong>Equipment Pool</strong>

            <span
              class="count"
              data-role="pool-count"
            >
              0
            </span>
          </div>

          <button
            type="button"
            class="icon-btn"
            data-action="hide-pool"
            title="Hide equipment pool"
          >
            ×
          </button>
        </div>

        <div class="pool-search">
          <input
            data-role="pool-search"
            placeholder="Search equipment..."
            autocomplete="off"
          />
        </div>

        <div class="pool-tabs">
          <button
            type="button"
            class="pool-tab active"
            data-pool-tab="all"
          >
            All
          </button>

          <button
            type="button"
            class="pool-tab"
            data-pool-tab="placed"
          >
            Placed
          </button>

          <button
            type="button"
            class="pool-tab"
            data-pool-tab="unplaced"
          >
            Unplaced
          </button>
        </div>

        <div
          class="pool-list"
          data-role="pool-list"
        ></div>
      </aside>
    `;
  }

  function createCanvasMarkup(configuration) {
    const {
      instance,
      arrowMarkerId,
      glowFilterId,
      smallGridId,
      gridId,
      mode
    } = configuration;

    const viewMode = mode === "view";

    return `
      <section
        class="canvas-wrap panel"
        data-role="canvas-wrap"
      >
        ${
          viewMode
            ? ""
            : `
              <div class="canvas-toolbar">
                <button
                  type="button"
                  class="small-link"
                  data-action="show-pool"
                >
                  Equipment Pool
                </button>

                <span data-role="canvas-hint">
                  Drag from the pool. Double-click equipment to open it.
                </span>

                <span data-role="zoom-label">
                  100%
                </span>
              </div>
            `
        }

        <div
          class="canvas-viewport"
          data-role="viewport"
        >
          <svg
            data-role="diagram-svg"
            xmlns="${SVG_NAMESPACE}"
            tabindex="0"
            aria-label="NEXUS one-line diagram"
          >
            <defs>
              <pattern
                id="${smallGridId}"
                width="20"
                height="20"
                patternUnits="userSpaceOnUse"
              >
                <path
                  d="M 20 0 L 0 0 0 20"
                  fill="none"
                  stroke="#dedede"
                  stroke-width="0.7"
                ></path>
              </pattern>

              <pattern
                id="${gridId}"
                width="100"
                height="100"
                patternUnits="userSpaceOnUse"
              >
                <rect
                  width="100"
                  height="100"
                  fill="url(#${smallGridId})"
                ></rect>

                <path
                  d="M 100 0 L 0 0 0 100"
                  fill="none"
                  stroke="#c7c7c7"
                  stroke-width="1"
                ></path>
              </pattern>

              <marker
                id="${arrowMarkerId}"
                markerWidth="9"
                markerHeight="9"
                refX="8"
                refY="4.5"
                orient="auto"
                markerUnits="strokeWidth"
              >
                <path
                  d="M0,0 L9,4.5 L0,9 z"
                  fill="#111"
                ></path>
              </marker>

              <filter
                id="${glowFilterId}"
                x="-40%"
                y="-40%"
                width="180%"
                height="180%"
              >
                <feDropShadow
                  dx="0"
                  dy="0"
                  stdDeviation="5"
                  flood-color="#d51f26"
                  flood-opacity="0.9"
                ></feDropShadow>
              </filter>
            </defs>

            <rect
              data-role="grid-rect"
              x="-12000"
              y="-8000"
              width="24000"
              height="16000"
              fill="url(#${gridId})"
            ></rect>

            <g data-role="world-layer">
              <g data-role="zones-layer"></g>
              <g data-role="connections-layer"></g>
              <g data-role="nodes-layer"></g>
              <g data-role="labels-layer"></g>
              <g data-role="overlay-layer"></g>
            </g>
          </svg>
        </div>

        ${
          viewMode
            ? `
              <div class="status-bar one-line-view-status">
                <span data-role="stats-status">
                  0 equipment • 0 connections
                </span>

                <span data-role="zoom-label">
                  100%
                </span>
              </div>
            `
            : `
              <div class="status-bar">
                <span data-role="selected-status">
                  Selected: none
                </span>

                <span data-role="stats-status">
                  0 equipment • 0 connections
                </span>

                <span data-role="snap-status">
                  Grid: On • Snap: On
                </span>

                <span data-role="autosave-status">
                  Auto-save: Saved
                </span>
              </div>
            `
        }
      </section>
    `;
  }

  function createPropertiesMarkup() {
    return `
      <aside
        class="properties panel"
        data-role="properties-panel"
      >
        <div class="mini-map-wrap">
          <div class="section-title">
            Mini Map
          </div>

          <svg
            data-role="mini-map"
            viewBox="0 0 320 170"
            aria-label="Diagram mini map"
          ></svg>
        </div>

        <div class="properties-wrap">
          <div class="section-title">
            Properties
          </div>

          <div
            class="empty-properties"
            data-role="empty-properties"
          >
            Select equipment, a label, a zone, or a connection.
          </div>

          <form
            class="property-form hidden"
            data-role="property-form"
          >
            <label>
              Name

              <input data-role="property-name" />
            </label>

            <label data-role="shape-row">
              Shape

              <select data-role="property-shape">
                <option value="auto">Automatic</option>
                <option value="switchgear">Switchgear</option>
                <option value="ats">ATS</option>
                <option value="transformer">Transformer</option>
                <option value="generator">Generator</option>
                <option value="panelboard">Panelboard</option>
                <option value="ups">UPS</option>
                <option value="pdu">PDU</option>
                <option value="meter">Meter</option>
                <option value="busway">Busway</option>
                <option value="disconnect">Disconnect</option>
                <option value="rectangle">Rectangle</option>
              </select>
            </label>

            <div
              class="two-col"
              data-role="size-row"
            >
              <label>
                Width

                <input
                  data-role="property-width"
                  type="number"
                  min="${MIN_NODE_WIDTH}"
                  max="900"
                />
              </label>

              <label>
                Height

                <input
                  data-role="property-height"
                  type="number"
                  min="${MIN_NODE_HEIGHT}"
                  max="700"
                />
              </label>
            </div>

            <label
              class="checkbox"
              data-role="arrow-row"
            >
              <input
                data-role="property-arrow"
                type="checkbox"
              />

              Show direction arrow
            </label>

            <label
              class="checkbox"
              data-role="lock-row"
            >
              <input
                data-role="property-locked"
                type="checkbox"
              />

              Lock position
            </label>

            <div
              class="readout"
              data-role="equipment-readout"
            ></div>

            <button
              type="button"
              class="btn primary full"
              data-action="open-equipment"
            >
              Open Equipment
            </button>

            <button
              type="button"
              class="btn danger full"
              data-action="remove-selected"
            >
              Return to Pool / Delete
            </button>
          </form>
        </div>

        <div class="legend">
          <div class="section-title">
            Completion
          </div>

          <div>
            <span class="swatch green"></span>
            100% Complete
          </div>

          <div>
            <span class="swatch orange"></span>
            51–99% Complete
          </div>

          <div>
            <span class="swatch purple"></span>
            1–50% Complete
          </div>

          <div>
            <span class="swatch red"></span>
            0% Complete
          </div>

          <div>
            <span class="swatch gray"></span>
            No Data
          </div>
        </div>
      </aside>
    `;
  }

  function createDiagramOptions(instance) {
    const phases = getAvailablePhases(instance);

    const options = [
      `<option value="overall">Building ${escapeHtml(
        instance.buildingId
      )} — Overall</option>`
    ];

    phases.forEach(function addPhaseOption(phase) {
      options.push(
        `<option value="phase-${phase}">Phase ${phase}</option>`
      );
    });

    return options.join("");
  }

  function createVisibleEquipmentOptions(instance) {
    const phases = getAvailablePhases(instance);

    const options = [
      `<option value="all">All Equipment</option>`
    ];

    phases.forEach(function addPhaseOption(phase) {
      options.push(
        `<option value="phase-${phase}">Phase ${phase}</option>`
      );
    });

    return options.join("");
  }

  // ==============================================================
  // 07. ELEMENT COLLECTION
  // ==============================================================

  function collectElements(instance) {
    const root = instance.root;

    instance.elements = {
      component: query(root, ".nexus-one-line"),

      workspace: queryRole(root, "workspace"),

      subtitle: queryRole(root, "diagram-subtitle"),

      saveState: queryRole(root, "save-state"),

      autosaveStatus: queryRole(root, "autosave-status"),

      selectedStatus: queryRole(root, "selected-status"),

      statsStatus: queryRole(root, "stats-status"),

      snapStatus: queryRole(root, "snap-status"),

      zoomLabels: queryAllRole(root, "zoom-label"),

      buildingSelect: queryRole(root, "building-select"),

      diagramSelect: queryRole(root, "diagram-select"),

      viewSelect: queryRole(root, "view-select"),

      viewport: queryRole(root, "viewport"),

      svg: queryRole(root, "diagram-svg"),

      grid: queryRole(root, "grid-rect"),

      world: queryRole(root, "world-layer"),

      zones: queryRole(root, "zones-layer"),

      connections: queryRole(root, "connections-layer"),

      nodes: queryRole(root, "nodes-layer"),

      labels: queryRole(root, "labels-layer"),

      overlay: queryRole(root, "overlay-layer"),

      canvasWrap: queryRole(root, "canvas-wrap"),

      poolPanel: queryRole(root, "pool-panel"),

      poolList: queryRole(root, "pool-list"),

      poolCount: queryRole(root, "pool-count"),

      poolSearch: queryRole(root, "pool-search"),

      miniMap: queryRole(root, "mini-map"),

      propertyForm: queryRole(root, "property-form"),

      emptyProperties: queryRole(root, "empty-properties"),

      propertyName: queryRole(root, "property-name"),

      propertyShape: queryRole(root, "property-shape"),

      propertyWidth: queryRole(root, "property-width"),

      propertyHeight: queryRole(root, "property-height"),

      propertyArrow: queryRole(root, "property-arrow"),

      propertyLocked: queryRole(root, "property-locked"),

      shapeRow: queryRole(root, "shape-row"),

      sizeRow: queryRole(root, "size-row"),

      arrowRow: queryRole(root, "arrow-row"),

      lockRow: queryRole(root, "lock-row"),

      equipmentReadout: queryRole(root, "equipment-readout"),

      toast: queryRole(root, "toast"),

      openEquipmentButton: queryAction(root, "open-equipment"),

      removeButton: queryAction(root, "remove-selected")
    };
  }

  function query(root, selector) {
    return root.querySelector(selector);
  }

  function queryAll(root, selector) {
    return Array.from(root.querySelectorAll(selector));
  }

  function queryRole(root, role) {
    return root.querySelector(`[data-role="${role}"]`);
  }

  function queryAllRole(root, role) {
    return queryAll(root, `[data-role="${role}"]`);
  }

  function queryAction(root, action) {
    return root.querySelector(`[data-action="${action}"]`);
  }

  // ==============================================================
  // 08. EVENT BINDING AND CLEANUP
  // ==============================================================

  function bindEvents(instance) {
    const root = instance.root;
    const elements = instance.elements;

    queryAll(root, "[data-tool]").forEach(function bindTool(button) {
      addListener(instance, button, "click", function handleToolClick() {
        setTool(instance, button.dataset.tool);
      });
    });

    queryAll(root, "[data-pool-tab]").forEach(
      function bindPoolTab(button) {
        addListener(
          instance,
          button,
          "click",
          function handlePoolTabClick() {
            instance.poolTab = button.dataset.poolTab;

            queryAll(root, "[data-pool-tab]").forEach(
              function updatePoolTabState(tabButton) {
                tabButton.classList.toggle(
                  "active",
                  tabButton === button
                );
              }
            );

            renderPool(instance);
          }
        );
      }
    );

    bindAction(instance, "save", function handleSave() {
      saveDiagramInstance(instance, true);
      showToast(instance, "Diagram saved.");
    });

    bindAction(instance, "viewer-qr", function handleViewerQr() {
      const url = createQrSetupUrl(instance);

      window.open(
        url,
        "_blank",
        "noopener,noreferrer"
      );
    });

    bindAction(instance, "undo", function handleUndo() {
      undo(instance);
    });

    bindAction(instance, "redo", function handleRedo() {
      redo(instance);
    });

    bindAction(instance, "fit", function handleFit() {
      fitDiagramInstance(instance);
    });

    bindAction(instance, "zoom-in", function handleZoomIn() {
      zoom(instance, 1);
    });

    bindAction(instance, "zoom-out", function handleZoomOut() {
      zoom(instance, -1);
    });

    bindAction(instance, "fullscreen", function handleFullscreen() {
      toggleFullscreen(instance);
    });

    bindAction(instance, "add-label", function handleAddLabel() {
      addLabel(instance);
    });

    bindAction(instance, "add-zone", function handleAddZone() {
      addZone(instance);
    });

    bindAction(
      instance,
      "auto-arrange",
      function handleAutoArrange() {
        autoArrange(instance);
      }
    );

    bindAction(instance, "align-left", function handleAlignLeft() {
      alignSelection(instance, "x");
    });

    bindAction(instance, "align-top", function handleAlignTop() {
      alignSelection(instance, "y");
    });

    bindAction(
      instance,
      "distribute-horizontal",
      function handleDistributeHorizontal() {
        distributeSelection(instance, "x");
      }
    );

    bindAction(
      instance,
      "distribute-vertical",
      function handleDistributeVertical() {
        distributeSelection(instance, "y");
      }
    );

    bindAction(
      instance,
      "toggle-lock",
      function handleToggleLock() {
        toggleSelectionLock(instance);
      }
    );

    bindAction(
      instance,
      "collapse-phases",
      function handleCollapsePhases() {
        togglePhaseCollapse(instance);
      }
    );

    bindAction(instance, "toggle-grid", function handleToggleGrid() {
      toggleGrid(instance);
    });

    bindAction(instance, "hide-pool", function handleHidePool() {
      instance.poolHidden = true;
      renderPool(instance);
      fitDiagramInstance(instance);
    });

    bindAction(instance, "show-pool", function handleShowPool() {
      instance.poolHidden = false;
      renderPool(instance);
      fitDiagramInstance(instance);
    });

    bindAction(
      instance,
      "open-equipment",
      function handleOpenEquipment() {
        openSelectedEquipment(instance);
      }
    );

    bindAction(
      instance,
      "remove-selected",
      function handleRemoveSelected() {
        removeSelected(instance);
      }
    );

    bindAction(
      instance,
      "open-workspace",
      function handleOpenWorkspace() {
        if (instance.callbacks.onOpenWorkspace) {
          instance.callbacks.onOpenWorkspace({
            projectId: instance.projectId,
            buildingId: instance.buildingId,
            diagramId: instance.diagramId
          });

          return;
        }

        const url = createWorkspaceUrl(instance);

        window.open(url, "_blank", "noopener,noreferrer");
      }
    );

    if (elements.poolSearch) {
      addListener(
        instance,
        elements.poolSearch,
        "input",
        function handlePoolSearch() {
          renderPool(instance);
        }
      );
    }

    if (elements.diagramSelect) {
      addListener(
        instance,
        elements.diagramSelect,
        "change",
        function handleDiagramChange() {
          loadDiagram(instance, elements.diagramSelect.value);
        }
      );
    }

    if (elements.viewSelect) {
      addListener(
        instance,
        elements.viewSelect,
        "change",
        function handleViewChange() {
          instance.visibleFilter = elements.viewSelect.value;
          instance.selection = [];

          render(instance);
          fitDiagramInstance(instance);
        }
      );
    }

    [
      elements.propertyName,
      elements.propertyShape,
      elements.propertyWidth,
      elements.propertyHeight,
      elements.propertyArrow,
      elements.propertyLocked
    ]
      .filter(Boolean)
      .forEach(function bindPropertyField(field) {
        addListener(
          instance,
          field,
          "change",
          function handlePropertyChange() {
            updateProperties(instance);
          }
        );
      });

    if (elements.viewport) {
      addListener(
        instance,
        elements.viewport,
        "dragover",
        function handleDragOver(event) {
          if (!canEdit(instance)) {
            return;
          }

          event.preventDefault();
        }
      );

      addListener(
        instance,
        elements.viewport,
        "drop",
        function handleDrop(event) {
          handleEquipmentDrop(instance, event);
        }
      );

      addListener(
        instance,
        elements.viewport,
        "wheel",
        function handleWheel(event) {
          event.preventDefault();

          zoom(
            instance,
            event.deltaY < 0 ? 1 : -1,
            event.clientX,
            event.clientY
          );
        },
        { passive: false }
      );

      /*
       * Touch navigation is handled in the capture phase so a pinch can
       * begin even when the first finger lands on an equipment node.
       * Mouse and pen behavior continue through the existing pan tools.
       */
      addListener(
        instance,
        elements.viewport,
        "pointerdown",
        function handleTouchPointerDown(event) {
          handleGesturePointerDown(instance, event);
        },
        { capture: true, passive: false }
      );

      addListener(
        instance,
        elements.viewport,
        "pointermove",
        function handleTouchPointerMove(event) {
          handleGesturePointerMove(instance, event);
        },
        { capture: true, passive: false }
      );

      addListener(
        instance,
        elements.viewport,
        "pointerup",
        function handleTouchPointerUp(event) {
          handleGesturePointerEnd(instance, event);
        },
        { capture: true, passive: false }
      );

      addListener(
        instance,
        elements.viewport,
        "pointercancel",
        function handleTouchPointerCancel(event) {
          handleGesturePointerEnd(instance, event);
        },
        { capture: true, passive: false }
      );

      addListener(
        instance,
        elements.viewport,
        "pointerdown",
        function handleViewportPointerDown(event) {
          if (event.pointerType !== "touch") {
            startPan(instance, event);
          }
        }
      );

      addListener(
        instance,
        elements.viewport,
        "pointermove",
        function handleViewportPointerMove(event) {
          if (event.pointerType !== "touch") {
            movePan(instance, event);
          }
        }
      );

      addListener(
        instance,
        elements.viewport,
        "pointerup",
        function handleViewportPointerUp(event) {
          if (event.pointerType !== "touch") {
            instance.pan = null;
          }
        }
      );

      addListener(
        instance,
        elements.viewport,
        "pointercancel",
        function handleViewportPointerCancel(event) {
          if (event.pointerType !== "touch") {
            instance.pan = null;
          }
        }
      );

      addListener(
        instance,
        elements.viewport,
        "contextmenu",
        function preventContextMenu(event) {
          event.preventDefault();
        }
      );
    }

    if (elements.svg) {
      addListener(
        instance,
        elements.svg,
        "click",
        function handleCanvasClick(event) {
          if (
            event.target === elements.svg ||
            event.target === elements.grid
          ) {
            instance.selection = [];
            instance.connectStart = null;

            render(instance);
          }
        }
      );

      addListener(
        instance,
        elements.svg,
        "keydown",
        function handleSvgKeyDown(event) {
          handleKeyboard(instance, event);
        }
      );
    }

    /**
     * Keyboard handling is attached with addEventListener rather than
     * window.onkeydown so NEXUS dashboard keyboard behavior is not
     * replaced.
     */
    addListener(
      instance,
      window,
      "keydown",
      function handleWindowKeyDown(event) {
        handleKeyboard(instance, event);
      }
    );

    /**
     * ResizeObserver watches only this component's host. This allows
     * the dashboard pane to resize without replacing window resize
     * handlers used elsewhere in NEXUS.
     */
    if (typeof ResizeObserver === "function") {
      instance.resizeObserver = new ResizeObserver(
        function handleComponentResize() {
          applyTransform(instance);
        }
      );

      instance.resizeObserver.observe(instance.root);
    } else {
      addListener(
        instance,
        window,
        "resize",
        function handleWindowResize() {
          applyTransform(instance);
        }
      );
    }
  }

  function bindAction(instance, action, handler) {
    queryAll(
      instance.root,
      `[data-action="${action}"]`
    ).forEach(function bindActionButton(button) {
      addListener(instance, button, "click", handler);
    });
  }

  function addListener(
    instance,
    target,
    eventName,
    handler,
    options
  ) {
    if (!target) {
      return;
    }

    target.addEventListener(eventName, handler, options);

    instance.eventCleanup.push(function removeBoundListener() {
      target.removeEventListener(eventName, handler, options);
    });
  }

  // ==============================================================
  // 09. STORAGE ADAPTER
  // ==============================================================

  function createStorageContext(instance) {
    return {
      projectId: instance.projectId,
      buildingId: instance.buildingId,
      diagramId: instance.diagramId
    };
  }

  /**
   * This function supports both:
   *
   * Current adapter:
   * NexusOneLineStorage.load(diagramId)
   *
   * New adapter being added next:
   * NexusOneLineStorage.load(context)
   */
  function isPromiseLike(value) {
    return Boolean(value && typeof value.then === "function");
  }

  function resolveAsyncLayout(instance, promise) {
    Promise.resolve(promise)
      .then(function handleResolvedLayout(layout) {
        if (layout) {
          applyLiveLayout(instance, layout);
        }
      })
      .catch(function handleAsyncLoadError(error) {
        reportError(instance, error);
      });
  }

  function storageLoad(instance) {
    const adapter = window.NexusOneLineStorage;

    if (!adapter || typeof adapter.load !== "function") {
      return null;
    }

    const context = createStorageContext(instance);

    try {
      const contextualResult = adapter.load(context);

      if (isPromiseLike(contextualResult)) {
        resolveAsyncLayout(instance, contextualResult);
        return null;
      }

      if (contextualResult) {
        return contextualResult;
      }
    } catch (contextError) {
      /* Fall through to the legacy diagramId signature. */
    }

    /*
     * FIREBASE_CUTOVER_REMOVE:
     * Delete the legacy diagramId-only fallback after every production adapter
     * uses the contextual {projectId, buildingId, diagramId} signature.
     */
    try {
      const legacyResult = adapter.load(instance.diagramId);

      if (isPromiseLike(legacyResult)) {
        resolveAsyncLayout(instance, legacyResult);
        return null;
      }

      return legacyResult;
    } catch (legacyError) {
      reportError(instance, legacyError);
      return null;
    }
  }

  /**
   * Supports both the existing and upcoming storage signatures.
   */
  function storageSave(instance, layout) {
    const adapter = window.NexusOneLineStorage;

    if (!adapter || typeof adapter.save !== "function") {
      throw new Error("NexusOneLineStorage is not available.");
    }

    const context = createStorageContext(instance);

    try {
      return adapter.save(context, layout);
    } catch (contextError) {
      // FIREBASE_CUTOVER_REMOVE: delete this legacy save signature after the
      // host adapter uses the contextual signature everywhere.
      return adapter.save(instance.diagramId, layout);
    }
  }

  // ==============================================================
  // 10. LIVE STORAGE SUBSCRIPTION
  // ==============================================================

  /**
   * Start a real-time diagram subscription when the active storage
   * adapter supports it.
   *
   * Firebase adapter contract:
   *
   * subscribe(context, callback) -> unsubscribeFunction
   *
   * The callback may provide a layout object. When no layout is
   * supplied, the engine reloads through the adapter's load method.
   */
  function startLiveUpdates(instance) {
    stopLiveUpdates(instance);

    const adapter = window.NexusOneLineStorage;
    const context = createStorageContext(instance);

    if (
      adapter &&
      typeof adapter.subscribe === "function"
    ) {
      const unsubscribe = adapter.subscribe(
        context,
        function handleStorageUpdate(layout) {
          applyLiveLayout(instance, layout);
        }
      );

      if (typeof unsubscribe === "function") {
        instance.storageUnsubscribe = unsubscribe;
      }

      return;
    }

    /*
     * FIREBASE_CUTOVER_REMOVE:
     * Polling is only a standalone fallback for adapters without realtime
     * subscriptions. Delete this block after the host adapter always exposes
     * subscribe(context, callback).
     *
     * localStorage cannot provide cross-device updates.
     */
    if (instance.autoRefreshMs > 0) {
      instance.refreshTimer = window.setInterval(
        function pollDiagramStorage() {
          applyLiveLayout(instance, storageLoad(instance));
        },
        Math.max(1000, instance.autoRefreshMs)
      );
    }
  }

  function stopLiveUpdates(instance) {
    if (
      instance.storageUnsubscribe &&
      typeof instance.storageUnsubscribe === "function"
    ) {
      try {
        instance.storageUnsubscribe();
      } catch (error) {
        reportError(instance, error);
      }
    }

    instance.storageUnsubscribe = null;

    if (instance.refreshTimer) {
      window.clearInterval(instance.refreshTimer);
      instance.refreshTimer = null;
    }
  }

  function applyLiveLayout(instance, suppliedLayout) {
    const layout = suppliedLayout || storageLoad(instance);

    if (!layout) {
      return;
    }

    instance.state = normalizeLayout(layout);
    instance.selection = [];
    instance.connectStart = null;

    render(instance);

    /*
     * Viewer screens should continually present the whole project
     * visual after a live layout update.
     */
    if (instance.mode === "view") {
      requestAnimationFrame(function fitLiveDiagram() {
        fitDiagramInstance(instance);
      });
    }
  }

  // ==============================================================
  // 10. DIAGRAM LOADING AND CONTEXT
  // ==============================================================

  function loadDiagram(instance, diagramId) {
    instance.diagramId = diagramId || "overall";

    const savedLayout = storageLoad(instance);
    const defaultLayout = getDefaultLayout(instance.diagramId);

    instance.state = normalizeLayout(
      savedLayout || clone(defaultLayout)
    );

    instance.selection = [];
    instance.history = [];
    instance.future = [];
    instance.connectStart = null;

    instance.transform = {
      x: 0,
      y: 0,
      scale: 1
    };

    if (instance.elements.diagramSelect) {
      ensureDiagramOption(instance, instance.diagramId);
      instance.elements.diagramSelect.value =
        instance.diagramId;
    }

    instance.visibleFilter =
      instance.diagramId === "overall"
        ? "all"
        : instance.diagramId;

    if (instance.elements.viewSelect) {
      ensureViewOption(instance, instance.visibleFilter);
      instance.elements.viewSelect.value =
        instance.visibleFilter;
    }

    updateSubtitle(instance);

    render(instance);

    requestAnimationFrame(function fitLoadedDiagram() {
      fitDiagramInstance(instance);
    });
  }

  function getDefaultLayout(diagramId) {
    if (defaultLayouts[diagramId]) {
      return defaultLayouts[diagramId];
    }

    return createEmptyLayout();
  }

  function normalizeLayout(layout) {
    const safe = layout || {};

    return {
      nodes: Array.isArray(safe.nodes)
        ? safe.nodes.map(normalizeNode)
        : [],

      zones: Array.isArray(safe.zones)
        ? safe.zones.map(normalizeZone)
        : [],

      labels: Array.isArray(safe.labels)
        ? safe.labels.map(normalizeLabel)
        : [],

      connections: Array.isArray(safe.connections)
        ? safe.connections.map(normalizeConnection)
        : [],

      collapsed: Boolean(safe.collapsed)
    };
  }

  function normalizeNode(node) {
    return {
      id: String(node.id || ""),
      x: toFiniteNumber(node.x, 0),
      y: toFiniteNumber(node.y, 0),
      w: Math.max(
        MIN_NODE_WIDTH,
        toFiniteNumber(node.w, DEFAULT_NODE_WIDTH)
      ),
      h: Math.max(
        MIN_NODE_HEIGHT,
        toFiniteNumber(node.h, DEFAULT_NODE_HEIGHT)
      ),
      shape: node.shape || "auto",
      locked: Boolean(node.locked)
    };
  }

  function normalizeZone(zone) {
    return {
      id: String(zone.id || createUniqueId("zone")),
      text: String(zone.text || "ZONE"),
      x: toFiniteNumber(zone.x, 0),
      y: toFiniteNumber(zone.y, 0),
      w: Math.max(100, toFiniteNumber(zone.w, 500)),
      h: Math.max(100, toFiniteNumber(zone.h, 300)),
      locked: Boolean(zone.locked)
    };
  }

  function normalizeLabel(label) {
    return {
      id: String(label.id || createUniqueId("label")),
      text: String(label.text || "LABEL"),
      x: toFiniteNumber(label.x, 0),
      y: toFiniteNumber(label.y, 0),
      locked: Boolean(label.locked)
    };
  }

  function normalizeConnection(connection) {
    return {
      id: String(
        connection.id || createUniqueId("connection")
      ),
      from: String(connection.from || ""),
      to: String(connection.to || ""),
      arrow: Boolean(connection.arrow),
      bends: Array.isArray(connection.bends)
        ? connection.bends.map(function normalizeBend(bend) {
            return {
              x: toFiniteNumber(bend.x, 0),
              y: toFiniteNumber(bend.y, 0)
            };
          })
        : []
    };
  }

  function ensureDiagramOption(instance, diagramId) {
    const select = instance.elements.diagramSelect;

    if (!select) {
      return;
    }

    const exists = Array.from(select.options).some(
      function optionMatches(option) {
        return option.value === diagramId;
      }
    );

    if (exists) {
      return;
    }

    const option = document.createElement("option");
    option.value = diagramId;
    option.textContent = formatDiagramName(diagramId);

    select.appendChild(option);
  }

  function ensureViewOption(instance, filter) {
    const select = instance.elements.viewSelect;

    if (!select) {
      return;
    }

    const exists = Array.from(select.options).some(
      function optionMatches(option) {
        return option.value === filter;
      }
    );

    if (exists) {
      return;
    }

    const option = document.createElement("option");
    option.value = filter;
    option.textContent =
      filter === "all"
        ? "All Equipment"
        : formatDiagramName(filter);

    select.appendChild(option);
  }

  function updateSubtitle(instance) {
    if (!instance.elements.subtitle) {
      return;
    }

    const diagramName =
      instance.diagramId === "overall"
        ? "Overall"
        : formatDiagramName(instance.diagramId);

    instance.elements.subtitle.textContent =
      "Building " +
      instance.buildingId +
      " • " +
      diagramName;
  }

  // ==============================================================
  // 11. HISTORY AND SAVE STATE
  // ==============================================================

  function checkpoint(instance) {
    if (!canEdit(instance)) {
      return;
    }

    instance.history.push(clone(instance.state));

    if (instance.history.length > MAX_HISTORY) {
      instance.history.shift();
    }

    instance.future = [];

    updateUndoRedoButtons(instance);
  }

  function undo(instance) {
    if (!canEdit(instance) || !instance.history.length) {
      return;
    }

    instance.future.push(clone(instance.state));
    instance.state = instance.history.pop();
    instance.selection = [];

    render(instance);
    queueSave(instance);
  }

  function redo(instance) {
    if (!canEdit(instance) || !instance.future.length) {
      return;
    }

    instance.history.push(clone(instance.state));
    instance.state = instance.future.pop();
    instance.selection = [];

    render(instance);
    queueSave(instance);
  }

  function updateUndoRedoButtons(instance) {
    const undoButton = queryAction(instance.root, "undo");
    const redoButton = queryAction(instance.root, "redo");

    if (undoButton) {
      undoButton.disabled = !instance.history.length;
    }

    if (redoButton) {
      redoButton.disabled = !instance.future.length;
    }
  }

  function queueSave(instance) {
    if (!canEdit(instance)) {
      return;
    }

    setSaveState(instance, "Unsaved Changes", "unsaved");

    clearTimeout(instance.saveTimer);

    instance.saveTimer = window.setTimeout(
      function performAutosave() {
        saveDiagramInstance(instance, false);
      },
      AUTOSAVE_DELAY
    );
  }

  function saveDiagramInstance(instance, manualSave) {
    if (!canEdit(instance)) {
      return false;
    }

    clearTimeout(instance.saveTimer);

    setSaveState(instance, "Saving", "saving");

    try {
      const saveResult = storageSave(instance, clone(instance.state));

      if (isPromiseLike(saveResult)) {
        Promise.resolve(saveResult)
          .then(function handleAsyncSaveComplete() {
            setSaveState(instance, "Saved", "saved");

            if (instance.callbacks.onSave) {
              instance.callbacks.onSave({
                manual: Boolean(manualSave),
                projectId: instance.projectId,
                buildingId: instance.buildingId,
                diagramId: instance.diagramId,
                state: clone(instance.state)
              });
            }
          })
          .catch(function handleAsyncSaveFailure(error) {
            setSaveState(instance, "Failed", "failed");
            reportError(instance, error);
          });

        return true;
      }

      setSaveState(instance, "Saved", "saved");

      if (instance.callbacks.onSave) {
        instance.callbacks.onSave({
          manual: Boolean(manualSave),
          projectId: instance.projectId,
          buildingId: instance.buildingId,
          diagramId: instance.diagramId,
          state: clone(instance.state)
        });
      }

      return true;
    } catch (error) {
      setSaveState(instance, "Failed", "failed");
      reportError(instance, error);

      return false;
    }
  }

  function setSaveState(instance, text, status) {
    const saveState = instance.elements.saveState;
    const autosave = instance.elements.autosaveStatus;

    if (saveState) {
      saveState.textContent = text;
      saveState.dataset.status = status;
    }

    if (autosave) {
      autosave.textContent = "Auto-save: " + text;
      autosave.dataset.status = status;
    }
  }

  // ==============================================================
  // 12. MAIN RENDER FUNCTION
  // ==============================================================

  function render(instance) {
    renderZones(instance);
    renderConnections(instance);
    renderNodes(instance);
    renderLabels(instance);
    renderOverlay(instance);

    if (canEdit(instance)) {
      renderPool(instance);
      renderProperties(instance);
    }

    applyTransform(instance);
    updateStatus(instance);
    renderMiniMap(instance);
    updateCollapseButton(instance);
    updateUndoRedoButtons(instance);
  }

  // ==============================================================
  // 13. EQUIPMENT HELPERS
  // ==============================================================

  function getEquipmentId(equipment) {
    return (
      equipment.equipmentId ||
      equipment.id ||
      equipment.equipmentID ||
      equipment.equipment_id ||
      ""
    );
  }

  function getEquipment(instance, equipmentId) {
    return instance.equipment.find(
      function findEquipment(item) {
        return String(getEquipmentId(item)) === String(equipmentId);
      }
    );
  }

  function getEquipmentPhase(equipment) {
    const phase =
      equipment &&
      (
        equipment.phase ??
        equipment.phaseNumber ??
        equipment.phaseId
      );

    if (phase === null || phase === undefined || phase === "") {
      return null;
    }

    const number = Number(
      String(phase).replace(/[^\d.-]/g, "")
    );

    return Number.isFinite(number) ? number : null;
  }

  function getEquipmentBuilding(equipment) {
    return String(
      equipment &&
      (
        equipment.building ??
        equipment.buildingId ??
        equipment.buildingName ??
        ""
      )
    );
  }

  function getEquipmentType(equipment) {
    return String(
      equipment &&
      (
        equipment.type ??
        equipment.equipmentType ??
        equipment.category ??
        "Equipment"
      )
    );
  }

  function getEquipmentPod(equipment) {
    return String(
      equipment &&
      (
        equipment.pod ??
        equipment.romp ??
        equipment.podRomp ??
        equipment.location ??
        ""
      )
    );
  }

  function getCompletionPercent(equipment) {
    if (!equipment) {
      return null;
    }

    const progress = equipment.progress || {};

    const candidates = [
      progress.percent,
      progress.percentage,
      progress.completionPercent,
      progress.completePercent,
      progress.percentComplete,

      equipment.percent,
      equipment.percentage,
      equipment.completionPercent,
      equipment.completePercent,
      equipment.percentComplete,
      equipment.completion
    ];

    for (const candidate of candidates) {
      const parsed = parseFloat(
        String(candidate ?? "").replace("%", "")
      );

      if (Number.isFinite(parsed)) {
        return Math.max(
          0,
          Math.min(100, Math.round(parsed))
        );
      }
    }

    if (equipment.complete === true) {
      return 100;
    }

    if (equipment.complete === false) {
      return 0;
    }

    return null;
  }

  function getCompletionColor(equipment) {
    const percent = getCompletionPercent(equipment);

    if (percent === null) {
      return "#999999";
    }

    if (percent === 100) {
      return "#98cb70";
    }

    if (percent >= 51) {
      return "#f2bd3f";
    }

    if (percent >= 1) {
      return "#d67ab6";
    }

    return "#de3b34";
  }

  function getAvailablePhases(instance) {
    return Array.from(
      new Set(
        instance.equipment
          .map(getEquipmentPhase)
          .filter(function removeNullPhases(phase) {
            return phase !== null;
          })
      )
    ).sort(function sortPhases(a, b) {
      return a - b;
    });
  }

  function getVisibleEquipment(instance) {
    let equipment = instance.equipment;

    /**
     * Building filtering is permissive during sample development.
     * Equipment with no building field remains visible.
     */
    equipment = equipment.filter(function filterBuilding(item) {
      const equipmentBuilding = getEquipmentBuilding(item);

      return (
        !equipmentBuilding ||
        equipmentBuilding === String(instance.buildingId)
      );
    });

    const filter =
      instance.visibleFilter ||
      (
        instance.diagramId === "overall"
          ? "all"
          : instance.diagramId
      );

    if (filter === "all") {
      return equipment;
    }

    const phaseMatch = String(filter).match(/phase-(\d+)/i);

    if (!phaseMatch) {
      return equipment;
    }

    const requestedPhase = Number(phaseMatch[1]);

    return equipment.filter(function filterPhase(item) {
      return getEquipmentPhase(item) === requestedPhase;
    });
  }

  function getVisibleEquipmentIds(instance) {
    return new Set(
      getVisibleEquipment(instance).map(function mapId(item) {
        return String(getEquipmentId(item));
      })
    );
  }

  // ==============================================================
  // 14. EQUIPMENT POOL
  // ==============================================================

  function renderPool(instance) {
    const elements = instance.elements;

    if (
      !elements.poolList ||
      !elements.poolPanel ||
      !elements.workspace
    ) {
      return;
    }

    const placedIds = new Set(
      instance.state.nodes.map(function mapNodeId(node) {
        return String(node.id);
      })
    );

    const searchText = elements.poolSearch
      ? elements.poolSearch.value.toLowerCase().trim()
      : "";

    const list = getVisibleEquipment(instance).filter(
      function filterPoolEquipment(equipment) {
        const equipmentId = String(getEquipmentId(equipment));
        const placed = placedIds.has(equipmentId);

        const matchesTab =
          instance.poolTab === "all" ||
          (
            instance.poolTab === "placed" &&
            placed
          ) ||
          (
            instance.poolTab === "unplaced" &&
            !placed
          );

        const searchableText = [
          equipmentId,
          getEquipmentType(equipment),
          getEquipmentPod(equipment),
          getEquipmentPhase(equipment)
        ]
          .join(" ")
          .toLowerCase();

        return (
          matchesTab &&
          searchableText.includes(searchText)
        );
      }
    );

    elements.poolCount.textContent = String(list.length);
    elements.poolList.innerHTML = "";

    if (!list.length) {
      const empty = document.createElement("div");
      empty.className = "pool-empty";
      empty.textContent = "No equipment in this view.";

      elements.poolList.appendChild(empty);
    }

    list.forEach(function renderPoolItem(equipment) {
      const equipmentId = String(getEquipmentId(equipment));
      const placed = placedIds.has(equipmentId);
      const percent = getCompletionPercent(equipment);
      const completionColor =
        getCompletionColor(equipment);

      const item = document.createElement("div");

      item.className =
        "pool-item" +
        (
          placed
            ? " placed"
            : ""
        );

      item.draggable = !placed;

      const accent = document.createElement("span");
      accent.className = "pool-accent";
      accent.style.background = completionColor;

      const description = document.createElement("div");

      const name = document.createElement("div");
      name.className = "pool-name";
      name.textContent = equipmentId;

      const type = document.createElement("div");
      type.className = "pool-type";

      const phase = getEquipmentPhase(equipment);

      type.textContent =
        getEquipmentType(equipment) +
        (
          phase === null
            ? ""
            : " • Phase " + phase
        ) +
        (
          placed
            ? " • Placed"
            : ""
        );

      description.appendChild(name);
      description.appendChild(type);

      const percentage = document.createElement("span");
      percentage.className = "pool-pct";
      percentage.style.color = completionColor;
      percentage.textContent =
        percent === null
          ? "—"
          : percent + "%";

      item.appendChild(accent);
      item.appendChild(description);
      item.appendChild(percentage);

      if (!placed) {
        item.addEventListener(
          "dragstart",
          function handlePoolDragStart(event) {
            event.dataTransfer.setData(
              "text/equipment-id",
              equipmentId
            );
          }
        );
      }

      item.addEventListener(
        "click",
        function handlePoolItemClick() {
          if (!placed) {
            return;
          }

          instance.selection = [
            {
              kind: "node",
              id: equipmentId
            }
          ];

          render(instance);
        }
      );

      elements.poolList.appendChild(item);
    });

    const shouldHidePool =
      instance.poolHidden ||
      (
        instance.poolTab === "unplaced" &&
        !list.length
      );

    elements.workspace.classList.toggle(
      "pool-hidden",
      shouldHidePool
    );
  }

  // ==============================================================
  // 15. SVG HELPER
  // ==============================================================

  function createSvgElement(tagName, attributes) {
    const element = document.createElementNS(
      SVG_NAMESPACE,
      tagName
    );

    Object.entries(attributes || {}).forEach(
      function applyAttribute(entry) {
        const key = entry[0];
        const value = entry[1];

        if (value !== null && value !== undefined) {
          element.setAttribute(key, String(value));
        }
      }
    );

    return element;
  }

  // ==============================================================
  // 16. ZONES
  // ==============================================================

  function renderZones(instance) {
    const layer = instance.elements.zones;

    if (!layer) {
      return;
    }

    layer.innerHTML = "";

    if (
      instance.state.collapsed &&
      instance.diagramId === "overall"
    ) {
      return;
    }

    instance.state.zones.forEach(function renderZone(zone) {
      const group = createSvgElement("g", {
        class:
          "zone" +
          (
            isSelected(instance, "zone", zone.id)
              ? " selected"
              : ""
          ) +
          (
            zone.locked
              ? " locked"
              : ""
          ),
        transform:
          "translate(" +
          zone.x +
          " " +
          zone.y +
          ")"
      });

      const body = createSvgElement("rect", {
        width: zone.w,
        height: zone.h,
        rx: 10
      });

      const title = createSvgElement("text", {
        x: 16,
        y: 28,
        fill: getPhaseColor(zone.text)
      });

      title.textContent = zone.text;

      group.appendChild(body);
      group.appendChild(title);

      if (canEdit(instance)) {
        group.addEventListener(
          "pointerdown",
          function handleZonePointerDown(event) {
            startDrag(instance, event, "zone", zone.id);
          }
        );
      }

      group.addEventListener(
        "click",
        function handleZoneClick(event) {
          event.stopPropagation();

          selectItem(
            instance,
            "zone",
            zone.id,
            event
          );
        }
      );

      layer.appendChild(group);
    });
  }

  function getPhaseColor(text) {
    const value = String(text);

    if (value.includes("1")) {
      return "#5f7e21";
    }

    if (value.includes("2")) {
      return "#754aa5";
    }

    if (value.includes("3")) {
      return "#c86416";
    }

    return "#444444";
  }

  // ==============================================================
  // 17. NODES AND ELECTRICAL SHAPES
  // ==============================================================

  function renderNodes(instance) {
    const layer = instance.elements.nodes;

    if (!layer) {
      return;
    }

    layer.innerHTML = "";

    if (
      instance.state.collapsed &&
      instance.diagramId === "overall"
    ) {
      renderPhaseSummaries(instance);
      return;
    }

    const allowedIds = getVisibleEquipmentIds(instance);

    instance.state.nodes
      .filter(function filterVisibleNode(node) {
        return allowedIds.has(String(node.id));
      })
      .forEach(function renderNode(node) {
        const equipment = getEquipment(instance, node.id);

        const group = createSvgElement("g", {
          class:
            "node" +
            (
              isSelected(instance, "node", node.id)
                ? " selected"
                : ""
            ) +
            (
              node.locked
                ? " locked"
                : ""
            ),
          transform:
            "translate(" +
            node.x +
            " " +
            node.y +
            ")"
        });

        drawNodeBody(group, node, equipment);

        if (canEdit(instance)) {
          drawPorts(instance, group, node);

          group.addEventListener(
            "pointerdown",
            function handleNodePointerDown(event) {
              startDrag(
                instance,
                event,
                "node",
                node.id
              );
            }
          );
        }

        group.addEventListener(
          "click",
          function handleNodeClick(event) {
            event.stopPropagation();

            if (
              canEdit(instance) &&
              instance.tool === "connect"
            ) {
              connectClick(instance, node.id);
              return;
            }

            selectItem(
              instance,
              "node",
              node.id,
              event
            );
          }
        );

        group.addEventListener(
          "dblclick",
          function handleNodeDoubleClick(event) {
            event.stopPropagation();
            openEquipment(instance, node.id);
          }
        );

        layer.appendChild(group);
      });
  }

  function determineShape(equipment, node) {
    if (
      node.shape &&
      node.shape !== "auto"
    ) {
      return node.shape;
    }

    const type = getEquipmentType(equipment).toLowerCase();

    const mappings = [
      ["ats", "ats"],
      ["automatic transfer", "ats"],
      ["transform", "transformer"],
      ["generator", "generator"],
      ["switchgear", "switchgear"],
      ["panel", "panelboard"],
      ["ups", "ups"],
      ["pdu", "pdu"],
      ["meter", "meter"],
      ["busway", "busway"],
      ["bus duct", "busway"],
      ["disconnect", "disconnect"],
      ["load bank", "load-bank"]
    ];

    for (const mapping of mappings) {
      if (type.includes(mapping[0])) {
        return mapping[1];
      }
    }

    return "rectangle";
  }

  function drawNodeBody(group, node, equipment) {
    const width = node.w;
    const height = node.h;
    const shape = determineShape(equipment, node);
    const completionColor =
      getCompletionColor(equipment);

    let body;

    if (shape === "ats") {
      body = createSvgElement("polygon", {
        class: "body",
        points:
          "20,0 " +
          (width - 20) +
          ",0 " +
          width +
          "," +
          height / 2 +
          " " +
          (width - 20) +
          "," +
          height +
          " 20," +
          height +
          " 0," +
          height / 2,
        fill: completionColor
      });
    } else if (
      shape === "generator" ||
      shape === "meter"
    ) {
      body = createSvgElement("ellipse", {
        class: "body",
        cx: width / 2,
        cy: height / 2,
        rx: width / 2,
        ry: height / 2,
        fill: completionColor
      });
    } else if (shape === "transformer") {
      body = createSvgElement("polygon", {
        class: "body",
        points:
          width * 0.12 +
          ",0 " +
          width * 0.88 +
          ",0 " +
          width +
          "," +
          height / 2 +
          " " +
          width * 0.88 +
          "," +
          height +
          " " +
          width * 0.12 +
          "," +
          height +
          " 0," +
          height / 2,
        fill: completionColor
      });
    } else {
      body = createSvgElement("rect", {
        class: "body",
        width,
        height,
        rx:
          shape === "ups"
            ? 14
            : 4,
        fill: completionColor
      });
    }

    group.appendChild(body);

    drawEquipmentSymbol(
      group,
      shape,
      width,
      height
    );

    const equipmentId = createSvgElement("text", {
      class: "id",
      x: width / 2,
      y: height * 0.36,
      "text-anchor": "middle"
    });

    equipmentId.textContent =
      getEquipmentId(equipment) ||
      node.id;

    const equipmentType = createSvgElement("text", {
      class: "type",
      x: width / 2,
      y: height * 0.58,
      "text-anchor": "middle"
    });

    equipmentType.textContent =
      getEquipmentType(equipment).toUpperCase();

    const percent = getCompletionPercent(equipment);

    const completionText = createSvgElement("text", {
      class: "pct",
      x: width / 2,
      y: height * 0.8,
      "text-anchor": "middle"
    });

    completionText.textContent =
      percent === null
        ? "NO DATA"
        : percent + "%";

    group.appendChild(equipmentId);
    group.appendChild(equipmentType);
    group.appendChild(completionText);

    if (node.locked && canEditByGroup(group)) {
      const lockText = createSvgElement("text", {
        x: width - 12,
        y: 16,
        "text-anchor": "end",
        "font-size": 14
      });

      lockText.textContent = "LOCKED";

      group.appendChild(lockText);
    }
  }

  function canEditByGroup(group) {
    const component = group.closest(".nexus-one-line");

    return (
      component &&
      component.dataset.mode === "edit"
    );
  }

  function drawEquipmentSymbol(
    group,
    shape,
    width,
    height
  ) {
    let pathData;

    if (shape === "ats") {
      pathData =
        "M18 " +
        height / 2 +
        "h18 " +
        "m-9 0 15-12 " +
        "m-15 12 15 12 " +
        "M" +
        (width - 18) +
        " " +
        height / 2 +
        "h-18 " +
        "m9 0-15-12 " +
        "m15 12-15 12";
    } else if (shape === "transformer") {
      pathData =
        "M28 18q18 12 0 24q18 12 0 24 " +
        "M48 18q18 12 0 24q18 12 0 24";
    } else if (shape === "generator") {
      pathData =
        "M18 " +
        height / 2 +
        "h12 " +
        "M" +
        (width - 30) +
        " " +
        height / 2 +
        "h12";
    } else if (shape === "meter") {
      pathData =
        "M" +
        (width / 2 - 18) +
        " " +
        height / 2 +
        "a18 18 0 1 0 36 0" +
        "a18 18 0 1 0-36 0 " +
        "M" +
        width / 2 +
        " " +
        height / 2 +
        "l12-10";
    } else if (shape === "disconnect") {
      pathData =
        "M20 " +
        height / 2 +
        "h28 " +
        "M48 " +
        height / 2 +
        "l28-20 " +
        "M76 " +
        height / 2 +
        "h28";
    } else if (shape === "busway") {
      pathData =
        "M18 " +
        height / 2 +
        "H" +
        (width - 18);
    } else if (shape === "load-bank") {
      pathData =
        "M20 22 " +
        "H" +
        (width - 20) +
        " V" +
        (height - 22) +
        " H20 Z " +
        "M35 35 L" +
        (width - 35) +
        " " +
        (height - 35) +
        " M" +
        (width - 35) +
        " 35 L35 " +
        (height - 35);
    } else {
      pathData =
        "M20 20v" +
        (height - 40);
    }

    const symbol = createSvgElement("path", {
      class: "symbol",
      d: pathData
    });

    group.appendChild(symbol);
  }

  function drawPorts(instance, group, node) {
    const ports = [
      ["top", node.w / 2, 0],
      ["right", node.w, node.h / 2],
      ["bottom", node.w / 2, node.h],
      ["left", 0, node.h / 2]
    ];

    ports.forEach(function drawPort(port) {
      const name = port[0];
      const x = port[1];
      const y = port[2];

      const circle = createSvgElement("circle", {
        class: "port",
        cx: x,
        cy: y,
        r: 5,
        "data-port": name
      });

      circle.addEventListener(
        "pointerdown",
        function handlePortPointerDown(event) {
          event.stopPropagation();

          setTool(instance, "connect");
          instance.connectStart = node.id;

          showToast(
            instance,
            "Select the equipment to connect."
          );
        }
      );

      group.appendChild(circle);
    });
  }

  // ==============================================================
  // 18. CONNECTIONS
  // ==============================================================

  function renderConnections(instance) {
    const layer = instance.elements.connections;

    if (!layer) {
      return;
    }

    layer.innerHTML = "";

    const visibleIds = getVisibleEquipmentIds(instance);

    instance.state.connections.forEach(
      function renderConnection(connection) {
        if (
          !visibleIds.has(String(connection.from)) ||
          !visibleIds.has(String(connection.to))
        ) {
          return;
        }

        const fromNode = instance.state.nodes.find(
          function findFromNode(node) {
            return node.id === connection.from;
          }
        );

        const toNode = instance.state.nodes.find(
          function findToNode(node) {
            return node.id === connection.to;
          }
        );

        if (!fromNode || !toNode) {
          return;
        }

        const points = routeConnection(
          fromNode,
          toNode,
          connection.bends || []
        );

        const path = createSvgElement("path", {
          class:
            "connection" +
            (
              isSelected(
                instance,
                "connection",
                connection.id
              )
                ? " selected"
                : ""
            ),
          d: createPathData(points)
        });

        if (connection.arrow) {
          path.setAttribute(
            "marker-end",
            "url(#" +
              instance.instanceId +
              "-arrow)"
          );
        }

        path.addEventListener(
          "click",
          function handleConnectionClick(event) {
            event.stopPropagation();

            selectItem(
              instance,
              "connection",
              connection.id,
              event
            );
          }
        );

        if (canEdit(instance)) {
          path.addEventListener(
            "dblclick",
            function handleConnectionDoubleClick(event) {
              event.stopPropagation();

              checkpoint(instance);

              const point = getWorldPoint(
                instance,
                event.clientX,
                event.clientY
              );

              connection.bends.push({
                x: snapValue(instance, point.x),
                y: snapValue(instance, point.y)
              });

              queueSave(instance);
              render(instance);
            }
          );
        }

        layer.appendChild(path);

        points.slice(1, -1).forEach(
          function drawJunction(point) {
            const junction = createSvgElement("circle", {
              class: "junction",
              cx: point.x,
              cy: point.y,
              r: 4
            });

            layer.appendChild(junction);
          }
        );
      }
    );
  }

  function routeConnection(fromNode, toNode, bends) {
    const fromCenter = {
      x: fromNode.x + fromNode.w / 2,
      y: fromNode.y + fromNode.h / 2
    };

    const toCenter = {
      x: toNode.x + toNode.w / 2,
      y: toNode.y + toNode.h / 2
    };

    if (bends.length) {
      return [
        fromCenter,
        ...bends,
        toCenter
      ];
    }

    const horizontalDistance = Math.abs(
      toCenter.x - fromCenter.x
    );

    const verticalDistance = Math.abs(
      toCenter.y - fromCenter.y
    );

    if (horizontalDistance >= verticalDistance) {
      const middleX =
        (fromCenter.x + toCenter.x) / 2;

      return [
        fromCenter,
        {
          x: middleX,
          y: fromCenter.y
        },
        {
          x: middleX,
          y: toCenter.y
        },
        toCenter
      ];
    }

    const middleY =
      (fromCenter.y + toCenter.y) / 2;

    return [
      fromCenter,
      {
        x: fromCenter.x,
        y: middleY
      },
      {
        x: toCenter.x,
        y: middleY
      },
      toCenter
    ];
  }

  function createPathData(points) {
    return points
      .map(function mapPoint(point, index) {
        return (
          (
            index === 0
              ? "M"
              : "L"
          ) +
          point.x +
          " " +
          point.y
        );
      })
      .join(" ");
  }

  function connectClick(instance, equipmentId) {
    if (!canEdit(instance)) {
      return;
    }

    if (!instance.connectStart) {
      instance.connectStart = equipmentId;

      instance.selection = [
        {
          kind: "node",
          id: equipmentId
        }
      ];

      showToast(
        instance,
        "Select the second equipment item."
      );

      render(instance);

      return;
    }

    if (instance.connectStart === equipmentId) {
      return;
    }

    const duplicate = instance.state.connections.some(
      function connectionAlreadyExists(connection) {
        return (
          (
            connection.from === instance.connectStart &&
            connection.to === equipmentId
          ) ||
          (
            connection.from === equipmentId &&
            connection.to === instance.connectStart
          )
        );
      }
    );

    if (duplicate) {
      showToast(
        instance,
        "Those equipment items are already connected."
      );

      instance.connectStart = null;
      setTool(instance, "select");

      return;
    }

    checkpoint(instance);

    instance.state.connections.push(
      createConnection(
        instance.connectStart,
        equipmentId
      )
    );

    instance.connectStart = null;

    instance.selection = [
      {
        kind: "node",
        id: equipmentId
      }
    ];

    queueSave(instance);
    setTool(instance, "select");
    render(instance);
  }

  // ==============================================================
  // 19. LABELS
  // ==============================================================

  function renderLabels(instance) {
    const layer = instance.elements.labels;

    if (!layer) {
      return;
    }

    layer.innerHTML = "";

    if (
      instance.state.collapsed &&
      instance.diagramId === "overall"
    ) {
      return;
    }

    instance.state.labels.forEach(
      function renderLabel(label) {
        const group = createSvgElement("g", {
          class:
            "label-item" +
            (
              isSelected(
                instance,
                "label",
                label.id
              )
                ? " selected"
                : ""
            ) +
            (
              label.locked
                ? " locked"
                : ""
            ),
          transform:
            "translate(" +
            label.x +
            " " +
            label.y +
            ")"
        });

        const text = createSvgElement("text");
        text.textContent = label.text;

        group.appendChild(text);

        if (canEdit(instance)) {
          group.addEventListener(
            "pointerdown",
            function handleLabelPointerDown(event) {
              startDrag(
                instance,
                event,
                "label",
                label.id
              );
            }
          );
        }

        group.addEventListener(
          "click",
          function handleLabelClick(event) {
            event.stopPropagation();

            selectItem(
              instance,
              "label",
              label.id,
              event
            );
          }
        );

        layer.appendChild(group);
      }
    );
  }

  // ==============================================================
  // 20. SELECTION OVERLAY
  // ==============================================================

  function renderOverlay(instance) {
    const layer = instance.elements.overlay;

    if (!layer) {
      return;
    }

    layer.innerHTML = "";

    if (
      !canEdit(instance) ||
      instance.selection.length !== 1
    ) {
      return;
    }

    const selected = instance.selection[0];
    const object = getSelectedObject(instance, selected);

    if (!object) {
      return;
    }

    if (
      (
        selected.kind === "node" ||
        selected.kind === "zone"
      ) &&
      !object.locked
    ) {
      const resizeHandle = createSvgElement("rect", {
        class: "resize-handle",
        x: object.x + object.w - 7,
        y: object.y + object.h - 7,
        width: 14,
        height: 14
      });

      resizeHandle.addEventListener(
        "pointerdown",
        function handleResizePointerDown(event) {
          startResize(
            instance,
            event,
            selected.kind,
            selected.id
          );
        }
      );

      layer.appendChild(resizeHandle);
    }

    if (selected.kind === "connection") {
      (object.bends || []).forEach(
        function drawBendHandle(bend, index) {
          const bendHandle = createSvgElement("circle", {
            class: "bend-handle",
            cx: bend.x,
            cy: bend.y,
            r: 7
          });

          bendHandle.addEventListener(
            "pointerdown",
            function handleBendPointerDown(event) {
              startBend(
                instance,
                event,
                object.id,
                index
              );
            }
          );

          layer.appendChild(bendHandle);
        }
      );
    }
  }

  // ==============================================================
  // 21. PHASE SUMMARY BLOCKS
  // ==============================================================

  function renderPhaseSummaries(instance) {
    const phases = getAvailablePhases(instance);

    phases.forEach(
      function renderPhaseSummary(phase, index) {
        const list = instance.equipment.filter(
          function filterPhase(equipment) {
            return getEquipmentPhase(equipment) === phase;
          }
        );

        const validPercentages = list
          .map(getCompletionPercent)
          .filter(function filterKnownPercentage(percent) {
            return percent !== null;
          });

        const average = validPercentages.length
          ? Math.round(
              validPercentages.reduce(
                function addPercent(total, percent) {
                  return total + percent;
                },
                0
              ) / validPercentages.length
            )
          : 0;

        const x = 240 + index * 410;
        const y = 360;

        const group = createSvgElement("g", {
          class: "phase-summary",
          transform:
            "translate(" +
            x +
            " " +
            y +
            ")"
        });

        const body = createSvgElement("rect", {
          width: 330,
          height: 150,
          rx: 14,
          fill:
            average === 100
              ? "#98cb70"
              : average >= 51
                ? "#f2bd3f"
                : average >= 1
                  ? "#d67ab6"
                  : "#de3b34"
        });

        group.appendChild(body);

        const lines = [
          {
            text: "PHASE " + phase,
            x: 75,
            y: 42,
            size: 24
          },
          {
            text:
              list.length +
              " EQUIPMENT",
            x: 75,
            y: 82,
            size: 16
          },
          {
            text:
              average +
              "% COMPLETE",
            x: 75,
            y: 116,
            size: 18
          }
        ];

        lines.forEach(function addSummaryText(line) {
          const text = createSvgElement("text", {
            x: line.x,
            y: line.y,
            "font-size": line.size
          });

          text.textContent = line.text;

          group.appendChild(text);
        });

        group.addEventListener(
          "click",
          function handlePhaseSummaryClick() {
            loadDiagram(
              instance,
              "phase-" + phase
            );
          }
        );

        instance.elements.nodes.appendChild(group);
      }
    );
  }

  // ==============================================================
  // 22. PROPERTIES PANEL
  // ==============================================================

  function renderProperties(instance) {
    const elements = instance.elements;

    if (
      !elements.emptyProperties ||
      !elements.propertyForm
    ) {
      return;
    }

    const selected =
      instance.selection.length === 1
        ? instance.selection[0]
        : null;

    elements.emptyProperties.classList.toggle(
      "hidden",
      Boolean(selected)
    );

    elements.propertyForm.classList.toggle(
      "hidden",
      !selected
    );

    if (!selected) {
      return;
    }

    const object = getSelectedObject(
      instance,
      selected
    );

    if (!object) {
      return;
    }

    toggleHidden(
      elements.shapeRow,
      selected.kind !== "node"
    );

    toggleHidden(
      elements.sizeRow,
      ![
        "node",
        "zone"
      ].includes(selected.kind)
    );

    toggleHidden(
      elements.arrowRow,
      selected.kind !== "connection"
    );

    toggleHidden(
      elements.lockRow,
      ![
        "node",
        "zone",
        "label"
      ].includes(selected.kind)
    );

    toggleHidden(
      elements.openEquipmentButton,
      selected.kind !== "node"
    );

    if (elements.propertyName) {
      elements.propertyName.disabled =
        selected.kind === "node" ||
        selected.kind === "connection";

      elements.propertyName.value =
        selected.kind === "node"
          ? object.id
          : selected.kind === "connection"
            ? object.from + " → " + object.to
            : object.text;
    }

    if (elements.propertyShape) {
      elements.propertyShape.value =
        object.shape || "auto";
    }

    if (elements.propertyWidth) {
      elements.propertyWidth.value =
        object.w || "";
    }

    if (elements.propertyHeight) {
      elements.propertyHeight.value =
        object.h || "";
    }

    if (elements.propertyArrow) {
      elements.propertyArrow.checked =
        Boolean(object.arrow);
    }

    if (elements.propertyLocked) {
      elements.propertyLocked.checked =
        Boolean(object.locked);
    }

    if (elements.removeButton) {
      elements.removeButton.textContent =
        selected.kind === "node"
          ? "Return to Equipment Pool"
          : "Delete " + selected.kind;
    }

    if (elements.equipmentReadout) {
      elements.equipmentReadout.innerHTML = "";

      if (selected.kind === "node") {
        const equipment = getEquipment(
          instance,
          object.id
        );

        const type = document.createElement("b");
        type.textContent = getEquipmentType(equipment);

        const phase = getEquipmentPhase(equipment);
        const percent = getCompletionPercent(equipment);

        elements.equipmentReadout.appendChild(type);
        elements.equipmentReadout.appendChild(
          document.createElement("br")
        );

        elements.equipmentReadout.appendChild(
          document.createTextNode(
            "Phase " +
              (
                phase === null
                  ? "—"
                  : phase
              ) +
              " • " +
              (
                getEquipmentPod(equipment) ||
                "—"
              )
          )
        );

        elements.equipmentReadout.appendChild(
          document.createElement("br")
        );

        elements.equipmentReadout.appendChild(
          document.createTextNode(
            "Completion: " +
              (
                percent === null
                  ? "No data"
                  : percent + "%"
              )
          )
        );

        elements.equipmentReadout.appendChild(
          document.createElement("br")
        );

        elements.equipmentReadout.appendChild(
          document.createTextNode(
            "Position: " +
              Math.round(object.x) +
              ", " +
              Math.round(object.y)
          )
        );
      }
    }
  }

  function updateProperties(instance) {
    if (
      !canEdit(instance) ||
      instance.selection.length !== 1
    ) {
      return;
    }

    const selected = instance.selection[0];
    const object = getSelectedObject(instance, selected);
    const elements = instance.elements;

    if (!object) {
      return;
    }

    checkpoint(instance);

    if (selected.kind === "node") {
      object.shape =
        elements.propertyShape.value;

      object.w = Math.max(
        MIN_NODE_WIDTH,
        Number(elements.propertyWidth.value) ||
          object.w
      );

      object.h = Math.max(
        MIN_NODE_HEIGHT,
        Number(elements.propertyHeight.value) ||
          object.h
      );

      object.locked =
        elements.propertyLocked.checked;
    } else if (selected.kind === "zone") {
      object.text =
        elements.propertyName.value;

      object.w = Math.max(
        100,
        Number(elements.propertyWidth.value) ||
          object.w
      );

      object.h = Math.max(
        100,
        Number(elements.propertyHeight.value) ||
          object.h
      );

      object.locked =
        elements.propertyLocked.checked;
    } else if (selected.kind === "label") {
      object.text =
        elements.propertyName.value;

      object.locked =
        elements.propertyLocked.checked;
    } else if (selected.kind === "connection") {
      object.arrow =
        elements.propertyArrow.checked;
    }

    queueSave(instance);
    render(instance);
  }

  // ==============================================================
  // 23. SELECTION
  // ==============================================================

  function selectItem(
    instance,
    kind,
    id,
    event
  ) {
    const item = {
      kind,
      id
    };

    if (
      event &&
      (
        event.ctrlKey ||
        event.metaKey
      ) &&
      canEdit(instance)
    ) {
      const existingIndex =
        instance.selection.findIndex(
          function findSelected(selected) {
            return (
              selected.kind === kind &&
              selected.id === id
            );
          }
        );

      if (existingIndex >= 0) {
        instance.selection.splice(existingIndex, 1);
      } else {
        instance.selection.push(item);
      }
    } else {
      instance.selection = [item];
    }

    render(instance);
  }

  function isSelected(instance, kind, id) {
    return instance.selection.some(
      function selectedMatches(selected) {
        return (
          selected.kind === kind &&
          selected.id === id
        );
      }
    );
  }

  function getSelectedObject(instance, selected) {
    const collectionName = {
      node: "nodes",
      zone: "zones",
      label: "labels",
      connection: "connections"
    }[selected.kind];

    if (!collectionName) {
      return null;
    }

    return instance.state[collectionName].find(
      function findObject(object) {
        return object.id === selected.id;
      }
    );
  }

  // ==============================================================
  // 24. DRAGGING, RESIZING, AND BENDS
  // ==============================================================

  function startDrag(
    instance,
    event,
    kind,
    id
  ) {
    if (
      !canEdit(instance) ||
      instance.tool !== "select" ||
      event.button !== 0
    ) {
      return;
    }

    const primary = getSelectedObject(instance, {
      kind,
      id
    });

    if (!primary || primary.locked) {
      return;
    }

    event.stopPropagation();

    if (!isSelected(instance, kind, id)) {
      instance.selection = [
        {
          kind,
          id
        }
      ];
    }

    checkpoint(instance);

    const startingPoint = getWorldPoint(
      instance,
      event.clientX,
      event.clientY
    );

    const items = instance.selection
      .filter(function filterMovable(selected) {
        return [
          "node",
          "zone",
          "label"
        ].includes(selected.kind);
      })
      .map(function mapMovable(selected) {
        const object = getSelectedObject(
          instance,
          selected
        );

        return {
          selected,
          object,
          originalX: object ? object.x : 0,
          originalY: object ? object.y : 0
        };
      })
      .filter(function removeLocked(item) {
        return (
          item.object &&
          !item.object.locked
        );
      });

    instance.drag = {
      mode: "move",
      start: startingPoint,
      items
    };

    bindTemporaryDragEvents(instance);
  }

  function startResize(
    instance,
    event,
    kind,
    id
  ) {
    if (!canEdit(instance)) {
      return;
    }

    event.stopPropagation();

    const object = getSelectedObject(instance, {
      kind,
      id
    });

    if (!object || object.locked) {
      return;
    }

    checkpoint(instance);

    instance.drag = {
      mode: "resize",
      object,
      start: getWorldPoint(
        instance,
        event.clientX,
        event.clientY
      ),
      originalWidth: object.w,
      originalHeight: object.h
    };

    bindTemporaryDragEvents(instance);
  }

  function startBend(
    instance,
    event,
    connectionId,
    bendIndex
  ) {
    if (!canEdit(instance)) {
      return;
    }

    event.stopPropagation();
    checkpoint(instance);

    instance.drag = {
      mode: "bend",
      object: getSelectedObject(instance, {
        kind: "connection",
        id: connectionId
      }),
      bendIndex
    };

    bindTemporaryDragEvents(instance);
  }

  function bindTemporaryDragEvents(instance) {
    const moveHandler = function moveHandler(event) {
      moveDrag(instance, event);
    };

    const endHandler = function endHandler() {
      window.removeEventListener(
        "pointermove",
        moveHandler
      );

      window.removeEventListener(
        "pointerup",
        endHandler
      );

      endDrag(instance);
    };

    window.addEventListener(
      "pointermove",
      moveHandler
    );

    window.addEventListener(
      "pointerup",
      endHandler,
      { once: true }
    );
  }

  function moveDrag(instance, event) {
    if (!instance.drag) {
      return;
    }

    const point = getWorldPoint(
      instance,
      event.clientX,
      event.clientY
    );

    if (instance.drag.mode === "move") {
      instance.drag.items.forEach(
        function moveItem(item) {
          item.object.x = snapValue(
            instance,
            item.originalX +
              point.x -
              instance.drag.start.x
          );

          item.object.y = snapValue(
            instance,
            item.originalY +
              point.y -
              instance.drag.start.y
          );
        }
      );
    } else if (instance.drag.mode === "resize") {
      instance.drag.object.w = Math.max(
        MIN_NODE_WIDTH,
        snapValue(
          instance,
          instance.drag.originalWidth +
            point.x -
            instance.drag.start.x
        )
      );

      instance.drag.object.h = Math.max(
        MIN_NODE_HEIGHT,
        snapValue(
          instance,
          instance.drag.originalHeight +
            point.y -
            instance.drag.start.y
        )
      );
    } else if (
      instance.drag.mode === "bend" &&
      instance.drag.object
    ) {
      instance.drag.object.bends[
        instance.drag.bendIndex
      ] = {
        x: snapValue(instance, point.x),
        y: snapValue(instance, point.y)
      };
    }

    renderZones(instance);
    renderConnections(instance);
    renderNodes(instance);
    renderLabels(instance);
    renderOverlay(instance);
    updateStatus(instance);
    renderMiniMap(instance);
  }

  function endDrag(instance) {
    if (!instance.drag) {
      return;
    }

    instance.drag = null;

    queueSave(instance);
    render(instance);
  }

  // ==============================================================
  // 25. REMOVE OR RETURN TO POOL
  // ==============================================================

  function removeSelected(instance) {
    if (
      !canEdit(instance) ||
      !instance.selection.length
    ) {
      return;
    }

    checkpoint(instance);

    for (const selected of [...instance.selection]) {
      const object = getSelectedObject(
        instance,
        selected
      );

      if (!object) {
        continue;
      }

      if (selected.kind === "node") {
        const attachedConnections =
          instance.state.connections.filter(
            function findAttachedConnection(connection) {
              return (
                connection.from === object.id ||
                connection.to === object.id
              );
            }
          );

        if (
          attachedConnections.length &&
          !window.confirm(
            "Returning " +
              object.id +
              " to the pool will remove " +
              attachedConnections.length +
              " connection(s). Continue?"
          )
        ) {
          instance.history.pop();
          updateUndoRedoButtons(instance);

          return;
        }

        instance.state.nodes =
          instance.state.nodes.filter(
            function keepOtherNodes(node) {
              return node.id !== object.id;
            }
          );

        instance.state.connections =
          instance.state.connections.filter(
            function keepUnattachedConnections(connection) {
              return (
                connection.from !== object.id &&
                connection.to !== object.id
              );
            }
          );
      } else {
        const collectionName = {
          zone: "zones",
          label: "labels",
          connection: "connections"
        }[selected.kind];

        if (collectionName) {
          instance.state[collectionName] =
            instance.state[collectionName].filter(
              function keepOtherObject(item) {
                return item.id !== object.id;
              }
            );
        }
      }
    }

    instance.selection = [];

    queueSave(instance);
    render(instance);
  }

  // ==============================================================
  // 26. ADD LABELS AND ZONES
  // ==============================================================

  function addLabel(instance) {
    if (!canEdit(instance)) {
      return;
    }

    checkpoint(instance);

    const center = getCenterWorldPoint(instance);
    const id = createUniqueId("label");

    instance.state.labels.push({
      id,
      text: "NEW LABEL",
      x: snapValue(instance, center.x),
      y: snapValue(instance, center.y),
      locked: false
    });

    instance.selection = [
      {
        kind: "label",
        id
      }
    ];

    queueSave(instance);
    render(instance);
  }

  function addZone(instance) {
    if (!canEdit(instance)) {
      return;
    }

    checkpoint(instance);

    const center = getCenterWorldPoint(instance);
    const id = createUniqueId("zone");

    instance.state.zones.push(
      createZone(
        id,
        "NEW ZONE",
        snapValue(instance, center.x - 250),
        snapValue(instance, center.y - 150),
        500,
        300
      )
    );

    instance.selection = [
      {
        kind: "zone",
        id
      }
    ];

    queueSave(instance);
    render(instance);
  }

  // ==============================================================
  // 27. ARRANGEMENT TOOLS
  // ==============================================================

  function autoArrange(instance) {
    if (!canEdit(instance)) {
      return;
    }

    checkpoint(instance);

    const visibleIds = getVisibleEquipmentIds(instance);

    const nodes = instance.state.nodes.filter(
      function filterVisibleNode(node) {
        return visibleIds.has(String(node.id));
      }
    );

    const groups = {};

    nodes.forEach(function groupByPhase(node) {
      const equipment = getEquipment(instance, node.id);
      const phase = getEquipmentPhase(equipment) || 0;

      if (!groups[phase]) {
        groups[phase] = [];
      }

      groups[phase].push(node);
    });

    let groupY = 180;

    Object.keys(groups)
      .sort(function sortGroupKeys(a, b) {
        return Number(a) - Number(b);
      })
      .forEach(function arrangeGroup(phase) {
        groups[phase].forEach(
          function arrangeNode(node, index) {
            node.x =
              240 +
              (index % 5) * 240;

            node.y =
              groupY +
              Math.floor(index / 5) * 170;
          }
        );

        groupY +=
          Math.ceil(groups[phase].length / 5) *
            170 +
          220;
      });

    queueSave(instance);
    render(instance);
    fitDiagramInstance(instance);

    showToast(
      instance,
      "Equipment arranged. Undo is available."
    );
  }

  function alignSelection(instance, axis) {
    if (!canEdit(instance)) {
      return;
    }

    const items = getMovableSelectedObjects(instance);

    if (items.length < 2) {
      showToast(
        instance,
        "Select two or more items with Ctrl-click."
      );

      return;
    }

    checkpoint(instance);

    const target = Math.min(
      ...items.map(function mapAxis(object) {
        return object[axis];
      })
    );

    items.forEach(function alignObject(object) {
      object[axis] = target;
    });

    queueSave(instance);
    render(instance);
  }

  function distributeSelection(instance, axis) {
    if (!canEdit(instance)) {
      return;
    }

    const items = getMovableSelectedObjects(instance)
      .sort(function sortByAxis(a, b) {
        return a[axis] - b[axis];
      });

    if (items.length < 3) {
      showToast(
        instance,
        "Select three or more items with Ctrl-click."
      );

      return;
    }

    checkpoint(instance);

    const first = items[0][axis];
    const last = items[items.length - 1][axis];
    const gap =
      (last - first) /
      (items.length - 1);

    items.forEach(
      function distributeObject(object, index) {
        object[axis] = snapValue(
          instance,
          first + gap * index
        );
      }
    );

    queueSave(instance);
    render(instance);
  }

  function getMovableSelectedObjects(instance) {
    return instance.selection
      .filter(function filterMovable(selected) {
        return [
          "node",
          "zone",
          "label"
        ].includes(selected.kind);
      })
      .map(function mapSelected(selected) {
        return getSelectedObject(instance, selected);
      })
      .filter(Boolean);
  }

  function toggleSelectionLock(instance) {
    if (!canEdit(instance)) {
      return;
    }

    const items = getMovableSelectedObjects(instance);

    if (!items.length) {
      showToast(
        instance,
        "Select an item first."
      );

      return;
    }

    checkpoint(instance);

    const nextState = !items.every(
      function allLocked(object) {
        return object.locked;
      }
    );

    items.forEach(function setLock(object) {
      object.locked = nextState;
    });

    queueSave(instance);
    render(instance);

    showToast(
      instance,
      nextState
        ? "Selection locked."
        : "Selection unlocked."
    );
  }

  // ==============================================================
  // 28. PHASE COLLAPSE
  // ==============================================================

  function togglePhaseCollapse(instance) {
    if (!canEdit(instance)) {
      return;
    }

    if (instance.diagramId !== "overall") {
      showToast(
        instance,
        "Phase collapsing is available on the overall diagram."
      );

      return;
    }

    checkpoint(instance);

    instance.state.collapsed =
      !instance.state.collapsed;

    queueSave(instance);
    render(instance);
    fitDiagramInstance(instance);
  }

  function updateCollapseButton(instance) {
    const button = queryAction(
      instance.root,
      "collapse-phases"
    );

    if (!button) {
      return;
    }

    button.textContent =
      instance.state.collapsed
        ? "Expand Phases"
        : "Collapse Phases";
  }

  // ==============================================================
  // 29. EQUIPMENT DROP
  // ==============================================================

  function handleEquipmentDrop(instance, event) {
    if (!canEdit(instance)) {
      return;
    }

    event.preventDefault();

    const equipmentId =
      event.dataTransfer.getData(
        "text/equipment-id"
      );

    if (
      !equipmentId ||
      instance.state.nodes.some(
        function alreadyPlaced(node) {
          return node.id === equipmentId;
        }
      )
    ) {
      return;
    }

    checkpoint(instance);

    const point = getWorldPoint(
      instance,
      event.clientX,
      event.clientY
    );

    instance.state.nodes.push(
      createNode(
        equipmentId,
        snapValue(
          instance,
          point.x - DEFAULT_NODE_WIDTH / 2
        ),
        snapValue(
          instance,
          point.y - DEFAULT_NODE_HEIGHT / 2
        )
      )
    );

    instance.selection = [
      {
        kind: "node",
        id: equipmentId
      }
    ];

    queueSave(instance);
    render(instance);

    /*
     * Recalculate the complete drawing bounds whenever
     * equipment is added. As the drawing grows, the
     * equipment automatically scales down so everything
     * remains visible inside the white workspace.
     */
    requestAnimationFrame(
      function fitAfterEquipmentDrop() {
        fitDiagramInstance(instance);
      }
    );
  }
  // ==============================================================
  // 30. ZOOM, PAN, GRID, AND FIT
  // ==============================================================

  function getWorldPoint(
    instance,
    clientX,
    clientY
  ) {
    const rectangle =
      instance.elements.svg.getBoundingClientRect();

    return {
      x:
        (
          clientX -
          rectangle.left -
          instance.transform.x
        ) /
        instance.transform.scale,

      y:
        (
          clientY -
          rectangle.top -
          instance.transform.y
        ) /
        instance.transform.scale
    };
  }

  function getCenterWorldPoint(instance) {
    const rectangle =
      instance.elements.svg.getBoundingClientRect();

    return getWorldPoint(
      instance,
      rectangle.left + rectangle.width / 2,
      rectangle.top + rectangle.height / 2
    );
  }

  function snapValue(instance, value) {
    return instance.snapOn
      ? Math.round(value / GRID_SIZE) * GRID_SIZE
      : value;
  }

  function applyTransform(instance) {
    const elements = instance.elements;

    if (
      !elements.world ||
      !elements.grid
    ) {
      return;
    }

    const transformText =
      "translate(" +
      instance.transform.x +
      " " +
      instance.transform.y +
      ") " +
      "scale(" +
      instance.transform.scale +
      ")";

    /*
     * Move and scale the actual diagram equipment,
     * connections, labels, and zones.
     */
    elements.world.setAttribute(
      "transform",
      transformText
    );

    /*
     * Keep the drawing grid covering the entire
     * white SVG workspace.
     *
     * The grid rectangle is already extremely large,
     * so it must not receive the same transform as
     * the equipment layer.
     */
    elements.grid.removeAttribute(
      "transform"
    );

    elements.zoomLabels.forEach(
      function updateZoomLabel(label) {
        label.textContent =
          Math.round(
            instance.transform.scale * 100
          ) + "%";
      }
    );
  }

  function fitDiagramInstance(instance) {
    const svg = instance.elements.svg;

    if (!svg) {
      return;
    }

    const items =
      instance.state.collapsed &&
      instance.diagramId === "overall"
        ? [
            {
              x: 240,
              y: 360,
              w: Math.max(
                330,
                getAvailablePhases(instance).length * 410
              ),
              h: 150
            }
          ]
        : getFitItems(instance);

    if (!items.length) {
      instance.transform = {
        x: 20,
        y: 20,
        scale: 1
      };

      applyTransform(instance);

      return;
    }

    const minimumX = Math.min(
      ...items.map(
        function mapMinimumX(item) {
          const itemX = Number(item.x);

          return Number.isFinite(itemX)
            ? itemX
            : 0;
        }
      )
    );

    const minimumY = Math.min(
      ...items.map(
        function mapMinimumY(item) {
          const itemY = Number(item.y);

          return Number.isFinite(itemY)
            ? itemY
            : 0;
        }
      )
    );

    const maximumX = Math.max(
      ...items.map(
        function mapMaximumX(item) {
          const itemX = Number(item.x);
          const itemWidth = Number(item.w);

          return (
            (
              Number.isFinite(itemX)
                ? itemX
                : 0
            ) +
            (
              Number.isFinite(itemWidth)
                ? itemWidth
                : 180
            )
          );
        }
      )
    );

    const maximumY = Math.max(
      ...items.map(
        function mapMaximumY(item) {
          const itemY = Number(item.y);
          const itemHeight = Number(item.h);

          return (
            (
              Number.isFinite(itemY)
                ? itemY
                : 0
            ) +
            (
              Number.isFinite(itemHeight)
                ? itemHeight
                : 100
            )
          );
        }
      )
    );

    const rectangle =
      svg.getBoundingClientRect();

    if (
      !rectangle ||
      rectangle.width <= 0 ||
      rectangle.height <= 0
    ) {
      return;
    }

    const padding =
      instance.mode === "view"
        ? 45
        : 65;

    const contentWidth = Math.max(
      1,
      maximumX - minimumX
    );

    const contentHeight = Math.max(
      1,
      maximumY - minimumY
    );

    const availableWidth = Math.max(
      1,
      rectangle.width - padding * 2
    );

    const availableHeight = Math.max(
      1,
      rectangle.height - padding * 2
    );

    const calculatedScale = Math.min(
      availableWidth / contentWidth,
      availableHeight / contentHeight,
      1.35
    );

    const safeCalculatedScale =
      Number.isFinite(calculatedScale) &&
      calculatedScale > 0
        ? calculatedScale
        : 1;

    instance.transform.scale = Math.max(
      MIN_ZOOM,
      Math.min(
        MAX_ZOOM,
        safeCalculatedScale
      )
    );
    instance.transform.x =
      (
        rectangle.width -
        contentWidth *
          instance.transform.scale
      ) /
        2 -
      minimumX *
        instance.transform.scale;

    instance.transform.y =
      (
        rectangle.height -
        contentHeight *
          instance.transform.scale
      ) /
        2 -
      minimumY *
        instance.transform.scale;

    applyTransform(instance);
  }

  function getFitItems(instance) {
    const visibleIds =
      getVisibleEquipmentIds(instance);

    const nodes =
      instance.state.nodes.filter(
        function visibleNode(node) {
          return visibleIds.has(
            String(node.id)
          );
        }
      );

    /*
     * Only equipment nodes determine the
     * automatic fit dimensions.
     *
     * Zones and text labels are intentionally
     * excluded because a large zone or a label
     * positioned away from the equipment can
     * make the equipment appear extremely small.
     */
    return nodes;
  }

  function zoom(
    instance,
    direction,
    clientX,
    clientY
  ) {
    const svg = instance.elements.svg;

    if (!svg) {
      return;
    }

    const rectangle = svg.getBoundingClientRect();

    const x =
      (
        clientX ??
        rectangle.left + rectangle.width / 2
      ) - rectangle.left;

    const y =
      (
        clientY ??
        rectangle.top + rectangle.height / 2
      ) - rectangle.top;

    const oldScale = instance.transform.scale;

    const nextScale = Math.max(
      MIN_ZOOM,
      Math.min(
        MAX_ZOOM,
        oldScale *
          (
            direction > 0
              ? 1.12
              : 0.89
          )
      )
    );

    instance.transform.x =
      x -
      (
        x - instance.transform.x
      ) *
        (
          nextScale / oldScale
        );

    instance.transform.y =
      y -
      (
        y - instance.transform.y
      ) *
        (
          nextScale / oldScale
        );

    instance.transform.scale = nextScale;

    applyTransform(instance);
  }


  /**
   * PHONE / IPAD GESTURE NAVIGATION
   * --------------------------------
   * One touch pans the viewer. Two touches pinch or spread to zoom.
   * The zoom is centered on the live midpoint between the fingers, so
   * the part of the one-line being inspected stays under the user's hand.
   *
   * Edit mode intentionally reserves a single touch for selecting and
   * moving equipment. Two-finger navigation remains available there.
   */
  function handleGesturePointerDown(instance, event) {
    if (event.pointerType !== "touch") {
      return;
    }

    instance.touchPointers.set(event.pointerId, {
      x: event.clientX,
      y: event.clientY
    });

    if (instance.elements.viewport.setPointerCapture) {
      try {
        instance.elements.viewport.setPointerCapture(event.pointerId);
      } catch (error) {
        // Pointer capture is optional on older mobile browsers.
      }
    }

    if (instance.touchPointers.size === 1 && instance.mode === "view" && instance.viewerOnly) {
      event.preventDefault();

      instance.pan = {
        startX: event.clientX,
        startY: event.clientY,
        originalX: instance.transform.x,
        originalY: instance.transform.y,
        touch: true
      };
    }

    if (instance.touchPointers.size >= 2 && instance.viewerOnly) {
      event.preventDefault();
      event.stopPropagation();

      /* Stop an equipment drag if a second finger changes the action
       * into navigation. The saved layout is not changed until drag end. */
      instance.drag = null;
      instance.pan = null;

      const pair = getFirstTwoTouchPoints(instance);

      if (!pair) {
        return;
      }

      const midpoint = getTouchMidpoint(pair[0], pair[1]);
      const distance = getTouchDistance(pair[0], pair[1]);
      const rectangle = instance.elements.svg.getBoundingClientRect();

      instance.pinch = {
        startDistance: Math.max(1, distance),
        startScale: instance.transform.scale,
        worldX:
          (midpoint.x - rectangle.left - instance.transform.x) /
          instance.transform.scale,
        worldY:
          (midpoint.y - rectangle.top - instance.transform.y) /
          instance.transform.scale
      };
    }
  }

  function handleGesturePointerMove(instance, event) {
    if (
      event.pointerType !== "touch" ||
      !instance.viewerOnly ||
      !instance.touchPointers.has(event.pointerId)
    ) {
      return;
    }

    instance.touchPointers.set(event.pointerId, {
      x: event.clientX,
      y: event.clientY
    });

    if (instance.touchPointers.size >= 2 && instance.pinch) {
      event.preventDefault();

      const pair = getFirstTwoTouchPoints(instance);

      if (!pair) {
        return;
      }

      const midpoint = getTouchMidpoint(pair[0], pair[1]);
      const distance = getTouchDistance(pair[0], pair[1]);
      const rectangle = instance.elements.svg.getBoundingClientRect();

      const nextScale = Math.max(
        MIN_ZOOM,
        Math.min(
          MAX_ZOOM,
          instance.pinch.startScale *
            (distance / instance.pinch.startDistance)
        )
      );

      instance.transform.scale = nextScale;
      instance.transform.x =
        midpoint.x - rectangle.left -
        instance.pinch.worldX * nextScale;
      instance.transform.y =
        midpoint.y - rectangle.top -
        instance.pinch.worldY * nextScale;

      applyTransform(instance);
      return;
    }

    if (
      instance.mode === "view" &&
      instance.pan &&
      instance.pan.touch
    ) {
      event.preventDefault();
      movePan(instance, event);
    }
  }

  function handleGesturePointerEnd(instance, event) {
    if (event.pointerType !== "touch") {
      return;
    }

    instance.touchPointers.delete(event.pointerId);

    if (instance.touchPointers.size < 2) {
      instance.pinch = null;
    }

    if (instance.touchPointers.size === 0) {
      instance.pan = null;
      return;
    }

    /* After a pinch ends with one finger still down, begin a fresh
     * one-finger pan from that finger instead of causing a jump. */
    if (instance.mode === "view" && instance.touchPointers.size === 1) {
      const remaining = Array.from(instance.touchPointers.values())[0];

      instance.pan = {
        startX: remaining.x,
        startY: remaining.y,
        originalX: instance.transform.x,
        originalY: instance.transform.y,
        touch: true
      };
    }
  }

  function getFirstTwoTouchPoints(instance) {
    const points = Array.from(instance.touchPointers.values());

    return points.length >= 2
      ? [points[0], points[1]]
      : null;
  }

  function getTouchDistance(first, second) {
    return Math.hypot(
      second.x - first.x,
      second.y - first.y
    );
  }

  function getTouchMidpoint(first, second) {
    return {
      x: (first.x + second.x) / 2,
      y: (first.y + second.y) / 2
    };
  }

  function startPan(instance, event) {
    const shouldPan =
      instance.mode === "view" ||
      event.button === 1 ||
      event.button === 2 ||
      event.shiftKey;

    if (!shouldPan) {
      return;
    }

    instance.pan = {
      startX: event.clientX,
      startY: event.clientY,
      originalX: instance.transform.x,
      originalY: instance.transform.y
    };

    if (
      instance.elements.viewport &&
      instance.elements.viewport.setPointerCapture
    ) {
      try {
        instance.elements.viewport.setPointerCapture(
          event.pointerId
        );
      } catch (error) {
        // Pointer capture is optional.
      }
    }
  }

  function movePan(instance, event) {
    if (!instance.pan) {
      return;
    }

    instance.transform.x =
      instance.pan.originalX +
      event.clientX -
      instance.pan.startX;

    instance.transform.y =
      instance.pan.originalY +
      event.clientY -
      instance.pan.startY;

    applyTransform(instance);
  }

  function toggleGrid(instance) {
    instance.gridOn = !instance.gridOn;
    instance.snapOn = instance.gridOn;

    if (instance.elements.grid) {
      instance.elements.grid.style.display =
        instance.gridOn
          ? ""
          : "none";
    }

    const button = queryAction(
      instance.root,
      "toggle-grid"
    );

    if (button) {
      button.textContent =
        "Grid: " +
        (
          instance.gridOn
            ? "On"
            : "Off"
        );
    }

    if (instance.elements.snapStatus) {
      instance.elements.snapStatus.textContent =
        "Grid: " +
        (
          instance.gridOn
            ? "On"
            : "Off"
        ) +
        " • Snap: " +
        (
          instance.snapOn
            ? "On"
            : "Off"
        );
    }
  }

  // ==============================================================
  // 31. STATUS AND MINI MAP
  // ==============================================================

  function updateStatus(instance) {
    const visibleIds = getVisibleEquipmentIds(instance);

    const visibleNodeCount =
      instance.state.nodes.filter(
        function countVisibleNode(node) {
          return visibleIds.has(String(node.id));
        }
      ).length;

    const visibleConnectionCount =
      instance.state.connections.filter(
        function countVisibleConnection(connection) {
          return (
            visibleIds.has(String(connection.from)) &&
            visibleIds.has(String(connection.to))
          );
        }
      ).length;

    if (instance.elements.statsStatus) {
      instance.elements.statsStatus.textContent =
        visibleNodeCount +
        " equipment • " +
        visibleConnectionCount +
        " connections";
    }

    if (instance.elements.selectedStatus) {
      instance.elements.selectedStatus.textContent =
        instance.selection.length
          ? "Selected: " +
            instance.selection.length +
            " item" +
            (
              instance.selection.length === 1
                ? ""
                : "s"
            )
          : "Selected: none";
    }
  }

  function renderMiniMap(instance) {
    const miniMap = instance.elements.miniMap;

    if (!miniMap) {
      return;
    }

    miniMap.innerHTML = "";

    miniMap.appendChild(
      createSvgElement("rect", {
        x: 0,
        y: 0,
        width: 320,
        height: 170,
        fill: "#101012"
      })
    );

    if (!instance.state.nodes.length) {
      return;
    }

    const minimumX = Math.min(
      ...instance.state.nodes.map(
        function mapMinimumX(node) {
          return node.x;
        }
      )
    );

    const minimumY = Math.min(
      ...instance.state.nodes.map(
        function mapMinimumY(node) {
          return node.y;
        }
      )
    );

    const maximumX = Math.max(
      ...instance.state.nodes.map(
        function mapMaximumX(node) {
          return node.x + node.w;
        }
      )
    );

    const maximumY = Math.max(
      ...instance.state.nodes.map(
        function mapMaximumY(node) {
          return node.y + node.h;
        }
      )
    );

    const scale = Math.min(
      290 / Math.max(1, maximumX - minimumX),
      140 / Math.max(1, maximumY - minimumY)
    );

    instance.state.nodes.forEach(
      function renderMiniMapNode(node) {
        const equipment = getEquipment(
          instance,
          node.id
        );

        miniMap.appendChild(
          createSvgElement("rect", {
            x:
              15 +
              (node.x - minimumX) * scale,
            y:
              15 +
              (node.y - minimumY) * scale,
            width: Math.max(5, node.w * scale),
            height: Math.max(4, node.h * scale),
            fill: getCompletionColor(equipment),
            stroke: "#ffffff",
            "stroke-width": 0.5
          })
        );
      }
    );
  }

  // ==============================================================
  // 32. TOOL STATE
  // ==============================================================

  function setTool(instance, toolName) {
    if (!canEdit(instance)) {
      return;
    }

    instance.tool = toolName;
    instance.connectStart = null;

    queryAll(
      instance.root,
      "[data-tool]"
    ).forEach(function updateToolButton(button) {
      button.classList.toggle(
        "active",
        button.dataset.tool === toolName
      );
    });

    if (instance.elements.viewport) {
      instance.elements.viewport.classList.toggle(
        "connect-mode",
        toolName === "connect"
      );
    }
  }

  // ==============================================================
  // 33. EQUIPMENT NAVIGATION
  // ==============================================================

  function openSelectedEquipment(instance) {
    if (
      instance.selection.length !== 1 ||
      instance.selection[0].kind !== "node"
    ) {
      return;
    }

    openEquipment(
      instance,
      instance.selection[0].id
    );
  }

  function openEquipment(instance, equipmentId) {
    if (!equipmentId) {
      return;
    }

    if (instance.callbacks.onOpenEquipment) {
      instance.callbacks.onOpenEquipment(
        equipmentId,
        getEquipment(instance, equipmentId)
      );

      return;
    }

    const url =
      "equipment.html?eq=" +
      encodeURIComponent(equipmentId);

    window.open(
      url,
      "_blank",
      "noopener,noreferrer"
    );
  }

  function createWorkspaceUrl(instance) {
    const parameters = new URLSearchParams({
      mode: "edit",
      project: instance.projectId,
      building: instance.buildingId,
      diagram: instance.diagramId
    });

    return (
      "one_line_diagram.html?" +
      parameters.toString()
    );
  }

  /**
   * Create the permanent viewer-only URL intended for dashboard cards
   * and phase-door QR codes.
   *
   * Authentication is intentionally not encoded in the QR code. The
   * host NEXUS application must require the user's normal system login.
   */
  function createViewerUrl(instance) {
    const parameters = new URLSearchParams({
      mode: "view",
      viewer: "1",
      project: instance.projectId,
      building: instance.buildingId,
      diagram: instance.diagramId
    });

    const fileName = "one_line_diagram.html";
    const relativeUrl = fileName + "?" + parameters.toString();

    try {
      return new URL(relativeUrl, window.location.href).href;
    } catch (error) {
      return relativeUrl;
    }
  }

  function createQrSetupUrl(instance) {
    const parameters = new URLSearchParams({
      project: instance.projectId,
      building: instance.buildingId,
      diagram: instance.diagramId,
      viewerUrl: createViewerUrl(instance)
    });

    return "one_line_qr.html?" + parameters.toString();
  }

  // ==============================================================
  // 34. FULLSCREEN
  // ==============================================================

  function toggleFullscreen(instance) {
    const target =
      instance.elements.workspace ||
      instance.elements.component;

    if (!target) {
      return;
    }

    if (document.fullscreenElement) {
      document.exitFullscreen().catch(
        function ignoreFullscreenExitError() {}
      );

      return;
    }

    if (target.requestFullscreen) {
      target.requestFullscreen().catch(
        function handleFullscreenError(error) {
          reportError(instance, error);
        }
      );
    }
  }

  // ==============================================================
  // 35. KEYBOARD CONTROLS
  // ==============================================================

  function handleKeyboard(instance, event) {
    if (!canEdit(instance)) {
      return;
    }

    /**
     * Only process keyboard actions while the component or one of its
     * controls is active.
     */
    const activeInsideComponent =
      instance.root.contains(document.activeElement) ||
      instance.root.contains(event.target);

    if (!activeInsideComponent) {
      return;
    }

    const key = event.key.toLowerCase();

    if (
      (
        event.ctrlKey ||
        event.metaKey
      ) &&
      key === "z"
    ) {
      event.preventDefault();

      if (event.shiftKey) {
        redo(instance);
      } else {
        undo(instance);
      }

      return;
    }

    if (
      (
        event.ctrlKey ||
        event.metaKey
      ) &&
      key === "y"
    ) {
      event.preventDefault();
      redo(instance);

      return;
    }

    const activeTag =
      document.activeElement &&
      document.activeElement.tagName;

    const editingField = [
      "INPUT",
      "SELECT",
      "TEXTAREA"
    ].includes(activeTag);

    if (
      (
        event.key === "Delete" ||
        event.key === "Backspace"
      ) &&
      !editingField
    ) {
      event.preventDefault();
      removeSelected(instance);

      return;
    }

    if (event.key === "Escape") {
      instance.selection = [];
      setTool(instance, "select");
      render(instance);
    }
  }

  // ==============================================================
  // 36. TOAST AND ERRORS
  // ==============================================================

  function showToast(instance, message) {
    const toast = instance.elements.toast;

    if (!toast) {
      return;
    }

    toast.textContent = message;
    toast.classList.remove("hidden");

    clearTimeout(instance.toastTimer);

    instance.toastTimer = window.setTimeout(
      function hideToast() {
        toast.classList.add("hidden");
      },
      2200
    );
  }

  function reportError(instance, error) {
    console.error(
      "[NEXUS One-Line]",
      error
    );

    if (
      instance &&
      instance.callbacks &&
      instance.callbacks.onError
    ) {
      try {
        instance.callbacks.onError(error);
      } catch (callbackError) {
        console.error(
          "[NEXUS One-Line] onError callback failed:",
          callbackError
        );
      }
    }
  }

  // ==============================================================
  // 37. PUBLIC INSTANCE METHODS
  // ==============================================================

  function createInstanceController(instance) {
    return {
      root: instance.root,

      fit: function fit() {
        fitDiagramInstance(instance);
      },

      save: function save() {
        return saveDiagramInstance(instance, true);
      },

      refresh: function refresh() {
        render(instance);
      },

      setEquipment: function setEquipmentData(equipment) {
        setEquipmentInstance(instance, equipment);
      },

      setDiagram: function setDiagramId(diagramId) {
        loadDiagram(instance, diagramId);
      },

      setContext: function setContextOptions(options) {
        setContextInstance(instance, options);
      },

      getState: function getState() {
        return clone(instance.state);
      },

      getViewerUrl: function getViewerUrl() {
        return createViewerUrl(instance);
      },

      openViewerQr: function openViewerQr() {
        window.open(
          createQrSetupUrl(instance),
          "_blank",
          "noopener,noreferrer"
        );
      },

      destroy: function destroy() {
        unmount(instance.root);
      }
    };
  }

  function setEquipmentInstance(instance, equipment) {
    instance.equipment = normalizeEquipment(
      Array.isArray(equipment)
        ? equipment
        : []
    );

    rebuildContextSelectors(instance);
    render(instance);
  }

  function setContextInstance(instance, options) {
    const supplied = options || {};

    const projectChanged =
      supplied.projectId !== undefined &&
      supplied.projectId !== instance.projectId;

    const buildingChanged =
      supplied.buildingId !== undefined &&
      supplied.buildingId !== instance.buildingId;

    const diagramChanged =
      supplied.diagramId !== undefined &&
      supplied.diagramId !== instance.diagramId;

    if (supplied.projectId !== undefined) {
      instance.projectId = supplied.projectId;
    }

    if (supplied.buildingId !== undefined) {
      instance.buildingId = supplied.buildingId;
    }

    if (Array.isArray(supplied.equipment)) {
      instance.equipment = normalizeEquipment(
        supplied.equipment
      );
    }

    rebuildContextSelectors(instance);

    if (
      projectChanged ||
      buildingChanged ||
      diagramChanged
    ) {
      loadDiagram(
        instance,
        supplied.diagramId ||
          instance.diagramId
      );

      startLiveUpdates(instance);

      return;
    }

    render(instance);
  }

  function rebuildContextSelectors(instance) {
    const diagramSelect =
      instance.elements.diagramSelect;

    const viewSelect =
      instance.elements.viewSelect;

    if (diagramSelect) {
      diagramSelect.innerHTML =
        createDiagramOptions(instance);

      ensureDiagramOption(
        instance,
        instance.diagramId
      );

      diagramSelect.value =
        instance.diagramId;
    }

    if (viewSelect) {
      viewSelect.innerHTML =
        createVisibleEquipmentOptions(instance);

      ensureViewOption(
        instance,
        instance.visibleFilter
      );

      viewSelect.value =
        instance.visibleFilter;
    }

    if (instance.elements.buildingSelect) {
      instance.elements.buildingSelect.innerHTML = "";

      const option = document.createElement("option");
      option.value = instance.buildingId;
      option.textContent =
        "Building " + instance.buildingId;

      instance.elements.buildingSelect.appendChild(
        option
      );
    }

    updateSubtitle(instance);
  }

  // ==============================================================
  // 38. PUBLIC STATIC API FUNCTIONS
  // ==============================================================

  function getInstance(container) {
    const root = resolveContainer(container);

    if (!root) {
      return null;
    }

    return instances.get(root) || null;
  }

  function unmount(container) {
    const root = resolveContainer(container);

    if (!root) {
      return;
    }

    const instance = instances.get(root);

    if (!instance) {
      root.innerHTML = "";
      return;
    }

    clearTimeout(instance.saveTimer);
    clearTimeout(instance.toastTimer);
    stopLiveUpdates(instance);

    instance.eventCleanup.forEach(
      function removeInstanceEvent(removeListener) {
        try {
          removeListener();
        } catch (error) {
          // Continue cleanup even if one listener fails.
        }
      }
    );

    if (instance.resizeObserver) {
      instance.resizeObserver.disconnect();
    }

    instance.eventCleanup = [];
    instance.root.innerHTML = "";

    instances.delete(root);
  }

  function setContext(container, options) {
    const instance = requireInstance(container);

    setContextInstance(instance, options);
  }

  function setEquipment(container, equipment) {
    const instance = requireInstance(container);

    setEquipmentInstance(instance, equipment);
  }

  function setDiagram(container, diagramId) {
    const instance = requireInstance(container);

    loadDiagram(instance, diagramId);
  }

  function fitDiagram(container) {
    const instance = requireInstance(container);

    fitDiagramInstance(instance);
  }

  function saveDiagram(container) {
    const instance = requireInstance(container);

    return saveDiagramInstance(instance, true);
  }

  function refresh(container) {
    const instance = requireInstance(container);

    render(instance);
  }

  function requireInstance(container) {
    const instance = getInstance(container);

    if (!instance) {
      throw new Error(
        "No NEXUS One-Line instance is mounted in that container."
      );
    }

    return instance;
  }

  // ==============================================================
  // 39. GENERAL UTILITIES
  // ==============================================================

  function canEdit(instance) {
    return instance.mode === "edit";
  }

  function toggleHidden(element, hidden) {
    if (!element) {
      return;
    }

    element.classList.toggle("hidden", hidden);
  }

  function toFiniteNumber(value, fallback) {
    const number = Number(value);

    return Number.isFinite(number)
      ? number
      : fallback;
  }

  function formatDiagramName(diagramId) {
    return String(diagramId)
      .replace(/-/g, " ")
      .replace(/\b\w/g, function uppercaseCharacter(character) {
        return character.toUpperCase();
      });
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  // ==============================================================
  // 40. EXPOSE NEXUS ONE-LINE API
  // ==============================================================

  window.NEXUS = window.NEXUS || {};

  window.NEXUS.OneLine = {
    mount,
    unmount,
    setContext,
    setEquipment,
    setDiagram,
    fitDiagram,
    saveDiagram,
    refresh,

    /**
     * Development data only.
     * The dashboard should pass dashboardEquipment instead.
     */
    sampleEquipment
  };
})();
