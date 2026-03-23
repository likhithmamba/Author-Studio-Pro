## 2025-02-20 - Memoization in Form Fields
**Learning:** React components containing numerous input fields linked to a unified state object can suffer from excessive re-rendering when one input changes, as every input is typically re-rendered by default, potentially impacting user experience.
**Action:** Memoize large components, static configurations or individual input field components with React.memo() to avoid unnecessary re-renders when their props don't change.

## 2025-02-21 - API Request Caching for Static Data
**Learning:** Frequent fetching of static backend data (like market metadata or rule-based assessments) during user interactions causes unnecessary network overhead and UI latency.
**Action:** Implement simple frontend memoization/caching (e.g. Map) in the API layer for endpoints that return deterministic, non-user-specific data based on arguments.

## 2024-03-23 - Code Splitting React Components with Framer Motion
**Learning:** When using React.lazy() and <Suspense> for route-based code splitting, placing <Suspense> inside Framer Motion's <AnimatePresence> causes exit animations to break. Because <Suspense> is not a recognized motion component, it instantly unmounts when the conditional becomes false, skipping the animation of the child component.
**Action:** Always place the <Suspense> wrapper OUTSIDE of <AnimatePresence> when lazily loading conditionally rendered components that require exit animations.
