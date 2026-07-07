# Borea

> Borea is a open-source research station for software engineering.

**Status:** Not production-ready.

## Quick Start

```bash
npm install
npm run dev      # http://localhost:3000
```

The first start auto-applies pending database migrations. No manual
`db:migrate` step is needed.

Default development settings are stored in `.env`. Override them locally in
`.env.local`, which is ignored by Git. Set a private `SESSION_SECRET` containing
at least 32 characters outside local development. Use `AUTH_MODE=noauth` for an
explicit development-only fixed-user mode.

### Prerequisites

- Node.js (LTS recommended)
- npm
- Git (for repository operations)

## Production Deploy

The build outputs a self-contained Nitro Node server:

```bash
npm run build
npm start
```

Build and run the production container:

```bash
docker compose up --build -d
```

The application is available at <http://localhost:3000>. Before production
deployment, replace the development `SESSION_SECRET` in `.env`. Persistent
application data is stored in a named Docker volume. See
[Docker Deployment](docs/deployment.md) for image configuration, `docker run`
usage, and data management.

## Documentation

- [Documentation Index](docs/README.md) — overview of all documentation
- [Architecture Overview](docs/architecture.md) — project structure, modules, providers
- [Docker Deployment](docs/deployment.md) — production image and Compose usage
- [API Reference](docs/API.md) — REST API v1 and Git smart-HTTP endpoints
- [Contributing Guide](CONTRIBUTING.md) — how to contribute

## License

[MIT](LICENSE)
