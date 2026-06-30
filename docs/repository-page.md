# Using Repository Pages

Nirvana provides a web interface for browsing and managing Git repositories. This guide covers the main pages you'll use.

## Repositories List

The main page at `/repositories` shows all repositories on the server.

- Each repository is shown with its name and optional description.
- Click a repository name to open its page.
- If no repositories exist, you'll see "No repositories yet."

### Creating a Repository

1. Click the **"New repository"** button.
2. Fill in:
   - **Repository name** (required) — use a short name like `my-project` or `docs`.
   - **Description** (optional).
3. Click **"Create repository"**.

After creation, the new repository appears in the list.

## Repository Page

Opening a repository (`/repositories/<name>`) brings you to its main page. If the repository has commits, you are redirected to `/repositories/<name>/tree/<defaultBranch>`.

### Branch Switcher

At the top of the page, next to the clone URL, you'll find the **branch switcher** — a button showing the current branch name (e.g., `main`). Click it to open a dropdown with all available branches. Select any branch to switch to it — the URL updates and the file tree shows that branch's contents.

Branch names containing `/` (e.g., `feature/logout`) are URL-encoded as `%2F` in the address bar.

### Creating a Branch

At the bottom of the branch switcher dropdown, below a divider, you'll see **"New branch"**. Click it to open a modal where you can enter the new branch name. The new branch is created from the currently selected branch.

Branch name rules:
- Must be 1–200 characters.
- Cannot contain spaces, `~`, `^`, `:`, `?`, `*`, `[`, `\`, or `@{`.
- Cannot contain `..` (consecutive dots).
- Cannot start with a hyphen (`-`).
- Cannot end with `.lock`.

After creation, the page navigates to the new branch's tree view. If creation fails (e.g., the branch already exists), an error message is shown in the modal.

### Clone URL

You'll find the **"Git pull URL"** field with the address for cloning the repository over HTTP. Click the copy button to copy it, then use it in your terminal:

```bash
git clone http://localhost:3000/api/git/my-project.git
```

See [Working with Repositories via HTTP](git-http.md) for detailed instructions.

### Commit Count

If the repository has commits, you'll see a **"N commits"** link next to the clone URL. Click it to view the commit history for the current branch.

### File Browser

Below the clone URL is the file browser — a table with two columns: **Name** and **Size**.

- **Directories** are listed first (with a folder icon), followed by **files** (with a file icon), sorted alphabetically.
- Click a directory name to navigate inside it.
- Use the **`..`** entry at the top to go up one level.
- **Breadcrumbs** above the table show your current path inside the repository. Click any part of the breadcrumb to jump directly to that folder.

### Empty Repository

If the repository has no commits yet, you'll see the message:

> "This repository is empty. Make your first commit to see files here."

Push your first commit to make the file browser appear.

## Commit History

Navigate to `/repositories/<name>/tree/<branch>/commits` to see the commit history.

- Click **"← Back to repository"** to return to the main repository page for the same branch.
- The branch switcher is available at the top, so you can switch branches without leaving the commit history page.
- Each commit in the table shows:
  - **Short hash** (e.g., `a1b2c3d`)
  - **Author** name
  - **Date** of the commit
  - **Message** (commit subject, up to two lines)
- If no commits exist on the selected branch, you'll see "No commits yet. This branch has no commits."

## Tips

- After `git push`, refresh the repository page to see your new files and commits.
- Repository names are case-sensitive in URLs.
