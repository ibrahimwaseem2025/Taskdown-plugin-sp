const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const html = readFileSync(join(__dirname, '..', 'index.html'), 'utf8');
const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];
const controlIds = ['tasks', 'project', 'tags', 'parseTags', 'parseNotes'];

async function loadPlugin(input, overrides = {}) {
  const elements = new Map();
  for (const match of html.matchAll(/<[^>]+\bid="([^"]+)"[^>]*>/g)) {
    const attributes = match[0]; const handlers = new Map();
    elements.set(match[1], {
      value: '', textContent: '', innerHTML: '', selectedOptions: [],
      checked: /\bchecked\b/.test(attributes), disabled: /\bdisabled\b/.test(attributes), hidden: /\bhidden\b/.test(attributes),
      addEventListener(event, handler) { handlers.set(event, handler); },
      emit(event) { return handlers.get(event)?.(); },
    });
  }
  const created = []; const notifications = []; const calls = [];
  let initialized; const ready = new Promise((resolve) => { initialized = resolve; });
  const api = {
    onReady(callback) { initialized(callback()); },
    async getAllProjects() { return [{ id: 'work', title: 'Work' }]; },
    async getAllTags() { return [{ id: 'tag-work', title: 'work' }]; },
    async addTask(data) {
      calls.push(data); await overrides.beforeAdd?.(data, calls.length);
      if (data.parentId) {
        const parent = created.find((task) => task.id === data.parentId);
        assert.ok(parent, 'Subtask must reference an existing parent');
        assert.equal(parent.parentId, null, 'Only one subtask level is supported');
      }
      const id = `task-${created.length + 1}`; created.push({ ...data, id }); return id;
    },
    showSnack(notification) { notifications.push(notification); return overrides.notify?.(notification); },
  };
  const context = vm.createContext({ document: { getElementById: (id) => elements.get(id) }, PluginAPI: api, console: { error() {} }, setTimeout });
  context.window = context;
  vm.runInContext(script, context, { filename: 'index.html' });
  await ready;
  const el = (id) => elements.get(id); el('tasks').value = input;
  return { el, created, calls, notifications, preview: () => el('previewBtn').emit('click'), import: () => el('importBtn').emit('click') };
}

test('builds independent notes and grouped checklists for each subtask', async () => {
  const input = [
    '- Prepare assignment',
    '  - Research',
    '    Notes go here as plain text.',
    '    **Critical**',
    '    - [ ] Find academic sources',
    '    - [x] Review literature',
    '    **Technical**',
    '    - [ ] Set up Zotero',
    '  - Write report',
    '    **Critical**',
    '    - [ ] Draft introduction',
    '    - [ ] Write methodology ((First task note))',
  ].join('\n');
  const app = await loadPlugin(input); app.preview();
  assert.equal(app.el('importBtn').disabled, false);
  await app.import();
  assert.equal(app.created.length, 3);
  assert.equal(app.created[0].title, 'Prepare assignment');
  assert.equal(app.created[0].notes, '');
  assert.equal(app.created[1].title, 'Research');
  assert.equal(app.created[1].parentId, 'task-1');
  assert.match(app.created[1].notes, /Notes go here as plain text\./);
  assert.match(app.created[1].notes, /\*\*Critical\*\*/);
  assert.match(app.created[1].notes, /- \[ \] Find academic sources/);
  assert.match(app.created[1].notes, /- \[x\] Review literature/);
  assert.match(app.created[1].notes, /\*\*Technical\*\*/);
  assert.match(app.created[1].notes, /- \[ \] Set up Zotero/);
  assert.equal(app.created[2].title, 'Write report');
  assert.equal(app.created[2].parentId, 'task-1');
  assert.match(app.created[2].notes, /- \[ \] Draft introduction/);
  assert.match(app.created[2].notes, /First task note/);
  assert.doesNotMatch(app.created[2].notes, /\(\(First task note\)\)/);
});

test('recognises an unlabelled checklist and adds the default Checklist heading', async () => {
  const app = await loadPlugin('- Task\n  - Child\n    - [ ] One\n    - [x] Two');
  await app.import();
  assert.equal(app.created[1].notes, '**Checklist**\n- [ ] One\n- [x] Two');
});

test('preserves Markdown note headings, bullets, and paragraphs on a subtask', async () => {
  const app = await loadPlugin('- Parent\n  - Child\n    # Heading 1\n    ## Heading 2\n    **Bold text**\n    - ordinary note bullet\n    A paragraph');
  await app.import();
  assert.equal(app.created[1].notes, '# Heading 1\n## Heading 2\n**Bold text**\n- ordinary note bullet\nA paragraph');
});

test('keeps project, known tag, and inline task notes working', async () => {
  const app = await loadPlugin('[wOrK]\n- Parent #work ((Check (CI)))\n  - Child ((Child note))');
  await app.import();
  assert.equal(app.created[0].title, 'Parent');
  assert.equal(app.created[0].projectId, 'work');
  assert.deepEqual(Array.from(app.created[0].tagIds), ['tag-work']);
  assert.equal(app.created[0].notes, 'Check (CI)');
  assert.equal(app.created[1].title, 'Child');
  assert.equal(app.created[1].parentId, 'task-1');
  assert.equal(app.created[1].notes, 'Child note');
});

test('blocks unknown projects, unknown tags, and unclosed inline notes', async () => {
  for (const input of ['[Unknown]\n- Task', '- Task #unknown', '- Task ((unclosed']) {
    const app = await loadPlugin(input); app.preview();
    assert.equal(app.el('importBtn').disabled, true, input);
    await app.import(); assert.equal(app.calls.length, 0, input);
  }
});

test('blocks checklist lines without an enclosing task', async () => {
  const app = await loadPlugin('- [ ] Orphan item'); app.preview();
  assert.match(app.el('errors').innerHTML, /checklist items must be indented beneath a task/);
  assert.equal(app.el('importBtn').disabled, true);
});

test('does not create third-level tasks; deeper dash bullets become subtask Markdown', async () => {
  const app = await loadPlugin('- Parent\n  - Child\n    - ordinary Markdown bullet');
  await app.import();
  assert.equal(app.created.length, 2);
  assert.equal(app.created[1].notes, '- ordinary Markdown bullet');
});

test('keeps partial import warning and prevents unchanged retry after API failure', async () => {
  const input = '- Parent\n  - Child';
  const app = await loadPlugin(input, { beforeAdd(_data, count) { if (count === 2) throw new Error('API failure'); } });
  await app.import();
  assert.equal(app.created.length, 1);
  assert.equal(app.el('tasks').value, input);
  assert.equal(app.el('importError').hidden, false);
  assert.equal(app.el('importBtn').disabled, true);
  await app.import(); assert.equal(app.calls.length, 2);
});

test('clears input after successful import', async () => {
  const app = await loadPlugin('- Task'); await app.import();
  assert.equal(app.created.length, 1);
  assert.equal(app.el('tasks').value, '');
  assert.equal(app.el('success').textContent, '1 task(s) created.');
});
