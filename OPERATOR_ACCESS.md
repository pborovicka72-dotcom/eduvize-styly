# Operator-only administration

Style and license management are available only to a verified Eduvize operator: a valid administration session with the `styles` scope and no `schoolId`.

- Application management hides the entire operator cards by default and reveals them only after session validation.
- `editor.html` and `licence.html` are public access gates, without editor or license form bodies.
- Page bodies live under `private/`, which must never be copied to GitHub Pages. The existing Pages workflow copies an explicit list of public files and directories.
- `/api/design-system/operator-pages/styles` and `/licenses` require server-side operator authorization and use `Cache-Control: no-store`.
- Public theme and branding reads remain available to application outputs. All administrative writes retain server-side authorization.
- Never put an administration token into a page URL, query parameter or fragment. Cross-origin session transfer uses the existing one-time handoff.
