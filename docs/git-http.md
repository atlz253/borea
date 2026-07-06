# Working with Repositories via HTTP

Borea supports standard Git operations over HTTP — you can clone repositories and push your changes just like with GitHub, GitLab, or any other Git hosting service.

Full authentication mode requires a Git personal access token. NoAuth mode
keeps Git operations credential-free for local development.

## Cloning a Repository

1. Open the repository page in Borea (e.g., `http://localhost:3000/organizations/default/repositories/my-project`).
2. Copy the URL from the **"Git pull URL"** field using the copy button on the right.
3. In full mode, create a token at `/settings/git-tokens`.
4. In your terminal, run:
   ```bash
   git clone https://<email>@<host>/api/git/<organization>/<repository>.git
   ```
   Enter the token when Git asks for a password. For local development:
   ```bash
   git clone http://alice%40example.com@localhost:3000/api/git/default/my-project.git
   ```
5. You now have a local copy of the repository in the `my-project` folder.

## Pushing Changes

1. Make changes to your local files and commit them:
   ```bash
   cd my-project
   git add .
   git commit -m "Describe your changes here"
   ```
2. If you haven't already set a remote, add one using the URL from the repository page:
   ```bash
   git remote add origin http://localhost:3000/api/git/default/my-project.git
   ```
3. Push your changes and provide the token when prompted:
   ```bash
   git push -u origin main
   ```
4. Refresh the repository page in Borea — your files and commits will appear.

## Requirements

- Git must be installed on your computer ([download](https://git-scm.com/downloads)).
- The Borea server must be running and accessible (default: `http://localhost:3000`).
- The organization and repository must already exist in Borea.

## Authentication

Git smart-HTTP accepts personal access tokens through HTTP Basic
authentication. Use any non-empty username, preferably the account email, and
the token as the password. Account passwords and web cookie sessions are not
accepted.

Clone and fetch require repository `read`. Push requires `write`. Token
revocation and repository permission changes take effect on the next request.
Missing or invalid credentials return `401`, inaccessible repositories return
`404`, and readers attempting to push receive `403`.

Tokens are equivalent to credentials. Never place them directly in a remote
URL, shell history, logs, or source control. Use the Git credential helper and
HTTPS outside local development.

> **Important:** This is intended for development and testing only. Running NoAuth mode in production is insecure. See [NoAuth Mode](security/noauth-mode.md) for details and risks.

## Troubleshooting

| Problem | What to check |
|---------|---------------|
| `fatal: Repository not found` | The repository name is incorrect or hasn't been created yet. Check it on the repositories page. |
| `git push` is rejected | Make sure the branch exists locally (`git branch`). For the first push, use `git push -u origin main`. |
| Connection refused | The Borea server may not be running (default: `http://localhost:3000`). |
| `git clone` hangs or times out | Check network connectivity and firewall settings. |
