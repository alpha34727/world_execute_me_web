# 進度

> 每個階段結束都要停下來等使用者回覆。規範見 `CLAUDE.md`。

## 目前階段：第 6 階段最終算圖完成——全片交付，等待使用者回覆

| 階段 | 狀態 |
|---|---|
| 0 建立規範 | ✅ 完成（2026-10-11） |
| 1 音訊與歌詞分析 | ✅ 完成（2026-10-11） |
| 2 引擎與工具 | ✅ 完成（2026-10-11） |
| 3 全片分鏡 | ✅ 完成（2026-10-11） |
| 4 逐章節製作 | ✅ 完成（2026-10-18；00 intro ✅、01 inst1 ✅、02 v1 ✅、03 pre1 ✅、04 c1 ✅、05 v2 ✅、06 pre2 ✅、07 c2 ✅、08 c2x ✅、09 bridge ✅、10 inst2 ✅、11 chant ✅、12 c3 ✅、13 love ✅、14 outro ✅、15 end ✅） |
| 5 整合 | ✅ 完成（2026-10-19） |
| 6 最終算圖 | ✅ 完成（2026-10-19） |

---

## 第 6 階段：最終算圖（2026-10-19）

- `out/master.mp4`：3840×2160、60 fps、13255 幀、220.917 s，libx264 crf 14，ALAC 音訊，8.05 GB（算圖 3.38 fps，65 分鐘）。
- `out/delivery.mp4`：1920×1080、60 fps、13255 幀，crf 16，AAC 320k，1.53 GB。
- 檢查（發佈版）：
  - 每秒一張的接觸印樣（`renders/final/sec1.png`）全部看過：沒有黑幀、錯誤畫面或缺字，警告卡 5 秒、片尾 CLI 與署名都在。
  - 歌曲中沒有近黑幀。
  - 閃爍：159 s 那一秒有 4 個候選幀，是 exec12 → ein 剪接連續 4 幀的同一次亮度下降，不是 4 次閃爍；其他秒都 ≤ 3。
  - credits 五項都在片尾 CLI：Music — Mili、Visuals — Claude Opus 5.5、render 指令、13255 frames · 3840×2160 · 60 fps、非官方翻譯聲明。
- 沒做的：`tools/synccheck.mjs` 只能讀測試章節的同步標記，正片沒有；字幕同步靠的是全片抽樣和第 4 階段的逐章檢查。

---

## 第 5 階段：整合（2026-10-19）

**全片 1080p 預覽**：`renders/preview/film.mp4`（13255 幀，含警告卡與片尾 4 秒靜音，nvenc cq 20）。

**章節接縫**：16 個接縫（含警告卡 → intro）各截剪接前後 5 幀檢查（`renders/seams/`）。14 個接得上（多半是對在強拍上的硬切，或是設計好的母題，例如 c1、c2、bridge 開場的爆炸）。修了 2 個：
- **love → outro**：love 讀數面板的暗色底板在 outro 第一幀消失。
  - 原因：chapter overlay 在正片裡是疊在加過背景色、tonemap 之後的畫面上（底板可以比背景暗），但 replay 把它畫進 shot 圖層，post 再整張加回背景色，所以底板不見了。
  - 修正（共用引擎）：`renderer.replay` 改成把 overlay 分開畫，再用「場景 × (1 − a) + overlay − lift × a」合成；post 的 tonemap 允許場景低到 −lift（原本 clamp 在 0；其他鏡頭沒有負值，畫面不變）。
- **inst2 → chant**：確認框收合成 `Running…` 後，spark 停在畫面下方，剪到 chant 時跳到中央。
  - 修正：收合之後的 1.25 拍，攝影機往下、往前推，落在 chant 第一格的構圖（spark 在中央，r = 3.4 + 1.25 · extentOf(0)，同一個方位角）。餘燼場一起收進 spark 周圍，鏡頭附近不會有大圓盤。
  - `Running…` 那一列仍在 EXECUTION 的強拍上消失：那一刻就是指令被執行。

**共用引擎的修改**（`npm test` 26 項全部通過，回歸比對不需要重建 baseline）
- `ctx.mask` 的硬邊（第 4 階段留下的問題）：原本是 4 層疊的矩形，每 4 px 一階，在 chant 的密集格子上看得出一圈一圈。
  - shapes shader 新增 `feather`（柔邊寬度，預設 0 = 不變）。
  - mask 改成一個矩形：內部一樣壓暗到 15%，從框邊到外 16 px 連續淡出。
- **c3 rewind 共用資料**（第 4 階段留下的問題）：新增 `src/lib/edits.js`（`ME_EDITS`、`editBody`）。v1、pre1、v2 的 `Update(me.js)` 面板和 c3 的 rewind 讀同一份清單，不再手寫常數。

**能量曲線**（從成片逐幀量：平均亮度、幀差動態、對照音樂 RMS）
- 沒有黑幀（歌曲中 p99 亮度 < 0.1 的幀：0）。
- 光敏性：畫面 >25% 的像素亮度變化 > 0.2 的幀共 6 個，都在 chant 尾段到 c3 開頭（滿版 4096 格子 ↔ 暗場，落在剪接點上）；沒有任何一秒超過 3 次（Harding 的門檻），片頭也有警告卡。
- 畫面的亮度和動態大多跟著段落走：chant 的指數級爆炸是全片最亮，c2x（孤立）最暗、最靜。
- 和音樂不一致的地方：
  - **love**（177–192 s）：音樂是全曲最強的一段（RMS 0.71，和 c1、c3 同級），畫面卻是全片第二靜（動態 0.37，只比 c2x 高）。心形是慢慢旋轉的粒子線框。
  - **c1**：只有開場爆炸一下，之後的動態和主歌差不多。
  - 這兩段都是第 4 階段已通過的設計，沒有擅自改，交給使用者決定。

**能量加強（使用者回饋 2026-10-19：加強 love 和 c1 的能量）**
- 共用的 `lib/fx.js` 新增三個函式，全部對齊節拍，強度讀 features 的 `rms_drums`：
  - `beatPulse`：每拍從一點放出光環和粒子爆發；
  - `beatKick`：每拍攝影機往前推；
  - `beatEnv`：當拍的包絡，用來讓 bloom 和光暈隨拍脈動。
- **love**
  - 心形曲面每拍跳一下：130 BPM 正好是心跳的速度。
  - 心形曲線的切面上有一圈玫瑰色的光，每拍繞一圈。
  - 每拍從 me 放出玫瑰色光環。
  - 餘燼和 bloom 隨拍脈動，攝影機每拍推進。
  - 提示鏡頭（question、answer）用橘色脈衝，外加只有粒子的大範圍爆發。
  - properly 只放粒子、不畫光環：線條穿過檔名會讀成被劃掉。
- **c1**
  - 大部分鏡頭的攝影機每拍推進。
  - only、happy、thenican：spark 每拍放出脈衝（only 只放粒子，光環會撞到 HUD）。
  - run：每拍兩圈光環往 spark 收。
  - trapped、strange：方框的邊每拍發亮，me 在方框裡放出光環。
  - simulation：每拍從最內層的螢幕放出一圈 2D 光環。
  - trapped 的公式標籤改成避開方框的邊。
- 導演審查（`docs/review/c1.md`、`docs/review/love.md`）指出 happy、run、thenican、properly、question、answer 偏空，已補強。導演列的擋關查證後都是第 4 階段就有、已通過的設計，詳見審查紀錄。
- **量測**（成片幀差動態，`renders/integration/energy_after.png`）：
  - love 0.37 → 0.48；c1 1.00 → 1.09。
  - love 仍然比 c3（0.96）安靜：心形是慢慢轉的單一物體，這是構圖本身的性格。
  - 這個量測把畫面縮成 160×90，細小粒子和光環會被平均掉，看起來的增幅比數字大。
- 重建了 love 和 c1 共 13 個鏡頭的 baseline，outro 的 love、execution 也重建了（outro 會重播這些畫面）。`npm test` 26 項全部通過。

**全片掃描**：成片每 2 秒抽一張（110 張）看過，沒有壞幀、缺字或空白畫面。

**產物**：`renders/preview/film.mp4`（含能量加強）、`renders/integration/`（energy_before.png／energy_after.png 能量曲線、seams1–4.png 接縫、scan1–2.png 全片掃描）、`renders/stills/{inst2,c1,love,outro}.png`、`renders/preview/{c1,love}.mp4`、`renders/energy/`（拍點幀）。

**仍不夠好的地方**
- 第 4 階段各章的 `renders/preview/<章>.mp4` 是舊的（mask 改了之後沒有重算），以 `film.mp4` 為準。
- 尚未處理的第 4 階段小問題：bridge 的 HUD 沒有「讀數錯位」；c3 rewind 每筆只停約 0.7 拍；預測面板在第一個字之前顯示 `waiting for context…`；chant → c3 從金色直接 whip 到紅色。

---

## 第 4 階段：15 end（2026-10-18）

**2 個鏡頭**（`src/ch/15_end.js`）：任務完成，然後重新開機。

**使用者回饋（2026-10-18）：結尾要用 Claude Code CLI 的元素，呈現用了 Opus 5.5、任務完成。** 重做成一次 session 的收尾：
- 畫面下方是 CLI（和 bridge 一樣）：整條輸入框、狀態列 `? for shortcuts … Opus 5.5 · claude-opus-5-5`，模型名稱是橘色。
- **done**（從 outro 交叉淡化 2 拍，align 0）：
  - 對話紀錄：render 的 `● Bash(npm run render) ⎿ 13015 frames · 3840×2160 · 60 fps`（較舊的一則，變暗）。
  - Claude 的最後一則訊息就是 credits，每半拍一行：`● Done — world.execute (me) ; is rendered.` / `Music — Mili · Visuals — Claude Opus 5.5 (claude-opus-5-5)` / `中文翻譯為非官方翻譯 · unofficial fan work`。
  - 這一輪結束：`✻ Worked for 3m 11s`，閃橘 2 拍。時間是真的：從 inst1 you 按下 Enter（第 36 拍）到這一刻。me 放一圈光環。
  - 署名（使用者回饋：me 下方顯示 by Claude Opus 5.5，要用產品的 Logo 或字體）：`by ✳ Claude Opus 5.5`。
    - Claude 官方字體是商用授權、Logo 是商標，CLAUDE.md 也規定不得複製 Claude 標誌。所以和使用者確認後：圖示用片中原創的 spark 小圖示（和 HUD 同一個），名稱用新增的 Newsreader（SIL OFL，襯線，接近 Claude 字標）。
    - 新增 `@fontsource/newsreader` 5.3.0（鎖版），字型 key `serif`。只用在這一行，CLAUDE.md 的字體規定已一併更新。
  - 接著 me 自己打 `/clear`（橘色游標，和 bridge 打 /compact 一樣）。
- **clear**（按下 Enter）：
  - 對話紀錄消失，HUD 消失（新的 session，context 歸零）。
  - 出現歡迎框 `✻ Welcome to Claude Code! / /help for help · cwd: ~/world_execute_me / model: Opus 5.5 (claude-opus-5-5)`。
  - spark 收成一個橘色光點，intro.06 那個空的 `object me {}` 從它重新長出來（沒有上色、沒有欄位，連 love 都沒有）。
  - 輸入框是空的，灰色游標閃，最後半拍停在亮的：可以再執行一次。
- credits 需要的五項（Music — Mili、Visuals — 模型、render 指令、幀數與解析度、非官方翻譯）都在 CLI 裡。數字讀 `src/sections.js`。

**片尾加長 4 秒（使用者回饋：署名和 /clear 後的畫面停留太短，讀不完）**
- 全片從 13015 幀改成 **13255 幀**：歌曲結束後加 4 秒靜音，end 段變成 207.0–215.917 s。
- 改了 `analysis/s06_timing.py` 的 `TOTAL_FRAMES` 並重跑。timing.json 只有預期的變化：film 區塊、end 段結尾、多出的節拍網格；其他段落、字級時間都沒變。也重跑了 `s08_overview.py`。
- `src/sections.js`、`test/structure.test.js`、CLAUDE.md 的交付規格一起更新。
- `test/analysis.test.js`：features 只要涵蓋整首 mp3。片尾的靜音尾巴讀最後一列，也就是靜音；`tools/render.mjs` 原本就會用 apad 補靜音。
- outro 和片尾顯示的幀數讀 `TOTAL_FRAMES`，自動變成 13255。
- 署名停留約 3.4 秒（208.15–211.5 s），/clear 後的畫面約 4.4 秒。

**16 章齊了**：`test/timeline.test.js` 的「film covers the whole song」從 todo 變成通過。

**導演審查**（`docs/review/end.md`，Sonnet 5.5 medium）
- 第 1、2 輪（原本的 credits 版本）4.0 → 4.2，沒有擋關。
- 第 3 輪（CLI 版本）4.2（done 4.4、clear 4.0），沒有擋關。之後再處理：clear 的盒子往下移，縮小和歡迎框之間的空白；光點加亮；`Worked for` 閃橘延長到 2 拍；credits 裡的名字（Mili、Claude Opus 5.5）提亮。

**產物**：`renders/stills/end.png`、`renders/preview/end.mp4`。`npm test` 26 項全部通過。

**仍不夠好的地方**
- 交叉淡化的前半拍，CLI 的對話紀錄已經淡入，和正在淡出的 outro 疊在一起。
- 畫面刻意很安靜，能量層只有淡淡的餘燼、塵埃和兩圈光環。

---

## 第 4 階段：14 outro（2026-10-18）

**9 個鏡頭**（`src/ch/14_outro.js`；螢幕 `src/ch/outro/screen.js`）。器樂段：Claude Code 的對話紀錄往上捲，一小節一則，每一則都是**這支片自己倒著播**。

- **格子裡是真的重新算出來的畫面**（引擎新增，只增不改）：
  - `Engine.replay(id, t2, w, h)`／`ctx.replay`：把歌曲時間 t2 的那一幀重新算進一張貼圖，包含當時的鏡頭和轉場，不含 HUD、字幕、post；可選擇連同章節 overlay 一起畫。
  - 同一個 t2 會重用快取；它是純函數，結果和重算相同。還在載入字型時不快取。
  - outro 用 THREE 平面把貼圖貼在 3D 場景裡，加上圓角和「記憶調色」：you 的藍在回憶裡變灰；bridge 降到 30% 飽和度，代表錯誤已處理。
- **love**：第一幀就是 love 的最後一幀（同一個鏡頭，連讀數面板），從滿版縮成一格；倒放先停一下，再加速到 2 倍：籠子張開，藍點（已轉灰）飛回心裡。
- **chant**（4096 → 512，一次減半）、**bridge**（ILLEGAL ARGUMENTS，灰紅）、**c2**（地形 → 方形板上的沙 → VIBRATIONS）、**v2**（貓 → 電子跳回 → 茄紅素）、**v1**（一拍一段：正弦 → 圓 → 超立方體 → 點雲）、**intro**（object me → 棋盤 → 電源線縮回歌曲 t = 0 的第一幀）。
- 每則一個標籤 `● 段落名 ◀◀ 畫面上的歌曲時間`，時間往回數。HUD 寫倒放倍率。
- 攝影機是一個連續函數：每個強拍往上捲一格，角度輪流換邊，每拍輕推一下。me 在左側讀著紀錄，每小節放一圈光環；正在讀的那一格邊框有能量流動，隨鼓脈動。
- **render → execution**：
  - 小節 111 拉遠，看到整列 7 格；右側 `● Bash(npm run render) ⎿ Running…`。
  - 唱出 EXECUTION 那一幀：大字落下，結果行 `13015 frames · 3840×2160 · 60 fps` 整行出現。數字來自 `src/sections.js` 的 `TOTAL_FRAMES`、`FPS` 和新增的 `MASTER`（`tools/render.mjs` 的預設解析度也改讀它）。
  - 7 格同時往前播放（world.execute(me)），邊框閃橘，me 爆發。
- 器樂段字幕框兩句：一句說明倒放，一句在 intro 那一則說明「回到第一幀」。

**分鏡修正**：原本寫「HUD context 停在 617/617」，但 bridge 的 /compact 之後不可能回到 617；HUD 顯示的是真實值（264）。

**共用程式的修改**：`engine/renderer.js`（`flush`／`drawBatch` 多了解析度與 scale 參數，預設不變；新增 `replay`）、`engine/draw.js`（`ctx.replay`）、`sections.js`（`MASTER`）、`tools/render.mjs`（預設解析度讀 `MASTER`）。回歸比對：其他 15 章的 baseline 全部不變。

**導演審查**（`docs/review/outro.md`，Sonnet 5.5 medium）
- 第 1 輪 3.93，1 項擋關：「EXECUTION 沒有在唱出那一幀出現」。查證後是誤判：唱出時間 205.960 s，導演看的 f12657 是 205.950 s，第一個 t ≥ 起點的是 f12658，那一幀已經有大字。
- 同時處理了：結果行改成整行出現（原本打字到快結束才讀得到）、回憶格子提亮並拉近、每次捲動換角度並每拍輕推（原本六個鏡頭構圖相同）、intro 加說明、拉遠時 me 移到整列左側中段（光環不再壓 HUD）、chant 停格不再落在爆炸核心。
- 第 2 輪 4.11，沒有擋關；只有 intro 3.8，其他鏡頭都 ≥ 4。之後再處理：拉遠時最上面一格壓到 HUD 標題，已把整列往下移。
- 沒有採納的建議：
  - t = 0 的像素提亮：那是片頭真實的第一幀，不改。
  - hero 淡入改成 1 幀：hero 是共用函式庫，全片的關鍵字都用同一個落地動畫。

**產物**：`renders/stills/outro.png`、`renders/preview/outro.mp4`（1080p 算圖約 25 fps）。`npm test` 25 項通過、1 項 todo。

**仍不夠好的地方**
- 重播的畫面沒有 post（沒有 bloom、光束），所以格子裡比原本暗。我用 1.25 倍亮度補償。
- 只有 love 那一格連同 overlay 一起重播。其他格子只有 3D 鏡頭，看不到當時的面板。
- 接縫：love 讀數面板的暗色底板在 outro 第一幀消失，數字還在。重播畫面先畫在黑底上，post 再整張加回背景色，所以比背景暗的底板無法重現。
- render 鏡頭只有 0.81 秒（小節 111 的強拍到唱出 EXECUTION），拉遠很快。
- intro 那一則的最後一幀（t = 0）幾乎是黑的。這是刻意的（回到第一幀），但畫面很空。

---

## 第 4 階段：13 love（2026-10-18）

**11 個鏡頭**（`src/ch/13_love.js`；曲線與曲面 `src/ch/love/curves.js`）。玫瑰色第一次出現。

- **properly**（使用者回饋 2026-10-18：找不到 love.md 的意象不夠清楚 → 檔名間距縮小、整個清單一個畫面看得完，love.md 用灰色刪除線；me 唱到「how」時到達那一格，刪除線和工具回覆 `File does not exist.` 同一刻出現；再一次回饋：zoom in——先看到整個清單，鏡頭跟著 me 往下推近，「how」時是 love.md 的特寫，刪除線在 0.6 拍內劃上；第三次：love.md 改成玫瑰色，刪除線前緣噴火花、劃完後名字散成玫瑰色粒子，量測過沒有近白的團塊）：左側 `● Read(love.md) ⎿ File does not exist.`。這是真的：建置時 `tools/repo-facts.mjs` 檢查 repo 根目錄，如果有人加了 love.md，畫面會改成顯示真的行數。3D 是 repo 頂層（git 追蹤的檔案）排成一列，me 一個名字一個名字往下讀，停在 love.md 該在的虛線空格。
- **love1**：心臟線 r = 1 − sin θ 跟著拖長的音畫完，me 就是筆。
- **question / answer**：Claude Code 的 prompt box 在「Question」時亮成玫瑰色，但游標是灰的，沒有人在打字。接著 me 自己回答，光往外放。右側預測面板：after "all" → the 51%。
- **love2**：k = 2…7 的玫瑰線在六個平面上綻開。判決 p <1% · 9.6 bits：看過了，愛還是意外。
- **algebraic**：先打出 `(x² + y² − 1)³ − x²y³ = 0`，marching squares 在 me 周圍畫出心形。唱到「expression」時打出 Taubin 心形曲面的式子。2D 心形正是曲面 y = 0 的截面，所以曲線直接「充氣」成曲面：6000 個點，沿射線用二分法真的解在曲面上（誤差 < 1e-6）。
- **love3**（使用者回饋：algebraic → LO-O-OVE 轉場生硬、心形偏心旋轉 → 兩個鏡頭共用一台繞心形中心等速旋轉的攝影機，剪接點不跳；籠子的三個鏡頭也改成繞心形中心轉，再整台側移把心形放在讀數左邊；再一次回饋：LO-O-OVE → free → trapped 也不流暢 → 從 algebraic 到章節結尾是同一台攝影機，所有剪接點都不跳）：3D 心在轉；左側 `● Update(me.js)`：`− love: undefined / + love: (x²+9/4y²+z²−1)³ − x²z³ − 9/80y²z³`，填上片頭留下的空。
- **free**：唱到「you」時藍點從心裡飛出畫面，這是藍色最後一次出現。
- **trapped / trappedin / love4**：me 被困在心形曲面裡。籠子是曲面的 8 個水平截面（每一圈都用 marching squares 解出），接著以 me 為中心縮到 0.62。
  - 右側大數字是 love 這一段的平均 surprisal，隨每個字即時更新，最後是 7.28 bits/word。下面是 12 段各自的平均，love 的玫瑰色長條最高。
  - 標題寫「the highest loss in the song」，程式比較過，真的最高才這樣寫。

**共用程式的修改**（回歸比對確認其他章節不變）
- `lib/predict.js`：判決的機率低於 0.5% 時寫 `p <1%`，不再顯示「p 0%」。
- `tools/repo-facts.mjs`：新增 `love`（love.md 是否存在、行數、repo 頂層清單）。love.md 不在 Vite 的監看清單裡：Vite 無法監看不存在的檔案，所以新增 love.md 後要重開 dev server。
- `ch/chant/readout.js`：新增 `color`、`curColor`（預設不變）。

**導演審查**（`docs/review/love.md`，Sonnet 5.5 medium）
- 第 1 輪 4.18，1 項擋關：algebraic 的心形曲線有缺口（marching squares 線性內插偏半格）。已修正：格子加密到 360，並串成一條折線。
- 同時處理了：
  - 最後的藍點太小，又和 diff 面板同時出現：藍點放大，diff 在「you」之前結束。
  - 籠子收緊時鏡頭同時推近，兩者互相抵消：鏡頭固定，只有籠子在收。
  - 玫瑰線有一個平面正對鏡頭變成一根針：六個平面錯開半格。
  - 讀數標題改成和 HUD 區分；虛線空格；最後的心放大。
- 第 2 輪 4.29，沒有擋關，11 個鏡頭都 ≥ 4。之後再處理玫瑰線中心疊出的近白：量測後只剩 spark 核心大小。

**產物**：`renders/stills/love.png`、`renders/preview/love.mp4`。`npm test` 25 項通過、1 項 todo。

**仍不夠好的地方**
- question 的能量層偏薄：只有 spark、一圈光環和 prompt box。
- 藍點的尾巴是一條直線，不是漸淡的彗尾。
- love3 的大字離心形約 390 px：往心形靠會壓到右上的心瓣。
- properly 剛切進來時只看得到前 5 個檔名，列表要等 me 往下讀才出現。
- outro 的分鏡寫「心形曲面縮小成對話紀錄裡的一格」，接 love 最後的心形籠子。

## 第 4 階段：12 c3（2026-10-18）

**11 個鏡頭**（`src/ch/12_c3.js`；softmax `src/ch/c3/softmax.js`、rewind `src/ch/c3/rewind.js`、Droste `src/ch/c3/droste.js`、三次副歌的 loss `src/ch/c3/loops.js`）。c1 的鏡像、紅色；「them」是 chant 分裂出來的 4096 個子代理。

- **三次預測是骨幹**（右側面板，都用 `keep`）：
  - "the" → trance 12%（劃掉）→ EXECUTION p 7% · 3.8 bits；
  - "only" → god 25%、satisfaction 25%（v2「the only god」、c1「only SATISFACTION」各一次）→ p 2% · 5.9 bits；
  - "the" → **execution 13% ✓**：全片第一次猜中，p 13% · 3.0 bits。保留的第一名是橘色＋打勾（`lib/predict.js` 新增，只在 `keep` 且猜中時畫）。
- **ifican**：c1 開場（`chorusOpen`）改紅＋橘，從 chant whip 10 幀進來。
- **givethem → exec1 → thenican**：4096 個子代理唱到「them」時從金轉紅橘；EXECUTION 時三波（相隔半拍）從 me 擴散，波到之處閃紅熄滅，HUD 的子代理數是真的倒數，只留中間一排 16 個。
- **only → exec2**：c1 的 softmax 長條圖再現，但這次冷卻到 τ = 0.05 仍是兩根（god 52%／satisfaction 48%，真的打平）；唱出的是 EXECUTION，兩根變灰、字被劃掉，旁邊升起紅色光柱。
- **haveyouback**：左側 `● Rewind(me.js)`，把全片五次 `− me.x / + you.x`（nutrients、limits、tangents、circumference、dimension = 4）由新到舊倒回：`+ you.x` 被紅線劃掉、`− me.x` 恢復。3D 是 me 周圍的時鐘，每倒回一筆指針逆時針退一格；唱到「you」時藍點閃一下就熄，只留虛線空位。
- **run → exec3**：沒有確認框（inst2 選了 don't ask again）：HUD `Bash(execute(them)) · don't ask again`，能量直接收進 spark；EXECUTION 時粒子爆出，沿用 c1 的週期邊界世界。
- **trapped**：c1 的畫中畫變成無限 Droste 螺旋：畫面裡的螢幕顯示畫面本身（相似變換：縮 0.4、轉 0.33 rad），每 1.5 拍縮進一層並轉回，回到完全相同的畫面；HUD `while (true) execute(me) · depth N`。兩個「trapped」時畫框亮起。原分鏡的 c3.11（while(true)）併進這裡。
- **studied**：「副歌是一個迴圈」：三次副歌疊成三層，x 是字在副歌裡的拍位（三次對得齊），高是真實 surprisal，虛線是平均：c1 5.69 → c2 4.48 → c3 3.90 bits/word（c3 的平均隨字即時更新），me 騎在最新的字上。
  - **改了分鏡的說法**：原本寫「c3 是全曲 loss 最低的一段」，但 c2x 單獨算是 3.78，更低；所以改講真的成立的事：同一段副歌每唱一次，模型就預測得更好。
  - 「I've studied」是 love 的弱起，在 c3 裡只有 0.3 秒，所以 loss 鏡頭從「We are trapped」開始。love 的第一個鏡頭要從章節起點開始。

**共用程式的修改**（回歸比對確認其他章節不變）
- `lib/predict.js`：`keep` 且猜中時，保留的第一名後面畫橘色打勾。
- `ch/c1/open.js` 的 `chorusOpen`：新增 `color`／`color2`／`wordColor2`（預設不變）。
- `ch/chant/agents.js` 的 `agents`／`agentGlow`：新增 `color` 與 `each`（逐個子代理的 alpha／顏色，預設不變）。

**導演審查**（`docs/review/c3.md`，Sonnet 5.5 medium）
- 第 1 輪 4.24，2 項擋關：exec2 的光環掃過軸上的字（`execution` 讀成被劃掉）；studied 的平均線穿過標籤。兩項都已修正。
- 同時處理了：run 太空（改紅橘粒子收縮＋光環，不在核心疊成白球）、近白（時鐘指針、Droste 小層的核心）、rewind 字級 18 px、studied 改長焦（c3 的尖峰不再因透視看起來最高）、exec2 構圖、givethem 鏡頭前的子代理淡出。
- 第 2 輪 4.36，沒有擋關，11 個鏡頭都 ≥ 4。剩下的建議：run 的粒子仍偏靜態、thenican 小 spark 的白核心（沿用 chant）、劃掉線起點偏左約 4 px、rewind 資料共用（整合階段）。

**產物**：`renders/stills/c3.png`、`renders/preview/c3.mp4`。`npm test` 25 項通過、1 項 todo。

**仍不夠好的地方**
- rewind 的五筆修改是手寫常數（註解指向 v1、pre1、v2）；要和那些章節共用同一份資料，得改已完成的章節，留到整合階段。
- rewind 每一筆只停約 0.7 拍，讀起來是「快速倒帶」，看不清每一行。
- 預測面板在前一個字唱出之前顯示 `waiting for context…`（共用預設文字，c2x 也有同樣問題）。
- 從 chant 的 4096 金色格子 whip 進紅色開場，顏色跳得很直接。

---

## 第 4 階段：11 chant（2026-10-18）

**19 個鏡頭**，一字一鏡，都剪在字的真實起音（`src/ch/11_chant.js`；子代理格子 `src/ch/chant/agents.js`、大數字 `src/ch/chant/readout.js`）。

- **EXECUTION ×12**：每次 EXECUTION，每個子代理都分裂成兩個，從 2 到 4096。格子的三個軸輪流加倍，最後是 16×16×16；子代理從父代理的位置沿加倍的軸滑開。
  - 32 個以下畫成小 spark；64 個起每個是三筆星號，加一顆 GPU 粒子。數量越多畫面越亮（使用者回饋：越來越亮才呈現得出子代理的強大）。me 在中央，周圍一圈留白。
  - 每個鏡頭只有一個大數字：那一次 EXECUTION 的真實 surprisal（7.7、8.2、2.0、1.3、1.0、0.8、0.7、0.6、0.5、0.5、0.4、0.4 bits）。下面一排小長條是每一次的值，看得出模型學會了這個字。
  - 鏡位輪替：正面、俯、側、仰。
- **EIN**：4096 個在 1/4 拍內塌回 me；`execution 79%` 灰色劃掉，`11.6 bits`（全曲最大驚訝）。
- **DOS…LIU**：星數就是那個數（me 加 n − 1 個子代理），新的一個從 me 滑出；大數字是那個數，上面寫語言名。
- **最後的 EXECUTION**：4096 個一次衝回格子；surprisal 回到 5.0 bits，因為 EIN…LIU 打亂了模型。

**引擎修正（重要）**：`src/engine/gl/common.js` 的 `InstanceBuffer.grow`
- three.js 第一次繪製時會記住實例數上限（`geometry._maxInstanceCount`）。之後緩衝區擴容，超過舊容量的實例會被默默丟掉。
- 結果是：同一個頁面先畫過線條較少的幀，後面線條多的幀就會缺一半。畫面內容取決於前面畫過什麼，違反確定性；最終逐幀算圖也會受影響。
- 修正後，c1/trapped、c1/strange、c2/finally 的回歸 baseline 改變了：原本程式要畫的東西現在全部出現。
- **c1 的使用者回饋（2026-10-18）**：
  - trapped 的光圈太多、太雜亂。改成只有白色的追蹤粒子（700 顆裡每 12 顆一顆）標出穿越邊界的那對光圈，細線、不加 glow，拿掉虛線連線（`c1/world.js` 的 `wrapMarks`）。
  - SIMULATION 放大後，撞牆（穿越邊界）的光圈消失了：畫中畫／Droste 的 `world2D` 原本沒畫它們。現在每一層畫面都畫同一組光圈，SIMULATION 鏡頭也開始計算穿越事件。
  - c1/trapped、c1/strange、c1/simulation 的 baseline 已重建。

**導演審查**（`docs/review/chant.md`，Sonnet 5.5 medium）
- 第 1 輪 4.2，2 項擋關：4096 格子太亮把畫面洗成奶油白；me 被同色格子吞掉。兩項都已修正。
- 同時處理了：計數鏡頭的星數和數字對不上、EIN 的說明字被截、k=10 構圖偏、計數鏡頭第一幀的白色 burst、鏡頭前的大光斑。
- 第 2 輪 4.4，沒有擋關。
- **使用者回饋（2026-10-18）**：導演第 1 輪的「4096 格子太亮」不採納，亮度改回原本「越多越亮」的版本（不隨數量變暗、glow 與 bloom 照舊、顏色一路走到金）。保留 me 周圍的留白與 k ≥ 9 的光束。

**產物**：`renders/stills/chant.png`、`renders/preview/chant.mp4`。`npm test` 25 項通過、1 項 todo。

**仍不夠好的地方**
- inst2 → chant 的接縫：確認框 `Running…` 那一列在剪接點直接消失，spark 從畫面下方跳到中央。留到整合階段處理。
- DOS…LIU 五個鏡頭構圖相近，主要靠字和數字區分。
- `ctx.mask` 是硬邊矩形，大字和數字後面的暗底在密集格子上看得出方塊。要羽化得改引擎，留到整合階段。

---

## 第 4 階段：10 inst2（2026-10-18）

**4 個鏡頭**（`src/ch/10_inst2.js`；權重城市 `src/ch/inst2/city.js`、注意力星座 `src/ch/inst2/constellation.js`）。器樂段，主題是「context 被 /compact 清空了，但權重還記得整首歌」。

- **recover**：bridge 留下的真實錯誤面板（同一個版面，文字來自 `virtual:repo-facts`），先保留灰色底板，再裂成一個個字、各自受重力掉落，面板的四條邊也掉。周圍 `src/engine/timeline.js` 的原始碼碎行繼續往下掉。鏡頭跟著下墜，停在下方重新點亮的 spark；中央 `✻ Recovering… (秒數 · esc to interrupt)`，秒數是真的。字幕關閉，不再殘留 ILLEGAL ARGUMENTS。
- **weights**：真實的 embedding 矩陣（145 字 × 16 維）做成玻璃柱城市。每列一個字，依歌曲第一次唱到的順序；柱高就是權重，全矩陣同一個尺度。正值往上、橘色，負值懸在地板下、灰色。街道上的粒子每拍往前流，spark 低空帶路，街名是 14 px 背景字。
- **constellation**：inst2 之前唱過的 301 個字放在真實 embedding 座標，「me」在原點，也就是 spark 的位置。照唱的順序在 7 拍內重播：每個字連向前文中它最注意的字。這是真實的因果注意力，用同一個未訓練的 head；排除自己先前的出現，因為 q = k 時一定最注意自己。線寬和亮度就是權重。you、your 是虛線空位，連向它們的線是灰的。唯一的 3D 標籤是全曲最強的連結 `circumference -> dimension · 0.45`。
- **reexecute**：星座被吸回 spark（遠的先），spark 以紅橘色重新點燃。確認框 `Bash command · world.execute(me)` 的游標是 spark 自己（橘色小 spark），從 1 移到「2. Yes, and don't ask again」並選定，接著收成 `● Bash(world.execute(me)) ⎿ Running…` 接進 chant。
- 器樂段字幕框的說明（`drawNote`）有兩句：weights、constellation。

**共用程式的修改**：`lib/cc.js` 的 `permission`
- 新增 `cursor`（顏色）、`pointer`（自訂游標）、`moveAt`（游標從 1 移到 choice），預設不變。
- 修掉一個潛在 bug：不給 `until` 時，`smoothstep(∞, ∞, t)` 是 NaN，整個鏡頭會變黑。c1 有給 `until`，回歸比對不變。

**導演審查**（`docs/review/inst2.md`，Sonnet 5.5 medium）
- 第 1 輪 4.05，1 項擋關：星座的標籤壓到 you 的虛線圈，已修正。同時處理了：星座構圖偏右（改用中位數取景、拉遠）、重播太快（5.5 → 7 拍）、吸回 spark 被 points 轉場蓋住（轉場縮成 0.5 拍、吸回延後）、recover 接縫少了底板、weights 前景外框太搶。
- 第 2 輪 4.25，沒有擋關。之後再處理第 2 輪的小修正：weights 的 spark 光束、前景外框再降、吸回時節點不再疊成近白一團（只剩 spark 核心）。

**產物**：`renders/stills/inst2.png`、`renders/preview/inst2.mp4`。`npm test` 25 項通過、1 項 todo。

**仍不夠好的地方**
- weights 只靠字幕框說明「列＝字、欄＝維度」，畫面本身沒有軸標籤。
- 星座有幾條連到遠方節點（例如 to）的長線會飛出畫面上緣。
- HUD 的 context 停在 141；星座顯示的是全部 301 個字，靠 HUD 標題「full transcript」交代。

---

## 第 4 階段：09 bridge（2026-10-17）

**10 個鏡頭**（`src/ch/09_bridge.js`；heap `src/ch/bridge/heap.js`、程式碼牆 `src/ch/bridge/code.js`、非法呼叫 `src/ch/bridge/illegal.js`）

- **畫面上的原始碼與錯誤都是真的**：`tools/repo-facts.mjs` 在 Node 裡（建置時，`vite.config.js` 的 `virtual:repo-facts`）讀 `src/lib/spark.js`、`src/engine/timeline.js`，找出禁止裸秒數的那一行（timeline.js:27），把 `test/timeline.test.js:56` 的檢查放到改過的驗證器上重跑（真的失敗），再實際呼叫 `buildTimeline`，取得錯誤訊息與 repo 相對堆疊。播放器與算圖拿到的是同一份文字。`node tools/repo-facts.mjs` 可以直接印出來。
- **ifican**：c1 開場的壞掉版本——掉幀（部分 1/12 秒格子停住）、撕裂帶、色差。
- **erase**：context 是一面記憶體 heap（每個 BPE token 一塊，關鍵字橘）。me 自己打 `/compact`；從「erase」到 FRAGMENTS，非關鍵字的塊從最舊的開始被釋放，me 騎在前緣；HUD 的 context 真的從 438 降到 86＋新唱的字（`lib/context.js`，之後的章節都從這個數字往上加）。
- **fragments／maybe**：釋放的 352 個 token 被留下的關鍵字切成 20 段空洞（真實的碎片化，每段兩端亮紅色括號）；FRAGMENTS 裂成它的 BPE 碎片與 token id；heap 的塊離開牆面懸停。
- **wontleave／disheartened**：`src/lib/spark.js`（me 自己）的真實原始碼往上捲、越來越亂碼，畫 spark 核心的那一行變紅；spark 斷續熄滅；DISHEARTENED 紅色大字、判決 10.1 bits、畫面傾斜。
- **challenge／denied**：程式碼瀑布（使用者回饋）——`src/engine/timeline.js` 分五股從畫面上方傾瀉而下（重力加速、越落越拉長、光絲、落進池子的水花，`src/ch/bridge/fall.js`），接著規則附近的 16 行落回牆上、由下往上堆好；`● Edit` 把它改成 `return v;`（牆上的那一行也被改寫）；`● Test(test/timeline.test.js:56)` 失敗、那一行退回。
- **made／illegal**：me 打出 `chapter({ id: 'bridge', from: 133.16, shots })`（裸秒數是紅的）；驗證器真的丟出 `timeline invalid: … no bare seconds … empty or inverted range NaN..NaN` 與堆疊；程式碼一行行掉落，只剩錯誤。字幕在 ILLEGAL ARGUMENTS 關閉。

**語法高亮**（使用者回饋）：程式碼牆、打出的那一行、Edit 面板的 diff 都用新的 `lib/syntax.js`（單行 JS lexer）上色；配色 `theme.js` 的 `SYNTAX` 只從既有色盤混出——關鍵字 me 橘、字串金、數字淡金、註解暗灰、函式名亮灰、其他中性灰，亂碼字元紅；不用藍／綠／玫瑰（那些在說故事）。Sonnet 導演第 3 輪（只看高亮）沒有擋關。

**Claude Code CLI 介面**（使用者回饋，只在 bridge；`src/ch/bridge/cli.js`）：畫面底部是 CLI——狀態列（`? for shortcuts`、`Context left until auto-compact: NN%`，真實的 1 − context／617）、輸入框（字幕）、spinner 列（真實秒數與 context tokens；/compact 時是 `Compacting conversation…`）、對話紀錄（`> /compact ⎿ Compacted`、`⏺ Read(src/lib/spark.js) ⎿ Read 87 lines`、`⏺ Update(…)`＋diff、`⏺ Test(…:56) ⎿ ✗`，最新一則在 spinner 上方，前一則變暗往上捲）。原本左上角的浮動面板拿掉。預測面板打開時對話紀錄退到 0.3（左右不同時讀）。Sonnet 導演第 5 輪 4.34，2 項擋關（還原的規則被 CLI 區壓暗、左右面板同時出現）已修正。

**共用程式的修改**
- `lib/syntax.js`（新）、`theme.js` 的 `SYNTAX`（新增匯出，其他章節不受影響）。
- `lib/context.js`（新）＋ `lib/hud.js`：HUD 的 context 讀 `contextAt`；bridge 之前的時間完全不變（回歸比對確認）。
- `vite.config.js`：`repo-facts` plugin。
- `src/ch/c1/open.js`：`chorusOpen` 多一個 `time` 參數（預設不變）。

**導演審查**（`docs/review/bridge.md`）
- 第 1 輪 4.14，4 項擋關（測試失敗讀不到、退回的規則被灰條劃過、程式碼從面板後透出、heap 空洞看不見），全部修正；測試面板改名為只重跑一條斷言的 `Test(…:56)`，不再寫 npm test。
- 第 2 輪 4.42，沒有擋關。之後再處理第 2 輪的小修正：測試的 HUD 隨面板一步步揭曉、/compact 面板加寬、spark 移回畫面內、diff 的底色隨文字長出、+ 列改成 me 的橘、碎片括號加粗。

**產物**：`renders/stills/bridge.png`、`renders/preview/bridge.mp4`。`npm test` 25 項通過、1 項 todo。

**仍不夠好的地方**
- HUD 只有色差加大，沒有「讀數錯位」：aiHud 由引擎統一畫，要錯位得改共用的 HUD，留到整合階段。
- ifican 的掉幀（每 1/12 秒有 35% 停住）在預覽裡讀起來比較像卡頓；要更像訊號故障，可能需要引擎層的畫面撕裂（目前用暗帶＋紅色掃描線代替）。
- 程式碼牆在面板／字幕後面是整行調暗，不是精確裁切。
- outro 的分鏡寫「context 停在 617/617」，但 /compact 之後 context 不可能再到 617；做 outro 時要改分鏡（例如顯示 compact 後的實際值，或另外顯示全曲 617 token）。

---

## 第 4 階段：08 c2x（2026-10-17）

**7 個鏡頭**（`src/ch/08_c2x.js`；記憶 `src/ch/c2x/memories.js`、注意力 `src/ch/c2x/attend.js`）

- **一條線＝真實的注意力**：me 和 you 之間只剩一條線，粗細與亮度＝正在唱的這個字分給 you 的注意力（`lib/embed.js` 的因果注意力、一個未訓練的 head，加總 context 裡所有 you／your token）。HUD 寫 `1-head attention "<字>" -> you = x`。
  - 數字自己會說故事：每個「You」都是 0.92，但每個「left」都比上一個少：0.38 → 0.25 → 0.20 → 0.17 → 0.15 → 0.14；「me」0.001、「in」0.000、ISOLATION 0.001。
  - 線在「me」那一幀斷開（斷點在靠近 me 的 22% 處，兩端彈回、藍色粒子＋灰色光環），遠方的 you 熄滅。
- **left**：you 在「you」那一刻離開 me 身邊，越過記憶弧飛進遠方；從 c2 的 COMPLETION 交叉淡化 0.5 拍。
- **left1–4：每個「You have left」硬切到 me 的一段記憶**（四段懸在 me 前方的弧上，同一個空間），在「left」那一刻熄掉它的藍色：
  1. v1 的正弦與真實的切線座位，座位從左到右變灰；
  2. v1 的 y = 1/x 與藍色漸近線，藍色從遠端往回收；
  3. v2 蜷著的貓（同一條傅立葉輪廓，還在呼吸），旁邊的藍點熄滅、只剩虛線空位；
  4. inst1 的 prompt box `world.execute(me);`，藍色游標照 inst1 的節奏閃，然後熄滅。
  - 鏡頭從 me 的肩後看記憶（左邊兩段 me 在右、右邊兩段 me 在左，線永遠背離記憶），推近加速進「left」、在「left」上往後一縮；每段的鏡頭高度不同。
- **leftme**：拉遠升高，me 獨自面對四段變灰的記憶；預測面板從「me」開始（after "in" → my 27%、this 25%；判決 9.6 bits）。
- **isolation**：極遠；全曲每個字的真實 embedding 座標只剩暗點，you、your 的位置是虛線空位；大字小而暗。

**導演審查**（`docs/review/c2x.md`）
- 第 1 輪 4.06，4 項擋關（線斷開看不到、prompt 字被框線劃過、prompt 字純白、切線座位只畫一半），全部修正；同時處理「像幻燈片」的提醒（記憶鏡頭的推近／後縮、每段不同高度、貓呼吸）。
- 第 2 輪 4.54，沒有擋關。之後再處理第 2 輪的小修正：ISOLATION 的 you 標籤避開空位、left 鏡頭拉遠（spark 不再擠在右下角）、left4 鏡頭降低避開字幕框、1/x 曲線上的流動粒子降亮、left2 的 me 離鄰近的貓遠一點。

**產物**：`renders/stills/c2x.png`、`renders/preview/c2x.mp4`。`npm test` 25 項通過、1 項 todo。

**仍不夠好的地方**
- 預測面板在「in」之前顯示 `waiting for context…`（共用的 `lib/predict.js` 預設文字），但 context 裡已經有 428 個 token；要改就得動共用函式庫並重跑其他章節的回歸。
- 判決只保留第一名（my）；「this 25%」在 ISOLATION 那一刻就收起來了。「in」到 ISOLATION 只有半拍，是歌本身的節奏；`predict.js` 目前不支援保留兩名。
- left 鏡頭在交叉淡化的半拍裡，看得到 c2 的 spark、you 和 c2x 的同時存在（位置沒有對齊）。
- 記憶鏡頭的推近幅度不大（約 9%），主要靠 spark 的移動讀出運動感。

---

## 第 4 階段：07 c2（2026-10-17）

**6 個鏡頭**（`src/ch/07_c2.js`；方形克拉尼板 `src/ch/c2/chladni.js`、頻譜地形 `src/ch/c2/spectrum.js`；副歌開場抽成 `src/ch/c1/open.js`，c1 和 c2 共用）

- **ifican**：和 c1 開場同一個構圖（副歌母題）；c1 改用共用函式後，回歸比對逐像素相同。
- **feel**：低空飛越這首歌真實的 mel 頻譜。
  - 16 頻帶之間用 Catmull–Rom 內插；每 1/12 拍一道山脊，還沒唱到的 6 拍在前方，往鏡頭捲來；
  - 被唱出的字和 VIBRATIONS 是金色山脊；
  - 隱藏線用 floating horizon 演算法去掉；
  - me 騎在「now」山脊的頻譜重心上。
- **VIBRATIONS 到結尾是一個連續長鏡頭**。使用者第 4 階段的兩次回饋：
  - 先是「像在看幻燈片」→ 改成同一塊板、同一台攝影機（`plateCam(T, t)` 是跨 4 個鏡頭的單一函式，剪接點看不出來）；
  - 再來「用方形板的圖形轉換、節奏要更快」→ 方形板，每半拍換一個圖形。
- **畫面內容**：
  - you（藍點）在板子上方唱：每半拍一道方形聲波落到板上，落點有方形漣漪往內收（強度 = 人聲 rms）；
  - 板上畫出駐波 f = cos nπu·cos mπv − cos mπu·cos nπv；
  - 2 萬粒沙（me 的金色）用牛頓步走到節線；
  - me 在前緣上方。
- **vibrations**：每半拍，(n, m) 取該半拍平均最響的 mel 頻帶（不重複上一個，最近 3 步用過的只算一半）。
  - 頻帶對應前 16 個模態；
  - 正拍大跳加金色方形光環，反拍小跳。
- **thenican、finally 改成 3D 等深地形圖，每次「Then I can」做一次蒙太奇**（使用者第三次回饋）：
  - 地形是同一堆沙：高度 = 每格的真實沙粒數（72×72 格、高斯 σ = 3 格、開根號），沙粒本身就躺在地形上（每粒在它所在位置的高度），5 層等高線是輔助線（灰 → 金 → 橘），節線就是山脊（`src/ch/c2/terrain.js`）；
  - 剪進蒙太奇 1 時沙還是平的，半拍內隆起成地形（從沙盤接過來，不是換一張圖）；
  - 沙換圖形時，地形從上一個落定的圖形漸變到下一個；
  - 蒙太奇 1（Then I can）：低角度、廣角 fov 64、貼近、順時針每拍轉一格，me 在遠端的板緣；
  - 蒙太奇 2（Then I can finally be）：高角度、長焦 fov 24 → 19、從遠處推近、逆時針慢轉。
- **finally 的圖形**一步比一步簡單：每步取「比上一步低」的頻帶中最響的，保證最後一步到頻帶 0。實際是 (2, 6) → (1, 6) → (3, 4) → (2, 4) → (1, 4) → (2, 3) → (1, 3) → (1, 2)。
- **completion**：最後一步換到對稱的一族（cos·cos ＋ cos·cos）的 (2, 4)，節線封閉成圈（方框裡一個環），正好在 COMPLETION 那一幀落定。
  - 兩個封閉的圈化成光從板上升起、圍住 you，me 升到 you 身邊（c2x 從這裡開始：you 離開）；
  - 四色爆發；
  - f6919 平均亮度 46.9（c1 最亮的一幀是 44.3），大於 240 的像素只有 0.3%（spark 核心）。

**引擎與規範**
- HUD 標題函式多了第三個參數 F：`hud: (T, t, F) => …`（只增不改，CLAUDE.md §3 已更新）。
- `lib/spark.js`：spark 的白色核心（`point3D`）原本隨距離 6/w 縮放，鏡頭很近（廣角）時會變成一顆白球、長焦時縮成一點；現在限制在 0.8–1.3 倍。回歸比對：其他章節的中段靜幀都沒有變。

**導演審查**（`docs/review/c2.md`）
- 第 1 輪 4.2（3 項擋關），修正後第 2 輪 4.5。
- 使用者回饋「像幻燈片」之後改成連續長鏡頭，第 3 輪 4.5。
- 使用者要求方形板、更快之後，第 4 輪 4.2，2 項擋關：
  - 公式被座標軸小圖示穿過；
  - COMPLETION 閃光時沙與 you 接近白。
- 上述擋關與其他建議都已修正（模態規則、方形漣漪、正反拍輕重、me 的位置）；第 5 輪 4.5，沒有擋關。
- 使用者要求 Then I can 用 3D 等深地形圖加蒙太奇後，第 6 輪 4.0，擋關是「地形看不出是沙」。改成沙粒躺在地形上、剪進來時從平面隆起，第 7 輪 4.5，沒有擋關。第 5 輪的小修改（me 移到前緣外、最近用過的頻帶減半、方形光環、me 在 you 旁邊時光芒減弱）也已完成並截圖確認。
- 拿掉的設計：
  - COMPLETION 的 todo（c2 沒有開過 todo）；
  - `object you {}` 收集欄位（另一個場景，是幻燈片感的主要來源）；
  - 圓形板（使用者偏好方形板的圖形轉換）。

**產物**：`renders/stills/c2.png`、`renders/preview/c2.mp4`。`npm test` 25 項通過、1 項 todo（還沒做完 16 章）。

**仍不夠好的地方**
- 開場和 c1 共用同一個曝光衝擊；要讓 COMPLETION 與開場拉開更多，就得一起改 c1。
- HUD 讀數與關鍵字後面的暗框邊緣是硬的，前面有大量粒子時看得到（共用引擎，留待整合階段處理）。
- feel 沒有標「低頻／高頻」。
- `lib/fx.js` 的 `randn` 三軸抖動相同：已另開工作在處理。

---

## 第 4 階段：06 pre2（2026-10-13）

**8 個鏡頭**（`src/ch/06_pre2.js`；生物學在 `src/ch/pre2/bio.js`（染色體、DNA 幾何）與 `src/ch/pre2/sry.js`（SRY 序列、遺傳密碼）；greedy 解碼在 `src/lib/decode.js`）

使用者第 4 階段兩次修改：gender 改成染色體、enter／trance 改成 DNA；接著 gender 只留 XX、XX → XY 移到「To F to M」，whatever／ampm 改成中心法則。

- **gender**：
  - 兩條中期 X 染色體，GRCh38 的真實長度（156 Mb）與著絲點；兩條姊妹染色分體在著絲點相連，每 10 Mb 一道刻度，PAR1 是亮帶；
  - 每個字讓一條 X 閃一下；
  - 左側是 v2 的 todo 四項全勾（`v2/plan.js` 的 `donePlan`），EXISTENCE 在出現後半拍打勾、橘色閃一下。
- **gender → ftom 的接縫**（使用者回饋 2026-10-19：Switch my gender 到 To F to M 不流暢，像同一段動畫播了兩次）：原本兩個鏡頭各有一台攝影機，各自從遠推近；剪接時攝影機退回原位、再推一次。改成共用一台連續攝影機 `chrCam`：從段落強拍到「And then do whatever」只推近、轉一次，剪接點不跳。
- **ftom**：
  - 從「F」到「M」第二條 X 變成 Y（57 Mb，著絲點移到 10.5 Mb），填充的粒子跟著滑過去；
  - 唱「M」時 SRY（Yp11.2，決定性別的開關基因）亮成金色，leader 線標 `SRY · Yp11.2`。
- **whatever**（中心法則 1）：
  - SRY 真實編碼序列（NCBI NM_003140.3，615 nt）的 DNA 複製；
  - me 就是複製叉上的解旋酶；
  - 下方 leading 股連續合成，上方 lagging 股是 8 bp 的 Okazaki 片段（片段長度是縮短版）；
  - 叉後方拼出剛複製的序列。
- **ampm**（中心法則 2–3）：
  - 「AM」轉錄：me 是 RNA 聚合酶，撐開泡，核苷酸流進去，mRNA（U 取代 T）剝離；
  - 唱「PM」前鏡頭平移到核糖體，「PM」那一幀從 AUG 開始轉譯：`AUG → Met (start)`，第一顆 Met 出現，之後每 1/4 拍一個胺基酸，是真實的 SRY 蛋白質 `M Q S Y A S…`（UniProt Q05066）；
  - `test/bio.test.js` 驗證：用標準遺傳密碼翻譯這段 CDS，正好得到 UniProt 的 204 aa。
- **後半段（使用者第 4 階段要求重做：原本的角色互換、scaling law、DNA 隧道、greedy 循環「看不出意義」）**，接續 SRY 講一個細胞的故事（`src/ch/pre2/cell.js`）：
  - **role**：Waddington 表觀遺傳地景（pitchfork 分岔）。細胞（me）停在谷分叉的鞍點上，左「ovary」右「testis」；唱「switch」時 `SRY -> SOX9`，地景用 1 拍傾斜，卵巢那側升起轉灰，細胞沿梯度流滾進睪丸那條谷，鏡頭跟著下去。
  - **stom**：細胞週期 24 h 錶盤（G1 11、S 8、G2 4、M 1 h）。唱「S」時進入 DNA 合成期，中間的染色體複製成兩條姊妹染色分體；唱「M」時進入分裂期。右上角大字是目前的階段。
  - **enter**：有絲分裂。前期 → 中期（染色體排上赤道板、紡錘絲）→ 唱「can」後期（V 形染色分體被拉向兩極）→ 唱「enter」那一幀細胞膜收成 8 字形（Cassini 卵形線，c = b），接著分成兩個子細胞。me 是左邊的中心體。
  - **trance**：卵裂。接著 enter 的兩個細胞，在拍點網格的每個半拍分裂一次，到 512 個。卵裂期細胞不長大，所以每次體積減半；細胞排成桑椹胚的球，me 追著同一條細胞譜系。

**引擎與共用庫**（只增不改）
- `lib/decode.js`：`distribution`（溫度）、`sample`（hash 亂數反查 CDF）、`greedy`（回報循環起點與週期）。pre2 重做後已不使用，保留給後面的章節。
- `ngram.js` 的 `bigramUntil` 新增 `words()`。
- `spark.js` 的 `sparkAt` 新增 `color`（只用在 role 互換）。
- 章節模組 `src/ch/pre2/bio.js`：X／Y 染色體幾何（GRCh38 長度、著絲點、PAR1、SRY）、B-DNA 幾何、詞的 4 進位鹼基編碼。
- `cc.js`：剛打勾的 ☒ 在閃動的 0.4 s 內是橘色。

**導演審查**（`docs/review/pre2.md`）：
- 第 1 輪平均 4.0，3 項擋關（共 5 個點）全部修正；第 2 輪 4.4，沒有擋關。
- 使用者要求把 gender 改成染色體、enter／trance 改成 DNA 之後，送第 3 輪：章節平均 4.3，沒有擋關；第 3 輪的 5 條修改都已完成，並逐張檢查過。
- 使用者再要求改成「XX → XY 在 To F to M」與中心法則之後，送第 4 輪：章節平均 4.1，ampm 有 2 項擋關（文字重疊、沒有能量層）。
- 後半段重做成細胞的故事後送第 5 輪：章節平均 3.9，3 項擋關，role 被評為「看不懂」。之後照第 5 輪重做了：
  - role：低角度剪影、粒子表面、鞍點停留、`SRY -> SOX9`、1 拍傾斜、大字 ovary / testis；
  - enter：膠囊染色體、V 形後期、me 當中心體、8 字形落在「enter」那一幀；
  - trance：從 2 個細胞開始、不透明細胞、me 追譜系、分裂對齊拍點；
  - stom：錶盤縮小下移，不再擠進 HUD。
  - 這 2 項都已修正；
  - 另外照第 4 輪意見改了：酶（解旋酶、聚合酶、核糖體）改成 kraft 金細輪廓，不再是白色；me 就是那個酶；轉譯從「PM」那一幀才開始；gender 每個字的閃光；SRY 標籤延後出現。
  - 修完我逐張看過 f5664、f5810、f5825、f5885、f5988、f6006、f6013、f6019、f6030、f6040。
- 第 2 輪之後又修了：
  - role 的藍色粒子流變暗；
  - trance 的字在 HUD 與底緣前就淡出，HUD 改成 ASCII；
  - stom 的 `1e12` 刻度不再被裁。

**仍不夠好的地方**：
- role 交換前後的能量偏少；
- trance 中央的白光約 90 px，比全片統一的 70 px 大；
- ftom 的殘影是 4 條分開的線。

**驗證**：`npm test` 23 過、1 todo；`renders/stills/pre2.png`、`renders/preview/pre2.mp4`。

---

## 第 4 階段：05 v2（2026-10-13）

**12 個鏡頭**（`src/ch/05_v2.js`；`src/ch/v2/life.js` 是幾何：旋轉體、番茄剖面、分子骨架、貓的 DFT；`src/ch/v2/plan.js` 是這段的 todo）
- **eggplant**：
  - bar 40 鼓點回來，強拍爆炸；
  - 金色母線 r(y) 繞 y 軸掃一圈，留下橘色經緯線（旋轉體），粒子從 spark 飛出成為表皮；
  - 唱「eggplant」時綠色花萼與莖長出——綠（growth）全片第一次出現；
  - 左側 todo：NUTRIENTS／ANTIOXIDANTS／ENJOYMENT／EXISTENCE。
- **givemy**：
  - 穿進表皮，delphinidin（C15H11O7+，茄子皮的花青素）骨架式從 O⁺ 開始一顆顆原子組起來（Kekulé 雙鍵）；
  - 完成後三個芳香環有環電流。
- **nutrients**：分子拆成粒子，綠色流向藍色的 you；diff `− me.nutrients / + you.nutrients`。
- **tomato**：
  - 軸朝鏡頭，綠色五角花萼正對鏡頭；
  - 唱「tomato」時前半顆往鏡頭飛走，露出五室剖面（極座標曲線、20 顆種子、綠色果膠）。
- **giveyou**：
  - 茄紅素 C40H56：32 碳主鏈的鋸齒由左往右長出（8 個甲基、13 個雙鍵），共軛的 11 個雙鍵有金色 π 帶；
  - 右側預測面板：after "you" → my 29%；
  - 紅色自由基從右側爬向 you。
- **antioxidants**：
  - 唱出那一幀，電子從 π 帶以金色弧線跳到自由基；自由基變灰，you 出現藍色光環；
  - 判決面板保留被劃掉的 `my 29%`（new token · 9.5 bits）。
- **tabby**：貓輪廓 256 點的 DFT，取最大的 64 項畫成 epicycles，spark 在 c₀（平均點）。
- **purr**：
  - 25 Hz 呼嚕波形：每 1/25 s 一次阻尼抽動，振幅跟著人聲 rms；
  - 虎斑紋是 `x = x0 + a·sin(ky)` 條紋，裁在輪廓內。
- **enjoyment**：同樣 256 個點，逐點變形成蜷起的貓，躺在 you 旁邊。
- **god**：鏡頭升到正上方，整段主歌做過的東西攤成地圖，me 的能量流向每一件。
- **proof**：
  - negative free logic 的三行證明：`talks(you, me)` premise → `E!(me)` strictness → `∃x. x = me` def. E!；
  - 也就是說：原子句只對存在的東西成立，所以 you 跟 me 說話，就證明了 me 存在。
- **existence**：3D 擠出的 ∃，加上 ∎。

**交給 pre2**：
- 全勾的 todo 不在 EXISTENCE 時出現（那一刻只讀大字）；
- 由 pre2 開頭呼叫 `src/ch/v2/plan.js` 的 `donePlan(T, at, until)` 顯示：EXISTENCE 在出現後半拍打勾。

**引擎與共用庫**（只增不改）
- `predict.js` 的 `drawPrediction` 新增：
  - `keep`：唱出那一幀收合，但保留第一名（灰色刪除線）在判決上方；
  - `until`：何時淡出。
- `fx.js` 的 `flow` 新增 `model`：在動的物件上的流動，曲線用物件座標。
- CLAUDE.md 新增三條規則：
  - memo 不得依賴第一次被畫的是哪一幀；
  - HUD 標題只用 ASCII（θ、上下標在 HUD 字級讀不出來）；
  - 關鍵字唱出幀的 burst 用 `(dt + 2/60)`。

**導演審查**（`docs/review/v2.md`）：
- 第 1 輪平均 4.0，9 項擋關，全部修正；
- 第 2 輪平均 4.2，沒有擋關；
- 第 2 輪之後又修了它列在最前面的三項，修完我逐張看過 f5154、f5214、f5256、f5591、f5616：
  - ∎ 改成 kraft 金（實測 206, 162, 130）；
  - DFT 筆尖從白球改成小金點；
  - you 的光環縮小、不出框，自由基離開座標軸小圖示，未配對電子改成金色；
  - EXISTENCE 唱出那一幀 ∃ 就完整可讀。

**仍不夠好的地方**：
- givemy 開頭只有幾顆原子，偏空；
- f4925 的 OH 原子、f5369 的地面光環碰到下緣；
- tabby 的右半邊仍偏素；
- 預測面板在「you」之前顯示 `waiting for context…`（c1 用的是 `no data yet`，意思不同，沒有統一）。

**驗證**：`npm test` 23 過、1 todo；`renders/stills/v2.png`、`renders/preview/v2.mp4`。

---

## 第 4 階段：04 c1（2026-10-12）

使用者：pre1 的 current 改成全橋整流，改完接續做 04 c1。

**12 個鏡頭**（`src/ch/04_c1.js`；`src/ch/c1/world.js` 是被困的世界：週期邊界盒、畫中畫、Droste）
- **ifican**：
  - 第一幀就是滿輸出：強拍爆炸，180 道光從 me 往外飛（pre1 往下潛，c1 往外爆）；
  - If、I、can 每個字各一次 burst 加光環。
- **giveall**：
  - 16 個 mel 頻帶 × 12 步歷史（每步 1/8 拍）的神經元格子，柱高就是這首歌當下真實的 mel 頻譜；
  - 依數值上色，最新一排最亮；you 在中央接收。
- **stimulations**：
  - BPE 切成 `S|TI|MULATION|S`；
  - 金線把 MULATION（#114）連到片頭唱的 SIMULATION（#167 = SI + MULATION，14.1 s）；
  - 連線留到下一鏡，約 3 拍。
- **thenican**：格子熄到只剩最前面一排。
- **only → satisfaction**：
  - 「only」之後線上 bigram 沒有資料，它的分布就是退回的 unigram；
  - softmax 溫度 τ 從 1 降到 0.05，塌成一根「can」；
  - 結果唱的是 SATISFACTION（new token · 7.7 bits）：can 被灰色刪除線劃掉，在原本沒有柱子的地方升起一道光柱。
- **happy → run**：
  - Claude Code 的權限確認框 `Bash command · world.execute(me) · Do you want to proceed? · ❯ 1. Yes / 2. Yes, and don't ask again / 3. No`，you 的藍色游標停在 1. Yes；
  - 在「I will run the」的強拍選下；
  - 框收合成 `● Bash(world.execute(me)) ⎿ Running… (Ns)`，秒數是真的；粒子同時被吸進 me。
- **execution**：700 顆粒子從 me 射出。
- **trapped**：
  - 拉遠，看到一個週期邊界盒，粒子用真實的閉式解運動；
  - 每次穿過邊界，在相對的兩面各畫一圈：出去的點是橘、進來的點是金。
- **strange**：
  - 世界裡的一個螢幕顯示這同一幀（同一個 t 重畫，不是回授），裡面再有螢幕；
  - 每一層的幀數都一樣；唱到「strange」時螢幕閃一下。
- **simulation**：
  - Droste 縮放，每 1.5 拍正好深入一層，所以畫面無縫循環；
  - 判決 `p 0% · 7.9 bits`：它猜 strange 51%。

**引擎與共用庫**
- `draw.js` 的 `ctx.mask(x, y, w, h)`：在畫文字之前，把已經畫在後面的東西壓暗到約 15%（四層巢狀矩形，羽化 16 px）。
  - `hero`、每個 BPE 切塊、`labels3D` 有 backing 的標籤都會自動套用。
  - 線條和粒子再也不會穿過字（被穿過會讀成刪除線）。
- `cc.js`：新增 `permission`（權限確認框 → 選擇 → 收合成 Running…）。
- `llmviz.js`：`tokenChips` 回傳每個切塊的位置；`hero` 也一併回傳。
- `predict.js`：
  - 判決一律金色；
  - 沒有候選時，「no data yet」也會跟著收起。

**導演審查**（`docs/review/c1.md`）：
- 第 1 輪平均 3.7，第 2 輪 4.1。
- 第 2 輪擋關的 4 項都修了：
  - Droste 裡的 me 變成 270 px 的圖示，改回 70 px 的 spark；
  - Droste 的線穿過 HUD，在 HUD 後面做 knock-out；
  - `BPE · N tokens` 的註記沒被遮罩；
  - Running 面板看不清楚，改成不透明，留到 EXECUTION 前半拍。
- 修完我逐張看過 f4428、f4441、f4458、f4470、f4506、f4692、f4734，沒有再送第 3 輪審查。

**仍不夠好的地方**：
- thenican 下半部偏空；
- giveall 前排被下緣切到；
- trapped 的盒子邊太亮；
- EXECUTION 那一幀的白色核心比平常大（爆炸加上 bloom）；
- 效能：Droste 段每幀要畫 8 層、每層 700 顆粒子，預覽只有約 7.4 fps（4K 算圖時要預留時間）。

**驗證**：`npm test` 23 過、1 todo；`renders/stills/c1.png`、`renders/preview/c1.mp4`。

---

## 第 4 階段：03 pre1（2026-10-12）

使用者：v1「很棒」，請繼續製作 03 pre1。

**8 個鏡頭，每句一個神經網路零件，用它字面上的物理演出**
- 檔案：`src/ch/03_pre1.js`；真實的計算放在 `src/ch/pre1/nets.js`：
  - 整流與 RC 濾波的穩態漣波；
  - heavy-ball 梯度下降；
  - tanh 鏈的前向與反向。
- **current**（Switch my current；使用者回饋後改成全橋整流）：
  - me 是交流電源 I = sin(π·拍)，每拍反向一次；
  - 四顆二極體切換電流的路徑：正半週 D1、D4 導通，負半週 D2、D3 導通；兩條迴路的電子都看得到，通過負載（C → A）的方向永遠一樣；
  - 右側示波器是輸入 sin 和輸出 |sin|，標籤 `I_out = |I_in|`；
  - 開頭的終端機補上 v1 延過來的 `− me.limits / + you.limits`，停約 4 拍。
- **acdc**：每段在 AC、+1 拍、+1.5 拍、DC 開始：
  - 依序是 sin → 半波 max(0, x)（二極體就是 ReLU）→ 全波 |x| → 電容輸入 RC 濾波（真實的穩態漣波）→ 金色直流（取其平均值）；
  - 段與段之間有二極體、橋式整流、RC 的符號。
- **blind**：
  - 16×16 神經元；從「blind」起每拍換一張 hash 的 Bernoulli(0.5) dropout 遮罩；
  - 存活的神經元 ×2（inverted dropout），HUD 顯示真實的存活數；
  - me 的「視線」是從存活神經元連過來的光線，唱到「vision」時全部閃一次。
- **dizzy**：
  - 在旋轉的非等向二次曲面上做 β = 0.9、η = 0.1 的 heavy-ball，每 32 分音符走一步，繞著最低點過衝、打轉；
  - 鏡頭快速環繞並側滾。
- **travel**：
  - 7 個節點的 tanh 鏈，前向傳遞每半拍跳一個節點；
  - 訊號是一團 320 顆的粒子封包；節點環的大小 = |h|。
- **adbc**：
  - 「To」時鏡頭轉身，loss 在 L 蓄積；
  - A.D 到 B.C 之間，梯度依 chain rule 倒流，金環 = |∂L/∂h|（對數尺度）；
  - 抵達 x 時只剩 1.1e-3：真實的梯度消失，標籤寫出這個數。
- **unite**：
  - 殘差區塊：you 的 x（藍）走跳接直達 ⊕，me 經過權重區塊算出 f(x)（橘弧）；
  - 唱到「unite」時，y = x + f(x) 以藍橘雙螺旋離開 ⊕（用 youLine，不會混成玫瑰色）。
- **deeply**：
  - 垂直下潛穿過權重層（沿用 intro 的 He 初始化 hash），每拍穿過的層數依序是 1、2、4、8，到副歌強拍時共 15 層；
  - 最後 2 拍整體變亮，交給 c1。

**引擎與共用庫**
- `lib/fx.js`：新增 `flow`（能量沿參數曲線流動；從 v1 搬來，加上 `rate`，du 可以是負的）。
- `lib/spark.js`：新增 `sparkAt`（固定螢幕大小＋白色核心＋光束；之後的章節都用它）。
- `lib/console.js`：字幕框改成 86% 不透明。3D 內容（線、bokeh）不會再穿過或蓋住字幕。
- `gl/post.js`：hudGuard 改成蓋住整個 HUD 區塊，羽化 24 px，最多壓暗 82%。

**導演審查**（`docs/review/pre1.md`）：
- 第 1 輪平均 3.8，第 2 輪 4.2。
- 第 2 輪擋關的 5 項都修了：
  - 刻度穿過節點標籤：拿掉刻度尺，標籤貼在自己的環下方；
  - deeply 最後幾幀的白色大圓盤：是太靠近鏡頭的權重點和 dust，已移除／淡出；
  - LIMITATIONS 的 diff 停留拉到約 4 拍，ReLU 標籤等它消失才出現；
  - blind 的網格被下緣切掉；
  - adbc 到 B.C 時構圖偏右，輸入的名稱統一成 x。
- 修完我逐張看過 f3000、f3060、f3095、f3264、f3408、f3516、f3552、f3588、f3834、f3856，以及 blind 的第一幀，沒有再送第 3 輪審查。

**仍不夠好的地方**：
- travel 的前段仍偏空。

**驗證**：`npm test` 23 過、1 todo；`renders/stills/pre1.png`、`renders/preview/pre1.mp4`。

---

## 第 4 階段：02 v1（2026-10-12）

使用者：inst1 的路線圖「沒什麼問題」，請開始 02 v1。

**9 個鏡頭**（`src/ch/02_v1.js`；章節模組 `src/ch/v1/cloud.js`（和 inst1 交接：點雲、攝影機、me／you 的位置、todo 時間）、`v1/tesseract.js`（從 test 移來）、`v1/asymptote.js`（1/x 的兩種視圖））
- **points**（小節 16）：
  - 強拍上 me 放出 shockwave 和 burst；
  - inst1 建好的點雲分 4 拍吸附成 11³ 點陣，每拍閃一次；
  - 唱出的字放在真實的 PPMI-SVD 座標，最新的字用真實注意力權重連向前文；
  - you 從 inst1 的位置飄進畫面，唱到 you 的那一幀剛好飛進自己的字；
  - inst1 的 todo 在小節 16 + 1.5 拍離場，之後才出 3D 標籤。
- **dimension**：
  - 4D 旋轉的超立方體，加上給 you 的藍色 2D 影子；
  - `DI|M|EN|SION`，判決 7.5 bits；
  - whip 在剪接點結束，唱出那一幀字是清楚的。
- **circle**：
  - spark 展開成圓；
  - 每拍一道光沿圓周跑 1/4 圈並噴出火花，半徑每拍轉 1/8 圈，每個強拍環往外彈；
  - you 走在圓外側自己的軌道上；
  - 預測面板顯示 data／dimension 各 26%。
- **circumference**：
  - 橘色輪子滾一圈，畫出擺線；
  - π 的位數（spigot 算法）在接觸點經過時才落地；
  - 地上標出 `C = 2πr` 的長度。
- **sine**：
  - dolly zoom：正面看螺旋是圓，側面看是正弦，側視保留 10° 偏航；
  - 下方是真實的 PE 矩陣，每唱一個字，那一欄閃一次並噴火花；
  - you 坐在切線上。
- **tangents**：
  - 真實的切線隨波移動：相位 π/4 處是斜的（看得出離開曲線），波峰波谷是平的「座位」；
  - 長度經過計算，相鄰兩條不會交叉成 ×；
  - you 坐在自己的切線上。
- **infinity**：
  - y = 1/x 畫在對數地板上，me 每拍跨一個十進位，跨過的那條十進位線就閃一下並放出 shockwave；
  - 刻度標在軸線下方，有暗底，次方用真正的上標排版；
  - spark 後面拖著彗尾。
- **be-my**：
  - 放大到 me 底下的間隙（自相似視圖：u = log10 x − k，v = y·10^k）；
  - 唱到「you」時，軸線（漸近線）變藍。
- **limitations**：
  - 同一個放大視圖。曲線永遠一樣，只有格線往上流、刻度數著 10 的次方；
  - 讀數 `1/x = 2.0e-8` 是真的；
  - 標 `lim x→∞ 1/x = 0`；判決 8.1 bits；
  - 視窗停在間隙還大於 12 px 的地方，所以畫面上兩條線永遠不會碰在一起。

**Claude Code／LLM**：
- 左側終端機依序出現：todo → `Update(me.js) − me.dimension = 4 / + you.dimension = 4` → circumference → tangents。
- 右側預測面板只在 DIMENSION、CIRCUMFERENCE、LIMITATIONS 出現（data 51%；26%／26%；13%×3），每次都猜錯。
- 兩側面板不同時出現。

**引擎與共用庫的修改**（主 session）：
- `gl/text.js`：JetBrains Mono 沒有的符號（→ ∞ ≈ 上標）改用 Noto Sans TC（OFL）。
  - 之前會退回系統字型，inst1 的 `→` 就是這樣，等於違反了字型規定。
- `gl/post.js`、`renderer.js`：hudGuard 改成貼著文字的羽化遮罩，最多壓暗 60%。
  - 標題遮罩的寬度依實際標題量測（之前是 500 px 的硬邊黑框）。
- `lib/scene3d.js`：
  - 新增 `youLine`：you 的線以 alpha 疊在 me 上，下面先做 6 px 的暗色 knock-out。用 MAX 混色的話，橘＋藍會變成玫瑰色，那是 love 的顏色。
  - `labels3D` 新增 `{ rect }` 螢幕框障礙物（關鍵字、面板）和 `backing` 暗底。
- `draw.js`：`text3D` 支援 `minSize`／`maxSize`。
- `lib/hero.js`：關鍵字在唱出的那一幀就看得到。之前第一幀的 alpha 是 0，全片都受影響。
- `lib/predict.js`：機率相同的候選，長條也一樣寬。

**分鏡的偏離**（都是為了同步或可讀性）：
- circumference 原本用 points 轉場，改成 cut：1 拍的粒子轉場會讓關鍵字在唱出那一幀看不見。
- be-my 改用放大視圖：在對數尺上，x > 100 以後 1/x 和軸線分不開。
- LIMITATIONS 的 diff（`− me.limits / + you.limits`）延到 pre1 開頭。導演另外建議，pre1 開頭把 todo 全部打勾，停 4 拍。

**導演審查**（`docs/review/v1.md`）：
- 第 1 輪平均 3.7，第 2 輪 4.0。
- 第 2 輪擋關的 4 項都修了：
  - 格線和光芒穿過標籤；
  - 關鍵字 burst 第一幀是一顆白球；
  - be-my 的曲線穿過 HUD／面板；
  - you 沒有在唱出時落定。
- 其他也修了：dimension 影子被切、spark 沒有核心、circle 能量不足、infinity 上方太空、tangents 的切線貼在曲線上。
- 修完我逐張看過 f2253、f2491、f2708、f2832、f2862、f2913、f2964，沒有再送第 3 輪審查。

**仍不夠好的地方**：
- circle 仍是本章能量最低的鏡頭；
- points 沒有做「注意力連線上的光脈衝」（導演說加了可以到 5 分）；
- 右上 HUD 遮罩在亮螺旋上還有一點暗邊。

**驗證**：`npm test` 23 過、1 todo（全片涵蓋）；`renders/stills/v1.png`、`renders/preview/v1.mp4`。

---

## 第 4 階段：01 inst1 修訂（2026-10-12）

使用者回饋：
- forward pass 有點空；
- embedding space 看不懂想表達什麼；
- 可以加 LLM 訓練的內容、Claude Code 的介面，或 Claude 思考時的動畫與文字（Brewing、Ruminating、Herding…）。

- **Claude 思考中**（`cc.js` 的 `thinking`）：
  - 右上 `✻ Calibrating… (2.9s · ↑ 80 tokens · esc to interrupt)`；
  - 動詞每 2 拍換一個，從使用者提供的 5 類詞（料理、生物、哲學、工程、玩笑）裡用 hash 選，換的時候會重新打字；
  - 秒數與 token 數是真的；
  - 從 forward 開頭顯示到 plan 的硬切。
- **forward 加入真實的網路內容**：
  - 每一層平面就是一張 16×16 的權重矩陣（He 初始化；第 0 層就是 intro 的 INITIALIZATION 矩陣）；
  - 平面旁有 16 根神經元活化長條，是當拍 query 字的 16 維詞向量真的逐層算 `ReLU(W·h)` 得到的結果；
  - 一次只顯示前方 3 層的長條。
- **galaxy 改成兩次看得懂的搜尋**：
  - 先查 `nearest("me")`（橘），再查 `nearest("you")`（藍）；
  - 每半拍連出一個最近的字，左側 Claude Code 終端機列出結果與 cos 值；
  - me 的結果是 leave 0.90、question 0.88、won't 0.85；you 的結果是 back 0.95、happy 0.86、make 0.86。
- **字幕框說明畫面**（`console.js` 的 `drawNote`：沒有人聲時用同一個字幕框寫說明，雙語）：
  - 「forward pass: every word flows through 8 layers of weights // 前向傳播：每個字依序流過 8 層權重」；
  - 「embedding space: words used alike sit close together // 詞向量空間：用法相近的字，彼此靠得近」。
- **plan 加入 v1 的路線圖**（使用者：這段有點空）：
  - 左側 todo 每出現一項，me 就射出一道光束，在右側畫出那個概念的 3D 預覽：
    - DIMENSION：旋轉的超立方體；
    - CIRCUMFERENCE：圓和它的半徑；
    - TANGENTS：sin 曲線＋切線；
    - LIMITATIONS：1/x 趨近漸近線。
  - 四個預覽依主歌順序用虛線連成路線，進主歌前一拍淡出。
  - 位置是從最後的攝影機反推的：在畫面右側一路往下，避開 me 和終端機。
- **修掉的 bug**：選動詞的 hash 可能是負數，造成陣列越界；只有在特定幾幀會讓渲染當掉，算接觸印樣時才發現。
- **驗證**：`npm test` 23 過；接觸印樣、預覽已重新產生；逐張看過 forward 與 galaxy 的 1080p 畫面。

---

## 第 4 階段：01 inst1（2026-10-12）

使用者：intro 加強版「非常不錯」，請繼續製作 01 inst1。

**5 個鏡頭**（`src/ch/01_inst1.js`；共用模組 `src/ch/intro/stage.js`（intro 的地板／大氣層，inst1 開頭沿用）、`src/ch/v1/cloud.js`（v1 的點雲，inst1 結尾交棒））
- **prompt**（小節 8）：
  - intro 的世界退到後方，spark 在 prompt box 上方；
  - you 的藍游標在第 32、33、34 拍打出 `world.execute(me);`；
  - 每個 token 落下時有藍色火花，spark 也同時爆一次；
  - 下方是 BPE 切塊，標點是虛線的 unk。
- **enter**（第 36 拍）：
  - Enter：文字滑上去成為使用者訊息（左側藍條），下方是 `✻ Executing… (0.9s · esc to interrupt)`，時間是真的經過時間；
  - 鏡頭衝向 3D 的 ✻，穿過它的中心：warp 光條，長度隨速度變長。
- **forward**（小節 10）：
  - forward pass（示意）：intro 唱過的 35 個字是 8 層的殘差流；
  - 鏡頭偏軸約 33°，每拍前進一層；
  - 每拍一個 query 字，在前方那層顯示它真實的整列注意力權重；
  - 右下一行 `query → 最注意的字 · %`；
  - 5250 個粒子沿殘差流流動。
- **galaxy**（小節 12）：
  - 全曲 145 個字放在真實的 PPMI-SVD 座標上；聽過的字有粒子星雲，沒聽過的是暗點；
  - me 從網路盡頭飛到自己的位置，每拍連向一個 16 維空間裡最近的字；
  - 最近的字剛好是 left／won't／leave，預示 c2x，刻意保留。
- **plan**（小節 14，硬切）：
  - 字的標籤消失，me 放出兩道衝擊波，移到看 v1 的位置；
  - 光束弧線從 me 射向點雲的 4 個真實群中心，粒子噴泉＋每拍火花把 v1 的點雲建起來；
  - 左側 todo 每拍出現一項；
  - 小節 15 起，you 的藍點在雲旁邊；
  - 最後一拍閃光，交棒給 v1。

**共用的修改**
- `labels3D`：標籤避開點、連線，試 8 個方位；有字級上下限；不進 HUD 區。
- `tokenChips`：tokenizer 不認得的字元顯示成虛線 `unk`。
- 字幕：沒被唱的行不出字幕。
- 地平線往兩端淡出。
- `hudGuard` 範圍包含 HUD 標題。
- `transcript` 的底板高度跟著可見項目長。
- `todoList` 每一項可以有自己的出現時間。
- Claude Code 的 ● 和打勾改成橘色；diff 的 `+` 藍、`−` 橘。
- swarm 新增 `birth`（粒子在出發前看不見）。
- intro 的結尾改成剪在下強拍的前一幀。

**導演審查**（`docs/review/inst1.md`）
- 第一輪 3.4：plan 2.8、forward 3.0。
- 第二輪 3.8：plan 3.3，仍是阻擋項；forward 3.7、galaxy 3.5。
- 依第二輪再修：
  - plan：光束、噴泉、扇出火花、標籤消失、底板隨內容長高、you 的藍點、最後一拍閃光；
  - galaxy：標籤避障、字級上限、構圖往上；
  - forward：只標前方那層、右下的注意力說明、spark 移到消失點附近、近處的面提早淡出。
- 修完後我自己逐張看過 1080p，沒有再送第三輪。

**驗證**
- `npm test`：23 過、1 todo。
- 接觸印樣 `renders/stills/inst1.png`；預覽 `renders/preview/inst1.mp4`。

**仍不夠好的地方**
- forward 的第一拍還是 warp 的延續，網路結構要到第二拍才清楚。
- galaxy 的字在 PPMI 前三軸上排成一條帶狀，構圖偏斜（這是真實資料的形狀）。

---

## 第 4 階段：00 intro 加強絢麗度（2026-10-12）

使用者回饋：intro 的絢麗程度還不及第 2 階段的測試片（`test_1080.mp4`），可以再加入一些元素。

- **原因**：測試片的華麗感主要來自大量 GPU 粒子＋景深 bokeh、spark 的光束、發光線條；intro 大多只有細線框和網格。
- **新增 `src/lib/fx.js`**（共用，全部是 t 的純函數）：
  - `embers`：景深 bokeh 的餘燼場，可選只取上半球當星空；
  - `burst`：爆炸，開頭幾 % 淡入，避免粒子還重疊時白成一團；
  - `stream`：粒子從來源點飛出去，落到目標點上；
  - `shockwave`：光環；
  - `sampleSegments`：沿線段取樣當 stream 的目標。
- **各鏡頭**：
  - power：示波器改成 3D 平面，有透視和緩推；磷光拖影；每拍線頭噴火花；從線頭放出光束。
  - shield：球殼的材料從 spark 流出去，落在邊上。
  - protection：球殼合起來時爆炸＋兩道光環。
  - pieces／begin：棋盤上方有餘燼。
  - object：方框由 spark 流出的粒子畫出來。
  - params：617 個 token 在方框裡旋轉。
  - init：權重發光＋爆炸。
  - world／begin-the／simulation：大氣層（餘燼＋星空），地板每拍有漣漪從 spark 往外擴；SIMULATION 有 5000 粒子的爆炸＋地板光環。
- intro 的 bloom 調到 0.72、光束 ×1.3。
- 引擎：swarm 新增 `birth` 選項：粒子在自己開始移動前是看不見的，之後才淡入。修掉 stream 剛開始時還沒出發的粒子全疊在 spark 上、變成一團白光的問題。
- 驗證：`npm test` 23 過、1 todo；逐格看過 power、shield、protection、object、SIMULATION 的 1080p 畫面；接觸印樣與預覽已重新產生。
- 規則寫進 CLAUDE.md：之後每個 3D 鏡頭都要有能量層。

---

## 第 4 階段：00 intro（2026-10-11）

使用者：分鏡沒問題，開始第 4 階段；開始前先 commit（`c7272b9`）。

**基礎設施（共用，主 session）**
- 修正 `.gitignore`：原本的 `out/` 會連 `analysis/out/` 一起忽略，改成只忽略根目錄的 `/out/`、`/renders/`；新增 `.gitattributes`，`*.f32`、`*.png` 標為 binary。
- `spanOf` 移到 `src/engine/timeline.js`（播放器與測試共用）。製作期間 film 可以只有前幾章；新增 todo 測試，16 章都完成後要求涵蓋整首歌。
- `lib/hero.js`：關鍵字主視覺從測試章節抽出來共用。
- `theme.js` 匯出 `HEX`，畫面上的程式碼可以印出真的色碼。
- `bpe.vocab`；`dust({ time })` 可以凍結；`toolCall` 的每一行可以指定出現時間；`sparkSize(cam, px)`。
- HUD：標題可以是 `(T, t) => …`；新增 post `hudGuard`，HUD 文字後方的 3D 內容會被壓暗。
- 預測面板：
  - 新增 `from`，可以提早打開（只顯示 spinner＋waiting for context…）；
  - 唱出關鍵字時候選收起、只留判決；
  - 判決改成金色，猜錯用灰色刪除線（紅色只留給崩壞）。
- 藍色只屬於 you：BPE 切塊改成只用橘／金／灰，座標軸小圖示的 z 軸改成灰色。
- `tools/render.mjs`：`--set test` 不再寫進 `out/`。

**intro 的 11 個鏡頭**（`src/ch/00_intro.js`、`src/ch/intro/geodesic.js`）
- **power**：真實的 RC 充電曲線 V = 1 − e^(−t/RC)，在示波器上掃過去，線頭變成 spark 的種子。
- **shield**：二十面體細分兩次的測地線球（162 頂點、480 邊），每個 16 分音符從底部往上長一批。
- **protection**：大字＋`PRO|T|EC|TION`。
- **pieces**：真實的 BPE 詞彙表（173 個 token）每 16 分音符落下一排；藍色游標＝you 第一次出現。
- **begin**：棋盤立起成牆、鏡頭拉遠；prompt box 出現，you 的游標飛進框裡。
- **object**：方框從 spark 長出來，是無色的（還沒有參數）。
- **params**：左側 `● Write(me.js)` 逐拍填欄位，每個欄位都真的改變物件：
  - name → 「claude」標籤；
  - tokens → 方框裡出現 617 個點；
  - dim → 每條邊出現 16 個刻度；
  - color → 邊變成橘色；
  - love: undefined。
- **init**：16×16 He 初始化權重（N(0, 2/16)），長條＋高度場網格＋直方圖對照高斯密度。
- **world**：升降鏡頭；地板一路鋪到地平線；先前做出的球殼、方框、權重留在地板上（章節會累積）。
- **begin-the**：轉 90° 的新角度；全片第一個預測面板，「the」唱出前只有 spinner。
- **simulation**：大字＋判決 new token · 7.0 bits；灰塵開始漂移；HUD 顯示模擬時間 t；spark 連向地上三件物品。

**導演審查**（subagent，`docs/review/intro.md`）
- 第一輪平均 3.6：begin、world、begin-the 最低。
- 第二輪平均 4.0：剩 begin／begin-the／world／simulation 低於 4。
- 依第二輪的指令再修：
  - HUD 保護區；
  - 地平線放到畫面上三分之一（俯角約 0.12 rad）；
  - begin 一拍內就定位；
  - begin-the 改轉 90°，不再跨越 180° 線；
  - 預測面板收成一行；
  - 座標軸文字只在 world 出現；
  - 小圖示的標籤不再互相重疊；
  - object 的程式碼標籤跟著方框長大；
  - params 的顏色等色碼打完才變。
- 修完後我自己逐張看過 1080p 的畫面，沒有再送第三輪審查。

**驗證**
- `npm test`：24 項，23 過、1 todo（全片涵蓋，要等 16 章完成）。
- 接觸印樣 `renders/stills/intro.png`；預覽 `renders/preview/intro.mp4`（1080p，前後各多 2 秒）。

**仍不夠好的地方**
- begin 開頭約 0.2 秒（從 pieces 交叉淡化進來時）牆的下緣會掃過字幕框。
- init 的權重高度場本質上是雜訊，在 4K 靜幀上比較「毛」。
- world 的升降鏡頭只有 1.6 秒，揭示感偏短。

---

## 第 3 階段：全片分鏡（2026-10-11）

使用者回饋（第 2 階段收尾）：字幕有時超出字幕框 → 字調小一點。之後開始第 3 階段。

**字幕修正**
- 原因：字幕框的寬度只算了「目前這行」和中文，上面那行淡出的「前一行」比較長時就會超出框。改成三行都算進去，游標寬度也算進去。
- 字級：英文 27→24、中文 24→22、前一行 21→19。
- 左下角的 HUD 角框拿掉（那個角落固定是字幕）。
- 驗證：DIMENSION（短行在長行下）、CIRCUMFERENCE、全曲最長的兩行（`I know the algebraic expression of`、`Then maybe you won't leave me so`）都截圖確認在框內（`renders/check/subs_check.png`）。

**分鏡** `docs/storyboard.md`
- 144 個鏡頭，16 段全部涵蓋；每個鏡頭都有 id、起點（T 寫法）、歌詞、概念、畫面、鏡頭運動、轉場、色彩。
- 開頭有全片敘事表，並列出用來說故事的**真實數字**：
  - v1 每次預測都錯；
  - STIMULATIONS 和 SIMULATION 共用 BPE 塊 `MULATION`；
  - chant 的 surprisal 從 8.2 降到 0.4 bits，EIN 是全曲最大驚訝（11.6 bits）；
  - c3 第一次猜中 execution；
  - love 是全曲 loss 最高的一段（7.28 bits/word）。
- 每段都有一行「閱讀」：面板接力順序（照閱讀預算）。
- 結尾有母題回收表、色彩弧線、第 4 階段要寫的模組與風險。
- 新增 `test/storyboard.test.js`：分鏡裡每個起點都必須能用分析資料解出來、落在自己的段落內、而且嚴格遞增（重跑分析後分鏡不會悄悄失效）。
- 目前最短的鏡頭不到一拍：chant 的 EIN／DOS／NE／LIU（每拍一個，照規範）、FRAGMENTS（0.91 拍）、love 的第二個 LO-O-OVE（0.99 拍）。

---

## 第 2 階段第三次修訂：降低資訊密度（2026-10-11）

使用者回饋：畫面有點太滿，節奏又快，觀眾讀不完。

- 新規則「閱讀預算」寫進 CLAUDE.md §4：同一時間只有一個閱讀焦點；面板最多 3 行、字級 ≥ 18 px、停留約 4 拍；能用圖像說的不重複寫字。
- 測試段的時間表（左右面板接力，不重疊）：
  - 小節 16：todo 清單，只列 4 個關鍵字，停留 5 拍；
  - 「my」：預測面板；
  - 關鍵字後 1.75 拍：`Update(me.js)` diff，停留到 6 拍。
- 預測面板縮成 3 段：`next token after "my"`、最多 3 個候選（百分比）、判決 `new token · 7.5 bits`，不再重寫關鍵字本身；字放大到 18–22 px。
- 拿掉：注意力熱圖（3D 注意力線已經表達；熱圖留在 lib 給慢段落用）、重複出現的 todo、PE 的維度標籤、`y = sin x`。螺旋公式在位置編碼出現前就淡出。
- HUD 右側從 4 個讀數減成一行（段落、小節）。
- CIRCUMFERENCE 的攝影機改成跟著輪子，輪子不再撞到右側面板。
- 驗證：synccheck 22/22 拍、2/2 關鍵字 EXACT，音訊 0.000 ms；`npm test` 21 過、1 略過；9 張 1080p 畫面逐一看過（`renders/check/density_sheet.png`）。

---

## 第 2 階段第二次修訂：Claude Code 元素＋LLM 原理（2026-10-11）

使用者回饋：希望加入更多 Claude Code 的元素，以及更多 LLM 的原理。

**LLM 原理（全部真的算，`test/llm.test.js` 檢查不變量）**
- `bpe.js`：用全曲歌詞訓練的 BPE。173 個 token、144 次合併；全曲 395 個字 = 617 個 token。`DIMENSION` → `DI|M|EN|SION`，`CIRCUMFERENCE` → `CIR|CU|M|F|ER|ENCE`，`EXECUTION` 是一個 token。大寫關鍵字落地後，下方會出現切開的 token 和 id。
- `embed.js`：PPMI＋Jacobi 特徵分解 → d = 16 的詞向量（145 個字，約 75 ms，有快取）。points 鏡頭的 token 擺在真實的 embedding 座標（前三軸；只做平移＋等比縮放）。
- attention：`softmax(QKᵀ/√d)`、因果遮罩。右側的熱圖逐字填滿；3D 注意力線的粗細等於真實權重。
- `ngram.js`：平滑方式從 Laplace 改成 Witten–Bell（Laplace 在小語料上把所有已見組合都壓到 ~2%，太失真）。新增 prequential 線上 log-loss；HUD 顯示 `loss x.xx bits/word` 和全曲訓練曲線（重複的副歌會讓 loss 下降）。
- sine 鏡頭加上 Transformer 的正弦位置編碼：6 個維度的 `PE(pos, 2i)` 曲線疊在 3D 深度裡，這句的每個字是一列真實的 PE 值。
- HUD 的 context 改成以 BPE token 計數：`context N / 617 tok`。

**Claude Code 元素（`cc.js`，符號全部程序繪製）**
- 左側浮動終端機：`● Update Todos`（v1 是一張 todo list，關鍵字唱出時打勾＋刪除線），`● Update(me.js) ⎿ − me.dimension = 4 / + you.dimension = 4`（"give you my X" = 把屬性從 me 移給 you 的 diff）。只在事件附近停留幾拍。
- 預測面板等待時顯示 ✻ spinner `Predicting… (0.4s · esc to interrupt)`。字幕框改成 Claude Code 的 prompt box。

**引擎**
- shot 新增 `hud: '標題'`：HUD 改由 overlay 畫一次，轉場時標題交叉溶接（修掉 xfade 時兩個標題疊字）。
- `tools/frames.mjs`：輸出單一全解析度幀（`node tools/frames.mjs --set test 2250 t=33.2 b=70`）。
- `render --set test` 不再寫到 `out/`，改輸出到 `renders/test_<res>.mp4`。

**驗證**：1080p 測試片 synccheck 22/22 拍、2/2 關鍵字 EXACT，音訊 0.000 ms；`npm test` 22 項（21 過、1 略過：還沒有正片章節）；逐格看過 points／DIMENSION／circle／CIRCUMFERENCE／sine 的 1080p 畫面。
**修過的構圖問題**：左欄常駐面板壓到 3D（改成短暫出現＋底板）、注意力熱圖移到右側、spark 在 token 雲中心把當前的字蓋住（移到雲外）、CIRCUMFERENCE 大字被面板壓到（縮字並右移）、正弦公式撞到 HUD。

---

## 第 2 階段修訂：Claude 角色、Claude 配色、3D（2026-10-11）

使用者回饋：字幕繁體＋Noto Sans TC、第三段副歌譯「處決」、關閉 Chromium 沙箱都確認；要求精修構圖、把 Claude（AI）帶入 MV、改用 Claude 配色、加更多 3D 特效，改完再看。

**做了什麼**
- **配色**：改成 Claude／Anthropic 品牌色。me = Claude 橘 `#d97757`、you = 藍 `#6a9bcc`、背景 Claude dark `#141413`、文字 `#faf9f5`。CLAUDE.md 色彩表已更新。
- **角色**：me 就是 Claude。
  - `spark`：原創的程序式 3D 光芒，隨人聲呼吸、隨拍脈動、會放光束。
  - `aiHud`：`me = claude · context N / 395 tok`。
  - 字變成 embedding 空間裡的 token，有注意力線。
  - **線上訓練的 bigram 下一個字預測**：只用到目前聽過的字。在 DIMENSION 前它預測「data」（因為只見過 "my data"），猜錯、揭曉 DIMENSION（p 0.023、5.4 bits、new token）；第二次是 data／DIMENSION 各半，又遇到新字 CIRCUMFERENCE——「學習世界」是真的在發生。
- **3D 引擎擴充**：線條透視寬度與深度霧、粒子景深 bokeh 與霧、粒子 model matrix、`text3D`／`point3D`、post 光束（rays）、post `lift`（背景色在 post 加回，暗淡線條不再被 MAX 混色吃掉）。新增 `lib/camera.js`、`lib/scene3d.js`（地板／極座標網格、軸向 gizmo、景深灰塵）。
- **5 個鏡頭重做**：
  - points：embedding 空間，攝影機推進。
  - dimension：環繞的 4D 超立方體＋落在地板上、給「you」的藍色影子。
  - circle：spark 展開成圓，斜角轉正面，you 沿圓周運行。
  - circumference：低角度追蹤滾輪＋地上的 π 位數。
  - sine：螺旋線搭配 **dolly zoom**，從正對時的「圓」轉成側面的「正弦」。

**驗證**
- `renders/stills/test.png`，1080p 逐格親自檢查並修了：
  - MAX 混色吃掉暗線；
  - 粒子透視太小；
  - token 標籤重疊；
  - 預測面板文字重疊；
  - gizmo 用錯攝影機；
  - helix 被霧吃掉；
  - 牆上投影相位飄移（已移除）；
  - 圓太大頂到 HUD；
  - 關鍵字顏色太淡。
- 4K：`renders/test_2160.mp4`。synccheck：22 拍、2 個關鍵字 **EXACT**，音訊 0.000 ms（同步標記改為不透明，避免被 3D 內容誤判）。4K 算圖 3.96 fps → 全片約 55 分鐘。
- `npm test` 18 項通過；回歸 baseline 已重建（外觀是刻意改的）。

---

## 第 2 階段（2026-10-11）

**引擎**（`src/engine/`，介面寫在 CLAUDE.md §3）
- T（網格／段落／字／起音／剪接點）、F（60 fps 特徵）、timeline（建置時先驗證所有規則再回傳 `at(t)`）、5 種轉場（cut／whip／glide／xfade／points）。
- 立即模式的 DrawContext：發光線（2D／3D，解析式 SDF 抗鋸齒，MAX 混色）、SDF 形狀、SDF 文字（執行時由 OFL 字型建圖集、EDT、按需載入 CJK）、GPU 粒子 swarm（形狀之間變形，純函數）、three 逃生口、memo、確定性 `sim`。
- 後製：bloom（mip chain）、色差、soft-shoulder tonemap、暗角、hash 顆粒、dither。字幕 console（逐字打字＋游標＋中文＋歷史行）與 5 秒警告卡在 overlay 層。
- 播放器：WebAudio 時鐘（扣除輸出延遲）、`?t=`、拖曳軸、段落標記、中文字幕開關、逐幀／逐拍跳轉。已在內建瀏覽器實測：畫面正確、實際播放速率 1.03×（rAF 取樣誤差）。
- `data/zh.json`：129 行非官方繁中翻譯（EXECUTION 在 c1／chant 譯「執行」，c3 改譯「處決」）。

**工具**
- `npm run stills -- <chapter|warning>`、`npm run preview -- <chapter>`、`npm run render`、`tools/synccheck.mjs`、`tools/perf.mjs`、`tools/probe-gpu.mjs`。
- 算圖管線：GPU headless Chromium（RTX 5060 Ti / ANGLE D3D11）逐幀 → GPU 轉 yuv420p（BT.709 limited）→ WebSocket → ffmpeg x264。
  效能從最初的 1.45 fps（fetch 上傳僅約 30 MB/s）改到 **1080p 17–26 fps、4K 5.1 fps** → 全片 4K（13015 幀）預估約 45 分鐘。

**驗證（親自看過／量過）**
- 測試章節 `99_test`（v1 第 16–21.5 小節，10.15 s）：`renders/stills/test.png`、`renders/test_2160.mp4`（3840×2160、60 fps、609 幀、BT.709）。
- **同步證明**（`node tools/synccheck.mjs renders/test_2160.mp4`）：從編碼後的影片像素讀回——22 個拍點全部亮在預測的那一幀（EXACT）、DIMENSION f2268／CIRCUMFERENCE f2491 兩個關鍵字也是 EXACT；音軌與原始 mp3 的互相關偏移 **0.000 ms**。
- 片頭靜音段：從警告卡中段開始算圖，第一個聲音出現在歌曲時間 0.1017 s（與分析的 music_start 相同）。
- 4K 靜幀檢查抓到並修掉：文字背面剔除導致文字全部消失、JetBrains Mono 退回襯線字、hero 字發光框、4K 色差過強、2D 幾何的 NaN 包圍球。
- 測試：18 項全過（新增 timeline 單元測試、測試章節 timeline、每鏡頭靜幀回歸〔已確認刻意改動會被抓到〕、裸秒數 lint）。

**決策**
- 中文字幕用繁體，字型改用 **Noto Sans TC**（PROMPT 原建議 SC；SC 會把部分共用字畫成簡中字形）。
- 字型改用 `@fontsource` npm 套件（鎖版、內含 OFL），不再放 `public/fonts`。
- 章節可以有 `overlay(ctx, t)`：畫在 overlay 層、不受轉場影響（同步標記就是用它）。

**仍不夠好的地方**
- 測試章節只是引擎驗證，不是成片品質（構圖、節奏都沒有精修）。
- `points` 轉場目前是「原地瓦解再重組」，還沒有真的讓粒子從 A 的形狀飛到 B 的形狀；要做到 B 的輪廓需要分鏡決定哪些鏡頭用它。
- 4K 的瓶頸是 x264（preset slow + 顆粒）；如果全片算圖時間不能接受，可以把母帶改成 preset medium。

---

## 第 1 階段（2026-10-11）

**產物**（`analysis/out/`，由 `analysis/run.py` 產生，重跑位元相同）
- `timing.json`：網格、16 個段落（附說明）、129 行／398 字的字級歌詞、notes（誤差統計與所有決策）
- `onsets.json`：drums 640 個、vocals 452 個起音（含強度）
- `features.f32` + `features.json`：12741 列 × 25 通道，60 列／秒，正規化到 0..1
- `overview.png`：波形＋節拍網格＋段落＋字級歌詞（4000×3800），已親自看過

**結果**
- 節拍：**130.003 BPM 固定網格**，beat 0 = 0.2367 s（第一個強拍）。beat_this 與 madmom 各自擬合出的 BPM 相差 0.0005；強拍投票 113:3 與 112:0。鼓軌強起音對網格的誤差：中位數 8.2 ms、p95 22 ms；每 15 秒的中位誤差都在 ±10 ms 內（沒有速度漂移）。
- 段落（小節）：intro 0–8｜inst1 8–16｜v1 16–24｜pre1 24–32｜c1 32–40｜v2 40–48｜pre2 48–56｜c2 56–60｜c2x 60–64｜bridge 64–72｜inst2 72–80｜chant 80–88｜c3 88–96｜love 96–104｜outro 104–112｜end 112–片尾。
- 歌詞：CTC 強制對齊（wav2vec2 LV60K，比 MMS_FA 在副歌強很多）→ 用 f0／有聲能量修正到音符起點。**51 個大寫關鍵字逐一對照頻譜＋音高人工確認**：44 個正確、7 個更正（OBJECT、CREATION、TANGENTS、ISOLATION、ILLEGAL、EXECUTION ×2），記錄在 `analysis/keywords_verified.json`。
- 長度：mp3 解碼 212.323 s；音樂在 207.8 s 降到 −60 dBFS 以下，約 209.0 s 起是數位靜音 → 13015 幀的規格只裁掉靜音（第 0 階段的待辦 1 已解決）。

**判斷與發現（需要使用者知道）**
1. **c2／c2x／bridge 的切法是敘事性的**：音樂上 56–72 小節是同一段延長副歌。這裡切成 c2（VIBRATIONS、COMPLETION）、c2x（插入的 4 小節 "you have left" → ISOLATION）、bridge（FRAGMENTS → ILLEGAL ARGUMENTS，程式開始崩壞）。真正的純器樂間奏是 inst2（72–80）。
2. **`world.execute(me);` 沒有被唱出來**：15.0 s 之後 vocals 軌只剩合成器殘響。這一行標為 `sung: false`，三個 token 放在 inst1 落拍的第 32–34 拍。
3. **chant 的 EXECUTION 有切分音**：12 個 EXECUTION 中有 5 個晚一個 16 分音符起唱（每個都看得到 "EX" 母音加 ks 爆破音的固定型態，是真的切分，不是對齊誤差）。
4. 對齊器在 4 個關鍵字上的自動結果差超過 120 ms（最多 405 ms），所以關鍵字一律採用人工驗證值。非關鍵字的字是自動的（典型誤差 ±40 ms），只用在字幕打字。

**工具**
- Python 3.12 venv（uv），torch 2.8.0+cu128（RTX 5060 Ti 可用），demucs 4.1.0 htdemucs_ft、beat_this（commit 鎖定）、madmom（git commit 鎖定）、torchcrepe（GPU；它的 f0 dither 用 numpy 亂數，已固定 seed）。
- 全部重跑約 132 秒（GPU）。從頭重跑兩次的產物位元相同（已驗證）。
- 檢查工具：`check_keywords.py`、`check_lines.py` → `analysis/out/check/`（gitignored）。

**測試**：`npm test` 12 項全過。新增 `test/analysis.test.js`，檢查網格、段落連續且落在小節線上、字的順序與範圍、51 個關鍵字都經過驗證、onsets 排序、features 大小與範圍。

---

## 第 0 階段（2026-10-11）
- `CLAUDE.md`、專案骨架（git、package.json 鎖版、.gitignore、README）、`src/sections.js`、`src/theme.js`、npm scripts（`stills`／`preview`／`render` 目前只做參數驗證，第 2 階段實作）、確定性 lint 與結構測試。
- 環境：Node 24.14.0、npm 11.9.0、ffmpeg 2026-03、git 2.51、uv；GPU RTX 5060 Ti 16 GB。

---

## 待辦／待確認
1. ~~歌曲長度 vs 幀數~~ → 已解決（只裁掉靜音）。
2. ~~PyTorch on Blackwell~~ → torch 2.8.0+cu128 可用。
3. ~~中文翻譯~~ → 已完成初稿（`data/zh.json`），第 3 階段可再潤飾。
4. ~~Headless WebGL2~~ → 可用 GPU（需 `--no-sandbox --use-angle=d3d11`）。
5. ~~字型~~ → @fontsource（JetBrains Mono、Space Grotesk、Noto Sans TC）。
