## 2025-05-20 - Bcrypt 72-Byte Limit DoS
**Vulnerability:** Bcrypt restricts passwords to 72 bytes. Passing a longer password results in either truncation or errors, leading to DoS or bypasses.
**Learning:** We need to pre-hash passwords with SHA-256 before feeding them to bcrypt.
**Prevention:** Use SHA-256 pre-hashing + `v2$` prefix.
