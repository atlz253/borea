# Docker Deployment

Borea is distributed as a single Linux container containing the Nitro server,
static assets, and the Git CLI used by `GitProvider`.

## Docker Compose

The repository `.env` contains development defaults. Before a production
deployment, replace `SESSION_SECRET` with a private random value containing at
least 32 characters.

```bash
docker compose -f docker/compose.yaml up --build -d
```

The application is available at <http://localhost:3000>. Application data is
stored in the `borea-data` named volume mounted at `/app/data`.

```bash
docker compose -f docker/compose.yaml logs -f borea
docker compose -f docker/compose.yaml down
```

`docker compose down` keeps the named volume. Removing it with
`docker compose -f docker/compose.yaml down --volumes` permanently deletes
repositories, users, organizations, and pull request metadata stored there.

## Build and Run the Image

```bash
docker build -f docker/Dockerfile -t borea:local .
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

If the application is served over plain HTTP (no TLS), set
`SESSION_COOKIE_SECURE=false` so the browser accepts the session cookie.
See [Authentication](security/authentication.md#session-cookie-security) for
details.

The container sets these runtime defaults:

| Variable | Default |
| --- | --- |
| `NODE_ENV` | `production` |
| `HOST` | `0.0.0.0` |
| `PORT` | `3000` |
| `REPOSITORIES_PATH` | `./data/repositories` |
| `DATABASE_URL` | `file:./data/borea.db` |
| `SESSION_COOKIE_SECURE` | `true` when `NODE_ENV=production`, otherwise `false` |
| `LOG_LEVEL` | `info` in production, `debug` in development |
| `LOG_FORMAT` | `json` outside development, `pretty` in development |
| `OTEL_ENABLED` | unset, tracing disabled |
| `OTEL_SERVICE_NAME` | `borea` |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | unset |

When `DATABASE_URL` uses the `file:` scheme, the application and Prisma CLI
automatically create the parent directory on startup. A fresh checkout does not
require a manual `mkdir`.

Pending database migrations are applied automatically on every container start
via the `ENTRYPOINT` (`prisma migrate deploy` before the Nitro server). The
Dockerfile includes the Prisma CLI, schema, and migration files in the runtime
image so that migration remains available without the build toolchain.

Application logs are written to stdout/stderr through Pino. Production logs are
JSON records suitable for collection with Docker, Kubernetes, or a log agent.
Every handled request receives an `x-request-id` response header and the same
value is included in request log records. When OpenTelemetry tracing is enabled,
request logs also include `traceId` and `spanId`. Set `LOG_FORMAT=pretty` only
for local human-readable output.

OpenTelemetry tracing is disabled unless `OTEL_ENABLED=true`. The observability
compose override sets:

```dotenv
OTEL_ENABLED=true
OTEL_SERVICE_NAME=borea
OTEL_EXPORTER_OTLP_ENDPOINT=http://alloy:4318
```

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
directory. The named volume in `docker/compose.yaml` is configured
automatically.

## Observability Stack

The optional observability stack lives in `docker/compose.observability.yaml`
and runs Grafana, Loki, Tempo, and Grafana Alloy. It is not part of the default
application deployment.

Start the application with observability:

```bash
docker compose \
  -f docker/compose.yaml \
  -f docker/compose.observability.yaml \
  up --build -d
```

Default observability values are committed in `docker/.env.observability`.
Real local values belong in `docker/.env.observability.local`, which is ignored
by Git:

```dotenv
GRAFANA_ADMIN_USER=your-user
GRAFANA_ADMIN_PASSWORD=replace-with-private-password
```

Grafana is bound to localhost only:

```text
http://127.0.0.1:3001
```

Grafana datasources and dashboards are provisioned from files under
`docker/observability/grafana/`. The default dashboard is
`docker/observability/grafana/dashboards/borea-overview.json` and appears in
the `Borea` folder as `Borea Overview`.

After editing a provisioned dashboard file, restart Grafana so the file is read
again:

```bash
docker compose \
  -f docker/compose.yaml \
  -f docker/compose.observability.yaml \
  restart grafana
```

On a remote server, do not expose the Grafana port publicly. Use an SSH tunnel:

```bash
ssh -L 3001:127.0.0.1:3001 user@server
```

Then open `http://127.0.0.1:3001` locally. Do not change the Grafana bind
address to `0.0.0.0` unless it is protected by a reverse proxy with TLS and an
external authentication policy.

Alloy collects Docker logs through `/var/run/docker.sock` mounted read-only.
This is acceptable for a single-host self-hosted deployment, but the Docker
socket is still a sensitive host interface. Treat hosts with observability
enabled as privileged infrastructure.
