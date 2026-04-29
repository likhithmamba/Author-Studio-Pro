## 2024-05-18 - Missing Dependencies causing frontend build to fail
**Learning:** `npm install` timeout may cause missing dependencies and `vite` not found errors, making `npm run build` unavailable for frontend validation.
**Action:** In restricted environments, skip `npm run build` if `vite` is unavailable. Use Node to check basic JavaScript syntax instead, or perform a manual code review.

## 2024-05-18 - Nested array iterations causing O(N^2) bottlenecks in React state setup
**Learning:** Found an `O(N^2)` operation happening synchronously during component state initialization (`processDuplicates` within `SubmissionTab.jsx`). `Array.map` containing `Array.filter` was iterating over the entire dataset for every single element just to check for duplicates based on string manipulation. This pattern is common in React state derived from local storage, causing initial load stuttering.
**Action:** Always replace nested loops intended for deduplication/frequency counting with an `O(N)` hash map (frequency object) pre-computation before mapping over the data.
