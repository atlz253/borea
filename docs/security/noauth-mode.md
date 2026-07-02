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

Full authentication is the default. Enable NoAuth explicitly:

```bash
AUTH_MODE=noauth
DEFAULT_USER_NAME=anonymous
```

NoAuth does not display the sign-in or registration flow. The fixed user can
access all organizations, including ownerless legacy data.

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

## Organization Mode

`ORGANIZATION_MODE=single` is supported only in NoAuth mode and exposes the
fixed `default` organization. Multi mode exposes every organization because
NoAuth intentionally bypasses ownership checks.

## Related

- [Git HTTP operations](../git-http.md) — how clone and push work in NoAuth mode
- [Authentication](authentication.md) — full authentication configuration and limitations
- Technical Specification (`docs/MVP.md` §5.3, §8.4) — architecture of NoAuth mode and `NoAuthProvider`
