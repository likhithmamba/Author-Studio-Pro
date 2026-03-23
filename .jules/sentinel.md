## 2024-05-18 - Prevent bcrypt 72-byte Limit DoS
**Vulnerability:** The backend used standard bcrypt which silently truncates passwords longer than 72 bytes. This can be exploited by users sending extremely long strings to cause a DoS (hashing takes much longer), or it can lead to multiple distinct long strings evaluating to the same hash.
**Learning:** `passlib` is not being used due to Python 3.12 compatibility issues. The application directly uses `bcrypt` which has this known limitation. We must manually handle pre-hashing when using bcrypt directly.
**Prevention:** Pre-hash the password using SHA-256 (`hashlib.sha256(password).hexdigest()`) before handing it over to bcrypt. A prefix (like `v2$`) can be used to maintain backward compatibility with legacy hashes.
