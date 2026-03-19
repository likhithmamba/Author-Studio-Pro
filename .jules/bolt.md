## 2025-02-20 - Memoization in Form Fields
**Learning:** React components containing numerous input fields linked to a unified state object can suffer from excessive re-rendering when one input changes, as every input is typically re-rendered by default, potentially impacting user experience.
**Action:** Memoize large components, static configurations or individual input field components with React.memo() to avoid unnecessary re-renders when their props don't change.

## 2025-02-21 - API Request Caching for Static Data
**Learning:** Frequent fetching of static backend data (like market metadata or rule-based assessments) during user interactions causes unnecessary network overhead and UI latency.
**Action:** Implement simple frontend memoization/caching (e.g. Map) in the API layer for endpoints that return deterministic, non-user-specific data based on arguments.

## 2025-10-24 - Route-Based Code Splitting in React
**Learning:** Monolithic React bundles increase initial load times, especially when users only need to access a single route (like a Landing Page) initially. Route components like `AppWorkspace` contain large tool suites that shouldn't block the initial render of the marketing site. Furthermore, when using Framer Motion's `<AnimatePresence>`, `<Suspense>` must wrap the routes directly, not individual components within `<AnimatePresence>`, to preserve unmount animations properly.
**Action:** Dynamically import top-level route components using `React.lazy()` and wrap `<Routes>` in a `<Suspense>` boundary to split the bundle based on routes.
