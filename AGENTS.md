# Eduvize output rules

- Kiosk content must reuse the Newline/NSP geometry and typography calculations for its actual available content viewport. Kiosk changes framing, navigation and interaction, not the content reading scale.
- Preserve the shared kiosk header and calculate layout in the remaining available space. Never recreate the NSP appearance using independent smaller fonts, fixed card heights or accumulated kiosk-only overrides.
- Keep repeated cards equal in height, including across rows, and use the whole available content area.
- Before shipping a kiosk style, compare NSP and kiosk at identical viewport sizes and verify computed text sizes, icons, spacing, complete content and equal card heights. Verify both orientations in the actual administration preview as well as the app output.
- Check long names, events, empty/hidden cards and the no-upcoming-days case. Preserve ordinary web document flow and existing NSP segment behavior.
- Increase the visible application version at the bottom right and asset versions when publishing changes.
