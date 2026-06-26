## 2025-05-15 - [Masking Error Messages and Security Headers]
**Vulnerability:** Information leakage through verbose error messages in the `/api/ai/analyze` endpoint and missing basic security headers.
**Learning:** Exposing raw internal error messages (e.g., `error.message`) to the client can reveal sensitive architectural details or API limits. Simple Express middleware can provide baseline protection (nosniff, DENY, etc.) without adding new dependencies.
**Prevention:** Always use generic error messages for client responses and log detailed errors on the server side only. Implement a standard security header middleware in every new server.
