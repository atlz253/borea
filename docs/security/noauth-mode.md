# NoAuth Mode

NoAuth mode is a development-time feature of Nirvana that disables authentication entirely. All operations (clone, push, repository creation, code review) are performed on behalf of a fixed user.

## When to Use

NoAuth mode is intended **for development and testing only**. It allows you to:

- Quickly try Nirvana without setting up user accounts
- Run automated tests without authentication logic
- Develop and debug features without logging in every time

## Risks

Since NoAuth mode requires no credentials:

- **Anyone** who can reach the Nirvana server can clone any repository.
- **Anyone** can push to any repository without permission.
- **Anyone** can create, modify or delete repositories (if the UI supports it).
- There is no audit trail tying actions to real users.

**Never enable NoAuth mode on a publicly accessible server** without understanding these risks.

## How to Enable and Disable

By default, Nirvana runs in NoAuth mode when `NODE_ENV` is set to anything other than `production`.

### Development (default)

```bash
NODE_ENV=development
```

NoAuth mode is allowed. No warnings.

### Production

```bash
NODE_ENV=production
```

If the server detects NoAuth mode in production, it will refuse to start unless the explicit override flag is set:

```bash
ALLOW_NOAUTH_IN_PRODUCTION=true
```

Even with the override, a warning is logged on every startup:

```
WARNING: Running in NoAuth mode in production. This is insecure!
```

## Future

NoAuth mode will be replaced with a proper authentication system (`AuthProvider`) in a future version (v0.2.0), supporting custom registration, OAuth, LDAP, and access control.

Organization mode is independent from authentication.
`ORGANIZATION_MODE=single` exposes only the fixed `default` organization,
while `multi` exposes all organizations. Neither mode adds access control.

## Related

- [Git HTTP operations](../git-http.md) — how clone and push work in NoAuth mode
- Technical Specification (`docs/MVP.md` §5.3, §8.4) — architecture of NoAuth mode and `NoAuthProvider`
