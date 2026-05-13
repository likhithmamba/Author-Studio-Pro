## 2025-02-20 - Memoization in Form Fields
**Learning:** React components containing numerous input fields linked to a unified state object can suffer from excessive re-rendering when one input changes, as every input is typically re-rendered by default, potentially impacting user experience.
**Action:** Memoize large components, static configurations or individual input field components with React.memo() to avoid unnecessary re-renders when their props don't change.
## 2025-05-01 - O(N) Hash Maps for Arrays Deduplication
**Learning:** When processing large data arrays in React components (e.g., deduplication for state initialization), using nested array iterations (like `filter` inside `map`) creates an O(N²) bottleneck, causing severe main thread blocking for large lists.
**Action:** Use pre-computed O(N) hash maps to count or track occurrences first, then use a single pass to assign properties, drastically improving initialization time.
## 2025-10-24 - O(N*M) bottlenecks in nested render loops with Array.find
**Learning:** When a component renders frequently (e.g. during pan or zoom events in an interactive canvas), using `Array.find` inside a loop (like `.map`) to match relationships creates an `O(N*M)` complexity that severely degrades framerate.
**Action:** Pre-calculate an O(1) lookup dictionary or Map using `useMemo` based on the array items' IDs, then use object lookup instead of `Array.find` within the render loop to maintain stable performance.
