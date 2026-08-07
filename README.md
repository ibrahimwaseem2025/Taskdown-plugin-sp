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

## Install

Download the release ZIP file:

```text
bulk-add-tasks-v0.1.0.zip
```

Then install it from Super Productivity:

1. Open Super Productivity.
2. Go to the plugin management screen.
3. Choose the option to install or import a plugin from a ZIP file.
4. Select `bulk-add-tasks-v0.1.0.zip`.
5. Enable the plugin if Super Productivity does not enable it automatically.

The ZIP must contain `manifest.json` and `index.html` at the archive root. Do not import the whole source folder unless you are installing it for development.

## Use

Open the plugin from Super Productivity's plugin menu, paste your task list, choose the default project and tags if needed, then click `Preview`.

If the preview is correct, click `Create tasks`.

The plugin only uses existing projects and tags. If a project heading or tag does not exist in Super Productivity, the preview shows an error and blocks the import.

## Syntax

```text
[Project Name]
Parent task #tag ((task note))
  Child task
  Another child task ((child note))
```

- `[Project Name]` changes the current project.
- Indentation creates subtasks.
- Existing `#tags` are added to the task and removed from the title.
- `((notes))` are added as task notes and removed from the title.
- Common bullets such as `-`, `*`, `[ ]`, and `[x]` can be stripped automatically.

## Install for development

Load this folder from Super Productivity's plugin management screen, or build and import the release ZIP.

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
