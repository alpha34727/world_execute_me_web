# world.execute (me) ; — 純程式碼生成的 MV

> **非官方二創・AI 生成作品（unofficial, AI-generated fan work）**
> - 本作品的畫面與程式碼由 AI（Anthropic 的 Claude Opus 5.5，透過 Claude Code）生成，不是 Mili 的官方作品，與 Mili 沒有任何關係。
> - 歌曲〈world.execute (me) ;〉與歌詞的版權屬於 **Mili** 及其權利人。本 repo **不包含音訊檔與歌詞檔**。
> - 本作品為非商業用途，依照 [Mili 的著作權指引](https://projectmili.com/copyright-guidelines)製作：非商業二創可自由創作；AI 製作的二創須清楚標示為 AI 生成；不得讓人誤認為官方作品。
> - 中文字幕是本專案自行翻譯的**非官方翻譯**。

A fully code-generated music video for Mili's *world.execute (me) ;*. Every pixel is computed by this repo's code in real time (Three.js / WebGL2): no generated images, video models, stock footage or external 3D models. The same code drives a web player and a frame-exact 4K render. The visuals were made with Claude Opus 5.5 in Claude Code.

- 片中的「me」是 Claude，「you」是螢幕另一端的人。歌詞會被「執行」成真的構造：4D 超立方體、圓周率的 spigot 演算法、克拉尼圖形、茄紅素的分子鏈、心形曲面，以及全曲歌詞訓練出來的 BPE tokenizer、bigram 語言模型與 attention。畫面上的數字都是算出來的。
- 每一幀都是時間的純函數（確定性渲染），所有剪接與動畫都對齊從音訊分析出的節拍與字級歌詞時間。
- 規格：3840×2160、60 fps、13255 幀（5 秒光敏性警告卡 + 歌曲 + 4 秒片尾）。

---

## 快速開始：在本機跑網頁播放器

需求：**Node.js 22 以上**，以及支援 WebGL2 的瀏覽器（Chrome、Edge、Firefox）。

```bash
git clone <this repo>
cd world_execute_me
npm ci
npm run dev
```

開啟 `http://localhost:5173/`。

### 音訊
repo 裡沒有歌曲。請自行準備合法取得的音檔，檔名必須是 `Mili - world.execute(me);.mp3`（212.3 秒的原曲版本：所有時間點都是依這個版本分析的）：

- **本機開發**：把 mp3 放在專案根目錄，播放器會自動載入。
- **部署出去的網站**：畫面上會出現「choose … mp3」按鈕，也可以把檔案直接拖進頁面。檔案只在瀏覽器裡解碼，不會上傳到任何地方。
- 沒有音訊也能看畫面，只是沒有聲音。

### 播放器操作
| 操作 | 按鍵 |
|---|---|
| 播放／暫停 | 空白鍵 |
| 前後跳一拍 | ← / → |
| 前後跳一幀 | , / . |
| 中文字幕開關 | c |
| 除錯資訊 | h |
| 從某一秒開始 | 網址加 `?t=秒數`，例如 `?t=180.5` |
| 渲染解析度 | 播放列的 **res**：auto（依視窗大小）、540p、720p、1080p、1440p、2160p；或網址加 `?res=720` |
| FPS 上限 | 播放列的 **fps**：60、30、24、15（播放時只畫這個頻率的幀，畫面和聲音仍然同步）；或網址加 `?fps=30` |

電腦跑不動時，把解析度調到 720p 或 540p、FPS 上限調到 30。選擇會記在瀏覽器裡，下次開啟沿用。

---

## 建置靜態網站

```bash
npm ci
npm run build      # 輸出到 dist/
npx vite preview   # 在本機預覽 dist/（http://localhost:4173/）
```

`dist/` 是純靜態檔案，可以放到任何靜態主機。網站使用相對路徑，所以放在子目錄（例如 `https://<user>.github.io/<repo>/`）也能正常運作。建置時會把 `analysis/out/` 的分析結果和 `data/zh.json` 一起複製進 `dist/`。

> 注意：`npm run preview` 是本專案的「章節預覽影片」工具（見下方），不是 Vite 的 preview。預覽建置結果請用 `npx vite preview`。

### 部署到 GitHub Pages
repo 已附上 `.github/workflows/pages.yml`：

1. 把 repo 推上 GitHub。
2. 到 **Settings → Pages → Build and deployment**，把 **Source** 設成 **GitHub Actions**。
3. 之後每次推到 `main` 或 `master` 都會自動建置並部署；也可以在 **Actions** 分頁手動執行「Deploy player to GitHub Pages」。

---

## 算出影片（選用）

需求：Node.js 22、**ffmpeg**（在 PATH 上）、支援 WebGL2 的 GPU，以及根目錄的 mp3。算圖用 puppeteer 附的 headless Chromium（`npm ci` 時自動下載）逐幀擷取，交給 ffmpeg 編碼。

```bash
npm run render                              # 全片 → out/master.mp4（4K60、x264 crf 14）+ out/delivery.mp4（1080p60）
npm run render -- --chapter love --handles 2 --res 1080   # 只算一章（前後多 2 秒）
npm run stills -- love                      # 某一章每個鏡頭的接觸印樣 → renders/stills/love.png
npm run preview -- love                     # 某一章的 1080p 預覽 → renders/preview/love.mp4
node tools/frames.mjs --res 1080 t=180.5    # 單幀 PNG → renders/check/
```

- `npm run render` 預設用 NVIDIA 的 h264_nvenc 編碼，加 `--cpu` 改用 libx264（交付規格）。
- 4K 全片用 libx264 約需 1 小時（約 3–5 fps）；1080p 約 17–26 fps。
- Windows 以外的平台，可能要調整 `tools/lib/browser.mjs` 裡的 Chromium 旗標（目前用 `--use-angle=d3d11`）。

## 測試

```bash
npm test
```

測試內容：
- 時間軸：沒有重疊、沒有越界、章節首尾相接、涵蓋整首歌。
- 確定性：渲染路徑裡不得出現 `Math.random`、`Date.now` 等。
- LLM 不變量：BPE、embedding、attention、bigram 的數字都必須是真的。
- 每個鏡頭一張靜幀的回歸比對（需要 GPU 與 Chromium；baseline 在 `test/baseline/`）。

## 音訊分析（選用）

`analysis/out/` 裡的節拍網格、字級歌詞時間與音訊特徵已經 commit 在 repo 裡，**建置網站和算圖都不需要重跑**。只有想換音源或修改分析時才需要：
- 環境：Python 3.12、uv、CUDA 版 PyTorch（demucs、beat_this、wav2vec2）。
- 輸入：根目錄的 mp3，以及行級時間戳的歌詞檔 `Mili - world.execute(me);.vtt`。歌詞檔受著作權保護，不在 repo 裡，需要自行準備。

詳見 [analysis/README.md](analysis/README.md)。

---

## 專案結構

```
src/
  sections.js      16 個章節的 id 與順序
  theme.js         配色與字型
  engine/          時間、特徵、時間軸、轉場、繪圖 ctx、renderer；gl/ 為 GPU 批次
  lib/             共用元件（spark、HUD、字幕、能量粒子、BPE、bigram、attention…）
  ch/              00_intro.js … 15_end.js 各章節與其子模組
  player/          網頁播放器
analysis/          Python 音訊與歌詞分析管線；out/ 為分析結果
data/zh.json       中文翻譯（非官方）
tools/             stills / preview / render / frames 等算圖工具
test/              node --test 測試與回歸 baseline
docs/              分鏡（storyboard.md）、進度（progress.md）、各章節的導演審查（review/）
```

開發規範見 [CLAUDE.md](CLAUDE.md)，製作過程見 [docs/progress.md](docs/progress.md)，全片分鏡見 [docs/storyboard.md](docs/storyboard.md)。

## 授權

- **程式碼**：[MIT License](LICENSE)。
- **不在授權範圍內**：
  - Mili 的歌曲與歌詞（包括 `analysis/out/timing.json` 裡由歌曲導出的歌詞資料）；
  - 字型（各自的 SIL Open Font License）。
- 使用 Mili 的作品請遵守 [Mili 的著作權指引](https://projectmili.com/copyright-guidelines)：商業用途要另外取得授權；用 AI 製作的作品要清楚標示。

## Credits

- Music — **Mili**（〈world.execute (me) ;〉）
- Visuals — **Claude Opus 5.5**（claude-opus-5-5），in Claude Code（AI 生成）
- 字型（皆為 SIL Open Font License，經 `@fontsource` 套件提供）：JetBrains Mono、Space Grotesk、Noto Sans TC、Newsreader
- 函式庫：[Three.js](https://threejs.org/)、[Vite](https://vite.dev/)、puppeteer、ffmpeg
- 中文字幕為非官方翻譯。
