## 2025-02-20 - Memoization in Form Fields
**Learning:** React components containing numerous input fields linked to a unified state object can suffer from excessive re-rendering when one input changes, as every input is typically re-rendered by default, potentially impacting user experience.
**Action:** Memoize large components, static configurations or individual input field components with React.memo() to avoid unnecessary re-renders when their props don't change.
## 2025-05-01 - O(N) Hash Maps for Arrays Deduplication
**Learning:** When processing large data arrays in React components (e.g., deduplication for state initialization), using nested array iterations (like `filter` inside `map`) creates an O(N²) bottleneck, causing severe main thread blocking for large lists.
**Action:** Use pre-computed O(N) hash maps to count or track occurrences first, then use a single pass to assign properties, drastically improving initialization time.
## 2025-05-09 - O(N) Hash Maps for Arrays in Canvas Components
**Learning:** When drawing visual connections between elements (like edges/lines between cards) using SVG or canvas, calling `.find()` for both the source and target on every element in a map iteration creates an O(N*M) time complexity. This blocks the main thread during render.
**Action:** Use `useMemo` to pre-calculate an O(1) lookup map (like `cardsById`) using a single pass, then refer to it during the `.map()` loop, making the rendering process O(N).
