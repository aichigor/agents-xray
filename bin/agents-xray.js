#!/usr/bin/env node
'use strict';
/** CLI: read-only filesystem adapter. Never executes inspected project commands. */
const fs = require('node:fs');
const path = require('node:path');
const XR = require('../src/analyzer.js');

function usage() {
  return `AGENTS X-Ray ${XR.VERSION} — inspect AGENTS.md without an AI call\n\n` +
    'Usage: node bin/agents-xray.js [project-folder] [options]\n\n' +
    '  --cwd <relative-directory>  Simulated working directory (default: root)\n' +
    '  --fallback <filename,...>  Additional filenames, in precedence order\n' +
    '  --max-bytes <integer>      Project byte budget (default: 32768)\n' +
    '  --format <text|json|md>    Output format (default: text)\n' +
    '  --lang <en|zh-TW>          Finding language (default: en)\n' +
    '  --fail-on <none|warning|error>  CI failure threshold (default: none)\n' +
    '  --version                 Print version\n' +
    '  --help                    Show this help\n\n' +
    'Exit codes: 0 completed; 1 chosen finding threshold reached; 2 input/tool error.\n' +
    'No network calls, command execution, source edits or automatic config discovery.\n';
}
function parseArgs(args) {
  const options = { root: '.', cwd: '', fallbackNames: [], maxBytes: 32768, format: 'text', locale: 'en', failOn: 'none' };
  let hasRoot = false;
  const flags = { '--cwd': 'cwd', '--fallback': 'fallbackNames', '--max-bytes': 'maxBytes', '--format': 'format', '--lang': 'locale', '--fail-on': 'failOn' };
  for (let index = 0; index < args.length; index++) {
    const arg = args[index];
    if (arg === '--help' || arg === '-h') return { help: true };
    if (arg === '--version') return { version: true };
    if (Object.hasOwn(flags, arg)) {
      const value = args[++index];
      if (value === undefined || value.startsWith('--')) throw new Error(`Missing value for ${arg}`);
      options[flags[arg]] = arg === '--fallback' ? value.split(',').map(item => item.trim()).filter(Boolean) : arg === '--max-bytes' ? Number(value) : value;
    } else if (arg.startsWith('-')) throw new Error(`Unknown option: ${arg}`);
    else if (hasRoot) throw new Error('Only one project folder can be provided.');
    else { options.root = arg; hasRoot = true; }
  }
  if (!['text', 'json', 'md'].includes(options.format)) throw new Error('--format must be text, json or md.');
  if (!['en', 'zh-TW'].includes(options.locale)) throw new Error('--lang must be en or zh-TW.');
  if (!['none', 'warning', 'error'].includes(options.failOn)) throw new Error('--fail-on must be none, warning or error.');
  XR.instructionNames(options.fallbackNames);
  XR.normalizePath(options.cwd);
  if (!Number.isSafeInteger(options.maxBytes) || options.maxBytes < 0 || options.maxBytes > XR.LIMITS.textBytes) throw new Error('Invalid --max-bytes value.');
  return options;
}
function collectProject(rootInput, fallbackNames) {
  const root = fs.realpathSync(path.resolve(rootInput));
  if (!fs.statSync(root).isDirectory()) throw new Error('The project path must be a folder.');
  const files = [], notes = [];
  let textBytes = 0;
  function walk(relative) {
    let entries;
    try { entries = fs.readdirSync(path.join(root, relative), { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name, 'en')); }
    catch (error) { throw new Error(`Cannot enumerate ${relative || '.'}: ${error.code}. The scan was stopped rather than treating unknown files as missing.`); }
    for (const entry of entries) {
      const rel = XR.normalizePath(relative ? `${relative}/${entry.name}` : entry.name);
      if (XR.isIgnored(rel)) continue;
      if (files.length >= XR.LIMITS.entries) throw new Error('Project exceeds 30000 inventory entries. Select a smaller project root.');
      if (entry.isSymbolicLink()) {
        notes.push(`Symbolic link not followed: ${rel}`);
        files.push({ path: rel, unreadable: true });
      } else if (entry.isDirectory()) {
        files.push({ path: rel, kind: 'directory' }); walk(rel);
      } else if (entry.isFile()) {
        const item = { path: rel };
        if (XR.needsContent(rel, fallbackNames)) {
          const absolute = path.join(root, rel);
          let fd;
          try {
            // O_NOFOLLOW is available on Unix. Symlinks are already skipped above.
            fd = fs.openSync(absolute, fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW || 0));
            const stat = fs.fstatSync(fd);
            if (!stat.isFile()) throw new Error('Not a regular file');
            if (stat.size > XR.LIMITS.fileBytes) throw new Error('File exceeds 1 MiB text limit');
            if (textBytes + stat.size > XR.LIMITS.textBytes) throw new Error('Combined text exceeds 8 MiB limit');
            const content = fs.readFileSync(fd, 'utf8');
            const size = XR.bytes(content);
            if (size > XR.LIMITS.fileBytes || textBytes + size > XR.LIMITS.textBytes) throw new Error('Decoded text exceeds safety limits');
            item.content = content; textBytes += size;
          } catch (error) { item.unreadable = true; notes.push(`Content not read: ${rel} (${error.code || error.message})`); }
          finally { if (fd !== undefined) fs.closeSync(fd); }
        }
        files.push(item);
      }
    }
  }
  walk('');
  return { files, notes };
}
function plainText(report) {
  const lines = [`AGENTS X-Ray ${report.version}`, `Working directory: ${report.cwd} | Mode: ${report.mode}`,
    `Loaded: ${report.summary.loadedFiles} files, ${report.summary.loadedBytes} bytes. Review candidates: ${report.summary.reviewCandidateBytes} bytes (not validated savings).`,
    `Findings: ${report.summary.errors} errors, ${report.summary.warnings} warnings, ${report.summary.suggestions} suggestions.`, '', 'FILES'];
  for (const file of report.files) lines.push(`  [${file.status}] ${file.path} (${file.includedBytes}/${file.byteCount ?? '?'} bytes)`);
  lines.push('', 'FINDINGS');
  if (!report.findings.length) lines.push('  No findings from the implemented checks; not a guarantee of correctness.');
  for (const item of report.findings) lines.push(`  ${item.severity.toUpperCase()} ${item.code} ${item.file}:${item.line} ${item.title}`, `    ${item.evidence}`, `    ${item.suggestion}`);
  lines.push('', 'LIMITATIONS');
  for (const note of [...report.assumptions, ...report.notes]) lines.push(`  - ${note}`);
  // Terminal escape sequences can occur in malicious instruction content.
  return lines.join('\n').replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f-\x9f]/g, '') + '\n';
}
function main(args) {
  try {
    const options = parseArgs(args);
    if (options.help) { process.stdout.write(usage()); return 0; }
    if (options.version) { process.stdout.write(XR.VERSION + '\n'); return 0; }
    const snapshot = collectProject(options.root, options.fallbackNames);
    const report = XR.analyze({ ...options, files: snapshot.files, completeProject: true });
    report.notes.push(...snapshot.notes);
    const output = options.format === 'json' ? JSON.stringify(report, null, 2) + '\n' : options.format === 'md' ? XR.toMarkdown(report) + '\n' : plainText(report);
    process.stdout.write(output);
    return options.failOn === 'warning' && report.summary.warnings + report.summary.errors > 0 || options.failOn === 'error' && report.summary.errors > 0 ? 1 : 0;
  } catch (error) {
    process.stderr.write(`AGENTS X-Ray: ${String(error.message).replace(/[\x00-\x1f\x7f-\x9f]/g, '')}\n`);
    return 2;
  }
}
if (require.main === module) process.exitCode = main(process.argv.slice(2));
module.exports = { parseArgs, collectProject, plainText, main };
