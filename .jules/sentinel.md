## 2024-03-21 - [Bcrypt Length Limit DoS]
**Vulnerability:** The password hashing implementation using `bcrypt` was passing the raw password directly to `bcrypt.hashpw`. Since `bcrypt` has a 72-byte limit and truncates anything longer, an attacker could supply a long password and only the first 72 bytes would matter, or if a password has a null-byte, it may be truncated. More severely, this can allow a DoS vulnerability.
**Learning:** Raw passwords should be pre-hashed (e.g. using SHA-256) before passing them to bcrypt to avoid bcrypt's 72-character limits and null-byte truncations, ensuring the entire password matters.
**Prevention:** Always pre-hash the password before using bcrypt or use argon2 instead.
