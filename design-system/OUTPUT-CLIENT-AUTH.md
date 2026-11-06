# Scoped output client behind the main-login perimeter

Published snapshot, theme, live data, item detail and item bitmap GETs use Fetch `credentials: 'same-origin'`. The browser may send an existing same-origin HttpOnly login cookie to the access gateway. No login cookie, browser session, localStorage or administrator token is read by the client to select an output, school, profile, configuration or style. Output identity remains the scoped ID and the server registry. Cross-origin cookie mode `include` is never used.

Private API operations still require the explicit getAuthorization Bearer provider and use `credentials: 'omit'`. Cookie presence is not a substitute for private API authorization. Existing origin validation, redirect rejection, no-store, signals and deadlines remain.

The gateway must return HTTP401 for denied API requests, including GET, instead of redirecting the API to a login HTML page. Navigation to ordinary pages may retain its303 login redirect. The client preserves HTTP denial status when its body is empty, non-JSON or null; it does not expose the raw body. Bitmap errors are never returned as usable Blob data.

The shared runtime treats401 like403/404/410: abort the render generation, clear content and stop. Late work from that generation must not restore content. Transient outage recovery remains separate and may restart the same published revision, but terminal denial cannot revive a stopped instance.

Security review and strategic coordination approved this narrow contract on6Nov2026. This source change does not change gateway configuration or authorize production deployment. Server must review the TEST-host-only API401 behavior while preserving the login perimeter, school ownership and production controls. Browser E2E and Render-blocked cold-start acceptance apply only to the subsequently deployed concrete release.
