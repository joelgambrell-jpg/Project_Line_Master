/**
 * NEXUS ONE-LINE FIELD READINESS RENDERER FIX
 * ============================================
 *
 * Additive field-view repair. It does not change the white Engineer/SME
 * setup workspace or the white embedded desktop dashboard.
 *
 * The core renderer redraws SVG nodes frequently. This module watches the
 * completed SVG output and applies the approved readiness colors directly
 * to the rendered SVG attributes/styles after every redraw.
 *
 * APPROVED STATES
 * ---------------
 * Gray   0% / no data
 * Blue   1-25%
 * Orange 26-60%
 * Yellow 61-99%
 * Green  100% ready for energization
 * Red    engineer/SME-confirmed energized
 */
(function initializeNexusFieldReadinessRendererFix() {
  "use strict";

  const COLORS = {
    gray: "#8b929b",
    blue: "#1f7dff",
    orange: "#ff7a00",
    yellow: "#ffe600",
    green: "#00f56a",
    red: "#ff2438"
  };

  function isFieldRequest() {
    const parameters = new URLSearchParams(window.location.search);
    return (
      parameters.get("mode") === "view" &&
      (
        parameters.get("viewer") === "1" ||
        parameters.get("presentation") === "field"
      )
    );
  }

  function readinessFromText(text) {
    const normalized = String(text || "").trim().toUpperCase();

    if (normalized.includes("ENERGIZED")) {
      return { key: "red", color: COLORS.red, rank: 5 };
    }

    const match = normalized.match(/(-?\d+(?:\.\d+)?)\s*%/);

    if (!match) {
      return { key: "gray", color: COLORS.gray, rank: 0 };
    }

    const percent = Math.max(
      0,
      Math.min(100, Number(match[1]))
    );

    if (percent <= 0) {
      return { key: "gray", color: COLORS.gray, rank: 0 };
    }

    if (percent <= 25) {
      return { key: "blue", color: COLORS.blue, rank: 1 };
    }

    if (percent <= 60) {
      return { key: "orange", color: COLORS.orange, rank: 2 };
    }

    if (percent < 100) {
      return { key: "yellow", color: COLORS.yellow, rank: 3 };
    }

    return { key: "green", color: COLORS.green, rank: 4 };
  }

  function getNodeInformation(group) {
    const identifier = group.querySelector(".id");
    const percentage = group.querySelector(".pct");

    return {
      id: identifier
        ? String(identifier.textContent || "").trim()
        : "",
      readiness: readinessFromText(
        percentage
          ? percentage.textContent
          : ""
      )
    };
  }

  function forceStyle(element, property, value) {
    if (!element) {
      return;
    }

    element.style.setProperty(property, value, "important");
  }

  function decorateNode(group) {
    const information = getNodeInformation(group);
    const color = information.readiness.color;
    const body = group.querySelector(".body");
    const symbol = group.querySelector(".symbol");
    const percentage = group.querySelector(".pct");

    group.dataset.equipmentId = information.id;
    group.dataset.readiness = information.readiness.key;
    group.style.setProperty("--nx-readiness-color", color);

    forceStyle(body, "fill", "#071018");
    forceStyle(body, "stroke", color);
    forceStyle(body, "stroke-width", "4px");
    forceStyle(
      body,
      "filter",
      "drop-shadow(0 0 4px " + color + ") " +
      "drop-shadow(0 0 12px " + color + ")"
    );

    forceStyle(symbol, "stroke", color);
    forceStyle(symbol, "stroke-width", "3px");
    forceStyle(percentage, "fill", color);

    group.querySelectorAll("text:not(.pct)").forEach(
      function makeTextReadable(text) {
        forceStyle(text, "fill", "#f7fbff");
      }
    );

    return information;
  }

  function getNodeGeometry(group) {
    const information = decorateNode(group);

    try {
      const matrix =
        group.transform &&
        group.transform.baseVal
          ? group.transform.baseVal.consolidate()
          : null;

      const box = group.getBBox();

      return {
        id: information.id,
        readiness: information.readiness,
        x:
          (matrix ? matrix.matrix.e : 0) +
          box.x +
          box.width / 2,
        y:
          (matrix ? matrix.matrix.f : 0) +
          box.y +
          box.height / 2
      };
    } catch (error) {
      return null;
    }
  }

  function nearestNode(point, nodes) {
    let winner = null;
    let smallestDistance = Infinity;

    nodes.forEach(function compareNode(node) {
      const xDifference = point.x - node.x;
      const yDifference = point.y - node.y;
      const distance = Math.sqrt(
        xDifference * xDifference +
        yDifference * yDifference
      );

      if (distance < smallestDistance) {
        smallestDistance = distance;
        winner = node;
      }
    });

    return winner;
  }

  function getConnectionReadiness(from, to) {
    if (
      from.readiness.key === "red" &&
      to.readiness.key === "red"
    ) {
      return {
        key: "red",
        color: COLORS.red,
        rank: 5
      };
    }

    const nonEnergized = [
      from.readiness,
      to.readiness
    ]
      .filter(function excludeRed(readiness) {
        return readiness.key !== "red";
      })
      .sort(function lowestFirst(first, second) {
        return first.rank - second.rank;
      });

    return (
      nonEnergized[0] ||
      { key: "gray", color: COLORS.gray, rank: 0 }
    );
  }

  function decorateConnections(root, nodes) {
    root.querySelectorAll(".connection").forEach(
      function decorateConnection(path) {
        try {
          const length = path.getTotalLength();
          const from = nearestNode(
            path.getPointAtLength(0),
            nodes
          );
          const to = nearestNode(
            path.getPointAtLength(length),
            nodes
          );

          if (!from || !to) {
            return;
          }

          const readiness = getConnectionReadiness(from, to);
          const color = readiness.color;

          path.dataset.fromEquipmentId = from.id;
          path.dataset.toEquipmentId = to.id;
          path.dataset.readiness = readiness.key;
          path.style.setProperty("--nx-readiness-color", color);

          forceStyle(path, "stroke", color);
          forceStyle(path, "stroke-width", "4px");
          forceStyle(
            path,
            "filter",
            "drop-shadow(0 0 3px " + color + ") " +
            "drop-shadow(0 0 9px " + color + ")"
          );
        } catch (error) {
          // SVG geometry can be temporarily unavailable during redraw.
        }
      }
    );
  }

  function addLegend(root) {
    if (root.querySelector(".nx-readiness-legend")) {
      return;
    }

    const toolbar = root.querySelector(".canvas-toolbar");

    if (!toolbar || !toolbar.parentElement) {
      return;
    }

    const legend = document.createElement("details");
    legend.className = "nx-readiness-legend";
    legend.open = !window.matchMedia("(max-width: 800px)").matches;
    legend.setAttribute("aria-label", "Completion percentage color key");
    legend.innerHTML =
      '<summary><span>Completion color key</span>' +
      '<span class="nx-readiness-preview" aria-hidden="true">' +
      createLegendDot(COLORS.gray) +
      createLegendDot(COLORS.blue) +
      createLegendDot(COLORS.orange) +
      createLegendDot(COLORS.yellow) +
      createLegendDot(COLORS.green) +
      createLegendDot(COLORS.red) +
      "</span></summary>" +
      '<div class="nx-readiness-items">' +
      createLegendItem(COLORS.gray, "0% Not Started") +
      createLegendItem(COLORS.blue, "1-25%") +
      createLegendItem(COLORS.orange, "26-60%") +
      createLegendItem(COLORS.yellow, "61-99%") +
      createLegendItem(COLORS.green, "100% Ready") +
      createLegendItem(COLORS.red, "Energized (manual)") +
      "</div>";

    toolbar.parentElement.insertBefore(
      legend,
      toolbar.nextSibling
    );
  }

  function createLegendItem(color, label) {
    return (
      '<span class="nx-readiness-chip">' +
      '<i style="--chip-color:' + color + '"></i>' +
      label +
      "</span>"
    );
  }

  function createLegendDot(color) {
    return '<i style="--chip-color:' + color + '"></i>';
  }

  function applyFieldPresentation(root) {
    if (!root || !root.isConnected) {
      return;
    }

    root.classList.add("nexus-field-readiness");
    document.body.classList.add("nexus-field-readiness-page");

    addLegend(root);

    const nodes = Array.from(
      root.querySelectorAll(".node")
    )
      .map(getNodeGeometry)
      .filter(Boolean);

    decorateConnections(root, nodes);
  }

  function install(root) {
    if (
      !root ||
      root.dataset.readinessRendererFixInstalled === "1"
    ) {
      return;
    }

    root.dataset.readinessRendererFixInstalled = "1";

    let frameRequested = false;

    function queueApply() {
      if (frameRequested) {
        return;
      }

      frameRequested = true;

      window.requestAnimationFrame(function performApply() {
        frameRequested = false;
        applyFieldPresentation(root);
      });
    }

    const observer = new MutationObserver(queueApply);

    observer.observe(root, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ["class", "transform"]
    });

    queueApply();
  }

  function scanForHost() {
    if (!isFieldRequest()) {
      return;
    }

    const host = document.getElementById("oneLineWorkspaceHost");

    if (host) {
      install(host);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      scanForHost,
      { once: true }
    );
  } else {
    scanForHost();
  }

  const pageObserver = new MutationObserver(scanForHost);

  pageObserver.observe(document.documentElement, {
    childList: true,
    subtree: true
  });
})();
