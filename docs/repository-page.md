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

Opening a repository (`/repositories/<name>`) brings you to its main page.

### Clone URL

At the top you'll find the **"Git pull URL"** field with the address for cloning the repository over HTTP. Click the copy button to copy it, then use it in your terminal:

```bash
git clone http://localhost:3000/api/git/my-project.git
```

See [Working with Repositories via HTTP](git-http.md) for detailed instructions.

### Commit Count

If the repository has commits, you'll see a **"N commits"** link next to the clone URL. Click it to view the commit history.

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

Navigate to `/repositories/<name>/commits` to see the commit history.

- Click **"← Back to repository"** to return to the main repository page.
- The active branch name is shown below the page title.
- Each commit in the table shows:
  - **Short hash** (e.g., `a1b2c3d`)
  - **Author** name
  - **Date** of the commit
  - **Message** (commit subject, up to two lines)
- If no commits exist, you'll see "No commits yet. This branch has no commits."

## Tips

- After `git push`, refresh the repository page to see your new files and commits.
- Repository names are case-sensitive in URLs.
