## 2025-02-20 - Memoization in Form Fields
**Learning:** React components containing numerous input fields linked to a unified state object can suffer from excessive re-rendering when one input changes, as every input is typically re-rendered by default, potentially impacting user experience.
**Action:** Memoize large components, static configurations or individual input field components with React.memo() to avoid unnecessary re-renders when their props don't change.

## 2025-02-21 - API Request Caching for Static Data
**Learning:** Frequent fetching of static backend data (like market metadata or rule-based assessments) during user interactions causes unnecessary network overhead and UI latency.
**Action:** Implement simple frontend memoization/caching (e.g. Map) in the API layer for endpoints that return deterministic, non-user-specific data based on arguments.
