'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { parseArgs, collectProject, plainText } = require('../bin/agents-xray.js');
const root = path.resolve(__dirname, '..');
const cli = (...args) => spawnSync(process.execPath, [path.join(root, 'bin/agents-xray.js'), ...args], { encoding: 'utf8', cwd: root });

test('CLI help works without any dependencies', () => { const r = cli('--help'); assert.equal(r.status, 0); assert.match(r.stdout, /Usage:/); });
test('CLI version works', () => { const r = cli('--version'); assert.equal(r.status, 0); assert.equal(r.stdout.trim(), '0.1.0'); });
test('CLI emits machine-readable JSON', () => {
  const r = cli('examples/demo-project', '--cwd', 'apps/web', '--format', 'json');
  assert.equal(r.status, 0); const report = JSON.parse(r.stdout); assert.equal(report.summary.warnings, 2);
});
test('CLI warning threshold exits with 1', () => assert.equal(cli('examples/demo-project', '--cwd', 'apps/web', '--fail-on', 'warning').status, 1));
test('CLI invalid flag exits with 2', () => assert.equal(cli('--wrong').status, 2));
test('CLI invalid root exits with 2', () => assert.equal(cli('nonexistent-root-xyz').status, 2));
test('CLI supports Markdown and Chinese reports', () => { const r = cli('examples/demo-project', '--cwd', 'apps/web', '--format', 'md', '--lang', 'zh-TW'); assert.equal(r.status, 0); assert.match(r.stdout, /重複/); });
test('CLI parser rejects missing and invalid options', () => {
  for (const args of [['--cwd'], ['--format', 'xml'], ['--fail-on', 'everything'], ['--lang', 'xx'], ['--max-bytes', '-1'], ['--cwd', '../oops'], ['one', 'two']]) assert.throws(() => parseArgs(args));
});
test('collector never reads unrelated file contents or executes manifest scripts', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'agents-xray-'));
  try {
    fs.writeFileSync(path.join(tmp, 'AGENTS.md'), 'Run `npm run danger`.');
    fs.writeFileSync(path.join(tmp, 'package.json'), JSON.stringify({ scripts: { danger: 'exit 99' } }));
    fs.writeFileSync(path.join(tmp, '.env'), 'A_PRIVATE_VALUE=not-a-real-secret');
    const snapshot = collectProject(tmp, []);
    assert.equal(snapshot.files.find(file => file.path === '.env').content, undefined);
    assert.equal(cli(tmp).status, 0);
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
});
test('collector preserves empty directory inventory', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'agents-xray-'));
  try { fs.mkdirSync(path.join(tmp, 'empty')); const snapshot = collectProject(tmp, []); assert.ok(snapshot.files.some(file => file.path === 'empty' && file.kind === 'directory')); }
  finally { fs.rmSync(tmp, { recursive: true, force: true }); }
});
test('collector skips symbolic links and discloses them', t => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'agents-xray-'));
  try {
    fs.writeFileSync(path.join(tmp, 'real.md'), 'Please think step by step.');
    try { fs.symlinkSync(path.join(tmp, 'real.md'), path.join(tmp, 'AGENTS.md'), 'file'); } catch (error) { if (error.code === 'EPERM') { t.skip('Symlinks not permitted for this Windows account.'); return; } throw error; }
    const snapshot = collectProject(tmp, []); assert.equal(snapshot.files.find(file => file.path === 'AGENTS.md').content, undefined); assert.ok(snapshot.notes.some(note => note.includes('Symbolic link')));
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
});
test('terminal output strips ANSI/control-sequence introducers from evidence', () => {
  const XR = require('../src/analyzer.js'); const r = XR.analyze({ files: [{ path: 'AGENTS.md', content: 'rules' }] });
  r.notes.push('\x1b[31mInjected'); assert.equal(plainText(r).includes('\x1b'), false);
});
