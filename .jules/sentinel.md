## 2024-05-24 - [Auth Bypass & Hardcoded Credentials in Mock Auth]
**Vulnerability:** Developer mock authentication was accessible even when `ENVIRONMENT=production`, utilizing hardcoded credentials ("demo@example.com" / "password123"), and was vulnerable to timing attacks during string comparison.
**Learning:** Mock/demo authentication features present a severe risk of backdoor entry if not strictly disabled in production. Hardcoded credentials bypass secure configuration practices, and simple string matching can be exploited to guess secrets via timing attacks.
**Prevention:** Strictly gate mock functionality with `ENVIRONMENT != "production"`. Never hardcode credentials; source them from environment variables (e.g., `MOCK_DEMO_EMAIL`). Use `hmac.compare_digest` for all string comparisons involving sensitive values to thwart timing attacks.

## 2024-05-24 - [Path Traversal in AI Signal Analysis]
**Vulnerability:** The AI signal analysis endpoint dynamically constructed file paths for prompt templates using unvalidated user input (`body.mode`). This allowed path traversal vulnerabilities where an attacker could pass values like `../` to access files outside the intended template directory.
**Learning:** Relying purely on file existence checks or standard path concatenation without strict input validation leaves applications vulnerable to path traversal attacks.
**Prevention:** Strictly validate dynamic input used in file paths against a known allowlist of valid filenames (e.g., `['normal', 'depth', 'extended']`) rather than using extension appending or attempting to sanitize the input.
