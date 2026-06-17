## 2024-05-24 - [Auth Bypass & Hardcoded Credentials in Mock Auth]
**Vulnerability:** Developer mock authentication was accessible even when `ENVIRONMENT=production`, utilizing hardcoded credentials ("demo@example.com" / "password123"), and was vulnerable to timing attacks during string comparison.
**Learning:** Mock/demo authentication features present a severe risk of backdoor entry if not strictly disabled in production. Hardcoded credentials bypass secure configuration practices, and simple string matching can be exploited to guess secrets via timing attacks.
**Prevention:** Strictly gate mock functionality with `ENVIRONMENT != "production"`. Never hardcode credentials; source them from environment variables (e.g., `MOCK_DEMO_EMAIL`). Use `hmac.compare_digest` for all string comparisons involving sensitive values to thwart timing attacks.
## 2024-05-24 - [Path Traversal in AI Routes]
**Vulnerability:** The `mode` parameter in the `/api/ai/analyze-signals` route was directly interpolated into a file path `f"prompt_templates/{mode}.txt"`, allowing path traversal (e.g., `../../../etc/passwd`).
**Learning:** Directly concatenating user input into file paths without validation or allowlisting exposes the system to path traversal vulnerabilities.
**Prevention:** Strictly validate user input against an allowlist of expected filenames rather than relying on character stripping or path joining. Use explicit lists of allowed values.
