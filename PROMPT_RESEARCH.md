# 用 Claude 從「mp3 + vtt」生成 world.execute (me) ; 程式動畫 MV —— Prompt 研究

> 分析對象：`world-execute-web/`（原始碼）、兩支成品影片、`Mili - world.execute(me);.mp3` / `.vtt`
> 日期：2026-10-11

---

## 0. 結論先講

**不存在「一個 prompt、一次回覆」就能產出這種影片的做法。** 這兩支影片背後是一個約 **69,000 行 JS** 的專案，是 Claude Code（credits 寫 *Claude Opus 5.5 Max*）在**人類監製的反覆審片之下、經過很多個 session** 做出來的。標題裡的「13 億 / 百億 Token」說的也正是這件事：大部分 token 花在「渲染 → 截圖 → 看圖 → 修改」的迴圈上。

真正要設計的是：

1. 一份**專案規格書**（放在 `CLAUDE.md`，每個 session 都會讀到）——把架構、美術語言、品質標準寫死；
2. 一組**分階段 prompt**（分析 → 引擎 → 逐章節製作 → 審片 → 算圖）；
3. 一個**視覺驗收迴圈**（讓 Claude 自己截圖、看接觸印樣、自評、再修改）。

下面第 1 節是從原始碼反推的「它到底是怎麼做的」，第 2–4 節是可以直接複製使用的 prompt。

---

## 1. 從原始碼反推的製作方式

### 1.1 兩支影片的關係

| | `杜比视界纯享…完美重制版` | `Claude用代码搓了13015帧4K视频…` |
|---|---|---|
| 長度 | 216.93 s | 216.92 s |
| 內容 | 同一套程式碼的 **remake edit** | 同一套程式碼的 **`orig` edit**（`src/lib/published.js` 的 `PUBLISHED = ["orig"]`） |
| 差異 | 部分鏡頭改了剪接點與畫面（如 DIMENSION／CIRCUMFERENCE 是深色版，B 版是米白紙張版 `paperLook`） | |

**13015 幀** = 歌曲 211.907 s × 60 fps（12715 幀）+ 5 s 片頭 preroll（300 幀）。母帶是 3840×2160／60 fps，影片檔是 B 站轉碼後的 1080p30。

### 1.2 管線（pipeline）

```
mp3 + vtt
  │
  ├─ analysis/ (Python, .venv)
  │    ├─ 分軌：drums / bass / vocals / other（demucs 類工具）
  │    ├─ 節拍：beat_this → 129.999 BPM 固定網格，All-In-One 交叉驗證 → timing.json.beats
  │    ├─ 段落：intro / title / v1 / pre1 / c1 / v2 / pre2 / c2 / c2x / bridge / inst2 / chant / c3 / love / outro
  │    ├─ 歌詞：VTT 行級時間 → 強制對齊到「字級」時間 → timing.json.lines[].words[]
  │    ├─ onsets.py：各分軌的起音點 → onsets.json
  │    └─ 每 1/60 s 一列、25 個通道的音訊特徵（rms*, onset*, centroid, flux, 16 個 mel 頻帶）→ features.f32
  │
  ├─ src/engine/  自製引擎（Three.js + WebGL2）
  │    ├─ timeline.js：chapter({ id, from, to, shots:[{ id, at, draw, transitionIn }] })
  │    ├─ timing.js：T.beatTime / T.barTime / T.section / T.findLine / T.onsetNear …
  │    ├─ edit.js：HIT（對齊鼓點）、VOX（對齊人聲起音）、cut / whip / glide / points / xfade 轉場
  │    ├─ swarm / lines / shapes / text / post（粒子、發光線、形狀取樣、文字、後製）
  │    └─ 每一幀都是 f(t) 的純函數 → 可任意跳幀、可確定性重算
  │
  ├─ src/ch/  16 個章節，約 300 個鏡頭（見 src/player/cost.json.js 的鏡頭清單）
  │
  ├─ test/  單元測試 + 回歸測試（regression.exempt 列出允許變動的鏡頭）
  ├─ tools/ 字型子集化、預覽、剪輯表等
  └─ render.mjs：無頭瀏覽器逐幀擷取 → ffmpeg（母帶 crf 14 / ALAC；發佈版 1080p crf 16 / AAC）
```

### 1.3 美術語言（必須寫進規格，否則 Claude 會做出「普通的音樂視覺化」）

- **黑底 + 終端機／HUD 美學**：JetBrains Mono、Space Grotesk；角落有小型讀數、座標軸、尺寸標註線。
- **歌詞字面視覺化**：每一句歌詞都被翻譯成一個「數學 / 程式 / 科學」概念的畫面
  - DIMENSION → 4D 超立方體被拆成 3D 投影；CIRCUMFERENCE → 圓滾動展開成 2π；sine wave、TANGENTS、LIMITATIONS（極限、漸近線）
  - ANTIOXIDANTS → 分子結構；ENJOYMENT → 貓；EXECUTION 倒數 → 2, 64, 1024… 的指數爆炸
  - bridge 的 `ILLEGAL ARGUMENTS` → 程式碼崩壞、錯誤訊息、try/catch
- **大寫關鍵字**（DIMENSION、SIMULATION…）是主角級排版，在唱出的那一幀出現。
- **左下角 console 字幕**：`> 英文歌詞` + `// 中文翻譯`，逐 token 打字。
- **色彩語義**（`src/theme.js`）：me＝青色、you＝橘色、rose、gold、violet、red（崩壞段）。
- **剪接對拍**：每個 cut 落在鼓點或人聲起音前 1 幀（`LEAD = 1/fps`）。
- **後設敘事**：片頭 `object me { N: 262 144 … }`，片尾 `Bash(node render.mjs --frames)` 與 credits，影片「展示自己的原始碼與呼叫堆疊」。

---

## 2. 主規格書（放進專案根目錄的 `CLAUDE.md`）

> 這是最關鍵的一份。Claude Code 每個 session 開始都會讀它，所以它取代了「每次重講一遍的長 prompt」。

```markdown
# Project: world.execute (me) ; — a fully code-generated music video

## Inputs (the only assets)
- `Mili - world.execute(me);.mp3` — the song (212 s)
- `Mili - world.execute(me);.vtt` — line-level English lyrics with timestamps
Everything else — every pixel, every font choice, every transition — is produced by code in this repo.
No stock footage, no generated images, no video models. Fonts may be downloaded only if OFL-licensed.

## Deliverable
- 3840×2160, 60 fps, H.264/HEVC master with the original audio, plus a 1080p delivery encode.
- A web player that renders the same film live in the browser (WebGL2), frame-for-frame identical to the master.

## Non-negotiable architecture
1. **Deterministic**: every frame is a pure function of time t. No Math.random, no Date.now, no frame-to-frame
   accumulation unless a shot is explicitly `stateful` and can re-simulate from its start. Use hash-based noise.
2. **Music-locked**: no hard-coded seconds in shots. Times come from the analysis via helpers:
   `T.beatTime(k)`, `T.barTime(k)`, `T.section(id)`, `T.findLine(text)`, `T.line(i).words[j].start`,
   `T.onsetNear('drums'|'vocals', t, tol)`. Cuts land on a drum hit or a sung onset, one frame early.
3. **Chapter / shot structure**: `src/ch/NN_<section>.js` registers `chapter({ id, from, to, shots })`;
   each shot is `{ id, at: T => seconds, draw(ctx, t), transitionIn? }`. Sub-modules live in `src/ch/<section>/`.
   Shared engine in `src/engine/`, shared look in `src/lib/` and `src/theme.js`.
4. **Design space** 1920×1080; render scales to any resolution. Text never smaller than legible at 1080p.
5. **Audio-reactive** values come only from `features.f32` (60 rows/s, normalised 0..1) and `onsets.json`.
6. Tests in `test/` (node --test). A regression test renders a still from every shot and compares to the baseline.

## Visual language
- Black field, terminal/HUD aesthetic: JetBrains Mono for code and readouts, Space Grotesk for display type.
- Every lyric line is visualised **literally** as a math / CS / physics / chemistry concept it names or implies.
  The film should feel like the song's program is executing on screen. Prefer real constructions
  (real 4D projection, real molecule geometry, real Fourier series) over decoration.
- Capitalised lyric words (PROTECTION, OBJECT CREATION, DIMENSION, SIMULATION, EXECUTION…) are hero typography
  that lands on the exact frame they are sung.
- Lyrics console bottom-left: `> English line` typed token by token, `// 中文翻譯` under it.
- Colour semantics: me = cyan (.42,.92,1), you = orange (1,.55,.22), love = rose, warmth = gold,
  corruption = red. Use colour to tell the me/you story, not for decoration.
- Story arc: creation (intro) → learning the world (v1, v2) → wanting to give everything (choruses)
  → the program breaks (bridge: ILLEGAL ARGUMENTS, crashes, stack traces of this very repo)
  → EXECUTION count-up → love → the world reboots and the film shows its own render command.
- Shot length follows the music: 1–4 bars in verses, one beat or less in the EXECUTION sections.
- Quality bar: every shot must survive a still-frame inspection at 4K. No placeholder geometry, no default
  Three.js materials, no aliasing, no text overlaps, no empty frames.

## Working rules for Claude
- Work one section (chapter) at a time. Before writing code for a section, write a shot list
  (`docs/shots/<section>.md`: time, lyric, concept, camera, transition) and wait for approval.
- After each change, render stills / a contact sheet of the affected shots (`npm run stills -- <chapter>`)
  and **look at them** before reporting. Report what is still weak.
- Never edit `analysis/out/` by hand; rerun the analysis instead.
- Keep `npm test` green.
```

---

## 3. 分階段 prompt（依序在 Claude Code 中使用）

> 建議：模型選最強的（Opus），effort 開最高；每一階段一個或多個 session；讓 Claude 自己開 subagent 平行做不相干的章節。

### Phase 0 — 專案初始化

```
讀 CLAUDE.md。建立專案骨架：Vite + Three.js（vendor 鎖版本）、src/engine、src/ch、src/lib、test、tools、analysis。
先不要做任何畫面。完成後說明目錄結構與 npm scripts（dev / test / stills / render）。
```

### Phase 1 — 音訊與歌詞分析（最重要的地基）

```
在 analysis/ 建一個 Python venv 管線，輸入只有 mp3 與 vtt，輸出到 analysis/out/：

1. 分軌（drums / bass / vocals / other），用 demucs 或同等工具。
2. 節拍與小節：用 beat_this 偵測，再用第二種方法（如 All-In-One）交叉驗證。這首歌是固定速度 ~130 BPM 4/4，
   請擬合成一條最小平方法網格，並用鼓軌起音修正相位。把誤差統計寫進 timing.json 的 notes。
3. 段落：intro, title(drop), v1, pre1, c1, v2, pre2, c2, c2x(4 小節延伸), bridge, inst2, chant(EXECUTION 計數),
   c3, love, outro, tail。以歌詞與能量判斷，每段附一句 notes。
4. 歌詞：vtt 只有行級時間。對 vocals 分軌做強制對齊，得到每個字的 start/end（必要時拆音節）。
   人工校對 PROTECTION、DIMENSION、EXECUTION 這類關鍵字是否落在正確的起音上。
5. onsets.json：drums 與 vocals 各自的起音時間與強度。
6. features.f32：每 1/60 秒一列，通道 rms, rms_drums, rms_bass, rms_vocals, rms_other, onset, onset_drums,
   centroid, flux, mel_00..mel_15；以非靜音幀的 p1/p99 正規化到 0..1，並輸出 features.json 描述格式。
7. 再寫一份繁中／簡中歌詞翻譯（自己翻，標註為非官方）存成 subs/zh.json，與行對齊。

最後畫一張圖：波形 + 節拍網格 + 段落 + 字級歌詞，存成 PNG 讓我檢查。
```

### Phase 2 — 引擎

```
依 CLAUDE.md 的架構實作 src/engine：
- timing.js：載入 analysis/out，提供 T.beatTime/barTime/section/findLine/line/onsetNear/beatAt/barAt。
- timeline.js：chapter() 註冊、Timeline 把所有 shot 依 at(T) 排序、檢查重疊與越界、at(t) 回傳 {a,b,p} 轉場狀態。
- edit.js：HIT/VOX/SYL 對拍函式；cut / whip / glide / points / xfade 轉場。
- 渲染核心：swarm（GPU 粒子，可沿形狀取樣）、lines（有發光的線）、text（SDF 或 canvas 文字貼圖）、
  post（bloom、色差、底片顆粒、暗角，全部可依 shot 調整）。
- 播放器：requestAnimationFrame 以音訊時鐘驅動；URL ?t=秒 可跳到任一時間。
- tools/stills.mjs：用 headless Chromium 對指定 shot 的中點與起訖各截一張，拼成接觸印樣 PNG。
- render.mjs：逐幀固定時間步進擷取（不依賴即時效能），用 ffmpeg 編碼並混入原音。
用一個測試章節（99_placeholder）驗證整條管線：能在 4K 60fps 算出 10 秒正確對拍的影片。
```

### Phase 3 — 整片分鏡（先文字、不寫程式）

```
讀 timing.json 的所有歌詞與段落。為整首歌寫分鏡表 docs/storyboard.md：
每一行歌詞 → 1~3 個 shot，欄位：shot id、起點（用 T 的表示法，例如 "c1 第 8 拍鼓點"）、歌詞、
要具象化的概念、畫面描述、鏡頭運動、轉場、me/you 的色彩敘事、是否顯示大寫關鍵字。
要求：
- 每個概念要「真的」：DIMENSION 用真實 4D 超立方體投影，CIRCUMFERENCE 讓圓滾一圈展開成 2π 並列出位數，
  sine wave/TANGENTS/LIMITATIONS 用真的函數與極限，ANTIOXIDANTS 用真實分子結構…
- 全片要有一條敘事弧（見 CLAUDE.md），bridge 要讓「這支程式本身」崩壞：顯示本 repo 的原始碼與 stack trace。
- 標出全片的視覺母題如何在片尾回收（例如片頭的 object me {} 在片尾再出現）。
不要寫程式，等我審核。
```

### Phase 4 — 逐章節製作（重複 16 次，最燒 token 的部分）

```
做 <section>（例如 v1）。依 docs/storyboard.md 中這一段的分鏡，在 src/ch/NN_<section>.js 和 src/ch/<section>/ 實作。
流程：
1. 先做所有 shot 的粗模（正確的時間點與構圖、簡單幾何），跑 stills 給我看接觸印樣。
2. 我確認後，逐個 shot 精修到 CLAUDE.md 的品質標準。每精修一個就重新截圖並自己檢查：
   文字是否重疊、是否清楚、關鍵字是否在唱出那一幀出現、構圖是否有重心、與前後 shot 的轉場是否順。
3. 用 render.mjs 算出這一段（含前後各 2 秒）的 1080p 預覽影片，抽 30 fps 的接觸印樣自評一次，
   列出最弱的 3 個 shot 並改善。
4. npm test 綠燈後，回報：完成的 shot 清單、截圖路徑、你認為仍不夠好的地方。
```

### Phase 5 — 審片 prompt（可交給 subagent 當「導演」）

```
你是這支 MV 的導演，不寫程式。請看 renders/preview/<section>.mp4 的每秒 4 張接觸印樣與 docs/storyboard.md：
逐個 shot 打分（構圖、可讀性、與音樂同步、概念是否真實、與全片美術一致），每項 1–5 分，
低於 4 分的要給出具體、可執行的修改指令（例如「CIRCUMFERENCE 字落地太晚 3 幀；圓的線寬在 4K 下太細」）。
輸出成 docs/review/<section>.md。
```

### Phase 6 — 全片整合與第二剪（remake edit）

```
全片 16 章已完成。請：
1. 從頭到尾算一次 1080p 預覽，檢查章節之間的轉場與能量曲線，列出所有斷裂點並修正。
2. 跑 regression 測試，確認之前審過的 shot 沒有被後來的共用程式改壞。
3. 新增一個 edit「remake」（src/edit/table.js），只改剪接點與少數 shot 的處理方式，
   不影響 orig；兩個 edit 都要能各自 render。
```

### Phase 7 — 最終算圖

```
用 render.mjs 輸出 orig edit：3840×2160、60 fps、含 5 秒片頭警告卡（光敏性癲癇警告），共 13015 幀。
母帶 crf 14 + ALAC，另出 1920×1080 crf 16 + AAC。算完後抽 1 fps 接觸印樣檢查有無黑幀、閃爍或錯誤畫面。
片尾 credits 顯示 render 指令、幀數、解析度、使用的模型與音樂出處。
```

---

## 4. 如果只能給「一個」prompt

若你真的只想丟一個訊息給 Claude Code（例如長時間自主模式），可以用下面這段，但請預期：結果會比參考影片簡單很多，而且仍然需要你在中途看圖、給回饋。

```
這個資料夾只有 `Mili - world.execute(me);.mp3` 與 `.vtt`。請用純程式碼（Three.js/WebGL2，無任何生成圖片或素材）
為這首歌製作一支 3840×2160、60fps 的完整 MV，並同時提供可在瀏覽器即時播放的網頁版。

先建立 CLAUDE.md，內容包含：確定性渲染（每幀是時間的純函數）、所有時間點來自音訊分析而非寫死、
chapter/shot 架構、黑底終端機/HUD 美學、每句歌詞都以真實的數學／程式／科學概念字面具象化、
大寫關鍵字在唱出的那一幀以主視覺字體落地、左下角 console 打字字幕（英文 + 中文翻譯）、
me=青色/you=橘色 的色彩敘事、bridge 段讓程式本身崩壞並顯示本 repo 的原始碼、片尾顯示 render 指令與幀數。

然後依序完成：
(1) Python 音訊分析：分軌、節拍網格（beat_this）、段落、字級歌詞強制對齊、各軌起音、60fps 音訊特徵；
(2) 引擎：timing / timeline / 轉場 / 粒子 / 發光線 / 文字 / 後製、stills 截圖工具、逐幀 render 工具；
(3) 全片分鏡表；
(4) 逐章節實作，每完成一個章節就截接觸印樣自己審查、列出最弱的鏡頭並修改，直到每格都能經得起 4K 靜幀檢視；
(5) 全片預覽、回歸測試、最終 4K 算圖與混音。

每個階段結束時停下來，給我看截圖與下一步計畫，等我回饋再繼續。
```

---

## 5. 實務提醒

1. **成本**：參考作品的鏡頭清單約 300 個；如果每個 shot 平均要 5–10 輪「改 → 截圖 → 看」，token 量級就會是「數億到十億以上」。截圖（圖片輸入）是最貴的部分，可以先用 640×360 的接觸印樣審，最後才看 4K。
2. **人類監製不可省**：credits 裡有 Executive Producer、Technical Advisor——成品的「品味」很大一部分來自人類否決不好的畫面。Phase 3 的分鏡審核與 Phase 4 第 1 步的粗模審核，是投資報酬率最高的兩個介入點。
3. **歌詞時間是一切的地基**：VTT 只有行級時間，字級對齊錯一格，所有大寫關鍵字就會不準。Phase 1 一定要自己檢查那張波形圖。
4. **中文翻譯**：參考作品用的是 Mili 官方中譯（版權屬 Mili），只有 mp3 + vtt 時 Claude 只能自己翻譯，應標示為非官方。
5. **確定性**：如果不在一開始就強制「每幀＝f(t)」，後面就無法逐幀 4K 算圖、也無法讓網頁版和影片版一致。
6. **版權**：歌曲與歌詞屬 Mili 與其權利人。自用或非商業二創可以，公開發佈請比照 `world-execute-web/NOTICE.md` 標示出處並排除音訊檔。
7. **可以直接拿來用的捷徑**：`world-execute-web/` 是 AGPL-3.0 開源的。如果目標是「做出類似的片」而不是「從零證明 Claude 能做」，把它的 `src/engine/`、`src/lib/` 與 `data/` 格式當成 Phase 2 的參考實作（在 prompt 中寫「參考 world-execute-web/src/engine 的設計」），能省下大量 token；但衍生作品同樣須以 AGPL 釋出。
