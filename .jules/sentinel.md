
## 2024-05-28 - Fix bcrypt 72-byte limit Denial of Service (DoS)
**Vulnerability:** Bcrypt silently truncates passwords longer than 72 bytes. When passwords longer than 72 bytes are passed, newer versions of `bcrypt` throw a `ValueError` resulting in unhandled exceptions and 500 server errors on authentication endpoints.
**Learning:** This codebase uses `bcrypt` directly instead of a higher level wrapper like `passlib`. Consequently, it is necessary to explicitly handle the 72-byte restriction securely without exposing the application to crashes when excessively long passwords are sent by users.
**Prevention:** Always pre-hash passwords using `hashlib.sha256(password.encode("utf-8")).hexdigest()` before hashing with `bcrypt`. Prefix the final hash (e.g., `v2$`) to maintain backward compatibility with any older/legacy truncated hashes.
