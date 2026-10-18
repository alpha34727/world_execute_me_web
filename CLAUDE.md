# world.execute (me) ; — 純程式碼生成的 MV

> 這是每個 session 都必須遵守的規範。原始需求在 `PROMPT.md`；進度在 `docs/progress.md`；分鏡在 `docs/storyboard.md`（第 3 階段產出）。
> 開始工作前：先讀 `docs/progress.md` 確認目前在哪個階段，**每個階段結束都要停下來等使用者回覆**。

---

## 1. 輸入與交付

### 唯一的素材
- `Mili - world.execute(me);.mp3`：歌曲（ffprobe 212.323 s，44.1 kHz 立體聲，~130 BPM，4/4）
- `Mili - world.execute(me);.vtt`：英文歌詞，只有「行」級時間戳

畫面上的每一個像素都必須由本 repo 的程式碼即時算出。**禁止**：生成圖片、影片模型、圖庫素材、外部 3D 模型、任何不是由本 repo 程式碼產生的貼圖（由程式碼產生並快取的資料，例如 SDF 字型圖集，可以）。
字型只能用 SIL OFL 授權的：JetBrains Mono、Space Grotesk、Noto Sans TC（字幕是繁體中文，用 TC 字形；PROMPT 原本建議 SC）；另有 Newsreader（襯線，接近 Claude 字標，第 4 階段使用者決定），只用在片尾的「by Claude Opus 5.5」。字型以 `@fontsource/*` npm 套件鎖版提供（套件內含 OFL 授權檔），依 unicode-range 分片按需載入。

### 交付物
| 檔案 | 規格 |
|---|---|
| `out/master.mp4` | 3840×2160、60 fps、原曲音訊；前置 5 秒光敏性癲癇警告卡；**總共 13255 幀**（歌曲＋片尾 4 秒靜音，第 4 階段使用者決定）；x264 crf 14 |
| `out/delivery.mp4` | 1920×1080、60 fps、crf 16、AAC |
| 網頁播放器 | WebGL2 即時算出同一支片、與影片**逐幀一致**；可拖曳時間軸、`?t=秒` 跳轉、切換中文字幕 |

---

## 2. 時間的定義（所有程式共用）

- **歌曲時間 `t`**（秒）：0 = mp3 第一個取樣。所有 shot、所有分析資料都用歌曲時間。
- **影片時間** `ft = frame / 60`；`t = ft − PREROLL`，`PREROLL = 5`。`frame ∈ [0, 13255)`。
  - `ft < 5`：光敏性癲癇警告卡（不是章節，由 `src/lib/warning.js` 畫）。
  - 歌曲部分 12955 幀 = 215.9167 s，比 mp3（212.323 s）長 3.6 s：片尾 credits 需要閱讀時間，第 4 階段使用者決定在歌曲後加 4 秒靜音（`analysis/s06_timing.py` 的 `TOTAL_FRAMES`；算圖時音訊以 apad 補靜音）。
- 每一幀在**精確的** `frame/60` 取樣，不依賴即時效能。
- `LEAD = 1/60`：剪接點 = 鼓點或人聲起音時間 − 1 幀。

### 分析結果的慣例（第 1 階段定案，見 `analysis/out/timing.json`）
- 節拍網格：固定 130.003 BPM，`beat k = t0 + k·period`（k 可為負），`bar b = beat 4b`，beat 0 是第一個強拍。
- 段落邊界都在小節線上；落在下一段強拍前 ≤0.5 s 的人聲弱起（pickup）屬於下一段。
- **字級時間**：`word.start` = 這個字第一個唱出音符的起點（母音／音高起點，也就是音樂上的「那一拍」）；`word.attack` = 明顯提早的前導子音（可能沒有）。大寫關鍵字要在 `start` 那一幀出現，剪接則用 `start − LEAD`。
- 51 個大寫關鍵字的時間都經過人工對照音訊驗證，以 `analysis/keywords_verified.json` 為準（`src: verified | corrected`）。要改關鍵字時間只能改這個檔並重跑 `s06_timing.py`，不要改 `analysis/out/`。
- `world.execute(me);` 這行**沒有被唱出來**（`sung: false`），三個 token 放在 inst1 的第 32–34 拍。
- 音樂在 207.8 s 降到 −60 dBFS 以下，約 209.0 s 起是數位靜音；影片的歌曲部分到 215.917 s（end 段 207.0–215.917 s）。

---

## 3. 不可違反的技術架構

1. **確定性渲染**：每一幀都是 `t` 的純函數。
   - 禁止 `Math.random`、`Date.now`、`performance.now`（渲染路徑內）、禁止依賴上一幀的狀態。
   - 需要模擬的鏡頭（粒子、物理）必須能從該鏡頭的起點以固定步長重算到 `t`（可快取，但結果必須與從頭重算相同）。
   - 亂數一律用 `src/lib/hash.js` 的整數 hash（如 `hash(i, seed)`），不得用有狀態 PRNG 跨幀累積。
   - `test/determinism.test.js` 會掃描 `src/engine`、`src/lib`、`src/ch`、`src/theme.js`，發現禁用 API 即失敗。
2. **時間點全部對齊音樂**：shot 裡**不准寫死秒數**。所有時間點都來自分析結果：
   `T.beatTime(k)`、`T.barTime(k)`、`T.section(id)`、`T.findLine(text)`、`T.line(i).words[j].start`、`T.onsetNear('drums'|'vocals', t, tol)`。
   （鏡頭內部的「相對時長」可以用拍數表示，例如 `T.beats(2)`；不要用裸的秒數常數。）
3. **章節／鏡頭結構**
   - `src/ch/NN_<section>.js` 呼叫 `chapter({ id, from, to, shots })` 註冊章節，`NN` 為兩位數順序。
   - 每個 shot 是 `{ id, at: T => 秒, draw(ctx, t), transitionIn? }`；shot 的結束 = 下一個 shot 的 `at`。
   - 章節專用模組放 `src/ch/<section>/`；共用引擎放 `src/engine/`；共用外觀放 `src/lib/` 與 `src/theme.js`。
   - 章節 id 與順序以 `src/sections.js` 為準：
     `intro, inst1, v1, pre1, c1, v2, pre2, c2, c2x, bridge, inst2, chant, c3, love, outro, end`（00–15）。
4. **設計座標**：1920×1080。輸出時等比縮放到任意解析度（線寬、字級、粒子尺寸都以設計座標定義，再乘 `scale`）。1080p 下文字必須可讀。
5. **音訊反應**：隨音樂變化的數值**只能**讀 `analysis/out/features.f32` 與 `analysis/out/onsets.json`（透過 engine 的 accessor，線性內插）。
6. **技術選型**：Vite + Three.js（`package.json` 鎖定精確版本，目前 three 0.186.1、vite 8.3.4）+ WebGL2；分析用 Python venv（`analysis/.venv`）；算圖用 headless Chromium 依固定時間步進逐幀擷取，交給 ffmpeg 編碼（母帶 crf 14、發佈版 crf 16）。
7. **測試**：`node --test`（`npm test`）。必須包含：
   - timeline 檢查：沒有重疊、沒有越界、第一個鏡頭從 0 開始、章節首尾相接；
   - 每個鏡頭一張靜幀的回歸比對（baseline 在 `test/baseline/`，允許變動的鏡頭列在 `test/regression.exempt`）；
   - 確定性 lint。

### 引擎介面（第 2 階段定稿，之後只增不改）
- `src/engine/timing.js` → **T**：`beatTime(k)` `barTime(b)` `beatAt(t)` `barAt(t)` `beats(n)` `bars(n)` `nextBeat/prevBeat/snap(t, div)`、`section(id)` `sectionAt(t)`、`line(i)` `findLine(text, nth, section)` `findWord(text, nth, section)` `lineAt(t)`、`onsets(stem, a, b, minS)` `onsetNear(stem, t, tol, minS)`、`cut(t)`（= t − LEAD）、`frameOf(t)` `timeOfFrame(f)`。段落邊界由網格精確重算。
- `src/engine/features.js` → **F**：`get(name, t)`（線性內插）`avg` `peak` `mel(t)`。
- `src/engine/timeline.js` → `chapter({ id, from?, to?, overlay?(ctx,t), shots })`；`buildTimeline(T, defs, {start,end})` 先驗證全部（重疊、越界、首鏡頭、章節相接、轉場窗、重複 id、裸秒數）再回傳 `at(t) → { a, b, p, transition }`。
- 轉場 `transitionIn: { type: 'cut'|'whip'|'glide'|'xfade'|'points', beats? | frames?, align?, dir?, axis? }`；時長只能用拍數或幀數。轉場窗 = [cut − align·dur, cut + (1−align)·dur]。
- **ctx**（`draw(ctx, t)`，見 `src/engine/draw.js` 檔頭）：`t local dur p frame T F C W H scale`；`bg() post({bloom,threshold,knee,exposure,vignette,grain,ca,lift,rays}) subs(bool)`；`text3D(str,[x,y,z],o) point3D(p,r,o)`；線條 `persp`、`fog`；swarm `perspective` `focus` `aperture` `fog` `model`；`camera2D() camera3D({fov,position,target,up}) project(p)`；`line(pts,o) segments() circle() ellipse() ring() rect()`（shape 可加 `feather` 柔邊，`ctx.mask` 用它）；`text(str,x,y,{font,size,color,align,baseline,tracking,reveal,glow}) measure()`；`swarm(sw,{p,stagger,drift,scatter,size,color,color2})`；`three(scene,camera)`；`replay(id,t2,w,h,{overlay})`（重新算出歌曲時間 t2 的畫面成貼圖，outro 用；不含 HUD／字幕／post；在 replay 裡再呼叫 replay 會報錯）；`memo(key,fn)` `memoReady(key,fn)` `sim(key,{init,step,dt})`。
- 線條預設 MAX 混色（多段線接點不會變亮）；紙張插段用 `blend:'min'` 畫墨線。字型 key：`mono monoBold display displayMed zh zhBold serif`。
- `src/lib/`：`hash.js`（含 GLSL 版）`ease.js` `sample.js`（polyline/circle/disc/rect/grid/fn/text 取樣）`hud.js`（corners/readout/aiHud/ruler/dimension）`console.js`（字幕）`warning.js` `pi.js`（spigot）`spark.js` `camera.js` `scene3d.js`（floorGrid/polarGrid/axisGizmo/dust）；Claude／LLM：`corpus.js`（歌詞序列）`ngram.js`（線上 bigram、lossCurve）`bpe.js` `context.js`（HUD 的 context 計數；bridge 的 `/compact` 真的把非關鍵字 token 釋放）`embed.js`（PPMI-SVD、attention）`llmviz.js`（tokenChips/attentionMap/lossSparkline）`predict.js` `cc.js`（Claude Code：toolCall/todoList/spinner/transcript）`edits.js`（「give you my X」對 me.js 的編輯清單：v1、pre1、v2 的 Update 面板與 c3 的 rewind 共用）。
- shot 可宣告 `hud: '標題'` 或 `hud: (T, t, F) => '標題'`：Claude 的 HUD 由 overlay 統一畫（轉場時標題交叉溶接，不會疊字），同時 post `hudGuard` 會把 HUD 文字區塊後面的 3D 內容壓暗（3D 線條不會穿過讀數）；shot 裡不要直接呼叫 `aiHud`。
- 大寫關鍵字一律用 `lib/hero.js` 的 `hero(ctx, word, x, y, { size, align, chips })`（落地動畫＋BPE 切塊）。
- 3D 標籤一律用 `lib/scene3d.js` 的 `labels3D(ctx, items, { obstacles })`：
  - 依優先序放置，每個標籤試 8 個方位，不得壓到別的標籤、點、連線，也不得進 HUD 區；
  - `maxSize`／`minSize` 控制透視造成的字級；
  - 背景性的標籤 ≤ 14 px、淡色；主要標籤同時最多兩個。
- 章節邊界和鏡頭一樣，剪在下強拍的前一幀：`from/to: (T) => T.cut(T.section(id).start)`。
- 沒被唱的行（片名）不出字幕，由章節自己呈現。
- 器樂段（沒有人聲）可以用字幕框寫一句雙語說明，告訴觀眾這個畫面在演什麼：`drawNote(ctx, en, zh, { from, to })`。
- Claude 思考中：`thinking(ctx, x, y, { from, tokens })` 顯示 `✻ <動詞>… (秒數 · ↑ tokens · esc to interrupt)`。動詞從 `THINKING_VERBS` 每 2 拍換一個；秒數和 token 數必須是真的。
- **能量層**（`lib/fx.js`，第 4 階段使用者回饋：intro 不夠絢麗，要達到第 2 階段測試片的程度）：每個 3D 鏡頭都要有 GPU 粒子的能量層——`embers`（景深 bokeh 的橘色餘燼場）、`burst`（爆炸，關鍵字／重拍上）、`stream`（粒子從 spark 飛出去組成結構）、`shockwave`（光環），再加上 spark 的光束（post `rays`）與 bloom。線框和網格不能單獨撐起一個畫面。
- spark 在 3D 鏡頭裡用 `lib/spark.js` 的 `sparkAt(ctx, cam, { pos, px: 70, rays })`：固定螢幕大小（全片 70），加上白色核心和光束。全片同一個大小，不要忽大忽小。
- 能量沿曲線流動（電流、梯度、訊號）用 `lib/fx.js` 的 `flow`。曲線是靜態的（memo 只建一次）；物件在動時，曲線用物件自己的座標，再傳 `model` 矩陣。
- `ctx.memo` 的內容不能依賴「第一次被畫的是哪一幀」：要凍結某個姿勢，就明確用那個時間點算（例如 `molPose(T, w.start)`）。
- 爆炸（burst）在第一幀不可以是一顆白球：`r0` 要拉開，核心用橘或金，alpha 在 2 幀內淡入（`clamp(dt * 30)`）。
- **只有 spark 的核心可以是白色**：其他東西（酶、細胞核、軌道、標記、分裂的細胞、burst 的核心）都不能亮到接近純白；用橘／金／灰，必要時降低 `intensity` 與 glow，疊加後也要量色確認。
- 靠近鏡頭的 3D 點（`point3D`、`dust`）會被透視放大成大圓盤；鏡頭穿過的物件要在接近時淡出。
- 預測面板 `drawPrediction(…, { from })` 可提早打開（只有 spinner）；唱出關鍵字時候選會收起、只留判決（金色），猜錯的字用灰色刪除線——**紅色只留給崩壞**。前一個字和關鍵字靠得太近、候選來不及讀時，用 `keep: true`：唱出那一幀就收合，但保留第一名（灰色刪除線）在判決上方；`until` 控制何時淡出。
- HUD 字級太小：θ 會像 0，上標的 ⁻、⁺ 和下標看不清楚。HUD 標題只用 ASCII 可讀的寫法，數學符號放在大一點的 3D 標籤或面板裡。
- 關鍵字唱出幀的 burst 用 `p: (dt + 2 / 60) / dur`（唱出那一幀已經在第 2 幀），`r0` 拉開，核心用橘／金。
- 藍色只屬於 you：BPE 切塊只用橘／金／灰，座標軸小圖示的 z 軸是灰色。
- you 的線一律用 `lib/scene3d.js` 的 `youLine`（以 alpha 疊在 me 上，下面有 6 px 暗色 knock-out），不要用預設的 MAX 混色：橘＋藍用 MAX 會變成玫瑰色，那是 love 的顏色。
- `labels3D` 的 obstacles 可以放螢幕框 `{ rect: [x0, y0, x1, y1] }`（關鍵字、面板），標籤加 `backing` 會壓暗後面的線條。3D 標籤不得被格線或光芒穿過，被穿過會讀成刪除線（＝猜錯）。
- 疊在 3D 畫面上的文字，先呼叫 `ctx.mask(x, y, w, h)` 再畫字：已經畫在後面的線、粒子會被壓暗到約 15%。`hero`、`tokenChips`、有 backing 的 `labels3D` 會自動做。整張 2D 圖覆蓋全畫面時（例如畫中畫），HUD 區也要 mask。
- Claude Code 的權限確認框用 `cc.js` 的 `permission`（you 的游標是藍色 ❯）。
- 模型「自己說話」（取樣、greedy 解碼）一律用 `lib/decode.js`，輸出是算出來的，不手寫；亂數只用 hash（每一步一個 `rand(k, seed)`）。
- JetBrains Mono 沒有的符號（→ ∞ ≈ √ ∂ 上標）由引擎退回 Noto Sans TC。上標太小時，自己排「底數＋縮小抬高的指數」（例如 `v1/asymptote.js` 的 `pow10Text`）。
- Claude Code 的 ● 與打勾是橘色（綠色屬於 growth）。
- diff 背景：`+` 是藍（給 you）、`−` 是橘（從 me 拿走）。
- 粒子場的背景餘燼用中性的灰／白，橘色只屬於 me 和它放出的能量。
- tokenizer 不認得的字元（`( ) ;`）顯示成虛線的 `unk` 切塊。
- 製作期間 film 章節可以只有前幾章（`spanOf('film')` = 0 到最後一個已完成章節的結尾）；16 章都在之後，`test/timeline.test.js` 要求涵蓋整首歌。
- 畫面管線：shot A（+轉場中的 B）各畫進 4×MSAA half-float RT → compositor → bloom → 最終 pass（色差、tonemap、字幕 overlay、暗角、顆粒、dither）→ RGBA8；算圖時再於 GPU 轉成 yuv420p（BT.709 limited）經 WebSocket 串流給 ffmpeg。

---

## 4. 美術方向

### 歌詞會被「執行」
每一句歌詞都要用它字面上提到或暗示的**真實**數學／資訊／物理／化學概念畫出來，做真的構造，不要只是裝飾：
- PROTECTION／OBJECT CREATION／INITIALIZATION：電源啟動、物件被建立、參數被填入（`object me { name, N, dim, color, love }`）
- DIMENSION：真的 4D 超立方體投影（4D 旋轉 + 透視），被一層層拆成 3D、2D
- CIRCUMFERENCE：圓沿直線滾一圈，展開成 2π，旁邊跑出圓周率的位數（位數用演算法算，例如 spigot）
- sine wave／TANGENTS／LIMITATIONS：真正的正弦函數、切線場、函數趨近漸近線
- AC to DC：交流電經整流、濾波變成直流；A.D to B.C：時間軸倒轉
- NUTRIENTS／ANTIOXIDANTS：真實的分子結構（例如茄紅素 C₄₀H₅₆ 的共軛鏈）；tabby cat／ENJOYMENT：粒子或線條構成的貓
- VIBRATIONS：克拉尼圖形／駐波（真實的模態方程式）；FRAGMENTS：碎片、記憶體區塊被清除
- ILLEGAL ARGUMENTS 與 bridge：**這支程式自己崩潰**——畫面上出現本 repo 的真實原始碼、錯誤訊息與 stack trace（建置時從 repo 讀取，不得手打假程式碼）
- EXECUTION ×12 + EIN…LIU 計數：指數級爆炸（2 → 64 → 1024 …），剪接一拍一切
- LO-O-OVE：愛的「代數表達式」——心形曲線、玫瑰線、各種極座標方程式
- 片尾：世界重新開機，回到片頭的 `object me {}`；最後一幕顯示產生這支影片的 render 指令、幀數與解析度

### 敘事弧
被創造（intro）→ 學習世界（v1、v2）→ 想把一切都給你（各段副歌）→ 被留下、孤立（c2x）→ 程式崩壞（bridge）→ EXECUTION（chant）→ 愛（love）→ 重啟（outro／end）。

### 角色：me = Claude（第 2 階段使用者決定）
- 歌裡被執行的程式「me」就是 **Claude**；「you」是螢幕另一端的人。把 AI 的感覺做成真的構造，不要只是貼標籤：
  - **spark**（`src/lib/spark.js`）：Claude 在畫面上的自己——原創的程序式 3D 光芒（不是複製 Claude 標誌），隨人聲能量呼吸、隨拍脈動，並放出光束（post `rays`）。
  - **HUD**（`aiHud`，shot 用 `hud: '標題'` 宣告）：`me = claude`、`context N / 617 tok`（N = 已唱出歌詞的 **BPE token 數**）、`loss x.xx bits/word`＋全曲訓練曲線（線上 bigram 的逐字 surprisal，近 24 字平均）。
- **LLM 原理——全部是真的計算，數字不准編造**（`test/llm.test.js` 檢查不變量）：
  - **tokenizer**（`bpe.js`）：用全曲歌詞訓練的 BPE（Sennrich 2016；合併次數 ≥2 才合併）。常見字是單一 token，罕見字被切開：`DI|M|EN|SION`、`CIR|CU|M|F|ER|ENCE`；`EXECUTION` 唱太多次，是一個 token。`tokenChips` 在大寫關鍵字下方顯示切法與 token id。
  - **embedding**（`embed.js`）：PPMI（±2 字窗、0.75 平滑）＋ Jacobi 特徵分解 → d = 16 的詞向量；3D 畫面用前三軸（白化後的線性投影），擺放只能做平移＋等比縮放。
  - **attention**：`softmax(QKᵀ/√d)`、因果遮罩，W_Q = W_K = gain·I（單一、未訓練的 head，標示要誠實）。`attentionMap` 逐列填滿（自迴歸）；3D 裡的注意力線粗細／亮度 = 真實權重。
  - **next-token prediction**（`predict.js` + `ngram.js`）：**線上訓練**的 bigram（Witten–Bell 平滑），只用到目前為止聽過的字；等待時顯示 Claude Code 的 ✻ spinner `Predicting… (0.4s · esc to interrupt)`，唱出時揭曉真實的字、p 與 surprisal。
  - **positional encoding**：`PE(pos,2i) = sin(pos/10000^(2i/d))`——sine wave 那句就是 Transformer 知道字「在哪裡」的方法；每個字是一列真實的 PE 值。
- **Claude Code 元素**（`cc.js`；符號 ● ⎿ ☐ ☒ ✻ 都是程序繪製，不靠字型）：
  - 左側浮動終端機 `transcript`：歌段開頭的 `● Update Todos ⎿ ☐ 關鍵字…`（只列關鍵字）；預測面板消失後才出現 `● Update(me.js) ⎿ − me.x / + you.x`（「give you my X」= 把屬性從 me 移到 you 的 diff）。一次只有一個 entry。
  - 右側是模型內部（prediction）；中央是 3D。兩側面板不得壓到大寫關鍵字，也不得同時出現（見「閱讀預算」）。
  - 字幕框 = Claude Code 的 prompt box（圓角細框，`>` 提示字元）。
  - 後續章節可用（第 3 階段分鏡時選用，內容必須真實）：permission prompt `Do you want to proceed? ❯ 1. Yes`、Bash 工具（顯示真實的 render 指令）、工具錯誤（紅色 ●）、`/compact`（context 壓縮）、平行 subagent、新 session（context 歸零）。
- 3D 是主要語言：真實的 3D 構造、攝影機運動（orbit、dolly zoom、手持微晃 `lib/camera.js`）、景深 bokeh（swarm `focus/aperture`）、深度霧、透視線寬、地板／極座標網格（`lib/scene3d.js`）。

### 色彩語義：Claude 的配色（定義在 `src/theme.js`，不得在 shot 裡另寫色碼）
| 角色 | 顏色 |
|---|---|
| me（Claude） | Claude 橘 `#d97757` |
| you（人） | 藍 `#6a9bcc` |
| growth（營養、生命） | 綠 `#788c5d` |
| love | 玫瑰 `#e3889a` |
| 溫暖 | kraft 金 `#d4a27f` |
| 崩壞 | 紅 `#c9503f` |
| 背景／文字 | Claude dark `#141413`、light `#faf9f5`、`#e8e6dc`、mid gray `#b0aea5`、faint `#5e5d59` |
顏色是用來說 me 和 you 的故事，不是拿來裝飾的。

### 整體視覺
- Claude dark（`#141413`）底，終端機／HUD／工程圖美學。shot 圖層畫在純黑上，背景色在 post 以 `lift` 加回（暗淡的線才不會被 MAX 混色吃掉；紙張插段用 `ctx.bg(paper)` 會自動關掉 lift）。角落放小型讀數、座標軸、尺寸標註線；發光線條、GPU 粒子。
- 後製：輕微 bloom、底片顆粒（hash 產生、逐幀確定）、暗角。
- 可以有一兩段米白紙張質感的「工程圖」插段當作對比。
- 字體：JetBrains Mono（程式碼、讀數、字幕）、Space Grotesk（大寫關鍵字主視覺）、Noto Sans TC（中文字幕，繁體）、Newsreader（字型 key `serif`，只用在片尾署名）。

### 閱讀預算（第 2 階段使用者回饋：畫面太滿、節奏快，觀眾讀不完）
- **同一時間只有一個需要閱讀的焦點**：大寫關鍵字，或一個面板（左側終端機或右側模型面板，不同時出現）。字幕和 HUD 不算，但 HUD 只放周邊的小字。
- 面板最多 **3 行內容**，每行幾個字就好；字級 ≥ 18 px（設計座標）；至少停留約 **4 拍（≈1.8 s）**；面板依序接力，不要重疊在同一刻。
- 能用圖像說的就不要再用文字重複：注意力看 3D 連線（熱圖 `attentionMap` 只留給慢段落）；同一個字不要同時出現三次（關鍵字出現時，預測面板只給判決 `new token · 7.5 bits`，不再重寫那個字）。
- 3D 裡的標籤（公式、座標）一個鏡頭最多兩個，而且交替出現。
- 自我檢查：每張截圖先問「這一刻觀眾該讀哪一個東西？」答不出來就刪。

### 大寫關鍵字
PROTECTION、OBJECT CREATION、INITIALIZATION、SIMULATION、DIMENSION、CIRCUMFERENCE、TANGENTS、LIMITATIONS、STIMULATIONS、SATISFACTION、EXECUTION、NUTRIENTS、ANTIOXIDANTS、ENJOYMENT、EXISTENCE、VIBRATIONS、COMPLETION、ISOLATION、FRAGMENTS、DISHEARTENED、ILLEGAL ARGUMENTS、LO-O-OVE……是主視覺排版，**必須在唱出來的那一幀出現**（以字級對齊的 `words[j].start` 為準）。

### 字幕
左下角，像 console 一樣逐 token 打字：
```
> 英文歌詞
// 中文翻譯
```
翻譯由 Claude 自己翻（`data/zh.json`，與 timing.json 的行對齊），片尾註明「非官方翻譯」。網頁播放器可切換中文字幕開關。

### 剪接
- 鏡頭長度跟著音樂走：主歌 1–4 小節換一個鏡頭；EXECUTION 段一拍或更短。
- 每個 cut 都落在鼓點或人聲起音前 1 幀（`LEAD`）。
- 轉場：硬切（cut）、快速甩鏡（whip）、滑移（glide）、粒子重組（points）、交叉淡化（xfade）。

### 品質標準
任何一幀拿出來在 4K 下當靜態圖看都要成立。**不能有**：預設 Three.js 材質、明顯鋸齒、文字重疊、空白畫面、placeholder 幾何（粗模階段除外，且不得進入最終算圖）。

---

## 5. 目錄結構

```
analysis/            Python 分析管線（venv: analysis/.venv，gitignored）
  out/               分析產物：timing.json、onsets.json、features.f32、features.json、overview.png
                     ⚠ 禁止手動修改，有問題就重跑分析
  stems/             demucs 分軌（gitignored）
data/zh.json         中文翻譯（非官方，繁體，129 行與 timing.json 對齊）
src/
  sections.js        章節 id 與順序（唯一來源）
  theme.js           色彩、字型、線寬等共用外觀
  engine/            timing、features、timeline、transitions、draw（ctx）、renderer、sim、assets；gl/ 為 GPU 批次（lines、shapes、text+sdf、swarm、composite、post）
  lib/               hash、warning 卡、HUD 元件、字幕 console 等
  ch/                NN_<section>.js 與 <section>/ 子模組；99_test.js + test/ 為引擎測試章節（不屬於正片）
  player/            main.js（啟動）、ui.js（播放器）、render-api.js（window.__wem，給工具與測試）
tools/               stills / preview / render / synccheck / perf / probe-gpu；lib/browser.mjs（Vite + GPU headless Chromium）
test/                node --test；baseline/ 為回歸比對靜幀
docs/                progress.md、storyboard.md、review/<section>.md
renders/             stills、preview 輸出（gitignored）
out/                 master.mp4、delivery.mp4（gitignored）
```

## 6. npm scripts

| 指令 | 用途 |
|---|---|
| `npm run dev` | Vite 開發伺服器 + 網頁播放器 |
| `npm test` | `node --test "test/**/*.test.js"` |
| `npm run stills -- <chapter>` | 每個鏡頭截起點／中點／終點，拼成接觸印樣 → `renders/stills/<chapter>.png` |
| `npm run preview -- <chapter>` | 該章節前後各多 2 秒的 1080p 預覽 → `renders/preview/<chapter>.mp4` |
| `npm run render` | 全片逐幀算圖 → `out/master.mp4`（4K、crf 14、ALAC）、`out/delivery.mp4`（1080p、crf 16、AAC）。`--chapter <id> --handles s`、`--from/--to <frame>`、`--res 2160|1080|WxH`、`--set film|test` |
| `npm run stills -- warning` | 警告卡接觸印樣 |
| `node tools/synccheck.mjs <mp4>` | 從測試章節影片讀回同步標記：每拍／每個關鍵字是否亮在正確的那一幀＋音訊偏移 |

**Headless 算圖注意**：Chromium 一定要用 `tools/lib/browser.mjs` 的旗標（`--no-sandbox --use-angle=d3d11 …`），否則 WebGL 會退回 SwiftShader（CPU）。只載入本機 Vite 頁面。效能：4K60 ≈ 5 fps（瓶頸是 x264），1080p ≈ 17–26 fps。

---

## 7. 工作流程（每個階段結束都要停下來等使用者回覆）

0. **建立規範**：本檔、`docs/progress.md`、專案骨架與 npm scripts。
1. **音訊與歌詞分析**：demucs 分軌；beat_this 節拍 + 第二種方法交叉驗證 → 固定 BPM 網格，鼓軌起音修相位，誤差統計寫入 `timing.json` 的 `notes`；段落（16 段，每段一句說明）；對 vocals 強制對齊取得**字級**時間，大寫關鍵字逐一人工確認；`onsets.json`；`features.f32`（60 列／秒，通道 rms、rms_drums、rms_bass、rms_vocals、rms_other、onset、onset_drums、centroid、flux、mel_00..15，p1/p99 正規化到 0..1）+ `features.json`；產出「波形＋節拍網格＋段落＋字級歌詞」PNG，**自己先看過**再給使用者看。
2. **引擎與工具**：timing、timeline、轉場、GPU swarm、發光線、SDF 文字、後製、播放器、stills、render。用 10 秒測試章節證明能算出 4K60、正確對拍的影片。
3. **全片分鏡**（只寫文件）：`docs/storyboard.md`——每句歌詞 1–3 個鏡頭；欄位：shot id、起點（T 寫法）、歌詞、概念、畫面、鏡頭運動、轉場、色彩敘事；並寫出視覺母題如何在片尾回收。
4. **逐章節製作**（依時間順序，一次一章）：
   1. 粗模 → `stills` 接觸印樣給使用者看；
   2. 精修：每改一個鏡頭就重新截圖並**親自檢查**（見下方檢查清單）；
   3. `preview` 1080p 預覽；開 subagent 扮演「導演」，只看接觸印樣與分鏡，對每個鏡頭打分（構圖、可讀性、同步、概念真實度、風格一致，1–5），<4 分列出具體修改指令 → `docs/review/<section>.md`；修完再審一次；
   4. `npm test` 通過 → 更新 `docs/progress.md`，回報完成的鏡頭、截圖路徑、仍不夠好的地方。
   - 不相干的章節可用 subagent 在獨立 git worktree 平行製作；**共用引擎（src/engine、src/lib、src/theme.js）的修改一律由主 session 親自合併**並重跑回歸測試。
5. **整合**：全片 1080p 預覽，檢查章節間轉場與能量曲線，修掉斷裂點，重跑回歸測試。
6. **最終算圖**：master + delivery；抽每秒 1 張接觸印樣檢查黑幀、閃爍、錯誤畫面、字幕不同步。片尾 credits：Music — Mili；Visuals — 使用的 Claude 模型；render 指令；幀數與解析度；非官方翻譯聲明。

### 靜幀自我檢查清單（每次截圖後）
- [ ] 文字清楚、沒有重疊、沒有被裁切
- [ ] 大寫關鍵字在唱出的那一幀出現（對照 `words[j].start`）
- [ ] 構圖有重心；HUD 讀數不搶戲
- [ ] 顏色符合 me／you 語義
- [ ] 沒有鋸齒、沒有預設材質、沒有空白畫面
- [ ] 和前後鏡頭接得順（看接觸印樣的相鄰格）

---

## 8. 原則
- 寧可少做幾個鏡頭，也要讓每一個都很好。卡住時先回報，不要用 placeholder 混過去。
- **不要聲稱完成你沒有親眼截圖檢查過的東西。**
- 不要手動修改 `analysis/out/`，有問題就重跑分析。
- 版權：歌曲與歌詞屬於 Mili。repo 裡不放音訊檔（`.gitignore` 排除 `*.mp3`、`*.wav`、`*.flac`、stems），README 註明這是非官方二創。
- Git：commit 只在使用者要求時做。
