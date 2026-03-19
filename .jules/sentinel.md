## 2024-05-24 - [Fix bcrypt 72-byte Limit DoS Vulnerability]
**Vulnerability:** Bcrypt silently truncates passwords longer than 72 bytes, which can lead to collision risks and Denial of Service if long inputs are submitted to a backend hashing function.
**Learning:** Bcrypt must never process unhashed, unbounded user input. The authentication module was vulnerable to DoS attacks because passwords could exceed 72 bytes.
**Prevention:** Always pre-hash the user password using a fast cryptographic hash function (e.g., SHA-256) and pass the resulting hexdigest or bytes to bcrypt. Add a version prefix (like `"v2$"`) to maintain backwards compatibility with older, un-pre-hashed user credentials.
