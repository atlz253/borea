# Authentication

Nirvana uses file-backed local accounts in its default `full` authentication
mode. Registration is open and does not require email verification.

## Configuration

```bash
AUTH_MODE=full
SESSION_SECRET=replace-with-at-least-32-characters
USERS_PATH=./data/users
ORGANIZATION_MODE=multi
```

`SESSION_SECRET` is mandatory and changing it invalidates all sessions. User
records are stored under `USERS_PATH`. Passwords are represented by salted
scrypt credentials and are never returned by the UI or API.

Full authentication cannot be combined with `ORGANIZATION_MODE=single`.

## Registration and Sessions

Open `/auth` to sign in or register with a name, email, and password. Email
addresses are normalized to lowercase and must be unique. Passwords must
contain between 8 and 128 characters.

Registration immediately creates a seven-day encrypted cookie session. The
cookie is HTTP-only, uses `SameSite=Lax`, and is marked `Secure` in production.
Signing out clears it.

## Organization Access

An organization belongs to the user who created it. Organization lists and
repository, pull-request, and REST operations only resolve organizations owned
by the current user. Requests for another user's organization return `404`.

Ownerless organizations created by older versions or in NoAuth mode are hidden
in full mode. Ownership migration and transfer are not implemented.

## Current Limitations

Git smart-HTTP remains public for clone, fetch, and push. Do not store
confidential data until repository visibility and Git authentication described
by ADR 0019 are implemented.
