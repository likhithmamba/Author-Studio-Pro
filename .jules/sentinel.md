## 2024-05-18 - [Fix bcrypt 72-byte limit DoS]
**Vulnerability:** Bcrypt hashes max out at 72 bytes. Passwords longer than 72 bytes are silently truncated, meaning two different passwords sharing the same first 72 bytes evaluate as equal. Additionally, sending extremely long strings to bcrypt can cause Denial of Service (DoS) by maxing out CPU.
**Learning:** Raw bcrypt is vulnerable when processing unbounded user input. We must never pass unhashed, unbounded strings to bcrypt directly.
**Prevention:** Pre-hash passwords using a fast hashing algorithm like SHA-256 (e.g., `hashlib.sha256(password.encode()).hexdigest()`) before passing them to bcrypt. To support legacy users, prepend a version indicator like "v2$" to the new hashes and maintain fallback verification logic.
