# 從零開始：試用 → 上傳 GitHub → 發布展示網站

這份教學以桌面瀏覽器操作，不需要先學 Git 指令。介面名稱依 GitHub 英文版撰寫；若按鈕位置微調，以相同功能的文字為準。

## 先分清楚三件事

**本機工具**：你電腦裡的 AGENTS X-Ray，負責檢查你選擇的檔案。

**GitHub Repository（儲存庫）**：公開放置這個工具原始碼的專案空間。

**GitHub Pages**：把原始碼裡的 index.html 發布成可操作的展示網站。

上傳 Repository 不代表已經啟用 Pages，也不等於已獲 Codex for Open Source 核准。

## 第一階段：在電腦先試跑

1. 下載 `agents-xray-v0.1.0.zip`，按右鍵選「全部解壓縮」。不要在 ZIP 預覽裡直接操作。
2. 進入解壓縮後的 `agents-xray` 資料夾，確認這層同時有 `index.html`、`README.md`、`package.json` 和 `src` 資料夾。
3. 用桌面瀏覽器開啟 `index.html`。如果副檔名被隱藏，你可能只看到 `index`，檔案類型是 HTML 文件。
4. 點「試跑範例專案」。預設工作目錄為 `apps/web`，應有 2 個警告、6 個建議。
5. 右上角「English」可切換英文。回到繁中後，試試篩選「警告與錯誤」，應只看到 2 項。

![實際介面範例](preview.png)

原始碼支援使用 `npm run build:standalone` 產生 `dist/AGENTS-Xray-Standalone.html` 單檔版，建置時需要 Node.js。初次上傳只需使用本 ZIP 裡的原始碼，不必先建置單檔版，也不必上傳 `dist/`。

### 試自己的規則

只有 AGENTS.md 時：點「切回貼上模式」，把文字貼入後按「開始檢查」。此模式不驗證實際檔案或套件腳本。

要驗證失效引用時：點「選擇專案資料夾」，選擇受檢查的專案根目錄，不是只選 AGENTS.md。若你平常從根目錄啟動 Codex，工作目錄填 `.`；從子目錄啟動，例如 `apps/web`，就填該相對路徑。它不會自動讀取你的 Codex 全域設定。

「其他規則檔名」用來填你實際設定的 fallback 名稱，例如 TEAM_GUIDE.md。請先填，再選資料夾；修改後需重新選擇。

注意：本機資料夾選取和 GitHub 上傳是不同操作。檢查公司專案時，不需要把公司專案放進這個公開儲存庫。

## 第二階段：建立 GitHub 帳號和儲存庫

1. 前往 <https://github.com>。沒有帳號就選 Sign up，完成註冊和信箱驗證；有帳號則 Sign in。
2. 登入後，點右上角 `+` → **New repository**。也可直接開啟 <https://github.com/new>。
3. Owner 選你的帳號。Repository name 填 `agents-xray`。這個名字只需在你帳號底下不重複。
4. Description 可貼以下英文：

   `Local-first AGENTS.md inspector: loading previews, stale references, duplicate rules, and reviewable instruction noise.`

5. Visibility 選 **Public**，讓別人可以查看原始碼。
6. **Add README 關閉；不要另外選 .gitignore 或 license**，因為下載包已經附上 README、.gitignore 和 MIT LICENSE。公開前請閱讀 LICENSE，確認你願意使用它。
7. 點 **Create repository**。

你剛建立的是空的專案空間，還沒把程式放進去。

## 第三階段：真正上傳原始碼

1. 空儲存庫頁面通常會有 **uploading an existing file** 連結，點它。若已經有檔案清單，則選 **Add file → Upload files**。
2. 在電腦開啟解壓縮後的 `agents-xray` 資料夾。這層應直接看到 index.html。
3. **選取這一層裡面的所有檔案和子資料夾，拖曳到 GitHub 上傳區。不要只拖 ZIP，也不要把最外層 agents-xray 資料夾包上去。**
4. 確認上傳清單包含 `.github/workflows/test.yml`、`.nojekyll`、`.gitignore`、README.md、LICENSE、index.html、src/、bin/、test/、scripts/、examples/、docs/。
5. 如果檔案總管隱藏了點開頭的檔案或資料夾，開啟「顯示隱藏的項目」後再確認。若你已在本機執行建置，**不要上傳 `dist/`、`artifacts/`、node_modules/ 或自己的掃描報告**。
6. Commit message 填：`Initial release: AGENTS X-Ray v0.1.0`。
7. 這是你的新儲存庫第一次上傳，使用目前的 `main` 分支，按 **Commit changes** 完成。

`Commit` 可以理解為「儲存這次版本，並附上修改說明」。正式多人合作或受保護分支會使用另一套分支／Pull Request 流程；現在先完成自己的初次上傳即可。

### 上傳後的正確位置

儲存庫首頁應直接顯示：

```text
agents-xray（這是儲存庫名稱，不是裡面又一層資料夾）
├── index.html
├── README.md
├── LICENSE
├── package.json
├── src/
├── bin/
├── test/
├── scripts/
├── examples/
├── docs/
└── .github/
```

如果首頁只顯示 `agents-xray-v0.1.0.zip`，表示你上傳的是壓縮檔，不是原始碼。應上傳解壓縮後的內容。

如果首頁只有一個 `agents-xray/` 子資料夾，表示多包了一層。先把正確檔案上傳到儲存庫根目錄，再移除誤上傳的那一層；不要刪除整個 Repository。

本包遠少於 GitHub 網頁單次 100 個檔案的限制，每個檔案也遠小於 25 MiB。網頁上傳不會套用 .gitignore 自動替你過濾機密檔案，必須自己檢查選取內容。

## 第四階段：確認測試有執行

1. 點儲存庫上方的 **Actions**。
2. 找到名為 **Tests** 的工作流程。初次提交後它應開始執行。
3. 等待狀態變成綠色。此工作流程設定了 Node 22/24、Linux/Windows 組合。
4. 若顯示紅色，點進失敗的步驟查看紀錄；不要把「已附測試設定」當成「GitHub 已測試成功」。

沒有 Tests 時，先確認 `.github/workflows/test.yml` 是否真的上傳到正確路徑，以及該儲存庫是否允許 Actions。

## 第五階段：發布別人可以使用的展示網站

1. 在儲存庫上方點 **Settings**。
2. 在左側找到 **Pages**。
3. 在 **Build and deployment → Source** 選 **Deploy from a branch**。
4. Branch 選 **main**，資料夾選 **/(root)**。
5. 點 **Save**。
6. 等待發布。依 GitHub 官方說明，推送變更後可能需要約 10 分鐘。
7. 回 Pages 頁面找 **Visit site**，打開它。請使用 GitHub 顯示的實際網址，不要自己猜。

一般專案網站網址形狀如下，下面只是格式示例：

```text
https://你的帳號.github.io/agents-xray/
```

公開程式碼的網址則類似：

```text
https://github.com/你的帳號/agents-xray
```

前者是給人使用的工具網站；後者是看原始碼、提 Issue 的地方。只有存放原始碼，不會自動變成公開 App。

`.nojekyll` 和根目錄的 index.html 都已附好。本程式是純靜態網站，沒有要另外設定的伺服器密碼、API Key 或資料庫。

### 404 或畫面異常

檢查 Pages 選的是 main / (root)、index.html 是否在儲存庫最外層、src/ 是否一起上傳，以及 Pages 的建置是否成功。首次發布後稍等再重新整理。

若下載後在本機開啟時沒有樣式或按鈕不動，確認已完整解壓縮且 index.html 與 src/ 相對位置沒變；也可用獨立 HTML 附件測試。企業瀏覽器政策可能封鎖本機腳本，此時可先用發布後的 Pages 網站。

## 第六階段：補上專案首頁資訊

回到儲存庫 **Code** 首頁，右侧 About 的齒輪中，可把 Pages 實際網址填到 Website。Topics 可用 `agents-md`、`codex`、`developer-tools`、`local-first`、`static-analysis`。

沒有真實使用者時，不要填不存在的下載量、採用專案或「已加速幾倍」。本版能誠實展示的是可運作的工具、測試案例、已知限制和後續維護。

## 以後修改程式怎麼更新

少量文字修改可直接點 GitHub 上的檔案，再點鉛筆編輯並 Commit changes。程式修改則在電腦中保留完整專案，更新後用 Add file → Upload files，把變更檔案放回原本的路徑。

例如修改 `src/analyzer.js`，上傳时仍要保留 `src/` 路徑，不能變成根目錄的 analyzer.js。對初學者最不容易弄錯的方式，是把包含修改的整個 src 子資料夾拖到儲存庫根目錄的上傳畫面，並檢查顯示的路徑。

一般更新的 Commit message 應寫實際修改，例如 `Fix false positive for generated file references`。之後再檢查 Actions。Pages 會依指定分支上的更新重新發布。

不必每次重建儲存庫，也不必上傳 ZIP 取代原始碼。熟悉後再考慮 GitHub Desktop 或 Git 指令。

## 官方操作參考（2026-09-16 查核）

- 建立儲存庫：<https://docs.github.com/en/repositories/creating-and-managing-repositories/quickstart-for-repositories>
- 網頁上傳檔案：<https://docs.github.com/en/repositories/working-with-files/managing-files/adding-a-file-to-a-repository>
- Pages 的分支設定：<https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site>
- Pages 建立與發布時間：<https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site>
- Codex for Open Source：<https://openai.com/form/codex-for-oss/>

官方申請會評估真實使用、對生態的重要性及維護證據；公開此專案不保證獲選。
