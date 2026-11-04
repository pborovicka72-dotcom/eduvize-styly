# Administration access

Style management is available to schools, including direct links. Previewing styles does not grant permission to publish shared theme or logo changes; those writes still require an Eduvize operator.

License management remains operator-only: a validated session with the `styles` scope and no `schoolId`. Its complete card is hidden from other accounts. `licence.html` is an access gate, and its page body is served from `private/licence.html` only after server authorization. Never publish the `private/` directory to GitHub Pages.

The legacy `/api/design-system/operator-pages/styles` route remains available for cached style entry points. `/api/design-system/operator-pages/licenses` remains protected and uses `Cache-Control: no-store`. Public theme and branding reads continue to support application outputs. Administration tokens must never appear in page URLs.
