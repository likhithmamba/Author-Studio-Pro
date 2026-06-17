## 2025-02-20 - Memoization in Form Fields
**Learning:** React components containing numerous input fields linked to a unified state object can suffer from excessive re-rendering when one input changes, as every input is typically re-rendered by default, potentially impacting user experience.
**Action:** Memoize large components, static configurations or individual input field components with React.memo() to avoid unnecessary re-renders when their props don't change.
## 2025-05-01 - O(N) Hash Maps for Arrays Deduplication
**Learning:** When processing large data arrays in React components (e.g., deduplication for state initialization), using nested array iterations (like `filter` inside `map`) creates an O(N²) bottleneck, causing severe main thread blocking for large lists.
**Action:** Use pre-computed O(N) hash maps to count or track occurrences first, then use a single pass to assign properties, drastically improving initialization time.
## 2025-05-07 - Pre-Grouping Loop Fusion for Drag-and-Drop UIs
**Learning:** React components containing drag-and-drop elements that rely on `array.filter().map()` inside a component render loop experience janky dragging behaviors on large lists due to redundant array passes per rendered column.
**Action:** Use `useMemo` to construct a pre-grouped dictionary (`group[col.id]`) in a single pass O(N) rather than repeatedly filtering inline (O(C*N)). This ensures that renders remain light and do not block the UI thread during drag events.
