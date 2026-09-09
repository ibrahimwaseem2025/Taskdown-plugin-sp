const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const html = readFileSync(join(__dirname, '..', 'index.html'), 'utf8');
const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];
const controlIds = ['tasks', 'project', 'tags', 'parseTags', 'parseNotes', 'stripBullets'];

// Exercise the shipped script through its UI events, without exposing its private state.
async function loadPlugin(input, overrides = {}) {
  const elements = new Map();
  for (const match of html.matchAll(/<[^>]+\bid="([^"]+)"[^>]*>/g)) {
    const attributes = match[0];
    const handlers = new Map();
    elements.set(match[1], {
      value: '',
      textContent: '',
      innerHTML: '',
      selectedOptions: [],
      checked: /\bchecked\b/.test(attributes),
      disabled: /\bdisabled\b/.test(attributes),
      hidden: /\bhidden\b/.test(attributes),
      addEventListener(event, handler) { handlers.set(event, handler); },
      // Deliberately allow direct handler calls on disabled controls to test guards too.
      emit(event) { return handlers.get(event)?.(); },
    });
  }

  const created = [];
  const notifications = [];
  const calls = [];
  let initialized;
  const ready = new Promise((resolve) => { initialized = resolve; });
  const api = {
    onReady(callback) { initialized(callback()); },
    async getAllProjects() { return [{ id: 'work', title: 'Work' }]; },
    async getAllTags() { return [{ id: 'tag-work', title: 'work' }]; },
    async addTask(data) {
      calls.push(data);
      await overrides.beforeAdd?.(data, calls.length);
      if (data.parentId) {
        const parent = created.find((task) => task.id === data.parentId);
        assert.ok(parent, 'A subtask must reference an existing parent');
        if (parent.parentId) throw new Error('CANNOT_NEST_SUBTASKS');
      }
      const id = `task-${created.length + 1}`;
      created.push({ ...data, id });
      return id;
    },
    showSnack(notification) {
      notifications.push(notification);
      return overrides.notify?.(notification);
    },
  };

  const context = vm.createContext({
    document: { getElementById: (id) => elements.get(id) },
    PluginAPI: api,
    console: { error() {} },
    setTimeout,
  });
  context.window = context;
  vm.runInContext(script, context, { filename: 'index.html' });
  await ready;

  const el = (id) => elements.get(id);
  el('tasks').value = input;
  return {
    el, created, calls, notifications,
    preview: () => el('previewBtn').emit('click'),
    import: () => el('importBtn').emit('click'),
  };
}

for (const [name, input, line] of [
  ['spaces', 'Parent\n  Child\n    Grandchild', 3],
  ['tabs', 'Parent\n\tChild\n\t\tGrandchild', 3],
  ['mixed indentation', 'Parent\n \tChild\n    Grandchild', 3],
  ['indented root', '    Parent\n      Child\n        Grandchild', 3],
  ['blank lines and headings', '[Work]\nParent\n\n  Child\n    Grandchild', 5],
]) {
  test(`blocks the entire import for a third level: ${name}`, async () => {
    const app = await loadPlugin(input);
    app.preview();
    assert.match(app.el('errors').innerHTML, new RegExp(`Line ${line}: subtasks cannot have subtasks`));
    assert.equal(app.el('importBtn').disabled, true);
    await app.import();
    assert.equal(app.calls.length, 0);
    assert.equal(app.el('tasks').value, input);
  });
}

for (const [name, input, parents] of [
  ['siblings', 'Parent\n  Child A\n  Child B\nAnother parent', [null, 'task-1', 'task-1', null]],
  ['wide indentation', 'Parent\n        Child', [null, 'task-1']],
  ['indented root', '    Parent\n        Child', [null, 'task-1']],
  ['tabs and spaces at equal width', 'Parent\n\tChild A\n  Child B', [null, 'task-1', 'task-1']],
  ['project boundary', 'Parent\n  Child\n[Work]\n    New parent\n      New child', [null, 'task-1', null, 'task-3']],
]) {
  test(`accepts two levels and preserves parent links: ${name}`, async () => {
    const app = await loadPlugin(input);
    app.preview();
    assert.equal(app.el('errors').innerHTML, '');
    assert.equal(app.el('importBtn').disabled, false);
    await app.import();
    assert.deepEqual(app.created.map((task) => task.parentId), parents);
  });
}

test('revalidates at import time even when a valid preview previously existed', async () => {
  const app = await loadPlugin('Parent\n  Child');
  app.preview();
  app.el('tasks').value += '\n    Grandchild';
  await app.import();
  assert.equal(app.calls.length, 0);
  assert.match(app.el('errors').innerHTML, /Line 3/);
});

test('preview indentation follows parent links instead of space count', async () => {
  const narrow = await loadPlugin('Parent\n  Child');
  const wide = await loadPlugin('    Parent\n            Child');
  narrow.preview();
  wide.preview();
  assert.equal(wide.el('previewList').innerHTML, narrow.el('previewList').innerHTML);
});

for (const failOn of [1, 3]) {
  test(`failure on task ${failOn} preserves input and a visible report across previews and edits`, async () => {
    const input = 'Parent\n  Child A\n  Child B';
    const app = await loadPlugin(input, {
      beforeAdd(data, count) { if (count === failOn) throw new Error('Host rejected task'); },
    });
    await app.import();
    assert.equal(app.created.length, failOn - 1);
    assert.equal(app.el('tasks').value, input);
    assert.equal(app.el('importError').hidden, false);
    const report = app.el('importError').textContent;
    assert.match(report, new RegExp(`after ${failOn - 1} task\\(s\\) confirmed created`));
    assert.match(report, new RegExp(`Failed on line ${failOn}`));
    assert.match(report, /duplicates/);
    app.preview();
    assert.equal(app.el('importError').textContent, report);
    app.el('tasks').emit('input');
    assert.equal(app.el('importError').hidden, false);
    assert.equal(app.el('importError').textContent, report);
    for (const id of controlIds) assert.equal(app.el(id).disabled, false);
    assert.equal(app.el('previewBtn').disabled, false);
  });
}

test('success clears input but preserves its status after rendering the preview', async () => {
  const app = await loadPlugin('Parent\n  Child');
  await app.import();
  assert.equal(app.el('tasks').value, '');
  assert.equal(app.el('success').textContent, '2 task(s) created.');
  app.preview();
  assert.equal(app.el('success').textContent, '2 task(s) created.');
  assert.equal(app.el('preview').hidden, true);
  assert.equal(app.el('importBtn').disabled, true);
  assert.equal(app.el('importError').hidden, true);
});

test('locks the form and prevents a concurrent import while the API is pending', async () => {
  let release;
  const pending = new Promise((resolve) => { release = resolve; });
  const app = await loadPlugin('Parent\n  Child', { beforeAdd: () => pending });
  const importing = app.import();
  for (const id of [...controlIds, 'previewBtn', 'importBtn']) {
    assert.equal(app.el(id).disabled, true, `${id} must be locked`);
  }
  app.preview();
  await app.import();
  assert.equal(app.calls.length, 1);
  release();
  await importing;
  assert.equal(app.created.length, 2);
  for (const id of [...controlIds, 'previewBtn']) assert.equal(app.el(id).disabled, false);
});

for (const id of controlIds) {
  test(`changing ${id} invalidates and hides the old preview`, async () => {
    const app = await loadPlugin('Task');
    app.preview();
    assert.equal(app.el('importBtn').disabled, false);
    app.el(id).emit(id === 'tasks' ? 'input' : 'change');
    assert.equal(app.el('importBtn').disabled, true);
    assert.equal(app.el('preview').hidden, true);
    assert.equal(app.el('previewList').innerHTML, '');
    app.preview();
    assert.equal(app.el('importBtn').disabled, false);
  });
}

test('existing project, tag, note and bullet parsing still works', async () => {
  const app = await loadPlugin('[wOrK]\n- Parent #work ((Check (CI)))\n  [ ] Child ((Child note))');
  await app.import();
  assert.equal(app.created[0].title, 'Parent');
  assert.equal(app.created[0].projectId, 'work');
  assert.deepEqual(Array.from(app.created[0].tagIds), ['tag-work']);
  assert.equal(app.created[0].notes, 'Check (CI)');
  assert.equal(app.created[1].title, 'Child');
  assert.equal(app.created[1].parentId, 'task-1');
  assert.equal(app.created[1].notes, 'Child note');
});

for (const input of ['[Unknown]\nTask', 'Task #unknown', 'Task ((unclosed', '((note only))']) {
  test(`existing validation still blocks invalid input: ${input}`, async () => {
    const app = await loadPlugin(input);
    await app.import();
    assert.equal(app.calls.length, 0);
    assert.notEqual(app.el('errors').innerHTML, '');
  });
}

for (const [kind, notify] of [
  ['synchronous', () => { throw new Error('Snack failed'); }],
  ['asynchronous', () => Promise.reject(new Error('Snack failed'))],
]) {
  test(`${kind} notification failure does not turn a successful import into a failure`, async () => {
    const app = await loadPlugin('Task', { notify });
    await app.import();
    assert.equal(app.created.length, 1);
    assert.equal(app.el('tasks').value, '');
    assert.equal(app.el('importError').hidden, true);
    assert.equal(app.el('success').textContent, '1 task(s) created.');
  });
}

test('notification failure does not hide a partial import report', async () => {
  const app = await loadPlugin('Task A\nTask B', {
    beforeAdd(data, count) { if (count === 2) throw new Error('Import failed'); },
    notify() { throw new Error('Snack failed'); },
  });
  await app.import();
  assert.equal(app.el('importError').hidden, false);
  assert.match(app.el('importError').textContent, /after 1 task\(s\) confirmed created/);
});
