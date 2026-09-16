# AGENTS X-Ray｜AI 規則檢查器

**看清規則的載入範圍，找出值得檢查的重複內容與失效引用。**

[![Tests](https://github.com/aichigor/agents-xray/actions/workflows/test.yml/badge.svg)](https://github.com/aichigor/agents-xray/actions/workflows/test.yml)
[![Live Demo](https://img.shields.io/badge/Live_Demo-GitHub_Pages-2ea44f)](https://aichigor.github.io/agents-xray/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

**[直接開啟線上版 →](https://aichigor.github.io/agents-xray/)**

[English](README.md) · [檢查規則](docs/RULES.md) · [隱私與限制](docs/PRIVACY.md) · [測試紀錄](docs/VALIDATION.md) · [參與開發](CONTRIBUTING.md)

這是 v0.1.0 初版。它不是另一個替你寫 `AGENTS.md` 的 AI，而是先用可重現的檢查，指出「哪一行、什麼問題、根據什麼證據」。

## 為什麼做這個工具？

現在大家很容易讓 AI 一直往 `AGENTS.md` 裡追加規則。時間久了，常見問題會變成：

- 同一件事重複提醒好幾次
- 文件或路徑早就不存在
- `npm run ...` 指令已經失效
- 規則其實不在目前工作目錄的載入鏈中
- 歷史紀錄和長篇說明一路堆進常駐規則

AGENTS X-Ray 不會自動替你刪掉內容，而是先把**確定可驗證的問題**和**需要人工判斷的建議**分開。

## 直接使用

最簡單的方式就是開啟線上版：

**https://aichigor.github.io/agents-xray/**

介面預設英文，右上角可以切換成繁體中文。

- **Try demo project／試跑範例專案**：先看人工建立的錯誤案例
- **貼上文字**：檢查重複規則、部分通用提醒、長篇內容等
- **選擇專案資料夾**：再進一步比對檔案路徑、`package.json` 腳本，以及 Codex 專案層載入範圍
- **匯出報告**：支援 Markdown 和 JSON

瀏覽器版是在本機分析，沒有分析後端、追蹤 SDK 或 AI API 呼叫。瀏覽器選資料夾時有時會顯示「Upload」，那只是授權頁面讀取本機檔案，不代表檔案被傳到 AGENTS X-Ray 伺服器；這個專案沒有分析伺服器。

也可以下載整個 repository，直接以桌面瀏覽器開啟 `index.html`。`npm run build:standalone` 可產生單一 HTML 版本。

## 目前會檢查什麼？

| 類型 | 例子 | 怎麼解讀 |
| --- | --- | --- |
| 重複規則 | 同檔或載入鏈中重複的正規化文字 | 確認重複，但是否刪除仍需人工判斷 |
| 通用提醒 | 少量中英文角色／鼓勵式句型 | 只是精簡建議，不是品質判決 |
| 歷史與長篇內容 | 大型規則檔、明顯的 progress/history 區段 | 建議確認是否應移出常駐規則 |
| Codex 專案載入 | `AGENTS.override.md`、`AGENTS.md`、fallback 檔名 | 專案層模擬，不是完整 runtime trace |
| 容量預覽 | 預設 32,768 UTF-8 bytes | 不是 tokenizer，也不是計費 Token |
| 本機路徑 | Markdown link、簡單反引號路徑 | 只代表這次提供的專案清單中找不到 |
| Package script | `npm run`、`pnpm run`、`yarn run` | 對最近的 `package.json` 檢查，不會真的執行 |

每個提示都會保留規則代碼、檔名、行號、證據、嚴重度、信心分類與下一步建議。

## 怎麼讀結果

「重複」代表字串在正規化空白後相同，不代表一定該刪。

「找不到路徑」代表這次提供的清單裡沒有，不代表世界上不存在。

「找不到腳本」以指定工作目錄向上最近的 `package.json` 為準，不會真的執行指令確認。

`AGENTS.override.md` 會在**同一層**優先於 `AGENTS.md`，不代表上層所有規則都被整份抹掉。資料夾模式把你選的資料夾當作專案根目錄，從根目錄走到指定工作目錄；不是把所有子目錄規則一起載入。

容量預覽預設為 32,768 UTF-8 bytes，可自行修改。這不是 Codex tokenizer，也沒有包含 runtime wrapper、全域規則或其他未讀取設定。

**「待檢視內容」不是「保證可刪除量」。目前沒有測量 AI 的實際速度、正確率、計費 Token 或省下多少錢。**

## 開發者模式

需要 Node.js 22 以上，沒有 runtime 套件依賴，也不必先 `npm install` 才能執行 CLI 或測試。

```sh
npm test
npm run check
npm run demo
npm run build:standalone
node bin/agents-xray.js "你的專案資料夾" --cwd apps/web --format json
```

專案尚未發布 npm，不要把 `npx agents-xray` 當成目前的安裝方式。

## 測試狀態

目前 GitHub Actions 已在以下四組環境成功通過：

- Node 22 / Ubuntu ✅
- Node 22 / Windows ✅
- Node 24 / Ubuntu ✅
- Node 24 / Windows ✅

每組都會執行 JavaScript syntax check、回歸測試與 standalone build。更完整的驗證方式與尚未測試的範圍，請看 [VALIDATION.md](docs/VALIDATION.md)。

## 支援範圍與限制

載入預覽目前只針對 Codex 的專案層機制，不是所有模型、Claude Code 或其他 Agent 的通用模擬器。

尚未實作：全域規則自動讀取、`config.toml`／profiles 解析、自動找 Git 根目錄、完整語意衝突偵測、程式碼符號過期檢查、自動改寫與一鍵刪除。

如果規則檔本身包含機密資訊，分析畫面與匯出的報告仍可能包含那些內容，分享前請自行檢查。

## 參與開發

歡迎回報可重現的 false positive、提供測試案例、改善文件或無障礙體驗。請先看 [CONTRIBUTING.md](CONTRIBUTING.md)。

## 授權與參考

採用 [MIT License](LICENSE)。這是獨立社群工具，不隸屬或代表 OpenAI、GitHub。

Codex 規則參考與查核日期請見 [英文 README 的 Specification sources](README.md#specification-sources)。
