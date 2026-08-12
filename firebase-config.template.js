/**
 * FIREBASE_CUTOVER_REMOVE — ENTIRE FILE IN HOST TOOL
 * --------------------------------------------------
 * Do not create a second Firebase initialization when this component is
 * embedded in the counterpart tool. Receive the host's initialized Firebase
 * app/database instead, then remove this template and its script tag.
 *
 * Copy to firebase-config.js during standalone Firebase deployment only.
 * Do not place service-account keys or Admin SDK secrets in browser code.
 * Firebase web configuration values are identifiers; Firestore rules and
 * Firebase Authentication provide the actual security boundary.
 */
window.NEXUS_ONE_LINE_USE_FIREBASE = false;
window.NEXUS_ONE_LINE_LOGIN_PAGE = "login.html";

window.NEXUS_FIREBASE_CONFIG = {
  apiKey: "REPLACE_FROM_EXISTING_NEXUS_CONFIG",
  authDomain: "REPLACE_FROM_EXISTING_NEXUS_CONFIG",
  projectId: "REPLACE_FROM_EXISTING_NEXUS_CONFIG",
  storageBucket: "REPLACE_FROM_EXISTING_NEXUS_CONFIG",
  messagingSenderId: "REPLACE_FROM_EXISTING_NEXUS_CONFIG",
  appId: "REPLACE_FROM_EXISTING_NEXUS_CONFIG"
};

/* Initialize only when the main NEXUS shell has not already done so. */
if (window.NEXUS_ONE_LINE_USE_FIREBASE === true && window.firebase) {
  if (!window.firebase.apps || window.firebase.apps.length === 0) {
    window.firebase.initializeApp(window.NEXUS_FIREBASE_CONFIG);
  }
}
