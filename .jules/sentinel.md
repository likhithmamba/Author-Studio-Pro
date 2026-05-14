## 2024-05-24 - [Auth Bypass & Hardcoded Credentials in Mock Auth]
**Vulnerability:** Developer mock authentication was accessible even when `ENVIRONMENT=production`, utilizing hardcoded credentials ("demo@example.com" / "password123"), and was vulnerable to timing attacks during string comparison.
**Learning:** Mock/demo authentication features present a severe risk of backdoor entry if not strictly disabled in production. Hardcoded credentials bypass secure configuration practices, and simple string matching can be exploited to guess secrets via timing attacks.
**Prevention:** Strictly gate mock functionality with `ENVIRONMENT != "production"`. Never hardcode credentials; source them from environment variables (e.g., `MOCK_DEMO_EMAIL`). Use `hmac.compare_digest` for all string comparisons involving sensitive values to thwart timing attacks.

## 2025-02-21 - [Path Traversal in Prompt Template Loading]
**Vulnerability:** The `mode` parameter from the user request was directly interpolated into a file path string (`prompt_templates/{mode}.txt`) without sanitization, allowing arbitrary file reading/execution if someone provided a path traversal payload like `../../etc/passwd`.
**Learning:** Path traversal vulnerabilities occur when user input is used to construct file paths dynamically without checking against an explicit allowlist. Relying solely on `os.path.exists()` does not prevent path traversal, as the file might actually exist outside the intended directory.
**Prevention:** To prevent path traversal vulnerabilities when loading internal template files based on user input, strictly validate the input against an allowlist of valid filenames (e.g., `['normal', 'depth', 'extended']`) rather than relying on extension appending or character stripping.
