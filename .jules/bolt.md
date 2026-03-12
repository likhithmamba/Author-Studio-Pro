## 2025-02-20 - Memoization in Form Fields
**Learning:** React components containing numerous input fields linked to a unified state object can suffer from excessive re-rendering when one input changes, as every input is typically re-rendered by default, potentially impacting user experience.
**Action:** Memoize large components, static configurations or individual input field components with React.memo() to avoid unnecessary re-renders when their props don't change.

## 2025-02-21 - API Request Caching for Static Data
**Learning:** Frequent fetching of static backend data (like market metadata or rule-based assessments) during user interactions causes unnecessary network overhead and UI latency.
**Action:** Implement simple frontend memoization/caching (e.g. Map) in the API layer for endpoints that return deterministic, non-user-specific data based on arguments.

## 2025-03-12 - Word-Level Function Duplication & Caching
**Learning:** During text analysis (like syllable counting), executing expensive operations per word inside a loop becomes a severe bottleneck for large texts like novels. Looping the same large list multiple times, or recomputing the same deterministic properties for repeated common vocabulary adds massive overhead.
**Action:** Consolidate redundant loops (compute all properties in a single pass). Apply `@functools.lru_cache` on word-level parsing functions to drastically reduce work since novels heavily reuse a subset of vocabulary.
