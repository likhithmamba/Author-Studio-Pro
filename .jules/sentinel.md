## 2024-05-24 - [Auth Bypass & Hardcoded Credentials in Mock Auth]
**Vulnerability:** Developer mock authentication was accessible even when `ENVIRONMENT=production`, utilizing hardcoded credentials ("demo@example.com" / "password123"), and was vulnerable to timing attacks during string comparison.
**Learning:** Mock/demo authentication features present a severe risk of backdoor entry if not strictly disabled in production. Hardcoded credentials bypass secure configuration practices, and simple string matching can be exploited to guess secrets via timing attacks.
**Prevention:** Strictly gate mock functionality with `ENVIRONMENT != "production"`. Never hardcode credentials; source them from environment variables (e.g., `MOCK_DEMO_EMAIL`). Use `hmac.compare_digest` for all string comparisons involving sensitive values to thwart timing attacks.

## 2024-05-24 - [Path Traversal in AI Route]
**Vulnerability:** The AI route `analyze_signals` was vulnerable to path traversal because it relied on `os.path.exists` to validate a user-controlled file path containing string concatenation (e.g., `prompt_templates/{mode}.txt`). Since `os.path.exists` will return True for valid paths like `prompt_templates/../backend/main.py`, an attacker could potentially read arbitrary files matching the `.txt` extension constraint, or worse.
**Learning:** Using `os.path.exists` is not sufficient to prevent path traversal when the input string is not strictly validated, as it still allows relative path symbols like `..` to traverse out of the intended directory.
**Prevention:** Strictly validate user inputs against an allowlist of permitted filenames (e.g., `['normal', 'depth', 'extended']`) instead of using character stripping or relying on `os.path.exists`.
