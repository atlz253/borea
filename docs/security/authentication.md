# Authentication

Borea uses file-backed local accounts in its default `full` authentication
mode. Registration is open and does not require email verification.

## Configuration

```bash
AUTH_MODE=full
SESSION_SECRET=replace-with-at-least-32-characters
SESSION_COOKIE_SECURE=false
USERS_PATH=./data/users
ORGANIZATION_MODE=multi
```

`SESSION_SECRET` is mandatory and changing it invalidates all sessions. User
records are stored under `USERS_PATH`. Passwords are represented by salted
scrypt credentials and are never returned by the UI or API.

Full authentication cannot be combined with `ORGANIZATION_MODE=single`.

### Session Cookie Security

The session cookie's `Secure` flag is controlled by the `SESSION_COOKIE_SECURE`
environment variable. Valid values are `true`, `false`, `1`, or `0`. When
unset, the default is `true` in production (`NODE_ENV=production`) and `false`
in development.

Set `SESSION_COOKIE_SECURE=false` when the application serves HTTP without a
TLS-terminating reverse proxy. Leaving it as the production default (`true`)
causes browsers to silently reject the session cookie on HTTP sites.

## Registration and Sessions

Open `/auth` to sign in or register with a username, email, and password.
Usernames are immutable, must be 1-100 characters, and may contain only English
letters, digits, `.`, `_`, and `-`. They cannot be `.`, `..`, or start with
`.`. Email addresses are normalized to lowercase and must be unique. Passwords
must contain between 8 and 128 characters.

`username` is the display identity and URL namespace for personal repositories.
There is no separate user display-name field.

Registration immediately creates a seven-day encrypted cookie session. The
cookie is HTTP-only, uses `SameSite=Lax`, and is marked `Secure` when
`SESSION_COOKIE_SECURE` is `true` (the production default). Signing out clears
it.

## Git Personal Access Tokens

Full mode requires a personal access token for clone, fetch, and push over Git
smart-HTTP. Create and revoke tokens on `/settings/git-tokens`. A token is
shown only once when created, has no expiration, and remains valid until
revoked.

Use the account email as the HTTP Basic username and the token as the password.
The username is required by Git clients but the token identifies its owner.
Tokens are accepted only for Git smart-HTTP and cannot authenticate REST API
requests.

Never send a token over unencrypted HTTP outside local development. Production
deployments must terminate HTTPS at the application or a trusted reverse proxy.

## Organization Access

The user creating an organization becomes its `owner`. Invited users start as
`member` and can read organization information without seeing any repository.
The owner can assign `administrator` or `moderator`; administrators can assign
`moderator`.

Repositories are private by default. Their creator is the repository owner.
Ordinary members need an explicit `read`, `write`, or `moderator` grant.
Requests for inaccessible organizations and repositories return `404`; denied
actions on visible resources return `403`.

Membership records are stored below each organization in
`members/<userId>.json`. Repository ownership and grants are stored below
`repositories/<repository>/`. Older equal-membership data is not supported.
NoAuth bypasses access checks but does not expose membership management.

See [Access Control](access-control.md) for the complete permission matrix.

## Current Limitations

Git tokens do not have scopes or expiration dates. Repository permissions are
evaluated on every request, and revocation takes effect immediately.
