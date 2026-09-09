# Bulk Add Tasks for Super Productivity

Bulk-create Super Productivity tasks from pasted text using the official Plugin API.

Version: 0.1.1
Author: initialcrow

## Features

- One task per line
- `[Project Name]` headings to switch projects
- Indentation to create subtasks (two levels: tasks and their subtasks)
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
bulk-add-tasks-v0.1.1.zip
```

Then install it from Super Productivity:

1. Open Super Productivity.
2. Go to the plugin management screen.
3. Choose the option to install or import a plugin from a ZIP file.
4. Select `bulk-add-tasks-v0.1.1.zip`.
5. Enable the plugin if Super Productivity does not enable it automatically.

The ZIP must contain `manifest.json` and `index.html` at the archive root. Do not import the whole source folder unless you are installing it for development.

## Use

Open the plugin from Super Productivity's plugin menu, paste your task list, choose the default project and tags if needed, then click `Preview`.

If the preview is correct, click `Create tasks`.

The plugin only uses existing projects and tags. If a project heading or tag does not exist in Super Productivity, the preview shows an error and blocks the import.

Changing the text or any option requires a new preview. The form is locked while tasks are being created.

If an API call fails, the import stops and keeps your text. A persistent message shows the number of confirmed creations and the line that failed. Tasks already created are not rolled back. Before retrying, check the tasks in Super Productivity and reconcile them with your input: importing the whole list again can create duplicates. In particular, keep remaining subtasks attached to the correct parent; simply removing an already-created parent line changes their hierarchy.

## Syntax

```text
[Project Name]
Parent task #tag ((task note))
  Child task
  Another child task ((child note))
```

- `[Project Name]` changes the current project.
- Indentation is relative: a more-indented line becomes a child of the nearest preceding task with less indentation. Tabs count as two spaces.
- Only two levels are supported: tasks and their subtasks. A third level is reported with its line number and blocks the entire import before any task is created.
- Existing `#tags` are added to the task and removed from the title.
- `((notes))` are added as task notes and removed from the title.
- Common bullets such as `-`, `*`, `[ ]`, and `[x]` can be stripped automatically.

## Install for development

Load this folder from Super Productivity's plugin management screen, or build and import the release ZIP.

## Development notes

The plugin is intentionally dependency-free and iframe-only.

Super Productivity's iframe plugin documentation recommends keeping CSS, JavaScript, and small assets self-contained in `index.html`. Extra files from the ZIP are not part of the portable iframe contract, so this plugin keeps its runtime code inline.

`manifest.json` and `index.html` are sufficient for the runtime. The release ZIP keeps those files at the ZIP root.

## Tests

Run the regression tests with Node.js 22 or later, without installing dependencies:

```bash
node --test tests/*.test.cjs
```

The tests execute the inline JavaScript with a simulated DOM and Plugin API. They cover hierarchy validation, partial failures, persistent status messages, form locking, and preview invalidation. Before publishing, also import the ZIP into Super Productivity and check the UI and task creation there.

## Prepare a release ZIP

```bash
bash scripts/package-release.sh
```

The script reads the plugin version from `manifest.json`, creates `dist/bulk-add-tasks-v<version>/`, copies `manifest.json`, `index.html`, and `LICENSE`, and creates `dist/bulk-add-tasks-v<version>.zip` for direct import into Super Productivity.

To publish, push an annotated tag matching the manifest version (for example, `v0.1.1`). The GitHub Actions release workflow checks the version, runs the tests, builds the ZIP, and publishes it as a release asset. The tag annotation becomes the release notes.

## Changes in 0.1.1

- Reject nested subtasks in the preview and revalidate before importing.
- Display hierarchy using actual parent links, regardless of indentation width.
- Preserve success and partial-failure messages when refreshing the preview.
- Lock the form during import and require a new preview after option changes.
- Keep notification errors separate from task creation results.
- Include the MIT license in the repository and release ZIP.

## License

MIT — see [LICENSE](LICENSE).
