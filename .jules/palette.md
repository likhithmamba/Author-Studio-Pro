
## 2024-05-01 - Add ARIA Labels to Empty Icon/Swatch Buttons
**Learning:** Empty `<button>` elements distinguished only by icon SVGs or background colors (e.g., color-swatch pickers and zoom controls) are completely opaque to screen readers without explicit `aria-label`s.
**Action:** Always ensure that icon-only interactive controls and visually-implied option buttons (like color pickers) have descriptive `aria-label` attributes and, when appropriate, hover `title`s to match.
