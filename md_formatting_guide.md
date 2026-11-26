# Markdown Formatting Guide

Generate task lists compatible with the Taskdown Super Productivity plugin.

Follow these formatting rules so the output can be pasted directly into the importer.

## 1. Task hierarchy

Use Markdown bullets for tasks.

- Root tasks start at the beginning of a line.
- Subtasks use two spaces of indentation.
- Only two task levels are supported. Do not create nested subtasks.

Example:

```markdown
- Prepare assignment
  - Research
  - Write report
- Prepare presentation
  - Create slides
  - Rehearse
```

## 2. Checklists

Use Markdown checkbox syntax for individual checklist items:

- `- [ ]` for incomplete items.
- `- [x]` for completed items.

Indent checklist items under the task or subtask they belong to.

## 3. Checklist categories

Use standalone bold headings to group related checklist items.

```markdown
- Research
  **Literature**
  - [ ] Find academic sources
  - [ ] Review related studies

  **Technical**
  - [ ] Set up Zotero
  - [ ] Organize references
```

Categories are Markdown headings stored in task notes, not separate native checklist objects.

## 4. Notes

Add explanatory text underneath the relevant task or subtask. Notes can contain paragraphs, headings, links, bold text, and ordinary Markdown bullet lists.

Keep notes separate from task titles. Do not turn explanations into tasks unless they describe an actionable activity.

## 5. Projects and tags

Use `[Project Name]` to select a project and `#tag` to assign a tag.

Only use project names and tags explicitly supplied or confirmed by the user. Do not invent them.

## 6. Complete example

```markdown
[University Assignment]

- Prepare assignment
  This assignment investigates the selected research topic.

  - Research
    Review existing studies and identify research gaps.

    **Literature Review**
    - [ ] Find academic sources
    - [ ] Review related studies
    - [x] Identify research gaps

    **Research Tools**
    - [ ] Set up Zotero
    - [ ] Organize references
    - [ ] Export bibliography

  - Write report
    **Report Sections**
    - [ ] Draft introduction
    - [ ] Write literature review
    - [ ] Write methodology
    - [ ] Write conclusion

- Prepare presentation
  - Create slides
  - Rehearse presentation
```

## 7. Before returning the output

Check that:

- Task hierarchy has no more than two levels.
- Checklist items use valid checkbox syntax.
- Categories use standalone bold headings.
- Notes belong to the correct task.
- No unconfirmed projects or tags are included.
- The result is valid Markdown and ready to paste into Taskdown.

Return only the Markdown task list unless the user requests an explanation.
