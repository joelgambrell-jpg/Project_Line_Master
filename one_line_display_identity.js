/**
 * NEXUS ONE-LINE DISPLAY IDENTITY
 * ===============================
 * Additive presentation layer for large office/VFM and QR field displays.
 *
 * FIELD HEADER CONTRACT
 * ---------------------
 * Field view shows only NEXUS, the building, the active overall/phase view,
 * and FIELD VIEW / READ ONLY. Existing Fit and zoom buttons are moved over
 * the canvas without replacing their handlers.
 */
(function initializeNexusOneLineDisplayIdentity() {
  "use strict";

  const PHASE_COLORS = [
    "#00f56a",
    "#1f7dff",
    "#ff7a00",
    "#b45cff",
    "#00e5ff",
    "#ff4fd8"
  ];

  function ensureCompactStylesheet() {
    if (document.querySelector('link[data-nexus-field-compact="1"]')) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "one_line_field_compact.css?v=4";
    link.dataset.nexusFieldCompact = "1";
    document.head.appendChild(link);
  }

  function parameters() {
    return new URLSearchParams(window.location.search);
  }

  function titleCase(value) {
    return String(value || "")
      .replace(/[-_]+/g, " ")
      .replace(/\b\w/g, function capitalize(letter) {
        return letter.toUpperCase();
      });
  }

  function isFieldView() {
    const params = parameters();
    return params.get("mode") === "view" &&
      (params.get("viewer") === "1" || params.get("presentation") === "field");
  }

  function buildIdentity() {
    const params = parameters();
    const buildingId = params.get("building") || "A";
    const diagramId = params.get("diagram") || "overall";
    return {
      buildingLabel: "BUILDING " + String(buildingId).toUpperCase(),
      diagramLabel: String(diagramId).toLowerCase() === "overall"
        ? "OVERALL"
        : titleCase(diagramId).toUpperCase()
    };
  }

  function addFieldBanner(root) {
    if (!isFieldView() || root.querySelector(".nx-display-identity")) return;
    const identity = buildIdentity();
    const banner = document.createElement("header");
    banner.className = "nx-display-identity";
    banner.setAttribute("aria-label", "Building and diagram identification");
    banner.innerHTML = [
      '<div class="nx-display-brand" aria-label="NEXUS"><span class="nx-brand-ne">NE</span><span class="nx-brand-x">X</span><span class="nx-brand-us">US</span></div>',
      '<div class="nx-display-building">',
      '<strong>' + identity.buildingLabel + "</strong>",
      '<i aria-hidden="true"></i>',
      '<span>' + identity.diagramLabel + "</span>",
      "</div>",
      '<div class="nx-display-state"><strong>FIELD VIEW</strong><span>READ ONLY</span></div>'
    ].join("");
    root.insertBefore(banner, root.firstChild);
  }

  function moveFieldControls(root) {
    if (!isFieldView() || root.querySelector(".nx-field-floating-controls")) return;
    const buttons = [
      root.querySelector('[data-action="fit"]'),
      root.querySelector('[data-action="zoom-out"]'),
      root.querySelector('[data-action="zoom-in"]')
    ].filter(Boolean);
    if (!buttons.length) return;
    const controls = document.createElement("div");
    controls.className = "nx-field-floating-controls";
    controls.setAttribute("aria-label", "Diagram zoom controls");
    buttons.forEach(function moveButton(button) {
      controls.appendChild(button);
    });
    root.appendChild(controls);
  }

  function hideLegacyViewerTitle(root) {
    if (!isFieldView()) return;
    root.querySelectorAll("h1,h2,h3,div,span,p").forEach(function inspect(element) {
      if (element.closest(".nx-display-identity")) return;
      if (element.childElementCount !== 0) return;
      const text = String(element.textContent || "").trim();
      if (/^One-Line Diagram\b/i.test(text)) {
        element.classList.add("nx-field-legacy-title-hidden");
        const parent = element.parentElement;
        if (parent && parent !== root && parent.children.length === 1) {
          parent.classList.add("nx-field-legacy-title-row-hidden");
        }
      }
    });
  }

  function phaseNumber(text) {
    const match = String(text || "").match(/PHASE\s*(\d+)/i);
    return match ? Number(match[1]) : null;
  }

  function decoratePhaseZones(root) {
    root.querySelectorAll(".zone").forEach(function decorateZone(group) {
      const text = group.querySelector("text");
      const rect = group.querySelector("rect");
      const label = text ? String(text.textContent || "").trim() : "";
      const number = phaseNumber(label);
      const color = number
        ? PHASE_COLORS[(number - 1) % PHASE_COLORS.length]
        : "#b8c2ce";
      group.dataset.phaseZone = number ? String(number) : "other";
      group.style.setProperty("--nx-phase-color", color);
      if (rect) rect.style.setProperty("--nx-phase-color", color);
      if (text) text.style.setProperty("--nx-phase-color", color);
    });
  }

  function refresh(root) {
    addFieldBanner(root);
    moveFieldControls(root);
    hideLegacyViewerTitle(root);
    decoratePhaseZones(root);
  }

  function install(root) {
    if (!root || root.dataset.displayIdentityInstalled === "1") return;
    root.dataset.displayIdentityInstalled = "1";
    refresh(root);
    let queued = false;
    const observer = new MutationObserver(function handleMutation() {
      if (queued) return;
      queued = true;
      window.requestAnimationFrame(function refreshIdentity() {
        queued = false;
        refresh(root);
      });
    });
    observer.observe(root, {
      childList: true,
      subtree: true,
      characterData: true
    });
  }

  function scan() {
    document.querySelectorAll(".nexus-one-line").forEach(install);
  }

  ensureCompactStylesheet();
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", scan, { once: true });
  } else {
    scan();
  }
  const pageObserver = new MutationObserver(scan);
  pageObserver.observe(document.documentElement, { childList: true, subtree: true });
})();
