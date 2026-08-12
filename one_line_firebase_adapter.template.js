/**
 * FIREBASE_CUTOVER_REPLACE — DO NOT ENABLE THIS TEMPLATE UNCHANGED
 * ---------------------------------------------------------------
 * Replace its internal paths, SDK calls, equipment query, and app lookup with
 * the counterpart host tool's actual Firebase integration. After the host
 * adapter is implemented and accepted, remove this template from production.
 *
 * ================================================================
 * NEXUS ONE-LINE FIREBASE ADAPTER TEMPLATE
 * FILE: one_line_firebase_adapter.template.js
 * ================================================================
 *
 * STATUS
 * ------
 * This file is intentionally NOT loaded by one_line_diagram.html.
 * The active project continues to use one_line_storage.js and
 * localStorage until the NEXUS Firebase migration is approved.
 *
 * FUTURE ENABLEMENT
 * -----------------
 * 1. Confirm the host NEXUS page has initialized Firebase and the
 *    signed-in user has access to the active project.
 * 2. Copy or rename this file to one_line_firebase_adapter.js.
 * 3. Set window.NEXUS_ONE_LINE_USE_FIREBASE = true before loading it.
 * 4. Load this file AFTER Firebase initialization and AFTER
 *    one_line_storage.js, but BEFORE one_line_diagram.js.
 *
 * This adapter deliberately replaces only the public interfaces:
 *
 *   window.NexusOneLineStorage
 *   window.NexusOneLineDataSource
 *
 * The diagram renderer and dashboard integration do not need to be
 * rebuilt when storage moves from localStorage to Firebase.
 *
 * FIREBASE API EXPECTATION
 * ------------------------
 * This template uses the Firebase Web SDK compatibility API:
 *
 *   window.firebase.firestore()
 *
 * If the main NEXUS application uses the modular SDK, retain the
 * public adapter methods below and replace only the internal Firebase
 * calls with getDoc, setDoc, onSnapshot, collection, query, and where.
 *
 * DATA OWNERSHIP
 * --------------
 * Diagram documents store layout only. Equipment documents remain
 * owned by the dashboard/project equipment registry.
 */
(function initializeNexusOneLineFirebaseAdapter() {
  "use strict";

  if (window.NEXUS_ONE_LINE_USE_FIREBASE !== true) {
    console.info(
      "[NEXUS One-Line] Firebase adapter is disabled; localStorage remains active."
    );
    return;
  }

  if (!window.firebase || typeof window.firebase.firestore !== "function") {
    console.error(
      "[NEXUS One-Line] Firebase adapter requested, but Firebase Firestore is not initialized."
    );
    return;
  }

  const db = window.firebase.firestore();

  function getLayoutDocument(context) {
    const safe = normalizeContext(context);

    return db
      .collection("projects")
      .doc(safe.projectId)
      .collection("buildings")
      .doc(safe.buildingId)
      .collection("oneLineDiagrams")
      .doc(safe.diagramId);
  }

  function getEquipmentCollection(context) {
    const safe = normalizeContext(context);

    return db
      .collection("projects")
      .doc(safe.projectId)
      .collection("equipment");
  }

  function normalizeContext(context) {
    const supplied = context || {};

    return {
      projectId: String(supplied.projectId || "default-project"),
      buildingId: String(supplied.buildingId || "default-building"),
      diagramId: String(supplied.diagramId || "overall")
    };
  }

  function normalizeEquipmentSnapshot(snapshot, context) {
    const safe = normalizeContext(context);

    return snapshot.docs
      .map(function mapEquipmentDocument(documentSnapshot) {
        return {
          equipmentId: documentSnapshot.id,
          ...documentSnapshot.data()
        };
      })
      .filter(function filterBuilding(item) {
        const equipmentBuilding =
          item.buildingId !== undefined
            ? item.buildingId
            : item.building;

        return (
          equipmentBuilding === undefined ||
          String(equipmentBuilding) === safe.buildingId
        );
      });
  }

  const firebaseLayoutStorage = {
    async load(context) {
      const snapshot = await getLayoutDocument(context).get();

      if (!snapshot.exists) {
        return null;
      }

      const data = snapshot.data() || {};
      return data.layout || null;
    },

    async save(context, layout) {
      const safe = normalizeContext(context);

      await getLayoutDocument(safe).set(
        {
          projectId: safe.projectId,
          buildingId: safe.buildingId,
          diagramId: safe.diagramId,
          layout,
          schemaVersion: 1,
          updatedAt:
            window.firebase.firestore.FieldValue.serverTimestamp(),
          updatedBy:
            window.firebase.auth && window.firebase.auth().currentUser
              ? window.firebase.auth().currentUser.uid
              : null
        },
        { merge: true }
      );
    },

    subscribe(context, callback) {
      return getLayoutDocument(context).onSnapshot(
        function handleLayoutSnapshot(snapshot) {
          if (!snapshot.exists) {
            callback(null);
            return;
          }

          const data = snapshot.data() || {};
          callback(data.layout || null);
        },
        function handleLayoutSubscriptionError(error) {
          console.error(
            "[NEXUS One-Line] Firebase layout subscription failed:",
            error
          );
        }
      );
    }
  };

  const firebaseEquipmentDataSource = {
    async getEquipment(context) {
      const snapshot = await getEquipmentCollection(context).get();
      return normalizeEquipmentSnapshot(snapshot, context);
    },

    subscribeEquipment(context, callback) {
      return getEquipmentCollection(context).onSnapshot(
        function handleEquipmentSnapshot(snapshot) {
          callback(normalizeEquipmentSnapshot(snapshot, context));
        },
        function handleEquipmentSubscriptionError(error) {
          console.error(
            "[NEXUS One-Line] Firebase equipment subscription failed:",
            error
          );
        }
      );
    }
  };

  firebaseLayoutStorage.getBackendInfo = function getBackendInfo() {
    return { backend: "firebase-firestore", realtime: true, enabled: true };
  };

  window.NexusOneLineStorage = firebaseLayoutStorage;
  window.NexusOneLineDataSource = firebaseEquipmentDataSource;

  console.info(
    "[NEXUS One-Line] Firebase adapter enabled."
  );
})();
