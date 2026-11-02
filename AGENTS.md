# Eduvize output rules

- Kiosk content must reuse the Newline/NSP geometry and typography calculations for its actual available content viewport. Kiosk changes framing, navigation and interaction, not the content reading scale.
- Preserve the shared kiosk header and calculate layout in the remaining available space. Never recreate the NSP appearance using independent smaller fonts, fixed card heights or accumulated kiosk-only overrides.
- Keep repeated cards equal in height, including across rows, and use the whole available content area.
- Before shipping a kiosk style, compare NSP and kiosk at identical viewport sizes and verify computed text sizes, icons, spacing, complete content and equal card heights. Verify both orientations in the actual administration preview as well as the app output.
- Check long names, events, empty/hidden cards and the no-upcoming-days case. Preserve ordinary web document flow and existing NSP segment behavior.
- Keep release versions only in diagnostics and asset URLs; never render release numbers in application or administration UI. Refresh asset versions when publishing changes.

- In NSP and kiosk long horizontal strips (aspect ratio >= 2.7) and small tiles (width <= 1200px and height <= 720px), hide secondary source details. Mark provenance/work/source metadata with `data-edu-source-details`. Keep authors, primary content and pagination/touch controls visible. Tall portrait columns and ordinary web pages retain source metadata.

- All administration output action rows use this order: Save to OneDrive, Save in browser, Copy link, Open output. Preserve native handlers when moving controls. Keep server style publishing, backups and destructive actions separate from these four actions. Local saving must remain available without a Microsoft connection.

- Weather station layouts in NSP must use the canonical `EduvizeNSPLayouts.kioskAllowed` predicate, shared with kiosk administration. Disable unsupported segments in the picker and enforce the same rule on direct output URLs.

- Keep school application cards in application management sorted by their visible Czech names using Czech alphabetical order (locale cs). Insert every new application at its alphabetical position. Keep central management (styles and kiosk) separate from school applications.
