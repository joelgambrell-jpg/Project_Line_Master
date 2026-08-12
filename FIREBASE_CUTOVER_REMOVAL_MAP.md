# Firebase Cutover Removal Map

Search token: `FIREBASE_CUTOVER_REMOVE`

These markers identify standalone-development code that becomes unnecessary
when the one-line component is mounted inside the counterpart host tool. Do not
remove marked code before the host adapter is working and local data has been
migrated and verified.

## Remove at host integration

- `firebase-config.template.js` — do not initialize a second Firebase app.
  Receive the initialized app/database from the host.
- `one_line_auth.js` — the host owns login, session, permissions, membership,
  and return routing.
- `firestore.rules.template` — do not deploy a parallel ruleset. Merge any
  required document paths into the host's canonical rules, then remove this
  template.
- The matching standalone script tags and startup references in
  `one_line_diagram.html`.

## Replace, then remove the old path

- `one_line_firebase_adapter.template.js` — replace with an adapter wired to
  the host's actual SDK instance, equipment paths, field names, and queries.
- Energized-state localStorage in `one_line_readiness.js` — replace with the
  host energization load/save/subscription contract.
- Same-device energized `storage` event listener — replace with the host's
  realtime subscription.
- Legacy diagramId-only load/save calls in `one_line_diagram.js` — delete once
  all adapters use `{ projectId, buildingId, diagramId }`.
- Polling fallback in `one_line_diagram.js` — delete when the host adapter
  always supplies realtime subscriptions.
- Sample equipment and Ohio demonstration layouts — delete after the host
  always supplies equipment and the database supplies layouts. An absent
  production layout should render an explicit empty state.

## Retain through migration and rollback

- `one_line_storage.js` and its script tag.
- Existing local layout keys under `nexus-one-line-v4:`.
- Existing local energized keys under
  `nexus-one-line-energized-v1:`.

Remove these only after:

1. Authoritative local layouts and energized records are exported.
2. Migration to the host database is verified.
3. Editor-to-viewer realtime behavior passes on separate devices.
4. The agreed rollback window has ended.

## Keep

Do not remove the renderer, editor/viewer mode separation, readiness colors,
QR route parameters, diagram layout schema, equipment/layout ownership
separation, live subscription hooks, or unsubscription cleanup. Those remain
part of the host-integrated component.
