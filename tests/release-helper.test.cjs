const assert = require('node:assert/strict');
const { mkdtempSync, mkdirSync, copyFileSync, writeFileSync, rmSync, openSync, closeSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join } = require('node:path');
const { spawnSync } = require('node:child_process');
const test = require('node:test');

// All commits, tags and pushes in these tests stay in disposable local repositories.
function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), 'bulk-release-test-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const repo = join(root, 'repo');
  const remote = join(root, 'remote.git');
  mkdirSync(repo);
  const env = {
    ...process.env,
    GIT_AUTHOR_NAME: 'Release Test', GIT_AUTHOR_EMAIL: 'test@example.invalid',
    GIT_COMMITTER_NAME: 'Release Test', GIT_COMMITTER_EMAIL: 'test@example.invalid',
    GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_GLOBAL: '/dev/null',
  };
  // The helper starts its own test runner, independent of the runner testing it.
  delete env.NODE_TEST_CONTEXT;
  function git(...args) {
    const result = spawnSync('git', args, { cwd: repo, env, encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
    return result.stdout.trim();
  }
  git('init', '-b', 'main');
  git('init', '--bare', remote);
  git('remote', 'add', 'origin', remote);
  copyFileSync(join(__dirname, '..', 'commit.sh'), join(repo, 'commit.sh'));
  writeFileSync(join(repo, 'manifest.json'), JSON.stringify({ version: '0.1.2' }));
  mkdirSync(join(repo, 'scripts'));
  writeFileSync(join(repo, 'scripts/package-release.sh'), '#!/bin/bash\nexit 0\n');
  mkdirSync(join(repo, 'tests'));
  writeFileSync(join(repo, 'tests/fixture.test.cjs'), 'require("node:test")("fixture", () => {});\n');
  git('add', '.');
  git('commit', '-m', 'Initial fixture');
  git('push', 'origin', 'main');
  writeFileSync(join(repo, 'change.txt'), 'A change to release\n');
  return {
    git, remote,
    run(input = 'y\nRelease test\nRelease notes\n') {
      const inputPath = join(root, 'answers.txt');
      writeFileSync(inputPath, input);
      const fd = openSync(inputPath, 'r');
      try {
        return spawnSync('bash', ['commit.sh'], {
          cwd: repo, env, stdio: [fd, 'pipe', 'pipe'], encoding: 'utf8', timeout: 20000,
        });
      } finally {
        closeSync(fd);
      }
    },
  };
}

for (const location of ['local', 'remote']) {
  test(`release helper refuses an existing ${location} tag without changing commits or tags`, (t) => {
    const app = fixture(t);
    app.git('tag', '-a', 'v0.1.2', '-m', 'Existing release');
    app.git('push', 'origin', 'refs/tags/v0.1.2');
    if (location === 'remote') app.git('tag', '-d', 'v0.1.2');
    const beforeHead = app.git('rev-parse', 'HEAD');
    const beforeRefs = app.git('ls-remote', 'origin');
    const result = app.run();
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /already exists/);
    assert.equal(app.git('rev-parse', 'HEAD'), beforeHead);
    assert.equal(app.git('ls-remote', 'origin'), beforeRefs);
    assert.match(app.git('status', '--short'), /change.txt/);
  });
}

test('release helper fails before committing when remote tag verification fails', (t) => {
  const app = fixture(t);
  const beforeHead = app.git('rev-parse', 'HEAD');
  app.git('remote', 'set-url', 'origin', `${app.remote}-missing`);
  const result = app.run();
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Could not check remote tags/);
  assert.equal(app.git('rev-parse', 'HEAD'), beforeHead);
  assert.equal(app.git('tag', '--list'), '');
});

test('release helper pushes a new annotated tag and preserves existing tags', (t) => {
  const app = fixture(t);
  app.git('tag', '-a', 'v0.1.1', '-m', 'Previous release');
  app.git('push', 'origin', 'refs/tags/v0.1.1');
  const previousTag = app.git('ls-remote', 'origin', 'refs/tags/v0.1.1');
  const result = app.run();
  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.match(result.stdout, /GitHub Actions will test, build, and publish/);
  assert.equal(app.git('cat-file', '-t', 'v0.1.2'), 'tag');
  assert.equal(app.git('for-each-ref', '--format=%(contents)', 'refs/tags/v0.1.2'), 'Release notes');
  assert.equal(app.git('rev-parse', 'HEAD'), app.git('rev-parse', 'v0.1.2^{}'));
  assert.equal(app.git('ls-remote', 'origin', 'refs/heads/main').split('\t')[0], app.git('rev-parse', 'HEAD'));
  assert.equal(app.git('ls-remote', 'origin', 'refs/tags/v0.1.2').split('\t')[0], app.git('rev-parse', 'v0.1.2'));
  assert.equal(app.git('ls-remote', 'origin', 'refs/tags/v0.1.1'), previousTag);
});

test('commit-only mode pushes the commit without creating a tag', (t) => {
  const app = fixture(t);
  const result = app.run('n\nCommit only\n');
  assert.equal(result.status, 0, result.stderr);
  assert.equal(app.git('tag', '--list'), '');
  assert.equal(app.git('ls-remote', 'origin', 'refs/heads/main').split('\t')[0], app.git('rev-parse', 'HEAD'));
});
