# Eduvize output rules

- Kiosk uses the shared geometry and semantic text roles for its actual available content viewport. For nearby touch reading use `EduvizeSegmentProfile.kiosk`, `header(geometry,'kiosk')` and `text(geometry,'kiosk')` in every application. The kiosk reading scale is bounded (body 24–40px, header 88–160px), independent of item count or empty space. NSP and ordinary web keep their existing scales. This supersedes the earlier requirement for identical NSP/kiosk physical font sizes.
- Preserve the shared kiosk header and calculate layout in the remaining available space. Bind application roles to the common kiosk metrics; do not add independent per-app font scales or enlarge short quotations, clocks, icons or cards just to fill the display. Fitters may reduce overflowing content, never enlarge it beyond its semantic role.
- Keep repeated cards equal in height, including across rows. Kiosk cards may use their natural height and leave unused space when content is sparse. Photos, charts and timetable matrices may use available area without enlarging their text.
- Before shipping a kiosk style, compare applications at identical kiosk viewport sizes and verify shared role sizes, icons, spacing, complete content and equal repeated-card heights. Separately verify NSP/web regressions. Verify both orientations in the actual administration preview as well as the app output.
- Check long names, events, empty/hidden cards and the no-upcoming-days case. Preserve ordinary web document flow and existing NSP segment behavior.
- Keep release versions only in diagnostics and asset URLs; never render release numbers in application or administration UI. Refresh asset versions when publishing changes.

- In NSP and kiosk long horizontal strips (aspect ratio >= 2.7) and small tiles (width <= 1200px and height <= 720px), hide secondary source details. Mark provenance/work/source metadata with `data-edu-source-details`. Keep authors, primary content and pagination/touch controls visible. Tall portrait columns and ordinary web pages retain source metadata.

- All administration output action rows use this order: Save to OneDrive, Save in browser, Copy link, Open output. Preserve native handlers when moving controls. Keep server style publishing, backups and destructive actions separate from these four actions. Local saving must remain available without a Microsoft connection.

- Weather station layouts in NSP must use the canonical `EduvizeNSPLayouts.kioskAllowed` predicate, shared with kiosk administration. Disable unsupported segments in the picker and enforce the same rule on direct output URLs.

- Keep school application cards in application management sorted by their visible Czech names using Czech alphabetical order (locale cs). Insert every new application at its alphabetical position. Keep central management (styles and kiosk) separate from school applications.

- Treat published output URLs as a stable public API. Preserve historical routes, aliases, omitted-parameter defaults and unknown content parameters. Read LINK_COMPATIBILITY.md before changing URL parsing, generation or configuration schemas. Version application releases independently of the link schema; do not force schools to replace links for routine updates. Add legacy URL regression cases and a precise administration notice before any incompatible change. Never show migration notices on public output screens or automatically rewrite school links.

- Always preserve vertical spacing between explanatory text, forms, fields, action rows and status/help text. Use the shared administration flow (20px between blocks, 12px for related hints); never let zero-margin hints touch the next form or the preceding button. Keep spacing inside compact list rows separate from form spacing and verify both desktop and mobile layouts.

- Ordinary navigation between Eduvize apps, administration pages and output pages must use the current tab. Use links with target=_self or location.assign; never pre-open an about:blank tab for asynchronous output preparation. Keep downloads and provider authentication flows functional. Verify both anchors and scripted navigation without increasing browser tab count.
