# Mr.Doc accounts and deployment

Mr.Doc now uses SQLite accounts instead of treating a browser-stored email as a sign-in. Registration and sign-in are handled by the Python server. Passwords are stored as salted PBKDF2-HMAC-SHA256 hashes; login sessions use random, hashed server-side tokens in HttpOnly cookies; account workspace JSON is encrypted with Fernet before it is written to SQLite.

## Local setup

Install the application requirements with `python -m pip install -r requirements.txt`, then start Mr.Doc with `python server.py`. On Windows, the SQLite database and encryption key are stored in `%LOCALAPPDATA%\MrDoc`. Other systems use the user app-data directory. The database path and key path can be overridden with `MRDOC_AUTH_DB` and `MRDOC_DATA_KEY_FILE`.

Keep the database and its encryption key together in protected, persistent storage when making backups or moving the app. If the key is lost, encrypted account workspaces cannot be recovered. Do not commit either file to source control or expose them through the static web server.

New account creation imports the current browser workspace once. Sign-in loads the workspace for that account. Subsequent app saves sync to the account database, and sign-out revokes the current session. The local browser cache remains available on that device.

## Before public internet use

The current `http.server` host is intended for local development. Public deployment must use HTTPS, a production-grade Python web server and reverse proxy, protected persistent storage, backups, monitoring, and a configured `AUTH_COOKIE_SECURE=true`. Email verification, password reset, and account recovery need a trusted email delivery service and are not enabled in the local app yet. Do not expose this development server directly to the internet or treat it as a production medical-record hosting service.
