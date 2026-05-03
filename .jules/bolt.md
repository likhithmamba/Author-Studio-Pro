## 2025-02-20 - Memoization in Form Fields
**Learning:** React components containing numerous input fields linked to a unified state object can suffer from excessive re-rendering when one input changes, as every input is typically re-rendered by default, potentially impacting user experience.
**Action:** Memoize large components, static configurations or individual input field components with React.memo() to avoid unnecessary re-renders when their props don't change.
## 2025-05-01 - O(N) Hash Maps for Arrays Deduplication
**Learning:** When processing large data arrays in React components (e.g., deduplication for state initialization), using nested array iterations (like `filter` inside `map`) creates an O(N²) bottleneck, causing severe main thread blocking for large lists.
**Action:** Use pre-computed O(N) hash maps to count or track occurrences first, then use a single pass to assign properties, drastically improving initialization time.
## 2026-05-03 - Submission Tab Render Optimization
**Learning:** In complex React dashboards that display categorized lists (like Kanban boards), computing multiple `.filter()` operations across the entire dataset inside the map function for columns results in (C \times N)$ time complexity on every render, leading to significant UI jank during interactions like drag-and-drop.
**Action:** Consolidate array aggregations and filtering into a single (N)$ loop inside a `useMemo` hook, grouping the data into a dictionary keyed by category. This replaces inline filtering with (1)$ property lookups during render.
