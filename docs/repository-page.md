# Using Repository Pages

Borea provides a web interface for browsing and managing Git repositories. This guide covers the main pages you'll use.

## Repositories

The authenticated landing page is `/repositories`. It shows the current user's
personal repositories together with organization repositories they can access.
Opening `/users/<username>` shows personal repositories for that user. Opening
`/organizations/<organization>` shows repositories in that organization.

- Each repository is shown with its name and optional description.
- Click a repository name to open its page.
- If no repositories exist, you'll see "No repositories yet."

### Creating a Repository

1. Click the **"New repository"** button.
2. Fill in:
   - **Repository name** (required) — use a short name like `my-project` or `docs`.
   - **Description** (optional).
3. Click **"Create repository"**.

On `/repositories`, new repositories are personal repositories and open at
`/users/<username>/repositories/<name>`. On an organization page, new
repositories stay organization-owned.

## Repository Page

Opening a repository (`/users/<username>/repositories/<name>` or
`/organizations/<organization>/repositories/<name>`) brings you to its main
page. If it has commits, the page redirects to its namespaced tree route.

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

### Renaming a Branch

To rename a branch, open the branch switcher and click **"Rename branch"** at the bottom of the dropdown (below the divider, next to "New branch"). A modal appears with the current branch name pre-filled and a field for the new name. Enter the new branch name and click **"Rename"**.

The same branch name rules apply as for creating a branch. The old branch is removed and you are navigated to the new branch's tree view. If the new name is already taken or the rename fails for another reason, an error message is shown in the modal.

### Clone URL

You'll find the **"Git pull URL"** field with the address for cloning the repository over HTTP. Click the copy button to copy it, then use it in your terminal:

```bash
git clone http://localhost:3000/api/git/users/alice/my-project.git
```

See [Working with Repositories via HTTP](git-http.md) for detailed instructions.

### Commit Count

If the repository has commits, you'll see a **"N commits"** link next to the clone URL. Click it to view the commit history for the current branch.

### File Browser

Below the clone URL is the file browser — a table with two columns: **Name** and **Size**.

- **Directories** are listed first (with a folder icon), followed by **files** (with a file icon), sorted alphabetically.
- Click a directory name to navigate inside it.
- Click a file name to open its contents under the same `/users/...` or
  `/organizations/...` repository namespace.
- Use the **`..`** entry at the top to go up one level.
- **Breadcrumbs** above the table show your current path inside the repository. Click any part of the breadcrumb to jump directly to that folder.

### File Contents

UTF-8 text files up to 1 MiB open with syntax highlighting, line numbers, and a copy button. The language is detected from the file extension; unknown extensions are shown as plain text. The editor colors follow the application's light or dark theme.

For files between 1 and 25 MiB, the page first displays a large-file warning. Click **"Open file"** to load the contents without syntax highlighting. Line numbers and copying remain available.

Binary files cannot be displayed. Files larger than 25 MiB are not loaded in the browser. Image previews, raw downloads, streaming, and non-UTF-8 encodings are not supported.

The branch switcher preserves the file path. If the file does not exist on the selected branch, the page displays an error.

### Empty Repository

If the repository has no commits yet, you'll see the message:

> "This repository is empty. Make your first commit to see files here."

Push your first commit to make the file browser appear.

## Commit History

Navigate to the repository's `/tree/<branch>/commits` route to see the commit
history.

- Click **"← Back to repository"** to return to the main repository page for the same branch.
- The branch switcher is available at the top, so you can switch branches without leaving the commit history page.
- Each commit in the table shows:
  - **Short hash** (e.g., `a1b2c3d`)
  - **Author** name
  - **Date** of the commit
  - **Message** (commit subject, up to two lines)
- If no commits exist on the selected branch, you'll see "No commits yet. This branch has no commits."

## Pull Requests

Each repository page has a **"Pull requests"** tab in the navigation bar next to the **"Code"** tab.

### Creating a Pull Request

1. Click the **"Pull requests"** tab, then click **"New pull request"**.
2. Fill in the form:
   - **Title** — a short description of the change.
   - **Source branch** — the branch containing your changes.
   - **Target branch** — the branch you want to merge into (default: the repository's default branch).
3. Click **"Create pull request"**.

You are redirected to the pull request detail page.

### Merging a Pull Request

On the pull request detail page:

- If there are no conflicts, the **"Merge"** button is enabled.
- If a fast-forward merge is possible, you'll see both a **"Merge (fast-forward)"** button and a **"Create merge commit"** button.
- If there are merge conflicts, the "Merge" button is disabled and the conflicting files are listed in an alert.

Click **"Merge"** to merge the pull request. The page updates to show the merged status and the merge commit SHA.

### Merge Status

- **Fast-forward**: The source branch is ahead of the target branch. No merge commit is created.
- **Merge commit**: Both branches have diverged. A merge commit with two parents is created.
- **Conflict**: Both branches modified the same file in different ways. The merge is blocked until the conflicts are resolved.

## Repository Settings

Open the **"Settings"** tab on a repository page to manage the repository.

### Deleting a Repository

The **"Danger zone"** section contains the permanent repository deletion
action. Click **"Delete repository"**, then enter the repository name exactly
as shown to enable the confirmation button. The confirmation is case-sensitive
and whitespace is not removed.

Deleting an organization repository also permanently deletes its pull requests.
Personal repositories do not support pull requests in this version. This action
cannot be undone. After deletion, you are returned to the repositories list.

## Tips

- After `git push`, refresh the repository page to see your new files and commits.
- Repository names are case-sensitive in URLs.
