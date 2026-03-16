## 2024-05-24 - Bcrypt 72-Byte Truncation Limit
**Vulnerability:** Bcrypt truncates passwords to 72 bytes. Attackers could submit extremely long passwords causing a Denial of Service via hash collision, or bypassing strong passwords that only differ after the 72nd byte.
**Learning:** Python's bcrypt library exhibits this limitation. Long passwords can cause severe security issues or CPU exhaustion.
**Prevention:** Pre-hash the password with a fast cryptographic hash function like SHA-256 before passing it to bcrypt, storing the result with a version prefix (e.g., `v2$`) to support legacy hashes and distinguish from standard bcrypt format.
