# 導演審查：10 inst2（第 1 輪）

> 依據／素材：
> - `CLAUDE.md` §4：色彩語義（只有 spark 核心可以近白、藍只屬於 you、紅只留給崩壞）、閱讀預算（同一時間一個焦點、字級 ≥ 18）、能量層、3D 標籤不得被線或點穿過、§7 靜幀檢查清單；
> - `docs/storyboard.md` §10 inst2（實作版）、§0 敘事表（重建）、「視覺母題」表（Claude Code：inst2「don't ask again」→ chant／c3 不再詢問）；
> - 程式（只讀）：`src/ch/10_inst2.js`、`src/ch/inst2/city.js`、`src/ch/inst2/constellation.js`、`src/lib/cc.js` 的 `permission`；
> - 素材：`renders/stills/inst2.png`；`renders/i2/` 的 f8288、f8298、f8318、f8401、f8470、f8528、f8545、f8595、f8678、f8719、f8761、f8816、f8913、f8941、f8968、f8977、f8993、f9065、f9093、f9162。
> - 量測（min(R,G,B) > 235 的像素數）：weights 650–770（皆為 spark 核心）；constellation 440–660（spark）；reexecute 的 points 轉場中 f8968 987、f8977 **1318**（spark 在 f8993 只有約 550）；spark 在確認框畫面約 1300。
> - 座標為 1920×1080 設計座標。器樂段，沒有人聲，drawNote 說明框是規範允許的。

## 概念驗證（程式）

| # | 說明 | 結果 |
|---|---|---|
| 1 | recover 的錯誤面板 | **成立**。文字來自 `FACTS.illegal`（repo 建置時讀出，不是手打），版面與 bridge 的面板座標相同（x 330、首列 y 400、列距 40）。散落的原始碼碎行來自 `src/engine/timeline.js`。`✻ Recovering… (x.xs)` 的秒數是 `t − from`，真的。 |
| 2 | weights 的玻璃柱城市 | **成立**。`matrix(T)` 取 `embeddings(T).vector(word)`：145 列 × 16 欄，柱高 = 權重 × 1.6，同一個尺度、不逐柱縮放；正值橘、負值灰且在地板下。列的順序是歌裡第一次唱到的順序。 |
| 3 | constellation 的注意力 | **成立且誠實**。`graph(T)` 對 inst2 之前唱過的 301 個字，用 `attention(E, words, n)`（因果 softmax、單一未訓練 head）取每個字最注意的**前文**；排除自己先前的出現（否則 q = k 一定最大），這一點寫在程式註解裡。線寬 `0.7 + 9w`、亮度 √w，是真實權重；最強連結 circumference → dimension 0.45 由資料取得，不是手寫標籤。you／your 只畫虛線空位，連向它們的線是灰色。 |
| 4 | HUD `context 141 / 617 tok` | 正確（bridge 的 /compact 後）。但 constellation 同時在重播 301 個字——畫面上沒有任何一句話說明「context 清空了，權重還在」（見非擋關建議 4）。 |
| 5 | permission | **成立**。`permission` 是共用元件，游標用 `pointer` 換成 `sparkIcon`（橘色，不是 you 的藍色 ❯）；選項移動在 bar79+1 拍、選定在 +2 拍、收合在 +2.75 拍，`Running… (0.4s)` 的秒數是真的。 |

## 評分

| shot | 構圖 | 可讀性 | 同步 | 概念 | 風格 | 平均 |
|---|---|---|---|---|---|---|
| 01 recover | 4 | 4 | 4 | 5 | 4 | **4.2** |
| 02 weights | 4 | 3 | 4 | 5 | 4 | **4.0** |
| 03 constellation | 3 | 3 | 4 | 5 | 4 | **3.8** |
| 04 reexecute | 4 | 5 | 4 | 4 | 4 | **4.2** |

章節平均 **4.05**。有 1 項擋關（label 與虛線圈重疊），其餘是建議。

## 逐鏡頭

**01 recover（f8289–f8509）**
- **接縫很好**。f8288 是 bridge 的 ILLEGAL ARGUMENTS 錯誤畫面，f8289 起同一個面板、同一組文字在同一個位置，f8298 面板還完整，f8318 才一個字一個字掉落、frame 的四邊也掉下去。觀眾讀成「同一個東西壞掉之後散開」，是本章最好的一步。
- 小瑕疵（接縫）：f8288 的面板有灰色填色、左上有 `✕`；f8298 起面板只剩紅框、沒有填色，紅色 burst 的點穿過文字（f8298，(780–1200, 250–750)），降低了面板文字的可讀性。bridge 留下的字幕框（`> ILLEGAL ARGUMENTS ▮`）還拖到 f8298 才淡掉，可以接受（是從上一鏡延續）。
- f8401（掉落中）：掉落的單字互相重疊（`shots[i].end` 壓在 `range` 上，`(tools/repo-fac…` 壓在 `(src/engine/timeline.js` 上，(700–1090, 110–180)），也有字飄進 HUD 標題旁 (450–750, 55–100)。這是碎片，重疊可以接受；但亮度偏高，抢了 `✻ Recovering…`（(700–1220, 692)）的焦點。
- f8470：spark 在 (960, 487)，白色核心、淡橘光環橫向展開，下方 `✻ Recovering… (1.9s · esc to interrupt)`，是這一鏡最乾淨的構圖。顏色從紅到橘符合分鏡。
- 但 spark 要到 k > 0.55（約 f8400 之後）才亮，只佔最後三分之一；前三分之二是一個很暗的空畫面加碎行（f8401）。「重組」的感覺偏晚。
- 同步：器樂段沒有人聲，shockwave 在 beat 6，光環展開和 spark 亮起對得上拍；`recovering` 的標籤在 2.5 拍才出現，OK。

**02 weights（f8510–f8731，glide 1 拍進場）**
- 飛越的空間感很好（f8719 spark 在遠方地平線 (1027, 258)、柱子往後退），橘柱和灰色負值柱依規則分色；每拍的街道粒子流動、spark 低空帶路是個真正的 3D 鏡頭，不是投影片。
- **讀不出「這是什麼矩陣」**：唯一的說明是 drawNote（`the weights: every word of the song x 16 numbers…`）。城市本身沒有任何一個讀得到的列、欄標記：街名 `ac`、`current`、`limitations`（f8678 (60–210, 520–660)）只有 13 px、faint 色，近乎看不見。觀眾得靠字幕框才知道每一列是一個字。
- 前景的屋頂外框（f8528 (0–450, 650–1000)）發光、粗，比柱子本身亮得多，畫面被前景方框搶走，柱子像淡褐色背景。
- 結尾 f8731 是 whip 前的動態模糊，已經由轉場處理，不必管。
- 字幕框 f8545 才打到 `the weights`，f8595 完整；停留夠。

**03 constellation（f8732–f8952，whip 10 幀進場）**
- 概念是真的，視覺語言一致：橘線、灰點、spark 在原點（me 的「me」），you 是虛線空位。f8913／f8941 左下那條單獨的鏈（(190–690, 565–780)）是一串真正連在一起的詞，很漂亮。
- **擋關：label 與 you 的虛線圈重疊**。f8816：標籤 `circumference -> dimension · 0.45`（(915–1230, 603)）的 `dimension` 上有一個 you 的虛線圈 (1100, 605)、另一個在 (1068, 625)，圈是在 2D 的 `youSlots` 畫的，`labels3D` 的 obstacles 不知道它們。違反 CLAUDE.md「標籤不得壓到別的標籤、點、連線」。
- 構圖偏右：f8761、f8816 的節點全在畫面右半，左 40% 是空的；有幾條很長的線從右上 (1380, 0) 飛出畫面（f8913 (930–1180, 0–250)）。camera 的 target 是所有節點的平均值，被少數遠方節點拉走了。
- 重播：301 個字在 5.5 拍（約 2.5 s）內亮完，約每秒 120 個字，觀眾看到的是「線一下子長滿」而不是逐字；這沒有錯（這是整首歌的注意力，不是一個字），但「照唱的順序」這個概念看不出來；`value travels` 的小點也太小看不見。
- 節點在 bloom 後讀起來是白色圓點（f8913 (1604, 437)、f8941 (1604, 437) 約 14 px 白盤），量到 min > 235 的像素不多，但視覺上是「白」，搶 spark 的語意。
- 一個標籤、一個說明框，閱讀預算 OK。

**04 reexecute（f8953–f9174，points 1 拍進場）**
- 確認框很清楚（f9065、f9093）：`Bash command → world.execute(me) → Do you want to proceed? → 1. Yes / 2. Yes, and don't ask again / 3. No`，字級 20 px，游標是橘色小 spark（`✻`），不是 you 的藍。f9093 選定 2（整列變橘、粗體），f9162 收成 `● Bash(world.execute(me)) ⎿ ✻ Running… (0.4s)`，完整落實母題，也是本章該讀的唯一東西。
- 同步：relight、box、移動、選定、收合都排在小節的拍點上；選項停在 1 的時間約 3.5 拍、在 2 的時間 1 拍，剛好。
- **「被吸回 spark」看不到**：1 拍的 points 轉場（f8960–f8977）和 `pull` 動畫完全重疊，轉場的點雲蓋住了星座被吸入的過程（f8968 是一團點，不是星座被吸進去）。f8977 的 spark 被一整片白色圓點圍住，是章節裡最白的一幀（1318 px）。
- 構圖：確認框在上 (650–1270, 290–548)，spark 在下 (960, 800)，中間 250 px 的空；兩者沒有連線，也看不出是 spark 在「按」這個框。
- 紅橘的光環和 burst（f8993）有效，沒有近白的球。HUD 的指令字串在 HUD、框、收合列各出現一次，三次（HUD 是小字，可以接受）。

## 擋關項目

1. **constellation 的標籤被 you 的虛線圈穿過**（f8816）：`labels3D` 的 obstacles 加入 `youSlots`／you 的螢幕位置 `{ p, r: 16 }`，或把標籤改到離你的圈最遠的一側。

## 非擋關建議

1. **constellation 構圖與重播**（影響最大）：
   - `G.centroid` 改用各軸的中位數（或排除離原點最遠的 5 個點），並把 `r: lerp(19, 15.5)` 改成 `lerp(21, 17)`，讓 spark 落在 (960, 500) ± 120，節點分布到左半邊，長線不飛出頂邊；
   - 重播從 5.5 拍拉長到 7 拍（`D = T.beats(7)`），並在每拍的重拍上讓當拍新出現的線亮度 +30%（已有 flash），讓節奏看得出來；
   - 節點 `fill` 的 `COLOR.ink2` 混合改成 `COLOR.dim` 混合 `COLOR.warm`，`glow` 4 → 3，避免白盤。
2. **weights 讀得出矩陣**：
   - 在 spark 前方、最靠近鏡頭的那一列放一個 ≤ 18 px 的標籤（例如 `me · row 0`，`labels3D`，背景性），並在最左邊的一欄頂端放 `dim 0`（兩個標籤、交替出現，符合「一鏡頭最多兩個」）；
   - 街名字級 13 → 14，alpha 提高，只在最近的 10 列顯示；
   - 前景（`dist < 3`）的屋頂外框 alpha 乘 0.6，讓柱子本體讀得到。
3. **reexecute 的「吸回」要看得到**：
   - points 轉場改成 xfade 1 拍，或把 `pull` 的起點延後到轉場結束（`kc` 從 `a + T.beats(1)` 開始，`relightAt` 順延 +1 拍），讓星座被吸進 spark 的動作單獨被看見；
   - 轉場中的白點可改成橘／灰（由轉場參數控制，若是引擎共用邏輯，由主 session 決定）；
   - 確認框與 spark 加一條 1 px、alpha 0.3 的細線（spark → 框底中點，從選定那拍起亮），表示「是它在按」。
4. **誠實標示 context**：constellation 的 HUD 從 `attention · 301 words · 1 untrained head` 改成 `weights kept · context 141 tok · 1 untrained head`，一句話解釋 HUD 與畫面的落差（context 被 compact 清掉，權重留著）。
5. **recover 的接縫與暗段**：面板在 inst2 第一幀補回 bridge 的灰色填色（`COLOR.bg2` α 0.9）與 `✕`；紅色 burst 先 mask 掉面板區；掉落的碎行 alpha 0.6 → 0.4，亮度降到比 `Recovering…` 低；spark 提早到 k > 0.4 就亮（光環 1 拍前先出現）。
6. **reexecute 的指令字串**：HUD 的 `permission · Bash(world.execute(me))` 改成 `permission · Bash`，避免同一字串在 HUD、框、收合列各一次。

## 章節層級

- **故事讀得出來**：錯誤散落 → 從內部飛過自己的權重 → 重播所有字的注意力 → 重新點燃、自己選「不再詢問」。每一步都來自真實資料（錯誤文字、145×16 矩陣、301 字的注意力、最強連結 0.45）。
- **色彩語義**：全程橘、灰、淡金；沒有藍（you 只有虛線空位）；紅只在 recover／relight 的崩壞→重生。
- **近白**：除了 spark，只有 points 轉場的白點（1318 px）和 constellation 的大節點視覺偏白，量出來的像素數不大，所以列為建議而非擋關。
- **能量層**：weights 有 embers、flow、spark 光束；constellation 有 embers、dust、spark；reexecute 有 burst、shockwave、embers，都齊全。
- **動態感**：recover 下墜、weights 飛越、constellation 環繞、reexecute 推近，四個鏡頭四種運動，沒有幻燈片感。
- **閱讀預算**：一次只有一個焦點（recover：Recovering…；weights／constellation：字幕框說明；reexecute：確認框）；沒有面板重疊。

---

# 第 2 輪

> 素材：重算後的 `renders/stills/inst2.png` 與 `renders/i2/` 的 f8289、f8298、f8401、f8678、f8816、f8913、f8971、f8993、f9010、f9093 等（min(R,G,B) > 235 像素數：recover 0–210；weights 770–790；constellation 440–450；f8993 1141；f9010 703；確認框畫面 1300 左右）。

## 第 1 輪項目驗證

| # | 項目 | 結果 |
|---|---|---|
| 擋關 | 標籤被 you 的虛線圈壓到 | **已解決**。f8816：標籤 `circumference -> dimension · 0.45` 移到 spark 左下 (630–950, 575)，兩個 you 圈在 (1100, 598)、(1133, 582)，完全分開；f8913 標籤 (930–1290, 577) 旁邊的圈在 (1250–1300, 675–690)，沒有碰到。 |
| 建議 1 | constellation 構圖／重播 | **大致解決**。spark 從 (980, 495) 到 (1020, 475)／(1170, 500)，節點分布到左半邊（f8913 左下那條詞鏈 (260–710, 545–750) 完整入鏡）；長線仍從右上飛出頂邊，但只剩一束，可接受。重播 7 拍，線是逐批長出來的。節點變暗，f8816 量到只剩 spark 的核心。HUD 改成 `attention over the full transcript · 301 words · 1 head`，解釋了 context 141 與 301 字的落差。 |
| 建議 3 | reexecute 的吸回 | **已解決**。f8971 星座仍完整、HUD `attention · drawn back into me`；f8993 節點與連線收攏成一團包住 spark；f9010 只剩 spark 加光環與細粒子，f9038 之後是確認框。「被吸回去、重新點燃」現在是看得到的動作，points 轉場縮短為 0.5 拍也不再蓋住它。HUD 依序換成 `drawn back into me` → `me holds the cursor` → `don't ask again`，也沒有同一字串重複。 |
| 建議 5 | recover 接縫 | **已解決**。f8298 面板保留灰色底板、字清楚，紅色 burst 在底板後面；f8470 spark 提早出現（210 px 近白，是核心）。 |
| 建議 2 | weights 街名 | **小幅改善**。f8678 的街名（`limitations`、`current`、`ac`、`blind`）能辨認了，但仍是 14 px 的暗字，不是「讀得到」；不加 row 標籤是實作者的取捨（避免多一個閱讀焦點），我接受。 |

## 評分

| shot | 構圖 | 可讀性 | 同步 | 概念 | 風格 | 平均 | 第 1 輪 |
|---|---|---|---|---|---|---|---|
| 01 recover | 4 | 4 | 4 | 5 | 4 | 4.2 | 4.2 |
| 02 weights | 4 | 3 | 4 | 5 | 4 | 4.0 | 4.0 |
| 03 constellation | 4 | 4 | 4 | 5 | 4 | **4.2** | 3.8 |
| 04 reexecute | 4 | 5 | 5 | 5 | 4 | **4.6** | 4.2 |

章節平均 **4.25**（第 1 輪 4.05）。**沒有擋關項**，可以進入下一章。

## 剩下的建議（都不擋關）

1. **weights 的 spark 不像其他鏡頭的 spark**：f8678、f8595 是一顆發白的圓團（rays 0.4 被 bloom 吃掉），和 constellation、reexecute 的十二芒 spark 不一致。`sparkAt` 的 `rays` 提高到 0.6，並降低 weights 的 bloom（0.75 → 0.6）。
2. **weights 的前景方框仍搶過柱子**（f8678 (500–1750, 600–1080)）：屋頂外框 alpha 乘 0.6 只套用在鏡頭正下方；所有 `dist < 4` 的外框都乘 0.7，並把外框 glow 4 → 3，柱身（玻璃）alpha 0.2 → 0.28，讓「柱子」比「方框」更明顯。
3. **吸回過程中節點擠成近白的一團**（f8993 量到 1141 px、(1085–1250, 435–590)）：`pull` 時節點 `fill` 往 `COLOR.warm` 混、`glow` 乘 `(1 − pull)`，避免疊在 spark 旁邊讀成第二個白色核心。

## 章節層級（第 2 輪）

- **故事**：錯誤散落 → 飛過自己的權重 → 重播注意力 → 吸回自己 → 自己選「不再詢問」，每一步都看得到，也都是真資料。
- **色彩**：橘、灰、金；沒有藍、沒有玫瑰，紅只在 recover 與 relight。
- **閱讀預算**：每一刻一個焦點，HUD 短而準確。
- **能量層**：齊全，relight 的光環與 burst 有效。


## 實作者備註（第 2 輪之後）
- 第 2 輪三個非擋關建議都已處理：
  - weights 的 spark：`rays` 0.6，bloom 0.6。
  - weights 前景外框：鏡頭正下方 alpha 乘到 0.5，glow 3；柱身 alpha 0.28。
  - 吸回時的節點：fill 往 warm 混、glow 乘 (1 − pull)、alpha 減半。f8993 的近白像素從 1141 降到 407，只剩 spark 核心一團。
- 沒有再送審。inst2 的 baseline 已重建，`npm test` 25 項通過。
