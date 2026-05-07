
## 2024-05-01 - Add ARIA Labels to Empty Icon/Swatch Buttons
**Learning:** Empty `<button>` elements distinguished only by icon SVGs or background colors (e.g., color-swatch pickers and zoom controls) are completely opaque to screen readers without explicit `aria-label`s.
**Action:** Always ensure that icon-only interactive controls and visually-implied option buttons (like color pickers) have descriptive `aria-label` attributes and, when appropriate, hover `title`s to match.

## 2024-05-01 - ARIA Labels for Buttons with Visual Characters
**Learning:** Buttons that only contain visual text characters intended to act as icons (e.g., `‹`, `›`, or emojis) are not descriptive to screen readers and lack helpful context for mouse users.
**Action:** Always provide explicit `aria-label` and `title` attributes on these buttons to ensure screen readers announce their function correctly and visual tooltips are available on hover. Ensure tab navigation mappings use correct `role="tab"` and `aria-selected` attributes.
