# AGENTS X-Ray｜AI 規則檢查器

**看清規則的載入範圍，找出值得檢查的重複內容與失效引用。**

[English](README.md) · [從零上傳 GitHub](docs/GITHUB-BEGINNER.zh-TW.md) · [檢查規則](docs/RULES.md)

這是 v0.1.0 初版。不是另一個替你寫 AGENTS.md 的 AI，而是先用可重現的檢查，找出「哪一行、什麼問題、根據什麼證據」。

## 直接使用

解壓縮整個專案後，以桌面瀏覽器開啟 `index.html`，點「試跑範例專案」。也可以使用透過 `npm run build:standalone` 產生的獨立版 `dist/AGENTS-Xray-Standalone.html`，不用安裝程式、登入帳號或提供 API Key。

- **貼上文字**：檢查規則行重複、少量中英文通用提醒、長篇規則與歷史紀錄。不會假裝知道你的電腦中有哪些檔案。
- **選擇專案資料夾**：進一步比對路徑清單、簡單的 package.json 腳本名稱，以及指定工作目錄的 Codex 專案層載入順序。
- **匯出報告**：提供 Markdown 和 JSON。報告可能包含敏感的原文片段；JSON 還包含模擬合併的規則內容，分享前要檢查。

第一次請先跑人工範例。預設工作目錄 `apps/web`，結果為 **2 個警告、6 個建議**。這是刻意製造的測試資料，不是掃描真實專案得到的市場成效。

## 怎麼讀結果

「重複」代表字串在正規化空白後相同，不代表一定該刪。「找不到路徑」代表這次提供的清單裡沒有，不代表世界上不存在。「找不到腳本」以指定工作目錄向上最近的 package.json 為準，不會執行指令確認。

`AGENTS.override.md` 會在**同一層**優先於 `AGENTS.md`。這不表示上層的所有規則都被整份抹掉。資料夾模式把你選的資料夾當作根目錄，從根目錄走到你填寫的工作目錄；不是把所有子目錄規則都一起載入。

容量預覽預設為 32,768 個 UTF-8 位元組，可以自行修改。此版本只計算專案原文容量，不包含實際執行時的包裝、分隔符、全域規則與其他設定，不能當作 Codex 執行追蹤或精確 tokenizer。

**「待檢視內容」不是「保證可刪除量」。目前沒有測量 AI 的實際速度、正確率、計費 Token 或省下多少錢。**

## 支援範圍

載入預覽目前只針對 Codex 的專案層機制，不是所有模型、Claude Code 或其他 Agent 的通用模擬器。其他工具的文字可以參考一般內容檢查，但不能套用相同的載入結論。

未實作：全域規則自動讀取、config.toml／profiles 解析、自動找 Git 根目錄、程式碼符號過期檢查、完整語意衝突偵測、自動改寫與一鍵刪除。這些限制也會出現在報告中。

資料夾選取不會把檔案傳給分析伺服器。本程式只讀取規則檔、package.json 的內容，其餘檔案只記錄路徑；不讀一般原始碼或 `.env` 內容。若你自己把機密寫進規則檔，它仍會出現在分析和報告中。瀏覽器中的原生「上傳」確認只代表授權這個頁面讀取所選檔案，和上傳到 GitHub 是兩回事。

## 開發者模式

需要 Node.js 22 以上，無 runtime 套件依賴，不需先執行 npm install。

```sh
npm test
npm run check
npm run demo
node bin/agents-xray.js "你的專案資料夾" --cwd apps/web --format json
```

`npm run build:standalone` 可重新產生獨立 HTML 版。專案尚未發布 npm，不要直接把 `npx agents-xray` 當成此專案的安裝方法。

## 第一版測試與公開

核心與命令列測試、瀏覽器驗證方式請看 [VALIDATION.md](docs/VALIDATION.md)。GitHub Actions 工作流程已附，但必須由你上傳後在 GitHub 上實際執行，才能確認 GitHub 測試狀態。

從零開始上傳和發布展示網站，請依 [GitHub 操作教學](docs/GITHUB-BEGINNER.zh-TW.md)。這份開源專案沒有承諾任何方案申請資格；真實使用、維護與回饋需要後續建立。

## 授權與參考

附 [MIT 授權檔](LICENSE)。這是獨立社群工具，不隸屬或代表 OpenAI、GitHub。

官方規則參考與查核日期請見 [英文 README 的 Specification sources](README.md#specification-sources)。
