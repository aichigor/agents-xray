'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const XR = require('../src/analyzer.js');
const demo = require('../src/demo.js');
const file = (path, content) => ({ path, ...(content === undefined ? {} : { content }) });
const scan = (content, extra = {}) => XR.analyze({ files: [file('AGENTS.md', content)], ...extra });
const has = (report, code) => report.findings.some(item => item.code === code);
const status = (report, path) => report.files.find(item => item.path === path)?.status;
const repeated = 'Always run the focused regression tests before opening a pull request.';

test('synthetic demo: two warnings and six suggestions', () => {
  const r = XR.analyze({ files: demo, cwd: 'apps/web', completeProject: true });
  assert.equal(r.summary.warnings, 2); assert.equal(r.summary.suggestions, 6);
  assert.deepEqual(r.chain, ['AGENTS.md', 'apps/web/AGENTS.override.md']);
});
test('duplicate lines include both source line numbers', () => {
  const r = scan(`# Rules\n- ${repeated}\n- ${repeated}`);
  const item = r.findings.find(item => item.code === 'RX001');
  assert.equal(item.line, 3); assert.equal(item.related.line, 2);
  assert.equal(r.summary.reviewCandidateBytes, XR.bytes(`- ${repeated}`));
});
test('generic reminders are suggestions, not errors', () => {
  const r = scan('You are a highly experienced software engineer.\nPlease think step by step.');
  assert.equal(r.summary.suggestions, 2); assert.equal(r.summary.errors, 0); assert.equal(r.summary.warnings, 0);
});
test('Chinese reminders are detected', () => assert.ok(has(scan('請一步一步思考。\n你是一位資深專業的軟體工程師。'), 'RX003')));
test('one critical instruction is not labeled generic filler', () => {
  const r = scan('Never commit secrets.\nNever delete production data.\n請勿洩漏任何 API Key。');
  assert.equal(r.findings.length, 0);
});
test('fenced examples do not count as instruction duplicates or filler', () => {
  const r = scan('```md\n' + repeated + '\n' + repeated + '\nPlease think step by step.\n```');
  assert.equal(r.findings.length, 0);
});
test('example sections are not linted as active instructions', () => {
  const r = scan('# Example\nPlease think step by step.\nUse `missing/file.js`.\n# Actual rules\nNever commit secrets.', { completeProject: true });
  assert.equal(r.findings.length, 0);
});
test('long instruction file alone is a review suggestion', () => {
  const r = scan('Keep these project constraints.\n'.repeat(280));
  assert.ok(has(r, 'RX004')); assert.equal(r.summary.errors, 0);
});
test('very long lines are bounded and visibly reported', () => {
  const r = scan('['.repeat(9000), { completeProject: true });
  assert.ok(has(r, 'RX006'));
});
test('excessive line counts are disclosed', () => {
  const r = scan('\n'.repeat(20002));
  assert.ok(r.notes.some(note => note.includes('20000')));
});
test('history section requires enough content', () => {
  assert.ok(has(scan('## Progress log\n' + Array.from({ length: 6 }, (_, i) => `Day ${i}: update`).join('\n')), 'RX005'));
  assert.equal(has(scan('## Progress log\nOne important decision.'), 'RX005'), false);
});
test('same-directory override does not erase the parent document', () => {
  const r = XR.analyze({ files: [file('AGENTS.md', 'Root rules.'), file('app/AGENTS.md', 'Old.'), file('app/AGENTS.override.md', 'New.')], cwd: 'app', completeProject: true });
  assert.deepEqual(r.chain, ['AGENTS.md', 'app/AGENTS.override.md']); assert.equal(status(r, 'app/AGENTS.md'), 'overridden');
});
test('blank overrides fall through to AGENTS.md', () => {
  const r = XR.analyze({ files: [file('AGENTS.override.md', ' \n\t'), file('AGENTS.md', 'Actual rules.')] });
  assert.deepEqual(r.chain, ['AGENTS.md']); assert.equal(status(r, 'AGENTS.override.md'), 'empty');
});
test('fallback order is deterministic and lower priority than defaults', () => {
  const r = XR.analyze({ files: [file('TEAM.md', 'team'), file('EXTRA.md', 'extra')], fallbackNames: ['TEAM.md', 'EXTRA.md'] });
  assert.deepEqual(r.chain, ['TEAM.md']); assert.equal(status(r, 'EXTRA.md'), 'overridden');
});
test('fallbacks are not automatically activated', () => {
  const r = XR.analyze({ files: [file('TEAM.md', 'team')] });
  assert.equal(r.files.length, 0);
});
test('files below or beside cwd are outside startup scope', () => {
  const r = XR.analyze({ files: [file('AGENTS.md', 'root'), file('app/AGENTS.md', 'app'), file('other/AGENTS.md', 'other')] });
  assert.deepEqual(r.chain, ['AGENTS.md']); assert.equal(status(r, 'app/AGENTS.md'), 'out-of-scope');
});
test('unreadable override makes lower-priority selection uncertain, not shadowed', () => {
  const r = XR.analyze({ files: [file('AGENTS.override.md'), file('AGENTS.md', 'rules')] });
  assert.equal(status(r, 'AGENTS.md'), 'uncertain'); assert.equal(has(r, 'RX101'), false); assert.ok(has(r, 'RX103'));
});
test('unreadable earlier files make later budget uncertain', () => {
  const r = XR.analyze({ files: [file('AGENTS.md'), file('app/AGENTS.md', 'rules')], cwd: 'app', completeProject: true });
  assert.equal(status(r, 'app/AGENTS.md'), 'uncertain'); assert.equal(r.summary.loadedBytes, 0);
});
test('budget truncation reports source bytes and exhausted child documents', () => {
  const r = XR.analyze({ files: [file('AGENTS.md', 'abcdef'), file('a/AGENTS.md', 'child')], cwd: 'a', maxBytes: 4 });
  assert.equal(status(r, 'AGENTS.md'), 'truncated'); assert.equal(status(r, 'a/AGENTS.md'), 'budget-exhausted'); assert.equal(r.summary.loadedBytes, 4);
});
test('UTF-8 truncation never inserts broken characters', () => {
  assert.equal(XR.utf8Prefix('中文', 4), '中'); assert.equal(XR.utf8Prefix('😀x', 3), '');
  const r = scan('中文', { maxBytes: 4 }); assert.equal(r.summary.loadedBytes, 3); assert.equal(r.effectiveText.includes('�'), false);
});
test('zero budget is accepted and loads nothing', () => {
  const r = scan('Some rules.', { maxBytes: 0 }); assert.equal(r.summary.loadedBytes, 0); assert.ok(has(r, 'RX102'));
});
test('duplicate lines across currently loaded files are reported', () => {
  const r = XR.analyze({ files: [file('AGENTS.md', repeated), file('app/AGENTS.md', repeated)], cwd: 'app' });
  assert.ok(has(r, 'RX002')); assert.equal(r.summary.reviewCandidateBytes, XR.bytes(repeated));
});
test('duplicates in unloaded siblings do not add active review bytes', () => {
  const r = XR.analyze({ files: [file('AGENTS.md', 'root'), file('app/AGENTS.md', repeated + '\n' + repeated)] });
  assert.equal(r.summary.reviewCandidateBytes, 0); assert.equal(has(r, 'RX002'), false);
});
test('candidate bytes are deduplicated across multiple finding types', () => {
  const generic = 'You are a highly experienced software engineer.';
  const r = scan(generic + '\n' + generic);
  assert.equal(r.summary.reviewCandidateBytes, XR.bytes(generic) * 2);
});
test('text-only mode does not assert missing paths or scripts', () => {
  const r = scan('Read `missing/file.ts` and run `npm run absent`.');
  assert.equal(has(r, 'RX202'), false); assert.equal(has(r, 'RX201'), false); assert.ok(r.assumptions.some(note => note.includes('NOT verified')));
});
test('explicit missing paths are reported when project inventory is supplied', () => {
  const r = scan('Read [Guide](docs/dead.md).', { completeProject: true }); assert.ok(has(r, 'RX202'));
});
test('existing paths and inferred directories do not trigger missing warnings', () => {
  const r = scan('Read `src/` and `src/app.js`.', { completeProject: true, files: [file('AGENTS.md', 'Read `src/` and `src/app.js`.'), file('src/app.js')] });
  assert.equal(has(r, 'RX202'), false);
});
test('Markdown links resolve relative to instruction file, including parent segments', () => {
  const r = XR.analyze({ files: [file('app/AGENTS.md', 'See [Guide](../docs/guide.md).'), file('docs/guide.md')], completeProject: true, cwd: 'app' });
  assert.equal(has(r, 'RX202'), false);
});
test('escaped link paths and anchors are supported', () => {
  const r = XR.analyze({ files: [file('AGENTS.md', 'See [Guide](docs/my%20guide.md#rules).'), file('docs/my guide.md')], completeProject: true });
  assert.equal(has(r, 'RX202'), false);
});
test('absolute, URL, glob, excluded and proposed paths are not mislabeled as missing', () => {
  const r = scan('Use `src/*.ts`.\nRead [Web](https://example.com/guide).\nRead `/tmp/log.txt`.\nRead `dist/output.js`.\nCreate `new/file.js`.\n建立 `new/file.ts`。', { completeProject: true });
  assert.equal(has(r, 'RX202'), false);
});
test('unknown symlink subtree is not treated as missing', () => {
  const r = XR.analyze({ files: [file('AGENTS.md', 'Read `linked/file.js`.'), { path: 'linked', unreadable: true }], completeProject: true });
  assert.equal(has(r, 'RX202'), false);
});
test('commands are checked against cwd package, not instruction directory', () => {
  const r = XR.analyze({ files: [file('AGENTS.md', 'Run `npm run web`.'), file('package.json', '{"scripts":{"root":"ok"}}'), file('app/package.json', '{"scripts":{"web":"ok"}}')], cwd: 'app', completeProject: true });
  assert.equal(has(r, 'RX201'), false);
});
test('missing explicit npm scripts get contextual warnings', () => {
  const r = XR.analyze({ files: [file('AGENTS.md', 'Run `npm run lint`.'), file('package.json', '{"scripts":{"test":"ok"}}')], completeProject: true });
  assert.ok(has(r, 'RX201')); assert.equal(r.findings.find(item => item.code === 'RX201').confidence, 'contextual');
});
test('fenced shell commands are checked without being executed', () => {
  const r = XR.analyze({ files: [file('AGENTS.md', '```sh\nnpm run missing\n```'), file('package.json', '{"scripts":{}}')], completeProject: true });
  assert.ok(has(r, 'RX201'));
});
test('workspace, optional and compound commands require review instead of false failure', () => {
  const r = XR.analyze({ files: [file('AGENTS.md', 'Run `npm run absent --if-present`.\nRun `npm run absent --workspace app`.\nRun `npm run absent && echo done`.'), file('package.json', '{}')], completeProject: true });
  assert.equal(has(r, 'RX201'), false); assert.equal(r.findings.filter(item => item.code === 'RX203').length, 3);
});
test('invalid package manifests are surfaced and skip script existence checks', () => {
  const r = XR.analyze({ files: [file('AGENTS.md', 'Run `npm run test`.'), file('package.json', '{no')], completeProject: true });
  assert.ok(has(r, 'RX204')); assert.equal(has(r, 'RX201'), false);
});
test('no manifest means unverified, not missing scripts', () => {
  const r = scan('Run `npm run test`.', { completeProject: true }); assert.equal(has(r, 'RX201'), false); assert.ok(r.notes.length);
});
test('manifest prototype properties are not treated as scripts', () => {
  const r = XR.analyze({ files: [file('AGENTS.md', 'Run `npm run toString`.'), file('package.json', '{"scripts":{}}')], completeProject: true });
  assert.ok(has(r, 'RX201'));
});
test('path normalization supports Windows separators and rejects escape/absolute paths', () => {
  assert.equal(XR.normalizePath('apps\\web'), 'apps/web'); assert.equal(XR.normalizePath('./apps/../web'), 'web');
  for (const path of ['../oops', '/tmp/x', 'C:\\secret', 'a/../../b', 'a\u0000b']) assert.throws(() => XR.normalizePath(path));
});
test('unknown cwd in complete project is an input error', () => assert.throws(() => scan('rules', { completeProject: true, cwd: 'nonexistent' }), /Working directory not found/));
test('duplicate input paths are rejected, including normalized aliases', () => assert.throws(() => XR.analyze({ files: [file('AGENTS.md', 'a'), file('./AGENTS.md', 'b')] }), /Duplicate input path/));
test('invalid fallbacks and byte limits are rejected', () => {
  for (const fallback of ['../x', 'a/b', '.', 'package.json']) assert.throws(() => XR.instructionNames([fallback]));
  for (const limit of [-1, NaN, 3.5, Infinity, 8388609]) assert.throws(() => scan('a', { maxBytes: limit }));
});
test('oversized supplied file content is rejected', () => assert.throws(() => scan('a'.repeat(XR.LIMITS.fileBytes + 1)), /safety limits/));
test('excluded dependency instructions are not scanned', () => {
  const r = XR.analyze({ files: [file('AGENTS.md', 'root'), file('node_modules/pkg/AGENTS.md', 'Please think step by step.')] }); assert.equal(r.files.length, 1);
});
test('Markdown export escapes source HTML and Markdown image syntax', () => {
  const r = scan('rules'); r.findings.push({ code:'RX000',severity:'info',title:'<img src=x>',file:'![x](https://evil)',line:1,confidence:'review',inCurrentChain:true,evidence:'<script>alert(1)</script>',suggestion:'review' });
  const md = XR.toMarkdown(r); assert.equal(md.includes('<script>'), false); assert.equal(md.includes('![x]('), false);
});
test('input snapshots are not mutated', () => {
  const source = [Object.freeze(file('AGENTS.md', 'rules'))]; Object.freeze(source); assert.doesNotThrow(() => XR.analyze({ files: source }));
});
test('results are deterministic and contain explicit scope disclosures', () => {
  const opts = { files: demo, cwd: 'apps/web', completeProject: true };
  assert.deepEqual(XR.analyze(opts), XR.analyze(opts)); assert.ok(XR.analyze(opts).assumptions.length >= 6);
});
test('inactive child commands are not checked using an unrelated root cwd', () => {
  const r = XR.analyze({ files: [file('AGENTS.md', 'root'), file('app/AGENTS.md', 'Run `npm run web`.'), file('package.json', '{}'), file('app/package.json', '{"scripts":{"web":"ok"}}')], completeProject: true });
  assert.equal(has(r, 'RX201'), false);
});
