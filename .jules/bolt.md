## 2025-02-20 - Memoization in Form Fields
**Learning:** React components containing numerous input fields linked to a unified state object can suffer from excessive re-rendering when one input changes, as every input is typically re-rendered by default, potentially impacting user experience.
**Action:** Memoize large components, static configurations or individual input field components with React.memo() to avoid unnecessary re-renders when their props don't change.
## 2025-05-01 - O(N) Hash Maps for Arrays Deduplication
**Learning:** When processing large data arrays in React components (e.g., deduplication for state initialization), using nested array iterations (like `filter` inside `map`) creates an O(N²) bottleneck, causing severe main thread blocking for large lists.
**Action:** Use pre-computed O(N) hash maps to count or track occurrences first, then use a single pass to assign properties, drastically improving initialization time.
## 2025-05-02 - Pre-grouping and Loop Fusion for React Lists
**Learning:** Performing multiple `filter`, `map`, and `reduce` operations inside useMemo hooks or repeating `filter` operations inside JSX render loops (e.g., for Kanban columns) causes O(N * C) redundant work and allocates unnecessary intermediate arrays, leading to drag-and-drop jank and UI blocking in React.
**Action:** Consolidate array iterations into a single O(N) `for` loop (loop fusion) to calculate statistics, and pre-group items by category into a hash map to make render lookups O(1) instead of O(N).
