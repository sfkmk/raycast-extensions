# Fuzzy File Search

Raycast command that lets you fuzzy-find files by filename or full path. By default, searches focus on file and folder names for precision—enable "Match Full Path" in preferences to search anywhere in the full path.

![Screenshot of the command list](./metadata/fuzzy-file-search-1.png)

## Why Use It Instead of Raycast's Built-in Search Files?

- Matches folder names and file names together when "Match Full Path" is enabled (e.g. `algo home pdf` → `~/algorithms/homework.pdf`), or focus purely on filenames for precision.
- Keeps context when several files share the same name in different directories.
- Indexes with [`fd`](https://github.com/sharkdp/fd) and filters with [`fzf`](https://github.com/junegunn/fzf) for lightning-fast results on large trees.
- Offers quick actions (open, show in Finder, copy path, Quick Look) without leaving Raycast.

## How It Works

- On first run the extension downloads portable copies of `fd` and `fzf` to the Raycast support directory.
- The extension reuses the last local index immediately, then refreshes it in the background so search stays available while results catch up.
- Directories, hidden files, and filename-vs-path matching are filtered at query time, so those preference changes apply instantly without waiting for a rebuild.
- Search roots live in the `Manage Search Roots` command, where you can create named scopes from one or more folders and reuse them from the search dropdown.
- Filtering is delegated to `fzf`. By default, it matches against filenames only; enable "Match Full Path" in preferences to match anywhere in the full path.
- Search results show paths relative to the active scope, keeping the list compact while still showing where each result lives.

## Configure the Search

Open the Raycast extension preferences to tailor the results:

- `Include Directories`: show both directories and files (enabled by default).
- `Include Hidden`: surface dot-files and hidden folders.
- `Follow Symbolic Links`: descend into symlinked directories.
- `Match Full Path`: when disabled (default), searches match only against file and folder names. Enable it to search anywhere in the full path.
- `Ignore Spaces in Search`: strip spaces from the query so `src foo bar` behaves like `srcfoobar`.

## Manage Search Roots

- Use the `Manage Search Roots` command to create named search scopes like `Work`, `Projects`, or `Client Files`.
- Each scope can contain one or more folders selected from a directory picker, so paths with spaces work naturally.
- You can give each folder inside a scope its own label and badge color, which show up in search results for multi-root scopes.
- The manager also shows lightweight index insights such as entry count and last indexed time for each scope.

## Ignore Rules and `.fdignore`

`fd` respects the same ignore rules as the desktop CLI:

- `.gitignore`, `.git/info/exclude`, and `.ignore` files are obeyed automatically.
- `.fdignore` files are also honored. You can place them in any directory to prune matches.
- On first run the extension creates a global `$HOME/.config/fd/ignore` (if missing) with sensible defaults to keep the index snappy.
  Edit that file to fine-tune global ignores.

If you need different rules per project, add a `.fdignore` alongside the folders you index or rely on the project's `.gitignore`. The command will pick up the changes the next time the index is refreshed.

## Tips

- Large trees index fastest when unnecessary paths are ignored—tune your `.fdignore` to skip build output and vendor folders.
- Combine folder hints and filename fragments in the query to jump straight to the exact file you want.
