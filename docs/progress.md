# 進度

> 每個階段結束都要停下來等使用者回覆。規範見 `CLAUDE.md`。

## 目前階段：第 3 階段（全片分鏡）完成，等待使用者回覆；之後才進第 4 階段

| 階段 | 狀態 |
|---|---|
| 0 建立規範 | ✅ 完成（2026-10-11） |
| 1 音訊與歌詞分析 | ✅ 完成（2026-10-11） |
| 2 引擎與工具 | ✅ 完成（2026-10-11） |
| 3 全片分鏡 | ✅ 完成（2026-10-11） |
| 4 逐章節製作 | ⏳ |
| 5 整合 | ⏳ |
| 6 最終算圖 | ⏳ |

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
