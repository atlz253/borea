# TECHNICAL SPECIFICATION

## Software Development Workspace

### 1. General Project Information

**1.1. Description**
A software development workspace - an open source platform that unifies development tools in a single space. It is an analogue of JetBrains Space and Yandex SourceCraft.

**1.2. Project Purpose**

- Platform for long-term development with potential monetization (SaaS) in the future
- Solution for import substitution and consolidation of fragmented tools

**1.3. License**
MIT License

**1.4. Versioning**
Semantic Versioning (MAJOR.MINOR.PATCH) following npm conventions

---

### 2. Goals and Objectives

**2.1. Strategic Goals**

- Create a competitive open source workspace
- Lay the foundation for future SaaS monetization and patenting

**2.2. MVP Objectives**

- Implement a Git hosting service with basic functionality
- Establish architectural abstractions for future extensibility
- Enable self-hosted deployment
- Use file-backed authentication by default while retaining explicit NoAuth for testing and development

---

### 3. Target Audience

**3.1. MVP Users**

- Software developers
- Teams of up to 10 people

**3.2. System Roles**

- Organization roles: `owner`, `administrator`, `moderator`, `member`
- Repository roles: `read`, `write`, `moderator`
- Role values are lowercase in storage and API payloads

**3.3. Future Expansion**

- DevOps, managers, QA, analysts (post-MVP)
- Teams of up to 5000+ users (as demand arises)
- Git smart-HTTP credentials and token management

---

### 4. MVP Functional Requirements

**4.1. Git Hosting**

- Organization creation and repository isolation by organization
- Repository creation and management (available to all users)
- Repository file browsing (tree view, file contents)
- Commit history browsing
- Diff viewing between commits
- Pull/Merge requests:
  - Create, view, close
  - Code review (line-level comments)
  - File-level discussion threads (implemented as an intermediate review step)
  - Basic discussion threads

**4.2. Git Protocol**

- HTTP/HTTPS for clone/pull operations (public, no authentication)
- HTTP/HTTPS for push operations (no authentication)

**4.3. User Management**

- Authentication through a swappable `AuthProvider`
- File-backed user registration and login with cookie sessions
- Explicit `NoAuthProvider` mode for development and testing
- Users can access organizations where they are members in full mode
- Organization roles control invitations, settings, and repository management
- Ordinary members require explicit repository access

**4.4. Web Interface**

- Dashboard with organization list
- Organization page with repository list
- Repository page with files and history
- Pull/Merge request page
- Repository settings
- Repository and PR creation is restricted by organization and repository roles

**4.5. API**

- REST API with OpenAPI specification
- Public API for future integrations
- REST resources require authentication in full mode; Git smart-HTTP remains public

---

### 5. Non-Functional Requirements

**5.1. Performance**
Not considered at the MVP stage. Optimization will be performed as real loads appear.

**5.2. Security (Basic)**

- Protection against OWASP Top 10:
  - SQL injection
  - XSS (Cross-Site Scripting)
  - CSRF (Cross-Site Request Forgery)
- Input data validation and sanitization
- HTTPS in production

**5.3. Operating Modes and Configuration**

- **Full mode** (default): file-backed accounts and cookie sessions
- **NoAuth mode**: explicit operation without authentication on behalf of a fixed user
- **Protection against accidental NoAuth activation in production**:
  - Check the `NODE_ENV` environment variable
  - Prohibit launching NoAuth mode when `NODE_ENV=production` without the explicit `--allow-noauth-in-production` flag
  - Log warnings when launching in NoAuth mode
  - Documentation explaining the risks

**5.4. Logging**

- Structured logs
- Levels: debug, info, warn, error
- Logging of key actions (repository creation, PRs, push operations)
- In NoAuth mode, log all actions with the fixed username

**5.5. Monitoring**
Deferred to future versions.

**5.6. Scalability**

- Horizontal scalability is not required at the start
- Architecture must allow future scaling through provider implementation swaps

---

### 6. Technology Stack

**6.1. Full-Stack Framework**

- TanStack Start
- TanStack ecosystem (Router, Query, Table, etc.)

**6.2. Infrastructure**

- Docker (single container for MVP)
- Docker Compose for local development

**6.3. Database**

- Specific DBMS to be chosen at implementation stage
- Mandatory abstraction via a unified interface

**6.4. UI Component Library**

- To be chosen at implementation stage

---

### 7. Architecture

**7.1. Architectural Style**
Modular monolith with clear separation into domain-based modules.

**7.2. Project Structure**
Monorepo — all project code (frontend, backend, shared, documentation) in a single repository.

**7.3. Key Architectural Principles**

- **Abstraction via interfaces**: all external dependencies (Git, DB, file storage, authentication) are accessed through unified interfaces with swappable implementations
- **Strategy/Adapter pattern**: for Git, DB, file storage, and authentication providers
- **Modularity**: clear boundaries between modules (git, auth, repositories, pull-requests)
- **Configurability**: all operating modes are configured via environment variables and configuration files

---

### 8. Interface Requirements (Abstractions)

**8.1. GitProvider**
Unified interface for Git operations. Must support:

- Repository operations (create, clone, delete)
- Commit operations (read history, diff)
- File operations (read, list)
- Handling HTTP push operations

Implementations (to be chosen at implementation stage):

- Via system Git CLI
- Via a library (e.g., isomorphic-git)

**8.2. DatabaseProvider**
Unified interface for DB operations, abstracted from a specific ORM. Allows migration between ORMs by creating a new implementation.

**8.3. StorageProvider**
Unified interface for repository file storage:

- Local file system
- S3-compatible storage (MinIO, AWS S3, etc.)

**8.4. AuthProvider**
Unified interface for authentication:

```typescript
interface AuthProvider {
  getCurrentUser(): Promise<User | null>;
  requireCurrentUser(): Promise<User>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserById(id: string): Promise<User | undefined>;
  // ... other methods
}

class NoAuthProvider implements AuthProvider {
  // MVP implementation — always returns a fixed user
  async getCurrentUser(): Promise<User> {
    return {
      id: "anonymous",
      name: process.env.DEFAULT_USER_NAME || "anonymous",
    };
  }
}
```

---

### 9. Security Requirements

**9.1. Required for MVP**

- Protection against OWASP Top 10:
  - SQL injection
  - XSS (Cross-Site Scripting)
  - CSRF (Cross-Site Request Forgery)
- Input data validation and sanitization
- HTTPS in production
- Protection against accidental NoAuth mode activation in production

**9.2. Deferred to Future Versions**

- Authentication module (custom system, OAuth, LDAP, SAML)
- Two-factor authentication (2FA)
- Git smart-HTTP authentication for repository roles
- Rate limiting
- Extended auditing
- Password hashing

---

### 10. Testing (TDD)

**10.1. Unit Tests**

- Mandatory for all business logic
- Cover pure functions, use cases, domain models
- Tests for `NoAuthProvider`

**10.2. Integration Tests**

- Verification of module interactions
- Tests for provider operations (Git, DB, Storage)
- Tests for configuration and operating modes

**10.3. E2E Tests**

- Verification of overall system functionality
- Key user scenarios (PR creation, code review, push/pull)
- Tests in NoAuth mode

---

### 11. Documentation (Documentation Driven Development)

**11.1. Format**
Markdown in the repository at the initial stage.

**11.2. Required Documents**

- **README.md** — project description, features, screenshots
- **INSTALL.md** — installation and setup instructions
- **CONTRIBUTING.md** — contributor guide
- **API.md** or auto-generated documentation from OpenAPI
- **ADR/** — Architecture Decision Records
- **docs/** — user and developer documentation
- **docs/security/noauth-mode.md** — description of NoAuth mode and its risks

---

### 12. Deployment

**12.1. MVP**

- Single Docker container with the entire application
- Docker Compose for local development
- Environment variables for mode configuration

**12.2. Configuration via Environment Variables**

```bash
# Operating mode
AUTH_MODE=full  # or "noauth" for explicit development mode

# Full-mode session signing (minimum 32 characters)
SESSION_SECRET=replace-with-at-least-32-characters

# File-backed users
USERS_PATH=./data/users

# Default username for NoAuth mode
DEFAULT_USER_NAME=anonymous

# Production protection
NODE_ENV=development  # or "production"
ALLOW_NOAUTH_IN_PRODUCTION=false  # explicit permission for NoAuth in production

# Other settings
DATABASE_URL=...
STORAGE_TYPE=local  # or "s3"
ORGANIZATION_MODE=multi  # or "single" for the fixed default organization
ORGANIZATIONS_PATH=./data/organizations
```

**12.3. Extension Points**

- Separation into individual containers (frontend, backend, DB)
- Reverse proxy (Nginx, Traefik)
- Kubernetes and orchestration

---

### 13. Roadmap

**13.1. v0.1.0 — MVP**

- Git hosting (repositories, files, history)
- Pull/Merge requests with code review
- NoAuth operating mode
- REST API with OpenAPI
- Docker deployment
- Complete documentation

**13.2. v0.2.0 — Authentication**

- Authentication module (custom system)
- User registration and login
- User profiles
- Basic access control

**13.3. Subsequent Versions (Preliminary)**

- v0.3.0 — Issue tracking
- v0.4.0 — Wiki/documentation
- v0.5.0 — CI/CD integrations
- v0.6.0 — Advanced integrations (OAuth, LDAP)
- v1.0.0 — Stable version with full toolset

---

### 14. MVP Acceptance Criteria

**14.1. Functional**

- [X] User can create and open an organization
- [X] Authorized organization member can invite an existing user
- [X] Organization and repository roles are enforced in UI and REST API
- [X] User can create a repository via the web interface
- [X] User can clone a repository over HTTP without authentication
- [X] User can push to a repository without authentication
- [X] User can browse files and commit history
- [X] User can create a Pull Request
- [X] User can leave comments on a changed file in a PR
- [ ] User can leave a comment on a code line in a PR
- [X] User can merge a PR
- [X] All actions are performed on behalf of a fixed user (configurable)

**14.2. Technical**

- [ ] All external dependencies are abstracted via interfaces (GitProvider, DatabaseProvider, StorageProvider, AuthProvider)
- [ ] NoAuth mode is implemented via `NoAuthProvider`
- [ ] Unit tests cover business logic
- [ ] Integration tests pass
- [ ] E2E tests for key scenarios pass
- [X] REST API is documented via OpenAPI
- [ ] Project deploys with a single `docker compose up` command
- [ ] All documentation is in place
- [ ] NoAuth mode cannot be accidentally enabled in production (`NODE_ENV` check)

**14.3. Security**

- [ ] Protection against SQL injection
- [ ] Protection against XSS
- [ ] Protection against CSRF
- [ ] Input data validation
- [ ] Log warnings when launching in NoAuth mode
- [ ] Blocking of NoAuth mode in production without explicit flag

**14.4. Code Quality**

- [ ] Code follows TDD principles
- [ ] Linter and formatter pass without errors
- [ ] No critical security vulnerabilities

---

### 15. Open Questions (To Be Resolved at Implementation Stage)

1. Specific DBMS for MVP
2. Specific UI component library
3. Specific GitProvider implementation (CLI vs library)
4. Specific ORM and method of abstraction over it
5. Monorepo structure (packages, apps, shared)
6. CI/CD for the project itself
7. Working name of the project
8. Specific default username for NoAuth mode

---
