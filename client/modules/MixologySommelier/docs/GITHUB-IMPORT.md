# GitHub Import (File Viewer)

This project includes a "Import from GitHub" button in the Chat & History panel.
It lets you fetch files from a public or private GitHub repository and view them inline in the File Viewer.

## How it works

- Uses GitHub REST API from your browser (no server keys).
- Optionally uses a Personal Access Token (PAT) stored only in your browser `localStorage`.
- Pulls the repo file tree and fetches text files (ts, tsx, js, jsx, css, md, json, html, txt).
- Large/binary files are skipped. Up to ~500 files are fetched to avoid rate limits.

## Steps

1. Open Studio → Chat & History.
2. Click "Import from GitHub".
3. Enter one of:
   - owner/repo
   - Full URL: https://github.com/owner/repo (supports URLs like /tree/<branch>/<subdir>)
4. Optional: branch and subdirectory.
5. Optional: GitHub PAT for private repos or higher rate-limits.
   - Create a Fine‑grained token with read-only Repository contents.
   - Paste it in the dialog. It is saved only in your browser (not committed).
6. Click Import. The module appears under "File Viewer" and the first file opens automatically.

## Local terminal alternative (if browser import is not enough)

If you prefer cloning locally (for very large repos or binary assets):

```
# On your machine terminal
# 1) Clone the repo
git clone https://github.com/owner/repo.git
cd repo

# 2) Optionally checkout a branch and filter a subdir
# git checkout main
# rsync -av subdir/ ../target-folder/

# 3) Drag and drop the desired folder into the app's Search/Drop box
#    to load it into the File Viewer.
```

## Notes

- We do not store your token on the server.
- For private repos your token must have read access.
- API limits may truncate large repos; re-import with a narrower subdirectory if needed.
