# Docker Deployment

Borea is distributed as a single Linux container containing the Nitro server,
static assets, and the Git CLI used by `GitProvider`.

## Docker Compose

The repository `.env` contains development defaults. Before a production
deployment, replace `SESSION_SECRET` with a private random value containing at
least 32 characters.

```bash
docker compose up --build -d
```

The application is available at <http://localhost:3000>. Application data is
stored in the `borea-data` named volume mounted at `/app/data`.

```bash
docker compose logs -f borea
docker compose down
```

`docker compose down` keeps the named volume. Removing it with
`docker compose down --volumes` permanently deletes repositories, users,
organizations, and pull request metadata stored there.

## Build and Run the Image

```bash
docker build -t borea:local .
docker run --rm \
  --name borea \
  -p 3000:3000 \
  -e SESSION_SECRET=replace-with-at-least-32-characters \
  -v borea-data:/app/data \
  borea:local
```

The image runs as the unprivileged `node` user and exposes port `3000`. Its
health check requests the application root every 30 seconds.

## Configuration

The container sets these runtime defaults:

| Variable | Default |
| --- | --- |
| `NODE_ENV` | `production` |
| `HOST` | `0.0.0.0` |
| `PORT` | `3000` |
| `REPOSITORIES_PATH` | `./data/repositories` |
| `DATABASE_URL` | `file:./data/borea.db` |

Full authentication mode is the application default and requires
`SESSION_SECRET`. All other application variables are documented in
[Authentication](security/authentication.md) and
[NoAuth Mode](security/noauth-mode.md).

To use NoAuth in a production container, both variables must be explicit:

```bash
-e AUTH_MODE=noauth -e ALLOW_NOAUTH_IN_PRODUCTION=true
```

NoAuth disables authentication and access control. Do not expose such a
container to an untrusted network.

For bind mounts on Linux, ensure UID `1000` can write the mounted data
directory. The named volume in `compose.yaml` is configured automatically.
