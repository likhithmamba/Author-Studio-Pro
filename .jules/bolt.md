## 2025-02-20 - Memoization in Form Fields
**Learning:** React components containing numerous input fields linked to a unified state object can suffer from excessive re-rendering when one input changes, as every input is typically re-rendered by default, potentially impacting user experience.
**Action:** Memoize large components, static configurations or individual input field components with React.memo() to avoid unnecessary re-renders when their props don't change.

## 2025-02-21 - API Request Caching for Static Data
**Learning:** Frequent fetching of static backend data (like market metadata or rule-based assessments) during user interactions causes unnecessary network overhead and UI latency.
**Action:** Implement simple frontend memoization/caching (e.g. Map) in the API layer for endpoints that return deterministic, non-user-specific data based on arguments.

## 2025-03-11 - React.lazy Suspense with Framer Motion AnimatePresence
**Learning:** When adding `React.lazy()` and `<Suspense>` to a component wrapped in Framer Motion's `<AnimatePresence>` (e.g., for tab switching), placing the `<Suspense>` boundary *outside* the `<AnimatePresence>` causes exit animations to break. Framer Motion requires direct access to its children to orchestrate unmounting animations.
**Action:** Always place `<Suspense>` boundaries *inside* the `<AnimatePresence>` component (wrapping the individual lazy-loaded component directly) to preserve exit animations during chunk loading.
