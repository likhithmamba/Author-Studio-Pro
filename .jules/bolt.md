## 2025-02-20 - Memoization in Form Fields
**Learning:** React components containing numerous input fields linked to a unified state object can suffer from excessive re-rendering when one input changes, as every input is typically re-rendered by default, potentially impacting user experience.
**Action:** Memoize large components, static configurations or individual input field components with React.memo() to avoid unnecessary re-renders when their props don't change.

## 2025-02-21 - API Request Caching for Static Data
**Learning:** Frequent fetching of static backend data (like market metadata or rule-based assessments) during user interactions causes unnecessary network overhead and UI latency.
**Action:** Implement simple frontend memoization/caching (e.g. Map) in the API layer for endpoints that return deterministic, non-user-specific data based on arguments.

## 2025-03-20 - Suspense boundaries and AnimatePresence
**Learning:** Placing `<Suspense>` boundaries around Framer Motion's `<AnimatePresence>` can disrupt exit animations by unmounting the tree prematurely during a fallback. Wrapping `<AnimatePresence>` around `<Suspense>` allows the exit animations to play. Additionally, lazy loading child components within an already lazy-loaded route creates a network waterfall.
**Action:** When implementing code splitting for animations, place `<Suspense>` *inside* `<AnimatePresence>`. Focus lazy loading at the route level to avoid network waterfalls on initial render.
