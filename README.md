# Bulk Add Tasks for Super Productivity

Bulk-create Super Productivity tasks from pasted text using the official Plugin API.

Version: 0.1.0
Author: initialcrow

## Features

- One task per line
- `[Project Name]` headings to switch projects
- Indentation to create subtasks
- Optional parsing of existing `#tags`
- Optional parsing of inline `((notes))`
- Default project and tags
- Preview and validation before creation
- No network access
- No Node/shell permission
- No external dependencies

## Example

```text
Prepare release #work ((Check CI before publishing))
  Run tests
  Update changelog

[Personal]
Buy coffee #errands ((Use the discount card))
Call dentist
```

## Install for development

Use Super Productivity's plugin management screen and load the plugin folder (or install the release ZIP, depending on your version).

## Development notes

The plugin is intentionally dependency-free and iframe-only.

Super Productivity's iframe plugin documentation recommends keeping CSS, JavaScript, and small assets self-contained in `index.html`. Extra files from the ZIP are not part of the portable iframe contract, so this plugin keeps its runtime code inline.

`manifest.json` and `index.html` are sufficient for the runtime. The release ZIP keeps those files at the ZIP root.

## Prepare a release ZIP

```bash
bash scripts/package-release.sh
```

The script reads the plugin version from `manifest.json`, creates `dist/bulk-add-tasks-v<version>/`, copies only `manifest.json` and `index.html`, and creates `dist/bulk-add-tasks-v<version>.zip` for direct import into Super Productivity.

## License

MIT
