# Security Baseline

- Content Security Policy recommended for nginx:
  ```
  default-src 'self'; img-src 'self' data:; script-src 'self'; style-src 'self' 'unsafe-inline';
  connect-src 'self';
  ```
- Disable server tokens (nginx): `server_tokens off;`
- Avoid inline event handlers; prefer addEventListener
- Validate/escape user input; sanitize HTML if rendering external text
- Strict dependency pinning via package-lock.json
- Use checksums: RedPhoenix CLI `bulk.js` verify before deploy
- Rotate release tag/channel for each deploy
