# 任務：用純程式碼為 Mili〈world.execute (me) ;〉製作一支 4K 60fps 的 MV

## 你手上只有
- `Mili - world.execute(me);.mp3`：歌曲（約 212 秒，~130 BPM，4/4）
- `Mili - world.execute(me);.vtt`：英文歌詞，只有「行」級時間戳

畫面上的每一個像素都必須由這個 repo 裡的程式碼即時算出：不准用生成圖片、影片模型、圖庫素材或外部 3D 模型。字型只能下載 SIL OFL 授權的（建議 JetBrains Mono、Space Grotesk、Noto Sans SC 子集）。

## 最終交付
1. `out/master.mp4`：3840×2160、60 fps、原曲音訊，前面加 5 秒光敏性癲癇警告卡（總共 13015 幀）。
2. `out/delivery.mp4`：1920×1080 發佈版。
3. 一個網頁播放器：在瀏覽器中用 WebGL2 即時算出同一支片，和影片逐幀一致，可拖曳時間軸、切換中文字幕。

## 這支片要長什麼樣子（美術方向）
- **歌詞會被「執行」**：這首歌的歌詞本身就是一段程式。每一句歌詞都要用它字面上提到或暗示的**真實**數學、資訊、物理、化學概念畫出來，而且要做真的構造，不要只是裝飾。例如：
  - PROTECTION／OBJECT CREATION／INITIALIZATION：電源啟動、物件被建立、參數被填入（`object me { name, N, dim, color, love }`）
  - DIMENSION：真的 4D 超立方體投影，被一層層拆成 3D、2D
  - CIRCUMFERENCE：圓沿著直線滾一圈，展開成 2π，旁邊跑出圓周率的位數
  - sine wave / TANGENTS / LIMITATIONS：真正的正弦函數、切線場、函數趨近漸近線
  - AC to DC：交流電經整流、濾波變成直流；A.D to B.C：時間軸倒轉
  - NUTRIENTS／ANTIOXIDANTS：真實的分子結構（例如茄紅素）；tabby cat／ENJOYMENT：用粒子或線條構成的貓
  - VIBRATIONS：克拉尼圖形／駐波；FRAGMENTS：碎片、記憶體區塊被清除
  - ILLEGAL ARGUMENTS 與 bridge：**這支程式自己崩潰**，畫面上出現這個 repo 的真實原始碼、錯誤訊息與 stack trace
  - EXECUTION 連續 12 次加上 EIN…LIU 計數：指數級爆炸（2 → 64 → 1024 …），剪接一拍一切
  - LO-O-OVE：愛的「代數表達式」，例如心形曲線、玫瑰線、各種極座標方程式
  - 片尾：世界重新開機，回到片頭的 `object me {}`，最後一幕顯示產生這支影片的 render 指令、幀數與解析度
- **敘事弧**：被創造 → 學習世界（v1、v2）→ 想把一切都給你（各段副歌）→ 被留下、孤立（c2x）→ 程式崩壞（bridge）→ EXECUTION → 愛 → 重啟。
- **色彩語義**：me＝青色 `(.42,.92,1)`，you＝橘色 `(1,.55,.22)`，love＝玫瑰色，溫暖＝金色，崩壞＝紅色。顏色是用來說 me 和 you 的故事，不是拿來裝飾的。
- **整體視覺**：黑底，終端機／HUD／工程圖美學。角落放小型讀數、座標軸、尺寸標註線；發光線條、GPU 粒子；後製加輕微 bloom、底片顆粒、暗角。可以有一兩段米白紙張質感的「工程圖」插段當作對比。
- **歌詞中的大寫關鍵字**（PROTECTION、DIMENSION、SIMULATION、EXECUTION…）是主視覺排版，必須在「唱出來的那一幀」出現。
- **字幕**：左下角像 console 一樣逐 token 打字，`> 英文歌詞`，下一行 `// 中文翻譯`。翻譯由你自己翻，並在片尾註明是非官方翻譯。
- **剪接**：鏡頭長度跟著音樂走。主歌段 1–4 小節換一個鏡頭；EXECUTION 段一拍或更短。每個 cut 都要落在鼓點或人聲起音前 1 幀。轉場可以用硬切、快速甩鏡（whip）、滑移（glide）、粒子重組、交叉淡化。
- **品質標準**：任何一幀拿出來在 4K 下當靜態圖看都要成立。不能有預設 Three.js 材質、明顯鋸齒、文字重疊或空白畫面。

## 不可違反的技術架構
1. **確定性渲染**：每一幀都必須是時間 t 的純函數。禁止 `Math.random`、`Date.now`，也禁止依賴上一幀的狀態；需要模擬的鏡頭必須能從該鏡頭的起點重算。亂數一律用 hash。
2. **時間點全部對齊音樂**：鏡頭裡不准寫死秒數。所有時間點都從分析結果取得，透過 `T.beatTime(k)`、`T.barTime(k)`、`T.section(id)`、`T.findLine(text)`、`T.line(i).words[j].start`、`T.onsetNear('drums'|'vocals', t, tol)`。
3. **章節／鏡頭結構**：`src/ch/NN_<section>.js` 呼叫 `chapter({ id, from, to, shots })` 註冊章節，每個 shot 是 `{ id, at: T => 秒, draw(ctx, t), transitionIn? }`。章節專用的模組放在 `src/ch/<section>/`，共用引擎放 `src/engine/`，共用外觀放 `src/lib/` 與 `src/theme.js`。
4. **設計座標**：以 1920×1080 為設計座標，輸出時縮放到任意解析度。
5. **音訊反應**：所有隨音樂變化的數值只能讀 `analysis/out/features.f32` 與 `onsets.json`。
6. **技術選型**：Vite + Three.js（鎖定版本）+ WebGL2；分析用 Python venv；算圖用 headless Chromium 依固定時間步進逐幀擷取，再交給 ffmpeg 編碼（母帶 crf 14、發佈版 crf 16）。
7. **測試**：用 `node --test`。包含 timeline 檢查（沒有重疊、沒有越界、第一個鏡頭從 0 開始），以及每個鏡頭一張靜幀的回歸比對。

## 工作流程（每個階段結束都要停下來等我回覆）

**第 0 階段：建立規範**
把這份 prompt 的內容整理成 `CLAUDE.md`，當作之後每個 session 的規範；另外建立 `docs/progress.md` 記錄進度。建立專案骨架與 npm scripts：`dev`、`test`、`stills <chapter>`、`preview <chapter>`、`render`。

**第 1 階段：音訊與歌詞分析（全片的地基，要做到非常準確）**
- 分軌成 drums／bass／vocals／other（demucs）。
- 用 beat_this 偵測節拍，再用第二種方法交叉驗證。擬合成固定 BPM 的網格，用鼓軌起音修正相位，誤差統計寫進 `timing.json` 的 notes。
- 標出段落：intro、inst1（title drop）、v1、pre1、c1、v2、pre2、c2、c2x、bridge、inst2、chant、c3、love、outro、end。每段附一句說明。
- 歌詞：對 vocals 軌做強制對齊，取得**字級**時間。所有大寫關鍵字都要逐一人工確認是否落在正確的起音上。
- 輸出 `onsets.json`（drums、vocals 各自的起音與強度）與 `features.f32`：60 列／秒，通道為 rms、rms_drums、rms_bass、rms_vocals、rms_other、onset、onset_drums、centroid、flux、mel_00..15，以 p1/p99 正規化到 0..1，另寫 `features.json` 描述格式。
- 產出一張「波形＋節拍網格＋段落＋字級歌詞」的 PNG，**自己先看過再給我看**。

**第 2 階段：引擎與工具**
實作 timing、timeline、轉場（cut／whip／glide／points／xfade）、GPU 粒子 swarm（可以沿任意形狀取樣）、發光線、文字（SDF）、後製、播放器（音訊時鐘驅動，支援 `?t=秒` 跳轉）、`stills`（每個鏡頭截起點／中點／終點，拼成接觸印樣）、`render`。先用一個 10 秒的測試章節，證明整條流程可以算出 4K60、正確對拍的影片。

**第 3 階段：全片分鏡（只寫文件，不寫程式）**
寫 `docs/storyboard.md`：每句歌詞對應 1–3 個鏡頭，欄位包括 shot id、起點（用 T 的寫法表示）、歌詞、要具象化的概念、畫面描述、鏡頭運動、轉場、色彩敘事。另外寫出全片的視覺母題如何在片尾被回收。

**第 4 階段：逐章節製作（一次一章，依時間順序）**
每一章都照下面的步驟做：
1. 粗模：時間點與構圖都正確，但只用簡單幾何。跑 `stills` 給我看接觸印樣。
2. 精修：每改一個鏡頭就重新截圖並**親自檢查**——文字是否清楚、有沒有重疊、關鍵字是否在對的幀出現、構圖有沒有重心、和前後鏡頭接得順不順。
3. 用 `preview` 算出這一章前後各多 2 秒的 1080p 預覽。開一個 subagent 扮演「導演」，只看接觸印樣與分鏡，替每個鏡頭打分（構圖、可讀性、同步、概念真實度、風格一致，1–5 分），低於 4 分的列出具體修改指令。修完後再審一次。
4. `npm test` 通過後，更新 `docs/progress.md`，回報：完成的鏡頭、截圖路徑、你認為還不夠好的地方。

不相干的章節可以用 subagent 在獨立的 worktree 平行製作，但共用引擎的修改一律由你親自合併，並重跑回歸測試。

**第 5 階段：整合**
算出全片的 1080p 預覽，檢查章節之間的轉場與整體能量曲線，修掉所有斷裂點，再跑一次回歸測試。

**第 6 階段：最終算圖**
輸出 master 與 delivery。抽每秒 1 張的接觸印樣，檢查有沒有黑幀、閃爍、錯誤畫面或字幕不同步。片尾 credits 要列出：Music — Mili；Visuals — 使用的 Claude 模型；render 指令；幀數與解析度。

## 原則
- 寧可少做幾個鏡頭，也要讓每一個都很好。卡住時先回報，不要用 placeholder 混過去。
- 不要聲稱完成你沒有親眼截圖檢查過的東西。
- 不要手動修改 `analysis/out/`，有問題就重跑分析。
- 版權：歌曲與歌詞屬於 Mili。repo 裡不放音訊檔，README 要註明這是非官方二創。

現在從第 0 階段開始。

