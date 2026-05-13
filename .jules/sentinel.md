## 2024-05-24 - [Auth Bypass & Hardcoded Credentials in Mock Auth]
**Vulnerability:** Developer mock authentication was accessible even when `ENVIRONMENT=production`, utilizing hardcoded credentials ("demo@example.com" / "password123"), and was vulnerable to timing attacks during string comparison.
**Learning:** Mock/demo authentication features present a severe risk of backdoor entry if not strictly disabled in production. Hardcoded credentials bypass secure configuration practices, and simple string matching can be exploited to guess secrets via timing attacks.
**Prevention:** Strictly gate mock functionality with `ENVIRONMENT != "production"`. Never hardcode credentials; source them from environment variables (e.g., `MOCK_DEMO_EMAIL`). Use `hmac.compare_digest` for all string comparisons involving sensitive values to thwart timing attacks.

## 2024-05-28 - [Path Traversal in AI Route Prompt Templates]
**Vulnerability:** The `mode` input parameter from the user request was used directly to construct the file path for prompt templates (`prompt_file = f"prompt_templates/{mode}.txt"`), creating a path traversal vulnerability. Although `os.path.exists()` was used as a fallback, it doesn't prevent path traversal if the attacker guesses a valid existing file path.
**Learning:** `os.path.exists()` is not a security control against path traversal when building file paths from user input. It only checks if a file exists, and will happily return `True` for `../../../etc/passwd` or `../../main.py`.
**Prevention:** Strictly validate user input against an allowlist of valid filenames/modes (e.g., `ALLOWED_MODES = {"normal", "depth", "extended"}`) before constructing any file paths.
