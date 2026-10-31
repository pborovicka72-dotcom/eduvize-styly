# Shared OneDrive profiles

`configuration-profiles.js` and its layout stylesheet are loaded by `active-theme.js` only in an administration with an adapter or the central `#configurations` manager. Output pages have no profile UI or cloud writes.

Each administration registers `window.EduvizeProfileAdapter = {app, read, apply, ready?}` and dispatches `eduvize-profile-adapter-ready`. `read()` returns JSON `{schemaVersion:1, ...}` containing only explicit display/content preferences. Never include keys, passwords, usernames, access tokens, connection forms or Microsoft state. `apply()` restores the native controls and refreshes the existing previews. Use `EduvizeProfiles.fields([...explicitIds])`, `segment()` and `applySegment()` for standard forms. A failed load attempts to restore the previous local state, which can also be restored with the panel's Undo action.

Profiles are selected explicitly. Their opaque ID is carried as `edu-profile` in administration links; no credentials are put in URLs. The selected ID can be remembered locally. A selected profile's saved module settings load on opening its administration. Settings are saved only by an explicit cloud Save action. Existing native local-save actions retain their purpose.

The dedicated account page also owns sign-in and Microsoft connection. The application hub links to it. Legacy hub account/profile URLs redirect there, preserving profile and return parameters. The central manager on `ucet.html#configurations` creates and copies profiles, reports saved modules, opens each administration with the selected profile, and restores archived whole-profile versions. Older kiosk-only backups can be copied into a selected profile without deleting the old files. The local school-systems prototype is clearly marked as a local test; profile files do not transfer its school connection or publication permissions.

The Documents service stores profiles privately in `Eduvize-Dokumenty/_Eduvize-system/Profily`. Each module has its own optimistic revision; each profile has a total revision and archived previous snapshots. A PostgreSQL advisory transaction lock serializes read/archive/write across service workers. Different modules merge; stale writes to the same module return HTTP 409. A list refresh never silently adopts a newer revision for locally edited settings. Archive failure prevents the replacement write.

Profiles reuse the server's existing OneDrive connection. Central handoff grants `configurations` scope to other applications without granting access to document management. Existing root Document sessions also validate for profiles. The server rejects credentials, unsafe URL schemes, malformed JSON, oversize configurations, and unsafe style values. Profile APIs are authenticated and `no-store`.

Loading a stored style changes its editor draft/preview only. Saving or activating the global style still requires the normal style-management action. Document files and server catalog metadata remain on their existing OneDrive paths; a profile carries document output preferences, not duplicate document files.

Validation: `python -m unittest discover -s tests -v` in the Styles and Documents repositories. Browser fixture in the development workspace tests create → cross-origin administration → save → dirty state → reload → central status, without a real Microsoft account.

## Simplified active profile flow

The account page selects the single active profile for the root administration session. The session database stores only that opaque profile ID, shared by all child sessions; credentials and display settings are not added to session metadata. Re-authentication preserves the selection and logout revokes it with the root session. Only the root session on the account origin may change the selection.

Administrations show a read-only profile name and one shared **Uložit na OneDrive** action immediately before their native local-save button. They load the selected module settings on opening and save only on an explicit click. A save refreshes the session first; a different active profile or a stale module revision requires an explicit reload of settings before saving. The reload/undo controls appear only for recovery. The existing nonce-bound session draft preserves work across sign-in and OneDrive reconnection.

The account manager has profile selection, a collapsed new-profile form and a link to applications. Copying and backup restoration are under **Další možnosti**; backup selection is hidden when none exist. The legacy kiosk importer is removed from ordinary UI; old files and backend import endpoints remain intact.
