## 2024-05-24 - [Auth Bypass & Hardcoded Credentials in Mock Auth]
**Vulnerability:** Developer mock authentication was accessible even when `ENVIRONMENT=production`, utilizing hardcoded credentials ("demo@example.com" / "password123"), and was vulnerable to timing attacks during string comparison.
**Learning:** Mock/demo authentication features present a severe risk of backdoor entry if not strictly disabled in production. Hardcoded credentials bypass secure configuration practices, and simple string matching can be exploited to guess secrets via timing attacks.
**Prevention:** Strictly gate mock functionality with `ENVIRONMENT != "production"`. Never hardcode credentials; source them from environment variables (e.g., `MOCK_DEMO_EMAIL`). Use `hmac.compare_digest` for all string comparisons involving sensitive values to thwart timing attacks.

## 2024-05-11 - Path Traversal in Template Loading
**Vulnerability:** User input (`body.mode`) in `backend/routers/ai_routes.py` was used directly to build a file path (`prompt_file = f"prompt_templates/{mode}.txt"`) to open. Despite `.lower()` being used, this allows for path traversal attacks if a malicious user passes `mode="../../etc/passwd\x00"` or similar (though Python 3 might catch null bytes, directories are still open to traversal).
**Learning:** Never trust string manipulation (like appending extensions) to sanitize file paths driven by user input.
**Prevention:** Strictly validate input against an allowlist of valid strings before incorporating it into file paths.
