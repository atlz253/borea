# ADR 0015: Repository File Viewing

## Context

The MVP requires browsing repository file contents. The existing repository page can list Git trees and navigate directories, but blobs are not linked and `GitProvider` cannot read file contents.

File viewing must work against bare repositories, preserve the selected branch in the URL, avoid loading arbitrarily large blobs during SSR, and distinguish text from binary data.

## Alternatives

### Reuse `/tree/$branch/$path` for files and directories

This avoids a new route but makes one URL represent two different resource types and requires probing the object before choosing the page.

### Add `/blob/$branch/$path` (chosen)

Directories remain under `/tree/` and files use `/blob/`, matching established Git-hosting URL semantics and keeping route loaders focused.

### Load all files immediately

This is simple but allows a large blob to consume excessive server and browser memory.

### Stream file contents

Streaming avoids buffering large files but requires a raw-content endpoint and a different client rendering path. It is deferred beyond the MVP file viewer.

## Decision

1. Add `/repositories/$name/blob/$branch/$` for file viewing.
2. Extend `GitProvider` with `getFile(name, { path, ref, maxBytes })`.
3. Determine blob size with `git cat-file -s` before reading it.
4. Return a discriminated result:
   - `text` with UTF-8 content;
   - `binary` without content;
   - `too-large` without content.
5. Treat NUL-containing data and invalid UTF-8 as binary.
6. Load files up to 1 MiB in the initial route loader with syntax highlighting.
7. Allow an explicit client request to load files up to 25 MiB without syntax highlighting.
8. Never expose a client-controlled byte limit. Files above 25 MiB are not loaded.

## Consequences

- Small source files are directly viewable with syntax highlighting and line numbers.
- Files between 1 and 25 MiB require explicit user action and render as plain text.
- Binary files and files above 25 MiB show metadata and an explanatory state.
- Each request uses at least one Git process for size detection and another when content is read.
- Raw downloads, image previews, non-UTF-8 encodings, and streaming remain out of scope.
