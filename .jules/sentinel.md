## 2025-05-09 - Path Traversal in AI Routes
**Vulnerability:** The `analyze_signals` endpoint dynamically constructed template file paths (`f"prompt_templates/{mode}.txt"`) using user-provided `mode` without sanitization, leading to a path traversal vulnerability.
**Learning:** Python's `os.path.exists()` check does not mitigate path traversal; an attacker could use `../../../` to verify and read arbitrary text files on the system.
**Prevention:** Strictly validate dynamically constructed file paths that incorporate user input against an explicit allowlist (e.g., `{'normal', 'depth', 'extended'}`) rather than attempting to sanitize the path string.
