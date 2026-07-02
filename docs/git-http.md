# Working with Repositories via HTTP

Nirvana supports standard Git operations over HTTP — you can clone repositories and push your changes just like with GitHub, GitLab, or any other Git hosting service.

## Cloning a Repository

1. Open the repository page in Nirvana (e.g., `http://localhost:3000/organizations/default/repositories/my-project`).
2. Copy the URL from the **"Git pull URL"** field using the copy button on the right.
3. In your terminal, run:
   ```bash
   git clone <copied-url>
   ```
   For example:
   ```bash
   git clone http://localhost:3000/api/git/default/my-project.git
   ```
4. You now have a local copy of the repository in the `my-project` folder.

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
3. Push your changes:
   ```bash
   git push -u origin main
   ```
4. Refresh the repository page in Nirvana — your files and commits will appear.

## Requirements

- Git must be installed on your computer ([download](https://git-scm.com/downloads)).
- The Nirvana server must be running and accessible (default: `http://localhost:3000`).
- The organization and repository must already exist in Nirvana.

## Authentication

In the current MVP version, Nirvana runs in **NoAuth mode**: no login, password, or token is needed to clone or push. Anyone who can reach the server can access all repositories.

> **Important:** This is intended for development and testing only. Running NoAuth mode in production is insecure. See [NoAuth Mode](security/noauth-mode.md) for details and risks.

## Troubleshooting

| Problem | What to check |
|---------|---------------|
| `fatal: Repository not found` | The repository name is incorrect or hasn't been created yet. Check it on the repositories page. |
| `git push` is rejected | Make sure the branch exists locally (`git branch`). For the first push, use `git push -u origin main`. |
| Connection refused | The Nirvana server may not be running (default: `http://localhost:3000`). |
| `git clone` hangs or times out | Check network connectivity and firewall settings. |
