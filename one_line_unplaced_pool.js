/* NEXUS One-Line equipment pool (pool + completion-key cleanups)
 * Consolidated from: one_line_unplaced_pool.js, one_line_completion_key_cleanup.js, one_line_sidebar_completion_cleanup.js.
 * Parts run in the original load order. */
/**
 * NEXUS ONE-LINE EQUIPMENT POOL SIMPLIFICATION
 * =============================================
 * Engineering/setup page only.
 *
 * Required behavior:
 * - All is the permanent material/equipment reference list.
 * - Unplaced is the placement work queue.
 * - Placed remains removed as a separate tab.
 * - Selecting an empty Unplaced view must NEVER collapse the left panel or
 *   allow the diagram canvas to slide underneath it.
 * - All and Unplaced continue using the core renderer's original filtering.
 *
 * Mini Map, Properties, drag/drop, storage, and diagram behavior remain
 * untouched.
 */
(function initializeNexusEquipmentPoolSimplification() {
  "use strict";

  function isEditorPage() {
    const parameters = new URLSearchParams(window.location.search);
    return parameters.get("mode") !== "view";
  }

  function normalizedText(value) {
    return String(value || "").trim().toLowerCase();
  }

  function findTab(pool, label) {
    return Array.from(pool.querySelectorAll(".pool-tab")).find(
      function matchTab(tab) {
        return normalizedText(tab.textContent) === label;
      }
    ) || null;
  }

  function renamePanel(pool) {
    const header = pool.querySelector(".panel-head");
    if (!header) return;

    Array.from(header.childNodes).forEach(function renameTextNode(node) {
      if (
        node.nodeType === Node.TEXT_NODE &&
        /equipment pool/i.test(String(node.textContent || ""))
      ) {
        node.textContent = String(node.textContent).replace(
          /Equipment Pool/gi,
          "Equipment Reference"
        );
      }
    });

    const heading = header.querySelector("h1,h2,h3,h4,strong,span:not(.count)");
    if (
      heading &&
      /equipment pool|unplaced equipment/i.test(String(heading.textContent || ""))
    ) {
      heading.textContent = String(heading.textContent).replace(
        /Equipment Pool|Unplaced Equipment/gi,
        "Equipment Reference"
      );
    }
  }

  function removePlacedTab(pool) {
    Array.from(pool.querySelectorAll(".pool-tab")).forEach(
      function inspectTab(tab) {
        if (normalizedText(tab.textContent) === "placed") {
          tab.remove();
        }
      }
    );
  }

  function unplacedViewIsActive(pool) {
    const tab = findTab(pool, "unplaced");
    return Boolean(
      tab &&
      (
        tab.classList.contains("active") ||
        tab.getAttribute("aria-selected") === "true"
      )
    );
  }

  function unplacedViewIsEmpty(pool) {
    if (!unplacedViewIsActive(pool)) return false;

    const visibleItems = Array.from(pool.querySelectorAll(".pool-item")).filter(
      function visibleItem(item) {
        return !item.hidden && getComputedStyle(item).display !== "none";
      }
    );

    return visibleItems.length === 0;
  }

  function keepEmptyUnplacedPanelOpen(pool) {
    if (!unplacedViewIsEmpty(pool)) return;

    const workspace = pool.closest(".workspace");
    if (!workspace) return;

    workspace.classList.remove("pool-hidden");
    pool.hidden = false;
    pool.removeAttribute("aria-hidden");
    pool.style.removeProperty("display");

    const empty = pool.querySelector(".pool-empty");
    if (empty) {
      empty.textContent = "All equipment has been placed.";
    }
  }

  function refreshPoolPresentation(pool) {
    renamePanel(pool);
    removePlacedTab(pool);
    keepEmptyUnplacedPanelOpen(pool);
  }

  function install(pool) {
    if (!pool || pool.dataset.poolSimplificationInstalled === "1") return;

    pool.dataset.poolSimplificationInstalled = "1";
    pool.classList.add("nx-unplaced-equipment-pool");

    refreshPoolPresentation(pool);

    let queued = false;
    const refresh = function queueRefresh() {
      if (queued) return;
      queued = true;

      window.requestAnimationFrame(function applyPresentationRules() {
        queued = false;
        refreshPoolPresentation(pool);
      });
    };

    const observer = new MutationObserver(refresh);
    observer.observe(pool, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ["class", "aria-selected", "hidden", "style"]
    });

    const workspace = pool.closest(".workspace");
    if (workspace) {
      const workspaceObserver = new MutationObserver(refresh);
      workspaceObserver.observe(workspace, {
        attributes: true,
        attributeFilter: ["class"]
      });
    }
  }

  function loadSmartTools() {
    if (!isEditorPage()) return;

    if (!document.querySelector('link[data-nx-smart-tools="1"]')) {
      const stylesheet = document.createElement("link");
      stylesheet.rel = "stylesheet";
      stylesheet.href = "one_line_smart_tools.css?v=2";
      stylesheet.dataset.nxSmartTools = "1";
      document.head.appendChild(stylesheet);
    }

    if (!document.querySelector('script[data-nx-smart-tools="1"]')) {
      const script = document.createElement("script");
      script.src = "one_line_smart_tools.js?v=2";
      script.defer = true;
      script.dataset.nxSmartTools = "1";
      document.head.appendChild(script);
    }


  }

  function scan() {
    if (!isEditorPage()) return;
    document.querySelectorAll(".pool").forEach(install);
  }

  loadSmartTools();

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", scan, { once: true });
  } else {
    scan();
  }

  const pageObserver = new MutationObserver(scan);
  pageObserver.observe(document.documentElement, {
    childList: true,
    subtree: true
  });
})();
;
/* ---- one_line_completion_key_cleanup.js ---- */
/**
 * NEXUS COMPLETION KEY CLEANUP
 * Engineering editor only.
 *
 * Keeps the movable completion key on the diagram, including when collapsed,
 * and removes the duplicate legacy Completion legend from the right sidebar.
 */
(function initializeNexusCompletionKeyCleanup() {
  "use strict";

  function isEditorPage() {
    return new URLSearchParams(window.location.search).get("mode") !== "view";
  }

  function normalize(value) {
    return String(value || "").replace(/\s+/g, " ").trim();
  }

  function removeSidebarCompletion(root) {
    const wrap = root.querySelector(".properties-wrap");
    if (!wrap) return;

    const headings = Array.from(
      wrap.querySelectorAll("h1,h2,h3,h4,h5,h6,legend,.section-title,.panel-title,strong")
    );

    headings.forEach(function inspectHeading(heading) {
      if (normalize(heading.textContent).toLowerCase() !== "completion") return;
      if (heading.closest(".nx-smart-health")) return;

      let section = heading;
      while (section.parentElement && section.parentElement !== wrap) {
        section = section.parentElement;
      }

      if (section !== wrap && !section.classList.contains("nx-smart-health")) {
        section.remove();
      }
    });

    Array.from(wrap.children).forEach(function inspectDirectChild(child) {
      if (child.classList.contains("nx-smart-health")) return;
      const text = normalize(child.textContent);
      if (
        /^Completion(?:\s|$)/i.test(text) &&
        /100% Complete/i.test(text) &&
        /No Data/i.test(text)
      ) {
        child.remove();
      }
    });
  }

  function keepDiagramKeyVisible(root) {
    const legend = root.querySelector(".canvas-viewport .nx-canvas-legend");
    if (!legend) return;

    legend.hidden = false;
    legend.removeAttribute("hidden");

    const close = legend.querySelector(".nx-legend-close");
    if (close) close.remove();

    const restore = root.querySelector(".nx-key-restore");
    if (restore) restore.remove();

    try {
      const parameters = new URLSearchParams(window.location.search);
      const key = [
        "nexus-one-line-key",
        parameters.get("project") || "sample-project",
        parameters.get("building") || "A",
        parameters.get("diagram") || "overall"
      ].join(":");
      const state = JSON.parse(localStorage.getItem(key) || "{}");
      state.hidden = false;
      localStorage.setItem(key, JSON.stringify(state));
    } catch (error) {
      /* localStorage can be unavailable in restricted browser modes. */
    }
  }

  function apply(root) {
    removeSidebarCompletion(root);
    keepDiagramKeyVisible(root);
  }

  function install(root) {
    if (!root || root.dataset.completionKeyCleanupInstalled === "1") return;
    root.dataset.completionKeyCleanupInstalled = "1";

    apply(root);

    let queued = false;
    const observer = new MutationObserver(function queueCleanup() {
      if (queued) return;
      queued = true;
      requestAnimationFrame(function runCleanup() {
        queued = false;
        apply(root);
      });
    });

    observer.observe(root, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["class", "hidden"]
    });
  }

  function scan() {
    if (!isEditorPage()) return;
    document.querySelectorAll(".nexus-one-line").forEach(install);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", scan, { once: true });
  } else {
    scan();
  }

  new MutationObserver(scan).observe(document.documentElement, {
    childList: true,
    subtree: true
  });
})();
;
/* ---- one_line_sidebar_completion_cleanup.js ---- */
/**
 * NEXUS ONE-LINE SIDEBAR COMPLETION CLEANUP
 * ==========================================
 * Engineering editor only.
 *
 * The core diagram renderer owns a legacy Completion legend in the right
 * sidebar. The active completion key now lives on the diagram canvas, so this
 * module removes only that duplicate sidebar legend whenever the renderer
 * creates or redraws it.
 *
 * It does not modify the Mini Map, Project Summary, Selected Object,
 * Properties controls, or the floating canvas Completion Key.
 */
(function initializeSidebarCompletionCleanup() {
  "use strict";

  function isEditorPage() {
    return new URLSearchParams(window.location.search).get("mode") !== "view";
  }

  function normalizedText(element) {
    return String((element && element.textContent) || "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function isLegacyCompletionLegend(element) {
    if (!element || element.classList.contains("nx-canvas-legend")) return false;
    if (element.closest && element.closest(".nx-canvas-legend")) return false;

    const text = normalizedText(element);
    return (
      /^Completion(?:\s|$)/i.test(text) &&
      /100% Complete/i.test(text) &&
      /51[–-]99% Complete/i.test(text) &&
      /1[–-]50% Complete/i.test(text) &&
      /0% Complete/i.test(text) &&
      /No Data/i.test(text)
    );
  }

  function findRemovalTarget(legend) {
    let current = legend;

    while (current && current.parentElement) {
      const parent = current.parentElement;
      const parentText = normalizedText(parent);

      /*
       * Stop before reaching a container that also owns Project Summary,
       * Mini Map, Selected Object, or unrelated Properties content.
       */
      if (
        /Project Summary/i.test(parentText) ||
        /Mini Map/i.test(parentText) ||
        /Selected Object/i.test(parentText) ||
        /Building Overview/i.test(parentText)
      ) {
        break;
      }

      if (isLegacyCompletionLegend(parent)) {
        current = parent;
        continue;
      }

      break;
    }

    return current;
  }

  function removeDuplicateLegend(root) {
    if (!root) return;

    const candidates = Array.from(
      root.querySelectorAll("section, article, fieldset, div")
    );

    candidates.forEach(function inspect(candidate) {
      if (!candidate.isConnected || !isLegacyCompletionLegend(candidate)) return;

      const target = findRemovalTarget(candidate);
      if (target && target.isConnected) {
        target.remove();
      }
    });
  }

  function install(root) {
    if (!root || root.dataset.sidebarCompletionCleanup === "1") return;
    root.dataset.sidebarCompletionCleanup = "1";

    removeDuplicateLegend(root);

    let queued = false;
    const observer = new MutationObserver(function handleSidebarRedraw() {
      if (queued) return;
      queued = true;

      window.requestAnimationFrame(function cleanAfterRedraw() {
        queued = false;
        removeDuplicateLegend(root);
      });
    });

    observer.observe(root, {
      childList: true,
      subtree: true
    });
  }

  function scan() {
    if (!isEditorPage()) return;
    document.querySelectorAll(".nexus-one-line").forEach(install);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", scan, { once: true });
  } else {
    scan();
  }

  new MutationObserver(scan).observe(document.documentElement, {
    childList: true,
    subtree: true
  });
})();
