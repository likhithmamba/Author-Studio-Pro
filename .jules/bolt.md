## 2025-02-20 - Memoization in Form Fields
**Learning:** React components containing numerous input fields linked to a unified state object can suffer from excessive re-rendering when one input changes, as every input is typically re-rendered by default, potentially impacting user experience.
**Action:** Memoize large components, static configurations or individual input field components with React.memo() to avoid unnecessary re-renders when their props don't change.

## 2025-02-21 - API Request Caching for Static Data
**Learning:** Frequent fetching of static backend data (like market metadata or rule-based assessments) during user interactions causes unnecessary network overhead and UI latency.
**Action:** Implement simple frontend memoization/caching (e.g. Map) in the API layer for endpoints that return deterministic, non-user-specific data based on arguments.

## 2024-05-20 - [Memory Leak with @lru_cache on class methods]
**Learning:** Using `@lru_cache` directly on a standard instance method (`def my_method(self, arg):`) will inadvertently cache the `self` instance, leading to memory leaks over time because the cache holds a strong reference to the object.
**Action:** When applying `@lru_cache` to a class method (like `_count_syllables` in `analyzer.py`), the method must be decorated with `@staticmethod` first so the `self` instance reference is not cached.
