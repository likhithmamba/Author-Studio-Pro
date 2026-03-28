## 2025-02-23 - Bcrypt 72-Byte Limit DoS Vulnerability
**Vulnerability:** The application hashed user passwords directly using bcrypt, which restricts input length to 72 bytes. Passing a longer password payload resulted in unhandled `ValueError` exceptions and a potential Denial of Service (DoS).
**Learning:** Hard-limiting the password to bcrypt without a preprocessing step natively creates an exploitable attack vector via overly long string inputs.
**Prevention:** Pre-hash plain-text inputs via `hashlib.sha256(password.encode("utf-8")).hexdigest()` to guarantee a fixed-length output before handing it to bcrypt. To support legacy users cleanly, prepend hashes with `v2$` while keeping backwards compatibility within a `try/except ValueError` block.
