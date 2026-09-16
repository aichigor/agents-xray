/* AGENTS X-Ray. MIT licensed. Shared, dependency-free browser/Node analysis engine. */
(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.AgentsXray = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const VERSION = '0.1.0';
  const VERIFIED_DATE = '2026-09-16';
  const LIMITS = Object.freeze({ entries: 30000, fileBytes: 1048576, textBytes: 8388608, lintLines: 20000, lintLineCharacters: 8192 });
  const IGNORED_DIRS = Object.freeze(['.git', 'node_modules', '.venv', 'venv', '.next', '.cache', 'dist', 'build', 'coverage', 'vendor']);
  const DEFAULT_NAMES = Object.freeze(['AGENTS.override.md', 'AGENTS.md']);
  const encoder = new TextEncoder();
  const bytes = text => encoder.encode(text).length;
  const own = (object, key) => Object.prototype.hasOwnProperty.call(object, key);
  const tx = (locale, en, zh) => locale === 'zh-TW' ? zh : en;

  /** Normalize only repository-relative paths; never silently accept an escape. */
  function normalizePath(input) {
    if (typeof input !== 'string' || /[\x00-\x1f\x7f]/.test(input)) throw new Error('Invalid path: expected a relative path without control characters.');
    const value = input.replace(/\\/g, '/');
    if (value.startsWith('/') || /^[a-zA-Z]:/.test(value)) throw new Error('Paths must be relative to the selected project root.');
    const parts = [];
    for (const part of value.split('/')) {
      if (!part || part === '.') continue;
      if (part === '..') {
        if (!parts.length) throw new Error('Path escapes the selected project root.');
        parts.pop();
      } else parts.push(part);
    }
    return parts.join('/');
  }
  const dirname = path => path.includes('/') ? path.slice(0, path.lastIndexOf('/')) : '';
  const basename = path => path.slice(path.lastIndexOf('/') + 1);
  const join = (left, right) => normalizePath(left ? `${left}/${right}` : right);
  function ancestors(path) {
    const result = [''];
    let current = '';
    for (const part of path.split('/').filter(Boolean)) { current = current ? `${current}/${part}` : part; result.push(current); }
    return result;
  }
  function isIgnored(path) { return path.replace(/\\/g, '/').split('/').some(part => IGNORED_DIRS.includes(part)); }
  function instructionNames(fallbackNames = []) {
    if (!Array.isArray(fallbackNames) || fallbackNames.length > 20) throw new Error('At most 20 fallback filenames are supported.');
    const result = [...DEFAULT_NAMES];
    for (const name of fallbackNames) {
      if (typeof name !== 'string' || !name.trim() || name === '.' || name === '..' || /[\\/\x00-\x1f\x7f]/.test(name)) {
        throw new Error('Fallbacks must be plain filenames, not paths.');
      }
      if (name === 'package.json') throw new Error('package.json cannot be an instruction filename.');
      if (!result.includes(name)) result.push(name);
    }
    return result;
  }
  function needsContent(path, fallbackNames = []) { return basename(path) === 'package.json' || instructionNames(fallbackNames).includes(basename(path)); }
  function utf8Prefix(text, maxBytes) {
    const data = encoder.encode(text);
    if (data.length <= maxBytes) return text;
    // Streaming decode drops an incomplete final UTF-8 character, not the whole string.
    return new TextDecoder('utf-8').decode(data.subarray(0, maxBytes), { stream: true });
  }
  function lineInfo(text) {
    const lines = text.split(/\r?\n/);
    let fenceChar = '', fenceLength = 0, exampleLevel = 0;
    return lines.map((text, index) => {
      const fence = text.match(/^\s*(`{3,}|~{3,})/);
      if (fence) {
        if (!fenceChar) { fenceChar = fence[1][0]; fenceLength = fence[1].length; }
        else if (fence[1][0] === fenceChar && fence[1].length >= fenceLength && /^\s*(`+|~+)\s*$/.test(text)) { fenceChar = ''; fenceLength = 0; }
        return { text, line: index + 1, code: true, example: exampleLevel > 0 };
      }
      const heading = !fenceChar && text.match(/^\s*(#{1,6})\s+(.+)/);
      if (heading) {
        const level = heading[1].length;
        if (exampleLevel && level <= exampleLevel) exampleLevel = 0;
        if (/\bexamples?\b|範例|示例/i.test(heading[2])) exampleLevel = level;
      }
      return { text, line: index + 1, code: Boolean(fenceChar) || /^( {4}|\t)/.test(text), example: exampleLevel > 0, heading: Boolean(heading) };
    });
  }
  const normalizeRule = line => line.trim().replace(/^(?:[-*+]\s+|\d+[.)]\s+)/, '').replace(/\s+/g, ' ');
  const fillerPatterns = [
    /^you are (?:a|an) (?:(?:very|highly|helpful|experienced|expert|professional|senior|skilled|talented)\s+)+(?:ai\s+)?(?:assistant|software engineer|developer|programmer)[.!。]?$/i,
    /^(?:please\s+)?(?:think step by step|do your best|be helpful|be professional)[.!。]?$/i,
    /^(?:請)?(?:一步一步思考|逐步思考|盡力而為|保持專業)[。！!]?$/,
    /^你是(?:一位|一個)?(?:非常|資深|專業|優秀|經驗豐富|的)*(?:軟體工程師|程式設計師|AI助手|AI 助手)[。！!]?$/
  ];

  /** Analyze an explicitly supplied snapshot; files are DATA and are never executed. */
  function analyze(options = {}) {
    const locale = options.locale === 'zh-TW' ? 'zh-TW' : 'en';
    const T = (en, zh) => tx(locale, en, zh);
    const names = instructionNames(options.fallbackNames || []);
    const cwd = normalizePath(options.cwd || '');
    const completeProject = options.completeProject === true;
    const maxBytes = options.maxBytes === undefined ? 32768 : Number(options.maxBytes);
    if (!Number.isSafeInteger(maxBytes) || maxBytes < 0 || maxBytes > LIMITS.textBytes) throw new Error('Byte budget must be an integer from 0 to 8388608.');
    if (!Array.isArray(options.files) || options.files.length > LIMITS.entries) throw new Error('Expected a files array with at most 30000 entries.');

    const files = new Map();
    const dirs = new Set(['']);
    const inputNotes = [];
    let totalBytes = 0;
    for (const raw of options.files) {
      if (!raw || typeof raw.path !== 'string') throw new Error('Every file needs a relative path.');
      const path = normalizePath(raw.path);
      if (!path) throw new Error('An empty filename is not allowed.');
      if (files.has(path)) throw new Error(`Duplicate input path: ${path}`);
      const file = { path, kind: raw.kind === 'directory' ? 'directory' : 'file' };
      for (const dir of ancestors(dirname(path))) dirs.add(dir);
      if (file.kind === 'directory') dirs.add(path);
      if (typeof raw.content === 'string') {
        const size = bytes(raw.content);
        totalBytes += size;
        if (size > LIMITS.fileBytes || totalBytes > LIMITS.textBytes) throw new Error('Input text exceeds the documented safety limits.');
        file.content = raw.content;
      }
      if (raw.unreadable) file.unreadable = true;
      files.set(path, file);
    }
    if (completeProject && !dirs.has(cwd)) throw new Error(T(`Working directory not found in the supplied snapshot: ${cwd || '.'}`, `提供的專案中找不到工作目錄：${cwd || '.'}`));
    if (isIgnored(cwd)) throw new Error('The selected working directory is in an excluded directory.');

    const findings = [];
    const add = (code, severity, file, line, title, evidence, suggestion, extras = {}) => {
      findings.push({ id: `finding-${findings.length + 1}`, code, severity, file, line, title, evidence, suggestion, confidence: 'review', ...extras });
    };
    const docs = [...files.values()].filter(file => file.kind === 'file' && !isIgnored(file.path) && names.includes(basename(file.path)))
      .sort((a, b) => a.path.localeCompare(b.path, 'en')).map(file => ({
        path: file.path, content: file.content, byteCount: typeof file.content === 'string' ? bytes(file.content) : null,
        status: 'out-of-scope', includedBytes: 0, includedText: '',
        reason: T('Not on the root → working-directory path.', '不在專案根目錄 → 目前工作目錄的路徑上。')
      }));
    const byPath = new Map(docs.map(doc => [doc.path, doc]));
    const chain = [];
    let remaining = maxBytes, unknownEarlier = false;
    for (const dir of ancestors(cwd)) {
      let selected = null;
      for (const name of names) {
        const doc = byPath.get(join(dir, name));
        if (!doc) continue;
        if (selected) {
          if (selected.status === 'unreadable') {
            doc.status = 'uncertain';
            doc.reason = T('A higher-priority file is unreadable; selection cannot be verified.', '優先度較高的檔案無法讀取，不能確認此檔案是否會被選取。');
            continue;
          }
          doc.status = 'overridden';
          doc.reason = T(`A higher-priority file exists at the same level: ${selected.path}`, `同一層已選擇優先度較高的檔案：${selected.path}`);
          add('RX101', 'info', doc.path, 1, T('Same-directory file is shadowed', '被同層檔案取代'), doc.reason,
            T('Compare the files. This does not replace instruction files in parent directories.', '比較兩份內容；這不代表上層目錄的規則也被整份取代。'), { confidence: selected.status === 'unreadable' ? 'review' : 'observed' });
          continue;
        }
        if (typeof doc.content !== 'string') {
          doc.status = 'unreadable'; selected = doc; unknownEarlier = true;
          doc.reason = T('Content unavailable; selection and the remaining budget cannot be determined reliably.', '無法讀取內容；後續選檔與剩餘容量無法可靠判定。');
          // Do not claim that fallback files are definitely shadowed by an unreadable file.
          continue;
        }
        if (!doc.content.trim()) { doc.status = 'empty'; doc.reason = T('Empty or whitespace-only file; try the next filename.', '空白檔案，繼續檢查下一個檔名。'); continue; }
        selected = doc;
        if (unknownEarlier) { doc.status = 'uncertain'; doc.reason = T('An earlier file is unreadable; inclusion is uncertain.', '較早的規則檔無法讀取，因此無法確認是否載入。'); continue; }
        if (!remaining) {
          doc.status = 'budget-exhausted'; doc.reason = T('The simulated project-file byte budget has been exhausted.', '模擬的專案規則檔容量已用完。');
        } else {
          doc.includedText = utf8Prefix(doc.content, remaining);
          doc.includedBytes = bytes(doc.includedText);
          doc.status = doc.byteCount > remaining ? 'truncated' : 'active';
          doc.reason = doc.status === 'truncated' ? T('Only a UTF-8-safe prefix fits the simulated budget.', '只有前段內容能放入模擬容量；保留完整 UTF-8 字元。') : T('Selected in the project-only startup preview.', '在僅限專案的啟動載入預覽中被選取。');
          // Consume the raw budget even if the final UTF-8 character did not fit.
          remaining = Math.max(0, remaining - doc.byteCount);
          chain.push(doc);
        }
        if (doc.status === 'truncated' || doc.status === 'budget-exhausted') {
          add('RX102', 'warning', doc.path, 1, T('Project instruction budget reached', '已達專案規則容量上限'),
            T(`${doc.includedBytes} / ${doc.byteCount} source bytes included in this preview.`, `本預覽納入 ${doc.includedBytes} / ${doc.byteCount} 個原文位元組。`),
            T('Review the chain and your real Codex configuration. Moving text to a nested file does not help if both files are loaded.', '檢查載入鏈與實際 Codex 設定；若兩份檔案仍會一起載入，只把文字移到子目錄不會減少總量。'), { confidence: 'simulation' });
        }
      }
    }
    for (const doc of docs) {
      if (typeof doc.content !== 'string') {
        add('RX103', 'warning', doc.path, 1, T('Instruction content unavailable', '規則檔內容無法讀取'),
          T('The file was listed but could not be read.', '已列出檔案，但未能讀入內容。'), T('Check the file size, permissions and import warnings; no clean bill of health is possible for this file.', '請檢查檔案大小、權限與匯入警告；不能判定此檔案沒有問題。'), { confidence: 'observed' });
      }
    }

    const lineCandidates = new Map();
    const includedLinesByPath = new Map(chain.map(doc => [doc.path, doc.includedText.split(/\r?\n/)]));
    const markCandidate = (doc, row) => {
      if (doc.status !== 'active' && doc.status !== 'truncated') return;
      const included = includedLinesByPath.get(doc.path) || [];
      if (included[row.line - 1] !== row.text) return; // Exclude a partially loaded last line.
      lineCandidates.set(`${doc.path}\0${row.line}`, bytes(row.text));
    };
    const nearestPackage = () => {
      for (const dir of ancestors(cwd).reverse()) {
        const path = join(dir, 'package.json');
        if (files.has(path)) return files.get(path);
      }
      return null;
    };
    const packageFile = nearestPackage();
    let packageData = null;
    if (packageFile && typeof packageFile.content === 'string') {
      try {
        packageData = JSON.parse(packageFile.content.replace(/^\uFEFF/, ''));
        if (!packageData || typeof packageData !== 'object' || Array.isArray(packageData)) throw new Error('Expected a JSON object');
      } catch (error) {
        packageData = null;
        add('RX204', 'error', packageFile.path, 1, T('Cannot parse package.json', '無法解析 package.json'),
          String(error.message).slice(0, 200), T('Fix or supply the manifest. Script checks were skipped.', '請修正或提供正確的套件檔；已跳過腳本名稱驗證。'), { confidence: 'observed' });
      }
    }
    const seenCommands = new Set();
    const commandCheck = (doc, row, command) => {
      const match = command.trim().match(/^(npm|pnpm|yarn)\s+run\s+([\w:.-]+)(?:\s+(.*))?$/);
      if (!match || !completeProject || !['active', 'truncated'].includes(doc.status)) return;
      if ((includedLinesByPath.get(doc.path) || [])[row.line - 1] !== row.text) return;
      const key = `${doc.path}\0${row.line}\0${command}`;
      if (seenCommands.has(key)) return;
      seenCommands.add(key);
      const tail = match[3] || '';
      if (/[;&|`<>$]/.test(tail) || /(?:^|\s)(?:--(?:workspace(?:s)?|filter|prefix|cwd|dir|if-present|ws)\b|-w(?:\s|=)|-C(?:\s|=))/.test(tail)) {
        add('RX203', 'info', doc.path, row.line, T('Command scope requires manual review', '指令執行範圍需要人工確認'), command,
          T('Workspace flags, optional scripts and shell expressions are not evaluated.', '不解析 workspace 旗標、可省略的腳本或 Shell 運算式。')); return;
      }
      if (!packageData) return;
      const scripts = packageData.scripts;
      const exists = scripts && typeof scripts === 'object' && !Array.isArray(scripts) && own(scripts, match[2]) && typeof scripts[match[2]] === 'string';
      if (!exists) {
        add('RX201', 'warning', doc.path, row.line, T('Script name not found for the selected working directory', '此工作目錄對應的 package.json 找不到腳本'),
          `${command} → ${packageFile.path} → scripts.${match[2]}`,
          T('Check the script name and intended execution directory. This is not proof that the command fails in every environment.', '確認腳本名稱與預期執行目錄；這不表示該指令在所有環境都無效。'), { confidence: 'contextual' });
      }
    };
    const existsPath = path => files.has(path) || dirs.has(path);
    const unknownPath = path => ancestors(path).some(prefix => files.get(prefix)?.unreadable);
    const seenRefs = new Set();
    const pathCheck = (doc, row, raw, markdownLink) => {
      if (!completeProject || row.code || row.example) return;
      if (/\b(?:create|generate|add a new|example|e\.g\.)\b|新增|建立|產生|例如|範例/i.test(row.text)) return;
      let value = raw.trim();
      if (/^[a-z][a-z\d+.-]*:|^[#/~]|^[A-Za-z]:[\\/]|^@\//i.test(value) || /[<>*$?{}|]/.test(value)) return;
      if (!markdownLink && (/\s/.test(value) || !(/[\\/]/.test(value) || /\.(?:md|txt|json|ya?ml|toml|[cm]?js|[cm]?ts|tsx|jsx|py|rs|go|sh|html|css|scss|sql|c|cpp|h|lock)$/i.test(value)))) return;
      value = value.split('#')[0].replace(/:(?:L)?\d+(?::\d+)?$/, '');
      try { value = decodeURIComponent(value); } catch (_) { return; }
      if (!value) return;
      const candidates = [];
      try { candidates.push(join(dirname(doc.path), value)); } catch (_) { /* An external path is not a dead project reference. */ }
      if (!markdownLink) { try { candidates.push(normalizePath(value)); } catch (_) { /* Same boundary rule. */ } }
      if (!candidates.length || candidates.some(isIgnored) || candidates.some(existsPath) || candidates.some(unknownPath)) return;
      const key = `${doc.path}\0${row.line}\0${value}`;
      if (seenRefs.has(key)) return;
      seenRefs.add(key);
      add('RX202', 'warning', doc.path, row.line, T('Local path not found in this snapshot', '提供的專案快照中找不到路徑'),
        `${value} → ${[...new Set(candidates)].join(' | ')}`,
        T('Check for a rename, a generated file, or an incomplete selection. References inside examples, excluded directories and external paths are not verified.', '確認是否已改名、尚未產生，或未選入專案；範例、排除目錄與專案外路徑不做存在性判定。'), { confidence: 'contextual' });
    };

    for (const doc of docs) {
      if (typeof doc.content !== 'string') continue;
      const allRows = lineInfo(doc.content);
      const rows = allRows.slice(0, LIMITS.lintLines);
      if (allRows.length > rows.length) inputNotes.push(T(`Only the first ${LIMITS.lintLines} lines were linted in ${doc.path}; the load preview still uses the full supplied text.`, `${doc.path} 只檢查前 ${LIMITS.lintLines} 行；載入預覽仍使用提供的完整文字。`));
      const seenLines = new Map();
      for (const row of rows) {
        if (row.text.length > LIMITS.lintLineCharacters) {
          add('RX006', 'info', doc.path, row.line, T('Very long line: detailed checks skipped', '單行過長：已跳過細節檢查'), `${row.text.length} characters`, T('Split this line before rerunning. The size and loading checks still apply.', '請將此行拆分後重跑；容量與載入檢查仍有效。'), { confidence: 'observed' });
          continue;
        }
        const norm = normalizeRule(row.text);
        if (!row.code && !row.example && !row.heading && !/^\s*[>|]|^<!--/.test(row.text) && norm.length >= 24) {
          if (seenLines.has(norm)) {
            const first = seenLines.get(norm);
            add('RX001', 'info', doc.path, row.line, T('Repeated instruction line', '重複的規則行'),
              T(`Same normalized text as line ${first}: ${norm.slice(0, 220)}`, `與第 ${first} 行正規化後相同：${norm.slice(0, 220)}`),
              T('Review whether both scopes need this reminder. No line is deleted automatically.', '確認不同章節是否需要重複提醒；不會自動刪除。'), { related: { file: doc.path, line: first }, confidence: 'observed' });
            markCandidate(doc, row);
          } else seenLines.set(norm, row.line);
        }
        if (!row.code && !row.example && fillerPatterns.some(pattern => pattern.test(norm))) {
          add('RX003', 'info', doc.path, row.line, T('Generic instruction: review its value', '通用提醒：可檢視是否有必要'), norm,
            T('Keep it if it serves a tested purpose; otherwise replace it with a concrete project requirement. This is a heuristic, not a model-quality judgment.', '有實測用途就保留；否則可改為具體的專案要求。這是啟發式提示，不是模型品質判定。'));
          markCandidate(doc, row);
        }
        if (!row.example) {
          if (row.code) commandCheck(doc, row, row.text.trim());
          else {
            for (const match of row.text.matchAll(/`([^`\n]+)`/g)) { commandCheck(doc, row, match[1]); pathCheck(doc, row, match[1], false); }
            for (const match of row.text.matchAll(/\[[^\]]*\]\(<?([^\s)>]+)>?(?:\s+["'][^"']*["'])?\)/g)) pathCheck(doc, row, match[1], true);
          }
        }
      }
      if (doc.byteCount > 8192) add('RX004', 'info', doc.path, 1, T('Large instruction file', '規則檔較長'),
        T(`${doc.byteCount} UTF-8 bytes; the review threshold is 8192 bytes.`, `${doc.byteCount} UTF-8 位元組；人工檢視門檻為 8192 位元組。`),
        T('Length alone is not a defect. Consider moving reference material to linked documentation, while keeping essential constraints in the loaded file.', '長度本身不是錯誤；可把參考資料移到連結文件，但重要限制仍需留在會載入的規則中。'));
      for (let index = 0; index < rows.length; index++) {
        if (rows[index].code) continue;
        const header = rows[index].text.match(/^\s*(#{1,6})\s+(.*)/);
        if (!header || !/\b(?:changelog|conversation log|progress log|history)\b|更新紀錄|對話紀錄|進度紀錄|歷史紀錄/i.test(header[2])) continue;
        let end = index + 1;
        while (end < rows.length) { const next = rows[end].text.match(/^\s*(#{1,6})\s/); if (next && !rows[end].code && next[1].length <= header[1].length) break; end++; }
        if (rows.slice(index + 1, end).filter(row => row.text.trim()).length >= 6) {
          add('RX005', 'info', doc.path, index + 1, T('History/log section in persistent instructions', '常駐規則中含有歷史或進度紀錄'),
            T(`Lines ${index + 1}–${end}: ${header[2]}`, `第 ${index + 1}–${end} 行：${header[2]}`),
            T('Review moving the log to a separate document. Preserve decisions that still constrain current work.', '可考慮把紀錄另存文件；仍影響當前工作的決策與限制要保留。'));
        }
      }
    }
    const chainSeen = new Map();
    for (const doc of chain) {
      for (const row of lineInfo(doc.includedText).slice(0, LIMITS.lintLines)) {
        if (row.text.length > LIMITS.lintLineCharacters) continue;
        if (row.code || row.example || row.heading || /^\s*[>|]|^<!--/.test(row.text)) continue;
        const norm = normalizeRule(row.text);
        if (norm.length < 24) continue;
        const first = chainSeen.get(norm);
        if (first && first.file !== doc.path) {
          add('RX002', 'info', doc.path, row.line, T('Repeated across loaded instruction files', '載入鏈中的跨檔重複規則'),
            `${first.file}:${first.line} → ${doc.path}:${row.line}: ${norm.slice(0, 180)}`,
            T('Review whether repetition is intentional. A child file may need to restate an important rule.', '確認是否刻意重複；子目錄有時需要再次明示重要規則。'), { related: first, confidence: 'observed' });
          markCandidate(doc, row);
        } else if (!first) chainSeen.set(norm, { file: doc.path, line: row.line });
      }
    }
    const activeSet = new Set(chain.map(doc => doc.path));
    for (const finding of findings) finding.inCurrentChain = activeSet.has(finding.file);
    const statusOrder = { error: 0, warning: 1, info: 2 };
    findings.sort((a, b) => statusOrder[a.severity] - statusOrder[b.severity] || a.file.localeCompare(b.file, 'en') || a.line - b.line || a.code.localeCompare(b.code));
    const assumptions = [
      T('Project-only startup preview. The selected folder is treated as the project root; it is not automatically verified as a Git root.', '僅模擬專案層的啟動載入；把所選資料夾當作根目錄，不會自動確認 Git 根目錄。'),
      T('Global instructions, config.toml/profiles, trust settings, symlinks, instructions read later by an agent and non-Codex tools are outside this preview.', '不包含全域規則、config.toml／設定檔、信任設定、符號連結、Agent 後續自行讀檔，以及其他工具的載入機制。'),
      T('The budget counts raw UTF-8 project-file bytes, without runtime wrappers or separators. Boundary behavior can differ from a particular Codex version; this is not a runtime trace.', '容量以專案原文的 UTF-8 位元組計算，不含執行時包裝或分隔符；邊界行為可能與特定 Codex 版本不同，這不是執行追蹤。'),
      T('Review-candidate bytes are not verified savings, tokenizer counts, speed improvements or monetary estimates. Important instructions must be reviewed before editing.', '待檢視位元組不等於已驗證的節省量、Token 數、加速幅度或費用估計；修改前必須人工確認。'),
      completeProject ? T('Path checks cover only the supplied inventory. Only loaded command lines are checked, against the nearest package.json above the selected working directory, not the instruction-file directory.', '路徑僅比對提供的清單；只驗證已載入的指令行，使用目前工作目錄向上最近的 package.json，不是規則檔所在目錄。') : T('Text-only mode: local paths and package scripts were NOT verified. Import a project folder for these checks.', '純文字模式：沒有驗證本機路徑或套件腳本。請選擇專案資料夾才可進行這些檢查。'),
      T(`Excluded directories: ${IGNORED_DIRS.join(', ')}. Their referenced paths are not treated as missing.`, `排除目錄：${IGNORED_DIRS.join('、')}；指向這些目錄的路徑不會被當成缺失。`)
    ];
    if (completeProject && !packageData) inputNotes.push(T('No readable, valid package.json was found above this working directory; script existence could not be verified.', '目前工作目錄向上沒有可讀且有效的 package.json，因此無法驗證腳本是否存在。'));
    if (!docs.length) inputNotes.push(T('No supported instruction files were found. Check capitalization or configure fallback filenames before importing.', '找不到支援的規則檔；請確認大小寫，或先設定 fallback 檔名再匯入。'));
    const summaries = docs.map(({ content, includedText, ...doc }) => ({ ...doc, characters: typeof content === 'string' ? [...content].length : null }));
    return {
      schemaVersion: 1, tool: 'AGENTS X-Ray', version: VERSION, rulesVerifiedOn: VERIFIED_DATE,
      mode: completeProject ? 'project' : 'text', cwd: cwd || '.', locale, maxBytes, fallbackNames: names.slice(2),
      summary: {
        instructionFiles: docs.length, loadedFiles: chain.filter(doc => doc.includedBytes > 0).length,
        sourceBytes: docs.reduce((sum, doc) => sum + (doc.byteCount || 0), 0), loadedBytes: chain.reduce((sum, doc) => sum + doc.includedBytes, 0),
        reviewCandidateBytes: [...lineCandidates.values()].reduce((sum, value) => sum + value, 0),
        errors: findings.filter(item => item.severity === 'error').length, warnings: findings.filter(item => item.severity === 'warning').length,
        suggestions: findings.filter(item => item.severity === 'info').length, inventoryEntries: files.size
      },
      files: summaries, chain: chain.map(doc => doc.path), findings, assumptions, notes: inputNotes,
      effectiveText: chain.filter(doc => doc.includedText).map(doc => `--- ${doc.path} ---\n${doc.includedText}`).join('\n\n')
    };
  }
  function toMarkdown(report) {
    // Escape untrusted values so exported reports cannot inject HTML or Markdown images.
    const safe = value => String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/([\\`*_{}\[\]()#+!|])/g, '\\$1').replace(/[\r\n]+/g, ' ');
    const lines = [`# AGENTS X-Ray ${report.version}`, '', `Mode: ${report.mode} · Working directory: ${safe(report.cwd)}`, '',
      `Loaded source bytes: ${report.summary.loadedBytes}. Review-candidate bytes (NOT validated savings): ${report.summary.reviewCandidateBytes}.`,
      `Errors: ${report.summary.errors}. Warnings: ${report.summary.warnings}. Suggestions: ${report.summary.suggestions}.`, '', '## Scope and limitations', ''];
    for (const note of [...report.assumptions, ...report.notes]) lines.push(`- ${safe(note)}`);
    lines.push('', '## Instruction files', '', '| File | Status | Included / source bytes |', '| --- | --- | --- |');
    for (const file of report.files) lines.push(`| ${safe(file.path)} | ${file.status} | ${file.includedBytes} / ${file.byteCount === null ? '?' : file.byteCount} |`);
    lines.push('', '## Findings', '');
    if (!report.findings.length) lines.push('No findings from the implemented checks. This is not a guarantee of correctness.');
    for (const item of report.findings) {
      lines.push(`### ${item.code} · ${item.severity} · ${safe(item.title)}`, '', `${safe(item.file)}:${item.line} · Confidence: ${item.confidence} · In current chain: ${item.inCurrentChain}`, '', safe(item.evidence), '', safe(item.suggestion), '');
    }
    return lines.join('\n');
  }
  return Object.freeze({ VERSION, VERIFIED_DATE, LIMITS, IGNORED_DIRS, bytes, normalizePath, isIgnored, instructionNames, needsContent, utf8Prefix, analyze, toMarkdown });
});
