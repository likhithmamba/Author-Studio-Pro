## 2025-02-20 - Memoization in Form Fields
**Learning:** React components containing numerous input fields linked to a unified state object can suffer from excessive re-rendering when one input changes, as every input is typically re-rendered by default, potentially impacting user experience.
**Action:** Memoize large components, static configurations or individual input field components with React.memo() to avoid unnecessary re-renders when their props don't change.
## 2025-05-01 - O(N) Hash Maps for Arrays Deduplication
**Learning:** When processing large data arrays in React components (e.g., deduplication for state initialization), using nested array iterations (like `filter` inside `map`) creates an O(N²) bottleneck, causing severe main thread blocking for large lists.
**Action:** Use pre-computed O(N) hash maps to count or track occurrences first, then use a single pass to assign properties, drastically improving initialization time.
## 2025-05-15 - useMemo Dependency Traps in O(N) Hash Maps
**Learning:** When using `useMemo` to pre-calculate grouped O(N) hash maps to replace multiple array `filter()` calls during render, passing locally-scoped config arrays (e.g. `const columns = [...]`) into the dependency array will cause the memoization to fail because the local array reference changes on every render.
**Action:** When implementing O(1) lookups via `useMemo`, strictly ensure that static lookup arrays are defined OUTSIDE the component or memoized themselves (e.g. `const columns = React.useMemo(() => [...], [])`) to preserve referential equality and guarantee the optimization works.
