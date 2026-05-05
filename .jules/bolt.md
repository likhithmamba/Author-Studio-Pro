## 2025-02-20 - Memoization in Form Fields
**Learning:** React components containing numerous input fields linked to a unified state object can suffer from excessive re-rendering when one input changes, as every input is typically re-rendered by default, potentially impacting user experience.
**Action:** Memoize large components, static configurations or individual input field components with React.memo() to avoid unnecessary re-renders when their props don't change.
## 2025-05-01 - O(N) Hash Maps for Arrays Deduplication
**Learning:** When processing large data arrays in React components (e.g., deduplication for state initialization), using nested array iterations (like `filter` inside `map`) creates an O(N²) bottleneck, causing severe main thread blocking for large lists.
**Action:** Use pre-computed O(N) hash maps to count or track occurrences first, then use a single pass to assign properties, drastically improving initialization time.
## 2025-05-05 - Loop Fusion and Render Loop Optimization
**Learning:** Repeatedly iterating through an array (`filter`) inside a React component's JSX render loop across multiple columns/categories causes O(C * N) performance scaling, leading to UI jank when updating status fields on large lists.
**Action:** Use loop fusion to combine multiple array aggregations into a single pass, and group items into dictionaries via `useMemo` so render loops only perform O(1) lookups per column instead of full array filtering.
