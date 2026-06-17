## 2024-05-24 - [Auth Bypass & Hardcoded Credentials in Mock Auth]
**Vulnerability:** Developer mock authentication was accessible even when `ENVIRONMENT=production`, utilizing hardcoded credentials ("demo@example.com" / "password123"), and was vulnerable to timing attacks during string comparison.
**Learning:** Mock/demo authentication features present a severe risk of backdoor entry if not strictly disabled in production. Hardcoded credentials bypass secure configuration practices, and simple string matching can be exploited to guess secrets via timing attacks.
**Prevention:** Strictly gate mock functionality with `ENVIRONMENT != "production"`. Never hardcode credentials; source them from environment variables (e.g., `MOCK_DEMO_EMAIL`). Use `hmac.compare_digest` for all string comparisons involving sensitive values to thwart timing attacks.
## 2024-05-24 - [Path Traversal in Template Loading]
**Vulnerability:** The AI route dynamically loaded prompt templates using `open(f"prompt_templates/{body.mode.lower()}.txt")` without validating the `mode` input, enabling potential path traversal.
**Learning:** Directly concatenating untrusted user input into file paths is a critical security risk. File extensions or stripping characters are insufficient protections.
**Prevention:** Always validate user input against a strict allowlist of permitted filenames (e.g., `["normal", "depth", "extended"]`) before incorporating it into file system operations.
