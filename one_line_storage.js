/**
 * FIREBASE_CUTOVER_REMOVE — ENTIRE FILE AFTER ACCEPTANCE
 * ------------------------------------------------------
 * Development-only localStorage backend. Keep it during migration and the
 * rollback window, then remove this file and its script tag after the host
 * Firebase adapter has passed cross-device acceptance tests.
 */
window.NexusOneLineStorage = (() => {
  "use strict";

  const PREFIX = "nexus-one-line-v4:";

  /**
   * STORAGE MIGRATION RULE
   * ----------------------
   * localStorage is the active backend during development.
   *
   * Do not add Firebase calls directly to this file. The future
   * one_line_firebase_adapter.js will replace the same public adapter
   * object after Firebase and authentication are initialized.
   *
   * Keeping the interface stable prevents the editor, dashboard
   * viewer, and QR viewer from requiring separate rewrites.
   */

  /**
   * Build a storage key.
   *
   * Supported:
   *
   * load("overall")
   *
   * load({
   *   projectId:"Ohio",
   *   buildingId:"A",
   *   diagramId:"overall"
   * })
   */
  function buildKey(input) {

    // Legacy support
    if (typeof input === "string") {
      return PREFIX + input;
    }

    input = input || {};

    const project =
      input.projectId || "default-project";

    const building =
      input.buildingId || "default-building";

    const diagram =
      input.diagramId || "overall";

    return `${PREFIX}${project}:${building}:${diagram}`;
  }

  function load(input) {
    try {

      const raw = localStorage.getItem(buildKey(input));

      if (!raw) return null;

      return JSON.parse(raw);

    } catch (err) {

      console.warn(
        "Diagram load failed",
        err
      );

      return null;
    }
  }

  function save(input, state) {

    // Legacy compatibility:
    //
    // save("overall",state)

    if (typeof input === "string") {

      localStorage.setItem(
        buildKey(input),
        JSON.stringify({
          ...state,
          updatedAt: new Date().toISOString()
        })
      );

      return true;
    }

    try {

      localStorage.setItem(
        buildKey(input),
        JSON.stringify({
          ...state,
          updatedAt: new Date().toISOString()
        })
      );

      return true;

    } catch (err) {

      console.warn(
        "Diagram save failed",
        err
      );

      return false;
    }
  }

  function clear(input) {
    localStorage.removeItem(buildKey(input));
  }

  /**
   * Subscribe to layout changes made in another browser tab on the
   * same device and origin.
   *
   * IMPORTANT:
   * localStorage does not synchronize across phones, tablets, or
   * computers. The production Firebase adapter must implement this
   * same subscribe(input, callback) contract for true real-time QR
   * viewer updates across devices.
   */
  function subscribe(input, callback) {
    if (typeof callback !== "function") {
      return function noopUnsubscribe() {};
    }

    const expectedKey = buildKey(input);

    const handler = function handleStorageEvent(event) {
      if (
        event.storageArea !== localStorage ||
        event.key !== expectedKey
      ) {
        return;
      }

      if (!event.newValue) {
        callback(null);
        return;
      }

      try {
        callback(JSON.parse(event.newValue));
      } catch (err) {
        console.warn(
          "Diagram subscription update failed",
          err
        );
      }
    };

    window.addEventListener("storage", handler);

    return function unsubscribe() {
      window.removeEventListener("storage", handler);
    };
  }

  function list() {

    const results = [];

    for (let i = 0; i < localStorage.length; i++) {

      const key = localStorage.key(i);

      if (
        key &&
        key.startsWith(PREFIX)
      ) {

        results.push(
          key.substring(PREFIX.length)
        );

      }

    }

    return results.sort();

  }

  function getBackendInfo() {
    return {
      type: "localStorage",
      crossDeviceRealtime: false,
      sameBrowserTabSubscription: true,
      prefix: PREFIX
    };
  }

  return {

    load,
    save,
    clear,
    list,
    subscribe,
    getBackendInfo

  };

})();
