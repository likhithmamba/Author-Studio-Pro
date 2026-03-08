## 2025-02-28 - [Bcrypt Password Truncation ValueError DoS]
**Vulnerability:** Bcrypt fails with `ValueError: password cannot be longer than 72 bytes` when hashing passwords over 72 bytes, leading to 500 server errors on login or registration endpoints, enabling simple Denial of Service (DoS) attacks.
**Learning:** This codebase uses `bcrypt` directly instead of passlib, which would have handled this limitation implicitly. Direct `bcrypt` usage requires manual pre-hashing of inputs to overcome the 72-byte restriction.
**Prevention:** Pre-hash passwords using SHA-256 before passing them to bcrypt.
