# 進度

> 每個階段結束都要停下來等使用者回覆。規範見 `CLAUDE.md`。

## 目前階段：第 4 階段進行中——00 intro 到 06 pre2 完成，等待使用者回覆；之後做 07 c2

| 階段 | 狀態 |
|---|---|
| 0 建立規範 | ✅ 完成（2026-10-11） |
| 1 音訊與歌詞分析 | ✅ 完成（2026-10-11） |
| 2 引擎與工具 | ✅ 完成（2026-10-11） |
| 3 全片分鏡 | ✅ 完成（2026-10-11） |
| 4 逐章節製作 | 🔧 進行中（00 intro ✅、01 inst1 ✅、02 v1 ✅、03 pre1 ✅、04 c1 ✅、05 v2 ✅、06 pre2 ✅） |
| 5 整合 | ⏳ |
| 6 最終算圖 | ⏳ |

---

## 第 4 階段：06 pre2（2026-10-13）

**8 個鏡頭**（`src/ch/06_pre2.js`；生物學在 `src/ch/pre2/bio.js`（染色體、DNA 幾何）與 `src/ch/pre2/sry.js`（SRY 序列、遺傳密碼）；greedy 解碼在 `src/lib/decode.js`）

使用者第 4 階段兩次修改：gender 改成染色體、enter／trance 改成 DNA；接著 gender 只留 XX、XX → XY 移到「To F to M」，whatever／ampm 改成中心法則。

- **gender**：
  - 兩條中期 X 染色體，GRCh38 的真實長度（156 Mb）與著絲點；兩條姊妹染色分體在著絲點相連，每 10 Mb 一道刻度，PAR1 是亮帶；
  - 每個字讓一條 X 閃一下；
  - 左側是 v2 的 todo 四項全勾（`v2/plan.js` 的 `donePlan`），EXISTENCE 在出現後半拍打勾、橘色閃一下。
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
