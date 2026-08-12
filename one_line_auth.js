/**
 * FIREBASE_CUTOVER_REMOVE — ENTIRE FILE IN HOST TOOL
 * --------------------------------------------------
 * The counterpart host already owns authentication, authorization, project
 * membership, login routing, and return URLs. Remove this standalone gate and
 * its script tag when the host integration supplies the current session.
 *
 * NEXUS One-Line Authentication Gate
 *
 * Local development remains enabled by default. Set
 * window.NEXUS_ONE_LINE_USE_FIREBASE = true only after the host NEXUS
 * Firebase app has initialized Firebase Auth and Firestore.
 *
 * The QR URL never contains a credential. A signed-out user is sent to
 * the normal NEXUS login page and returned to the requested diagram.
 */
(function initializeNexusOneLineAuth() {
  "use strict";

  const defaultLoginPage = "login.html";

  function getAuth() {
    if (!window.firebase || typeof window.firebase.auth !== "function") {
      return null;
    }
    return window.firebase.auth();
  }

  function redirectToLogin() {
    const loginPage = window.NEXUS_ONE_LINE_LOGIN_PAGE || defaultLoginPage;
    const returnUrl = encodeURIComponent(window.location.href);
    window.location.replace(loginPage + "?returnUrl=" + returnUrl);
  }

  function waitForUser() {
    if (window.NEXUS_ONE_LINE_USE_FIREBASE !== true) {
      return Promise.resolve({
        authenticated: false,
        localDevelopment: true,
        user: null,
        claims: {}
      });
    }

    const auth = getAuth();
    if (!auth) {
      return Promise.reject(new Error(
        "Firebase mode is enabled, but Firebase Auth is not initialized."
      ));
    }

    return new Promise(function(resolve, reject) {
      const unsubscribe = auth.onAuthStateChanged(async function(user) {
        unsubscribe();
        if (!user) {
          redirectToLogin();
          return;
        }
        try {
          const token = await user.getIdTokenResult();
          resolve({
            authenticated: true,
            localDevelopment: false,
            user,
            claims: token.claims || {}
          });
        } catch (error) {
          reject(error);
        }
      }, reject);
    });
  }

  function canEdit(session) {
    if (!session || session.localDevelopment) return true;
    const claims = session.claims || {};
    return claims.admin === true ||
      claims.engineer === true ||
      claims.oneLineEditor === true;
  }

  window.NexusOneLineAuth = { waitForUser, canEdit, redirectToLogin };
})();
