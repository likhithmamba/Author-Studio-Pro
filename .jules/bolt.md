## 2025-02-20 - Memoization in Form Fields
**Learning:** React components containing numerous input fields linked to a unified state object can suffer from excessive re-rendering when one input changes, as every input is typically re-rendered by default, potentially impacting user experience.
**Action:** Memoize large components, static configurations or individual input field components with React.memo() to avoid unnecessary re-renders when their props don't change.

## 2025-03-09 - [Parser Regex Precompilation]
**Learning:** Calling `re.match` with a string literal inside a loop containing thousands of iterations incurs significant overhead. Precompiling regex strings into `re.Pattern` objects before evaluating them against thousands of paragraphs significantly improves performance.
**Action:** Always precompile regular expressions before using them in tight loops or mapping over large datasets (such as a 51,000-word novel's paragraphs).
