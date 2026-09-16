/* Browser adapter. No fetch, analytics, remote fonts, storage or AI APIs. */
(function () {
  'use strict';
  const XR = window.AgentsXray;
  const $ = id => document.getElementById(id);
  const translations = {
    local: ['Local analysis · No AI calls', '本機分析 · 不呼叫 AI'],
    heading: ['See what your agent is told.', '看清 AI 到底讀了什麼規則。'],
    lede: ['Inspect duplicate instructions, stale references and loading scope in AGENTS.md. Evidence first. Edits second.', '檢查 AGENTS.md 的重複提醒、失效引用與載入範圍。先看證據，再決定要不要改。'],
    scope: ['Static checks and a project-only loading preview, not a Codex runtime trace or a promise of faster models.', '這是靜態檢查與專案載入預覽，不是 Codex 執行追蹤，也不保證縮短內容就能加速。'],
    inputHeading: ['01 / Your instructions', '01 / 提供規則'], demo: ['Try demo project', '試跑範例專案'], folder: ['Choose project folder', '選擇專案資料夾'],
    folderHelp: ['Only instruction files and package.json contents are read; other files contribute paths only. Do not select an entire drive.', '資料夾模式只讀取規則檔與 package.json 內容，其餘檔案只用路徑比對。請不要選整顆硬碟。'],
    orPaste: ['Or paste AGENTS.md', '或直接貼上 AGENTS.md'], editorLabel: ['AGENTS.md content', 'AGENTS.md 內容'], useText: ['Switch to paste mode', '切回貼上模式'],
    cwdLabel: ['Working directory (relative)', '工作目錄（相對於根目錄）'], budgetLabel: ['Project budget (bytes)', '專案容量上限（bytes）'],
    fallbackLabel: ['Other rule filenames (optional, comma-separated)', '其他規則檔名（選填，逗號分隔）'],
    fallbackHelp: ['Set fallback filenames before selecting a folder. Codex config.toml is not discovered automatically.', '使用 fallback 檔名時，請先填寫，再選資料夾。不會自動讀取 Codex 的 config.toml。'],
    analyze: ['Inspect instructions →', '開始檢查 →'], initialStatus: ['Try the demo or paste an instruction file.', '先試跑範例，或貼上一份規則。'],
    resultsHeading: ['02 / Findings', '02 / 檢查結果'], emptyTitle: ['Clearer rules. Not just shorter rules.', '規則需要的是清楚，不只是更短。'],
    emptyBody: ['Every finding includes a file, line and explanation. No automatic deletion. No content sent to a model.', '每個提示都會附檔案、行號與原因。沒有自動刪除，也不會把內容傳給模型。'],
    loadedMetric: ['Previewed load', '預覽載入量'], reviewMetric: ['Review candidates', '待檢視內容'], reviewSub: ['bytes · NOT validated savings', 'bytes · 不等於可刪除量'],
    findingsMetric: ['Findings', '檢查提示'], chainTitle: ['Project loading preview', '專案載入預覽'], findingsTitle: ['Evidence-backed review list', '有證據的檢視清單'],
    filterLabel: ['Filter findings', '篩選提示'], filterAll: ['All findings', '全部提示'], filterWarning: ['Warnings & errors', '警告與錯誤'], filterInfo: ['Review suggestions', '精簡／載入建議'], filterLoaded: ['Current chain', '目前載入檔案'],
    effectiveTitle: ['Inspect the simulated merged text', '查看模擬合併內容'],
    effectiveHelp: ['Filename prefixes are preview markers, not Codex internal prompts. Content may be sensitive; review before exporting.', '檔名前綴僅為預覽標記，不代表 Codex 的內部提示。內容可能含敏感資訊，匯出前請檢查。'],
    limitsTitle: ['Scope, limitations and unverified items', '分析範圍、限制與未驗證項目'], footer: ['No analytics · No cloud analysis · No source edits', '無追蹤程式 · 無雲端分析 · 不修改原始檔案']
  };
  let lang = 'en', mode = 'text', snapshot = [], currentReport = null, importNotes = [], projectLabel = '', importedFallback = '', busy = false;
  const say = (en, zh) => lang === 'zh-TW' ? zh : en;
  const fallbackNames = () => $('fallback').value.split(',').map(name => name.trim()).filter(Boolean);
  const fallbackKey = () => JSON.stringify(fallbackNames());
  const el = (tag, className, text) => { const node = document.createElement(tag); if (className) node.className = className; if (text !== undefined) node.textContent = text; return node; };
  function status(message, error = false) { $('status').textContent = message; $('status').className = error ? 'status error' : 'status'; }
  function setBusy(value) {
    busy = value;
    for (const id of ['analyze', 'demo', 'pick-folder', 'use-text', 'language']) $(id).disabled = value;
    $('cwd').disabled = value; $('budget').disabled = value; $('fallback').disabled = value;
    $('editor').readOnly = value || mode === 'project';
  }
  function invalidate() {
    currentReport = null;
    $('report').hidden = true; $('empty-state').hidden = false;
    $('export-md').disabled = true; $('export-json').disabled = true;
  }
  function applyLanguage() {
    document.documentElement.lang = lang === 'zh-TW' ? 'zh-Hant' : 'en';
    for (const node of document.querySelectorAll('[data-i18n]')) {
      const pair = translations[node.dataset.i18n];
      if (pair) node.textContent = pair[lang === 'zh-TW' ? 1 : 0];
    }
    $('language').textContent = lang === 'zh-TW' ? 'English' : '繁體中文';
    if (currentReport) run();
  }
  function run() {
    if (busy) return;
    try {
      XR.instructionNames(fallbackNames());
      if (mode === 'project' && importedFallback !== fallbackKey()) throw new Error(say('Fallback filenames changed. Select the folder again to read those files.', 'fallback 檔名已更改，請重新選擇資料夾，以讀取對應檔案。'));
      const files = mode === 'project' ? snapshot : [{ path: 'AGENTS.md', content: $('editor').value }];
      const budgetValue = $('budget').value.trim();
      if (!budgetValue) throw new Error(say('Enter a byte budget (0 is allowed).', '請填寫容量上限（可以為 0）。'));
      const report = XR.analyze({ files, cwd: mode === 'text' ? '' : $('cwd').value, completeProject: mode === 'project', locale: lang, maxBytes: Number(budgetValue), fallbackNames: fallbackNames() });
      report.notes.push(...importNotes);
      currentReport = report;
      render(report);
      status(say(`Done. ${report.summary.instructionFiles} instruction file(s) inspected. Original files were not changed.`, `完成。已檢查 ${report.summary.instructionFiles} 份規則檔，未修改任何原始檔案。`));
    } catch (error) { invalidate(); status(error.message, true); }
  }
  function render(report) {
    $('empty-state').hidden = true; $('report').hidden = false;
    $('export-md').disabled = false; $('export-json').disabled = false;
    $('metric-loaded').textContent = report.summary.loadedBytes.toLocaleString();
    $('metric-loaded-sub').textContent = say(`bytes · ${report.summary.loadedFiles} loaded file(s)`, `bytes · ${report.summary.loadedFiles} 份載入檔案`);
    $('metric-review').textContent = report.summary.reviewCandidateBytes.toLocaleString();
    $('metric-findings').textContent = report.findings.length.toLocaleString();
    $('metric-findings-sub').textContent = say(`${report.summary.errors} errors · ${report.summary.warnings} warnings · ${report.summary.suggestions} tips`, `${report.summary.errors} 錯誤 · ${report.summary.warnings} 警告 · ${report.summary.suggestions} 建議`);
    const list = $('chain-list'); list.replaceChildren();
    const ordered = [...report.files].sort((a, b) => {
      const aIndex = report.chain.indexOf(a.path), bIndex = report.chain.indexOf(b.path);
      return (aIndex < 0 ? 9999 : aIndex) - (bIndex < 0 ? 9999 : bIndex) || a.path.localeCompare(b.path);
    });
    if (!ordered.length) list.append(el('p', 'all-clear', say('No supported instruction files found.', '沒有找到支援的規則檔。')));
    const statusNames = { active: '已選取', truncated: '部分載入', overridden: '同層取代', empty: '空白', 'out-of-scope': '範圍外', 'budget-exhausted': '超出容量', unreadable: '無法讀取', uncertain: '無法確定' };
    for (const file of ordered) {
      const row = el('div', 'chain-row');
      row.append(el('span', 'chain-path', file.path), el('span', `badge ${file.status}`, lang === 'zh-TW' ? statusNames[file.status] || file.status : file.status), el('span', 'chain-reason', file.reason));
      list.append(row);
    }
    $('effective-text').textContent = report.effectiveText || say('(No content selected.)', '（沒有選取的內容。）');
    const limits = $('limitations'); limits.replaceChildren();
    for (const note of [...report.assumptions, ...report.notes]) limits.append(el('li', '', note));
    renderFindings();
  }
  function renderFindings() {
    if (!currentReport) return;
    const filter = $('filter').value;
    const matches = currentReport.findings.filter(item => filter === 'all' || filter === 'loaded' && item.inCurrentChain || filter === 'warning' && item.severity !== 'info' || filter === 'info' && item.severity === 'info');
    const list = $('findings'); list.replaceChildren();
    if (!matches.length) { list.append(el('p', 'all-clear', say('No findings in this view. This is not a guarantee of correctness.', '此篩選範圍沒有提示；不代表已驗證完全正確。'))); return; }
    // Bound rendering on pathological inputs. The complete report remains available for export.
    for (const item of matches.slice(0, 300)) {
      const card = el('article', `finding ${item.severity}`);
      const top = el('div', 'finding-top');
      top.append(el('span', `badge ${item.severity}`, item.severity.toUpperCase()), el('h4', '', item.title), el('span', 'finding-code', item.code));
      card.append(top, el('div', 'finding-location', `${item.file}:${item.line} · ${item.confidence}${item.inCurrentChain ? '' : say(' · outside current loaded chain', ' · 不在目前載入內容中')}`), el('pre', 'finding-evidence', item.evidence), el('p', 'finding-suggestion', item.suggestion));
      list.append(card);
    }
    if (matches.length > 300) list.append(el('p', 'all-clear', say('Showing the first 300 findings. Export JSON for the full report.', '畫面只顯示前 300 項；完整結果請匯出 JSON。')));
  }
  function textMode() {
    mode = 'text'; snapshot = []; importNotes = []; projectLabel = '';
    $('mode-tag').textContent = 'TEXT'; $('source-name').textContent = 'AGENTS.md'; $('editor').readOnly = false;
    $('cwd').value = '.'; $('cwd').disabled = true;
    invalidate(); status(say('Text-only mode. Local paths and scripts will not be verified.', '純文字模式，不會驗證本機路徑與腳本是否存在。'));
  }
  function previewSnapshot() {
    const names = XR.instructionNames(fallbackNames());
    $('editor').value = snapshot.filter(file => typeof file.content === 'string' && names.includes(file.path.split('/').pop())).map(file => `--- ${file.path} ---\n${file.content}`).join('\n\n').slice(0, 60000);
    $('editor').readOnly = true;
    $('mode-tag').textContent = 'PROJECT'; $('source-name').textContent = projectLabel;
    $('cwd').disabled = false;
  }
  async function importFolder(fileList) {
    invalidate();
    if (!fileList.length) return;
    setBusy(true); status(say('Reading selected project files locally…', '正在本機讀取所選專案檔案…'));
    try {
      if (fileList.length > XR.LIMITS.entries) throw new Error(say('More than 30000 files selected. Choose a smaller project.', '選取超過 30000 個檔案，請改選較小的專案。'));
      const fallbacks = fallbackNames(); XR.instructionNames(fallbacks);
      const rootNames = new Set([...fileList].map(file => (file.webkitRelativePath || file.name).split('/')[0]));
      if (rootNames.size !== 1 || !fileList[0].webkitRelativePath) throw new Error(say('Folder paths are unavailable. Use folder selection in a compatible desktop browser.', '無法取得資料夾路徑；請使用相容的桌面瀏覽器選擇資料夾。'));
      const next = [], notes = [];
      let consumed = 0, skipped = 0;
      for (const file of fileList) {
        const path = XR.normalizePath(file.webkitRelativePath.split('/').slice(1).join('/'));
        if (XR.isIgnored(path)) { skipped++; continue; }
        const entry = { path };
        if (XR.needsContent(path, fallbacks)) {
          try {
            if (file.size > XR.LIMITS.fileBytes) throw new Error('file > 1 MiB');
            if (consumed + file.size > XR.LIMITS.textBytes) throw new Error('combined text > 8 MiB');
            const content = await file.text();
            const size = XR.bytes(content);
            if (size > XR.LIMITS.fileBytes || consumed + size > XR.LIMITS.textBytes) throw new Error('decoded text limit');
            entry.content = content; consumed += size;
          } catch (error) { entry.unreadable = true; notes.push(say(`Could not read ${path}: ${error.message}`, `無法讀取 ${path}：${error.message}`)); }
        }
        next.push(entry);
      }
      if (skipped) notes.push(say(`${skipped} file(s) in excluded directories were skipped.`, `已跳過排除目錄中的 ${skipped} 個檔案。`));
      snapshot = next; importNotes = notes; mode = 'project'; projectLabel = [...rootNames][0]; importedFallback = fallbackKey();
      $('cwd').value = '.'; previewSnapshot();
    } catch (error) { status(error.message, true); setBusy(false); return; }
    setBusy(false); run();
  }
  function exportReport(format) {
    if (!currentReport) return;
    const includesContent = format === 'json';
    const message = includesContent ? say('JSON includes inspected instruction text and paths. It may contain secrets. Save a local copy?', 'JSON 包含檢查過的規則原文與路徑，可能含有機密。是否儲存本機副本？') : say('The report includes evidence snippets and file paths. Check it for sensitive information before sharing. Save a local copy?', '報告包含原文片段與檔案路徑。分享前請檢查敏感資訊。是否儲存本機副本？');
    if (!window.confirm(message)) return;
    const content = format === 'json' ? JSON.stringify(currentReport, null, 2) : XR.toMarkdown(currentReport);
    const blob = new Blob([content], { type: format === 'json' ? 'application/json;charset=utf-8' : 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob), link = document.createElement('a');
    link.href = url; link.download = `agents-xray-report.${format}`;
    document.body.append(link); link.click(); link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 10000);
  }
  $('demo').addEventListener('click', () => {
    mode = 'project'; snapshot = window.AgentsXrayDemo.map(file => ({ ...file })); importNotes = [];
    $('fallback').value = ''; importedFallback = fallbackKey(); projectLabel = say('Synthetic demo project', '人工建立的範例專案');
    $('cwd').value = 'apps/web'; $('budget').value = '32768'; previewSnapshot(); run();
  });
  $('pick-folder').addEventListener('click', () => { $('folder-input').value = ''; $('folder-input').click(); });
  $('folder-input').addEventListener('change', event => { void importFolder(event.target.files); });
  $('analyze').addEventListener('click', run);
  $('use-text').addEventListener('click', () => { if (mode === 'project') $('editor').value = ''; textMode(); });
  $('language').addEventListener('click', () => { lang = lang === 'zh-TW' ? 'en' : 'zh-TW'; applyLanguage(); });
  $('filter').addEventListener('change', renderFindings);
  for (const id of ['editor', 'cwd', 'budget', 'fallback']) $(id).addEventListener('input', () => { invalidate(); status(say('Inputs changed. Inspect again to update the report.', '輸入已變更，請重新檢查以更新結果。')); });
  $('export-md').addEventListener('click', () => exportReport('md'));
  $('export-json').addEventListener('click', () => exportReport('json'));
  $('cwd').disabled = true;
  applyLanguage();
})();
