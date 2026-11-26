# Markdown Task Importer for Super Productivity

A Markdown-first task importer for [Super Productivity](https://super-productivity.com/). Create structured tasks, subtasks, and categorized checklists from a simple text format, review the result, and import it through the official Plugin API.

## Features

- Create tasks and subtasks using indentation.
- Organize checklist items into named categories.
- Support checked and unchecked checklist items.
- Use a default checklist category when no category is specified.
- Add and edit detailed task notes separately from the task structure.
- Review and validate tasks before importing.
- Configure task metadata through the editor.
- Use the official Super Productivity Plugin API.

## Example

```markdown
- Prepare assignment
  - Research
    **Critical**
    - [ ] Find academic sources
    - [ ] Review relevant literature
    **Technical**
    - [ ] Set up Zotero
    - [ ] Export bibliography
  - Write report
    **Critical**
    - [ ] Draft introduction
    - [ ] Write methodology
```

## How it works

The importer reads the input and builds a structured task hierarchy.

1. **Write** your task structure using the Markdown-style syntax.
2. **Review** the parsed tasks, subtasks, and checklist items.
3. **Edit** task details and metadata where needed.
4. **Validate** the input before importing.
5. **Import** the approved structure into Super Productivity.

No tasks are created until the preview has been reviewed and the import is confirmed.

## Input syntax

| Syntax | Meaning |
|---|---|
| `- Task title` | Creates a task |
| Indented `- Task title` | Creates a child task |
| `**Category**` | Starts a named checklist category |
| `- [ ] Item` | Creates an unchecked checklist item |
| `- [x] Item` | Creates a checked checklist item |

Checklist items belong to the most recently declared category. If no category is specified, they belong to the default `Checklist` category.

Task hierarchy is determined by indentation. The parser validates the structure and reports errors with line numbers before importing.

## Notes and metadata

Detailed task notes are kept separate from the task hierarchy and checklist input. This allows notes to contain ordinary Markdown without conflicting with structural syntax.

Task metadata can be reviewed and edited through the importer before creation.

## Design principles

- **Markdown-first:** Keep the input readable and easy to write.
- **Preview before import:** Never create tasks from unreviewed input.
- **Validation first:** Reject invalid structures before making API calls.
- **Separation of concerns:** Keep task hierarchy, checklists, notes, and metadata distinct.
- **Reliable imports:** Report partial failures clearly and avoid silently duplicating tasks.

## Origin

This project is a fork of [InitialCrow/bulk-add-tasks-plugin](https://github.com/InitialCrow/bulk-add-tasks-plugin).

The original project provided the starting point for bulk task creation through the Super Productivity Plugin API. This fork develops that foundation into a Markdown-first importer with a different input format and workflow.

The original project is licensed under the MIT License. See [LICENSE](LICENSE) for the license and attribution details.

## Development

The project uses the Super Productivity Plugin API. Refer to the source code and tests for implementation details.

## License

MIT — see [LICENSE](LICENSE).
