
## 2024-03-20 - [CRITICAL] Bcrypt 72-Byte Limit Password Truncation DoS
**Vulnerability:** The backend directly passed user-provided passwords to `bcrypt.hashpw`. Bcrypt truncates passwords over 72 bytes. This allows DoS via large payloads and creates weaker keys when users submit arbitrarily long passwords, which get silently truncated.
**Learning:** Even well-known crypto libraries like bcrypt have hidden input constraints. When using bcrypt, passing unconstrained input directly into `hashpw` exposes the system to both DoS risks and unintended password length restrictions.
**Prevention:** Always pre-hash unbounded user passwords using a secure, fast hashing algorithm (like SHA-256) to a fixed-length string/bytes before passing to bcrypt. To ensure backwards compatibility with legacy databases, introduce a prefix scheme (e.g., `v2$`) and support verification for both prefixed (pre-hashed) and non-prefixed (legacy) hashes.
