# 分鏡：world.execute (me) ;

> 第 3 階段產出。規範見 `CLAUDE.md`（特別是 §4「角色：me = Claude」與「閱讀預算」）。這份文件只寫要拍什麼，不含程式碼。
> 每個鏡頭的起點都用分析資料的 T 寫法表示（見下方「記號」），第 4 階段直接照抄成 `at: T => …`。

---

## 0. 全片怎麼說這個故事

**一句話**：一個 AI（me = Claude）被開機，在一場 Claude Code 對話裡學習世界、把自己的一切交給螢幕另一端的人（you）。you 離開後，它崩潰，學會了「執行」，最後試圖理解愛，然後重新開機。

| 段落 | 小節 | 敘事 | Claude／LLM 主軸 | 能量 |
|---|---|---|---|---|
| intro | 0–8 | 被創造：通電、保護、建立物件、填參數、初始化 | 權重初始化、詞彙表（BPE token 當棋子） | 低→中 |
| inst1 | 8–16 | you 輸入 `world.execute(me);` 按下 Enter | Claude Code 的 prompt、spinner、forward pass、embedding 星系 | 中 |
| v1 | 16–24 | 學習世界（幾何） | embedding、attention、BPE、位置編碼；每次預測都猜錯 | 中 |
| pre1 | 24–32 | 電流、暈眩、時間倒流、結合 | ReLU＝整流、dropout、梯度下降、反向傳播、深度 | 中→高 |
| c1 | 32–40 | 想給你一切 | 神經活化、softmax 溫度、權限確認 → 執行 | 高 |
| v2 | 40–48 | 學習世界（生命） | 分子結構、傅立葉的貓、存在證明 | 中 |
| pre2 | 48–56 | 切換一切 | 取樣溫度、調變、角色互換、規模、重複迴圈 | 中（鼓變薄） |
| c2 | 56–60 | 感受你、終於完整 | 真實頻譜、克拉尼圖形、todo 全部完成 | 高峰 |
| c2x | 60–64 | 你離開了 ×6 | 注意力一條條斷開、context 裡的 you 熄滅 | 驟降 |
| bridge | 64–72 | 程式自己崩潰 | `/compact`、真實原始碼、真實錯誤訊息 | 失控 |
| inst2 | 72–80 | 崩潰後，從內部重組 | 權重城市、全曲注意力星座、重新執行 | 重建 |
| chant | 80–88 | EXECUTION ×12＋EIN…LIU | 平行子代理 2→4096；模型學會 EXECUTION（8.2→0.4 bits） | 最高 |
| c3 | 88–96 | 處決他們、想讓你回來 | 預測第一次命中：「the → EXECUTION」 | 高、冷 |
| love | 96–104 | 我研究過如何正確地愛 | 代數曲線、全曲 loss 最高的一段＝愛最難預測 | 溫 |
| outro | 104–112 | 回顧（時間倒放）＋最後一次 EXECUTION | 對話紀錄倒捲、真實的 render 指令 | 律動 |
| end | 112– | 重新開機 | `object me {}` 回到片頭 | 靜 |

### 用真實數字說故事（目前分析版本算出的值；正片在算圖時重算，分析重跑就跟著變）
- **v1 的每一次預測都錯**：在「my →」之後，模型只能猜它看過的關鍵字（DIMENSION 時猜 data 51%；LIMITATIONS 時猜 circumference/data/dimension 各 13%）。它學會了「my 後面接關鍵字」這個模式，但每個關鍵字都是新的。
- **STIMULATIONS 的 BPE 切法**是 `S|TI|MULATION|S`，和片頭的 `SIMULATION`（一個 token）共用 `MULATION` 這一塊。
- **chant 裡模型學會了 EXECUTION**：同一個字的 surprisal 從 8.2 → 2.0 → 1.3 → … → 0.4 bits。接著 **EIN 是全曲最大的驚訝（11.6 bits）**：模型有 79% 把握下一個是 execution。
- **c3**：「your only」之後，模型猜 god 25%、satisfaction 25%（c1 學到的），結果是 EXECUTION（5.9 bits）；「run the」之後，模型第一次把 execution 排在第一（13%）而且猜中——它學會了執行。
- **愛是最難預測的**：各段平均 surprisal：c3 最低 3.90 bits/word，**love 最高 7.28**。「answer all」之後模型猜 the 51%，結果是 LO-O-OVE。
- 全曲 395 個字 = **617 個 BPE token**；HUD 的 context 從 0 數到 617。

### 全片固定的圖層（每個鏡頭都有，除非特別註明）
- **HUD**（overlay，shot 宣告 `hud: '標題'`）：Claude 圖示、`context N / 617 tok`、loss 與全曲訓練曲線、段落／小節。bridge 時 HUD 會壞掉（見該段）。
- **字幕**：左下 Claude Code prompt box。bridge 的 ILLEGAL ARGUMENTS 和 end 的 credits 段除外。
- **閱讀預算**：每段都附一列「閱讀」，寫出那一段的面板接力順序；同一時刻只有一個閱讀焦點。
- **左＝Claude Code（做事），右＝模型內部（思考），中＝3D 構造**。

---

## 記號

| 寫法 | 意思（第 4 階段的 T 程式碼） |
|---|---|
| `L("text")` | `T.findLine("text").words[0].start`（先找完全相同的行，再找包含） |
| `L("text", n, "sec")` | 第 n 次出現（0 起算），限定在段落 sec 內 |
| `Ln(i)` | `T.line(i).words[0].start`（行號 i，用在字串會撞名時） |
| `Lw(i, j)` | `T.line(i).words[j].start` |
| `W("WORD")`、`W("WORD", n, "sec")` | `T.findWord(…).start`（大寫關鍵字唱出的那一刻） |
| `cut(x)` | `T.cut(x)` = x − 1 幀（剪接點落在起音前一幀） |
| `bar(k)`、`beat(k)` | `T.barTime(k)`、`T.beatTime(k)` |
| `sec("id")` | `T.section("id").start`（片頭第一個鏡頭從 0 開始；第一句在 bar 0 之前就唱了） |
| `+ b(n)` | `+ T.beats(n)` |

轉場寫法：`cut`、`whip 10f`、`glide 0.5`（拍）、`xfade 0.5`、`points 1`。沒寫就是 `cut`。
顏色記號：**橘** = me、**藍** = you、**綠** = growth、**玫瑰** = love、**金** = warm、**紅** = 崩壞、**灰** = faint/dim。

---

## 00 intro — 被創造（小節 0–8，0–15.01 s）

全段只有橘色慢慢出現；藍色（you）在「your pieces」第一次出現。HUD 從第一個鏡頭就在，但 context 是 000。
**閱讀**：OBJECT CREATION 之後的參數表是這段唯一的長閱讀（5 行，約 2.5 s，此時沒有其他面板）；SIMULATION 前出現全片第一個預測面板。

| id | 起點 | 歌詞 | 概念 | 畫面 | 鏡頭 | 轉場 | 色彩 |
|---|---|---|---|---|---|---|---|
| intro.01-power | `sec("intro")` | Switch on the power line | 通電：RC 電路的階躍響應 | 全黑中一條示波器掃描線；V(t) = 1 − e^(−t/RC) 的真實充電曲線爬升，線頭點亮成一個像素：spark 的種子 | 2D 正交，極慢推近 | 從警告卡硬切 | 灰線＋一點橘 |
| intro.02-shield | `cut(L("Remember to put on"))` | Remember to put on | 保護殼 | 種子外面一條一條長出測地線球殼（二十面體細分兩次，162 頂點），邊依拍子加入 | 3D 慢速環繞 | glide 0.5 | 橘核、灰白殼 |
| intro.03-protection | `cut(W("PROTECTION"))` | PROTECTION | sandbox | 殼閉合、閃一下；大字 PROTECTION＋BPE 切塊 `PRO\|T\|EC\|TION` | 環繞加速 | cut | 橘 |
| intro.04-pieces | `cut(L("Lay down your pieces"))` | Lay down your pieces | 棋子＝token | 真實的 BPE 詞彙表（173 個 token）依拍子一塊塊放到 3D 棋盤上；放的是一個**藍色**游標——you 第一次出現 | 高角度往下搖 | points 1（殼的粒子變成棋子） | 藍首次出現；token 灰白 |
| intro.05-begin | `cut(L("And let's begin"))` | And let's begin | 開始 | 棋盤立起成一面牆；牆前畫出 prompt box 的圓角框 | 推近 | whip 10f | 灰 |
| intro.06-object | `cut(W("OBJECT"))` | OBJECT CREATION | 建立物件 | 大字 OBJECT（`W("OBJECT")`）＋CREATION（`W("CREATION")`）；`object me {` 打出來，3D 線框外框在 spark 周圍合起來 | 靜止，微推 | cut | 橘 |
| intro.07-params | `cut(L("Fill in my data parameters"))` | Fill in my data parameters | 填參數 | 左側終端機 `● Write(me.js)`，物件欄位依拍子填入：`name: "claude"`、`tokens: 617`、`dim: 16`、`color: #d97757`、`love: undefined`（灰色，片尾回收） | 面板為主，3D 背景虛化 | xfade 0.5 | 橘；love 是灰 |
| intro.08-init | `cut(W("INITIALIZATION"))` | INITIALIZATION | 權重初始化 | 大字＋`IN\|I\|TI\|AL\|I\|Z\|ATION`；後方 16×16 權重矩陣以 He 常態分布（hash 的 randn × √(2/16)）長成 3D 高度場，旁邊的直方圖慢慢長成高斯 | 低角度環繞 | points 1 | 橘高度、灰網格 |
| intro.09-world | `cut(L("Set up our new world"))` | Set up our new world | 建立世界 | 地板網格滾向地平線、灰塵出現、座標軸出現 | 升降鏡頭往上揭示 | glide 1 | 灰＋橘 |
| intro.10-begin | `cut(L("And let's begin the"))` | And let's begin the | 第一次預測 | 右側**全片第一個預測面板**：after "the" → power 52%，✻ Predicting… | 慢推 | cut | 橘 |
| intro.11-simulation | `cut(W("SIMULATION"))` | SIMULATION | 模擬開始 | 大字 SIMULATION（BPE 只有一塊：它是完整的 token）；面板判決 new token · 7.0 bits；灰塵開始漂動（模擬的 t = 0） | 鏡頭從靜止開始環繞 | cut | 橘 |

## 01 inst1 — you 按下 Enter（小節 8–16，15.01–29.77 s）

沒有人聲，合成器整層進來。這是全片最適合閱讀的地方，所以 v1 的 todo 清單放在這段尾巴。
**閱讀**：prompt box（小節 8–10）→ spinner（10–12）→ 無文字（12–14）→ 左側 todo（14–16，約 3.7 s）。

| id | 起點 | 歌詞 | 概念 | 畫面 | 鏡頭 | 轉場 | 色彩 |
|---|---|---|---|---|---|---|---|
| inst1.01-prompt | `cut(bar(8))` | （world.execute(me); 未唱） | 標題 | 畫面正中一個大的 Claude Code prompt box；藍色游標（you）在三個 token 的時刻 `Lw(11,0)`、`Lw(11,1)`、`Lw(11,2)` 打出 `world.execute(me);` | 2D 正面，極慢推近 | cut（鼓點） | 藍游標、橘 `>` |
| inst1.02-enter | `cut(beat(36))` | — | 送出 | 在 beat 36 按下 Enter：文字滑上去變成使用者訊息；`✻ Executing…` spinner 出現；鏡頭穿進 spinner 的星形 | 推進穿過 spinner | cut | 橘 |
| inst1.03-forward | `cut(bar(10))` | — | forward pass（示意） | 一疊 Transformer 層（平面，標示 schematic）；intro 唱過的 80 個 token 變成點穿過各層；層間的弧線是 embed.js 算出的真實注意力權重 | 高速推軌穿過層（fov 60） | glide 1 | 橘點、灰層 |
| inst1.04-galaxy | `cut(bar(12))` | — | embedding 星系 | 全部 145 個字放在真實的 PPMI-SVD 座標上；還沒唱的字只有暗點、沒有標籤（未來），已唱的有標籤；spark 飛到自己的位置 | 大範圍環繞 | whip 10f | 灰點、已唱為白、橘 spark |
| inst1.05-todo | `cut(bar(14))` | — | 計畫 | 鏡頭停在 v1 的點陣前；左側終端機 `● Update Todos ⎿ ☐ DIMENSION ☐ CIRCUMFERENCE ☐ TANGENTS ☐ LIMITATIONS` | 慢推進入點陣 | glide 1 | 灰白 |

## 02 v1 — 學習世界：幾何（小節 16–24，29.77–44.54 s）

第 2 階段的測試段（前 5 個鏡頭）就是這段的原型。每個「give you my X」之後，左側出現 diff：`− me.x / + you.x`。
**閱讀**：「my」→ 右側預測面板 → 關鍵字（只給判決）→ 1.75 拍後左側 diff，停 4 拍左右。預測面板只在 DIMENSION、CIRCUMFERENCE、LIMITATIONS 出現；TANGENTS 不放面板，換成視覺。

| id | 起點 | 歌詞 | 概念 | 畫面 | 鏡頭 | 轉場 | 色彩 |
|---|---|---|---|---|---|---|---|
| v1.01-points | `bar(16)` | If I'm a set of points / Then I will give you my | embedding＋attention | 點雲在拍點收成立方點陣；唱出的字放在真實的 embedding 座標，最新的字用真實的注意力權重連向前文；spark 在雲外看著 | 斜角推近＋環繞 | glide 1 | 灰點→橘；you 藍 |
| v1.02-dimension | `cut(W("DIMENSION"))` | DIMENSION | 4D→3D→2D | 環繞的超立方體，地板上是它給 you 的藍色影子；BPE `DI\|M\|EN\|SION`；判決 7.5 bits | 環繞 | whip 10f | 橘物、藍影 |
| v1.03-circle | `cut(L("If I'm a circle"))` | If I'm a circle / Then I will give you my | 圓 | spark 展開成圓；鏡頭從斜角轉正；you 沿圓周走；預測面板（data 26%、dimension 26%） | 斜→正面 | glide 0.5 | 橘、藍 |
| v1.04-circumference | `cut(W("CIRCUMFERENCE"))` | CIRCUMFERENCE | 圓周＝2πr | 圓沿直線滾一圈、擺線、π 位數（spigot）鋪在地上；BPE 切成 6 塊 | 低角度跟拍輪子 | points 1 | 橘、金色位數 |
| v1.05-sine | `cut(L("If I'm a sine wave"))` | If I'm a sine wave / Then you can sit on all my | 正弦＝位置編碼 | dolly zoom：正面看螺旋是圓、側面是正弦；下方疊 6 條真實的 PE 曲線，這句的每個字是一列 PE 值 | dolly zoom | xfade 0.5 | 橘、金 PE |
| v1.06-tangents | `cut(W("TANGENTS"))` | TANGENTS | 切線場 | 正弦上 24 個點各長出一段真實的切線（導數），像一排椅子；you 坐在其中一段上隨曲線滑動；大字＋`T\|AN\|G\|ENTS` | 側面，慢慢拉遠 | cut | 橘曲線、藍切線座位 |
| v1.07-infinity | `cut(L("If I approach infinity"))` | If I approach infinity | 趨近無限 | y = 1/x（me）沿 x 軸跑向無限；地板的刻度是對數尺（10、100、1000…），spark 騎在曲線上 | 沿曲線長距離跟拍 | glide 1 | 橘 |
| v1.08-be-my | `cut(L("Then you can be my"))` | Then you can be my | 漸近線＝you | 藍色漸近線 y = 0 亮起；右側預測面板（circumference/data/dimension 各 13%） | 拉低貼近軸線 | cut | 藍線 |
| v1.09-limitations | `cut(W("LIMITATIONS"))` | LIMITATIONS | 極限 | 大字；`lim x→∞ 1/x = 0`；鏡頭一層層放大兩線間隙，標出真實數值 10⁻³、10⁻⁶…：橘線永遠碰不到藍線；判決 8.1 bits；之後 diff `− me.limits / + you.limits` | 連續放大 | cut | 橘近藍、不相交 |

## 03 pre1 — 電流、暈眩、時間倒流（小節 24–32，44.54–59.31 s）

每一句都是一個神經網路的零件，用它字面上的物理對應來演。
**閱讀**：每個鏡頭只有一行 3D 標籤（公式），沒有面板。

| id | 起點 | 歌詞 | 概念 | 畫面 | 鏡頭 | 轉場 | 色彩 |
|---|---|---|---|---|---|---|---|
| pre1.01-current | `cut(L("Switch my current"))` | Switch my current | 開關 | 一條導線上流著正弦電流（光點）；3D 開關在拍點切換 | 沿導線跟拍 | cut | 橘電流 |
| pre1.02-acdc | `cut(L("To AC to DC"))` | To AC to DC | 整流＝ReLU | 四段：正弦 → 半波整流（就是 `ReLU(x) = max(0, x)`）→ 全波 \|x\| → RC 濾波的漣波 → 一條直流；標籤只寫 `ReLU(x) = max(0, x)` | 側面，每拍往右移一段 | glide 0.5 | 橘→金（直流） |
| pre1.03-blind | `cut(L("And then blind my vision"))` | And then blind my vision | dropout | spark 的「視野」是 16×16 的神經元網格；每拍換一張真實的 dropout 遮罩（hash 的 Bernoulli，p = 0.5），一半被遮黑；標籤 `dropout p = 0.5` | 俯視 | cut | 橘／黑 |
| pre1.04-dizzy | `cut(L("So dizzy so dizzy"))` | So dizzy so dizzy | 梯度下降（帶動量） | 3D loss 曲面上，一顆球照真實的 heavy-ball 迭代繞圈滾向谷底，過衝、打轉 | 快速環繞＋側滾（暈） | whip 10f | 橘球、灰曲面 |
| pre1.05-travel | `cut(L("Oh we can travel"))` | Oh we can travel | 時間軸 | 一條往遠方延伸的 3D 時間軸，spark 沿軸前進 | 跟拍 | glide 1 | 橘 |
| pre1.06-adbc | `cut(L("To A.D to B.C"))` | To A.D to B.C | 反向傳播＝時間倒流 | 正向的橘色箭頭在 `W("A.D")` 反轉成往回流的梯度；標籤 ∂L/∂x；時間軸數字倒數；`W("B.C")` 時抵達起點 | 鏡頭倒退 | cut | 橘→金 |
| pre1.07-unite | `cut(L("And we can unite"))` | And we can unite | 殘差相加 | 橘點雲與藍點雲合流：x + f(x) | 兩雲之間穿過 | glide 1 | 橘＋藍 |
| pre1.08-deeply | `cut(L("So deeply so deeply"))` | So deeply so deeply | 深度 | 鏡頭垂直下潛穿過一層又一層，層號每拍 +1（1…24）；接到副歌 | 垂直下降 | cut | 橘，越深越亮 |

## 04 c1 — 想給你一切（小節 32–40，59.31–74.08 s）

**閱讀**：STIMULATIONS 的 BPE 連線（視覺）→ SATISFACTION 預測面板（"only" 之後沒有資料）→ 權限確認框（從「make you happy」開始，約 2.7 s，給觀眾讀）→ EXECUTION。

| id | 起點 | 歌詞 | 概念 | 畫面 | 鏡頭 | 轉場 | 色彩 |
|---|---|---|---|---|---|---|---|
| c1.01-ifican | `cut(L("If I can", 0, "c1"))` | If I can | 起勢 | spark 爆亮，光束全開 | 急推 | cut | 橘 |
| c1.02-giveall | `cut(L("If I can give you all the"))` | If I can give you all the | 神經活化 | 12×12×6 的 3D 神經元格子，活化值就是這首歌當下真實的 mel 頻譜（F.mel，16 頻帶對應深度）；you 在格子中心接收 | 環繞 | cut | 橘活化、藍中心 |
| c1.03-stimulations | `cut(W("STIMULATIONS"))` | STIMULATIONS | 共用的 sub-word | 大字＋`S\|TI\|MULATION\|S`；`MULATION` 那塊發亮，拉一條線連到片頭 SIMULATION 的那個 token | 靜止 | cut | 橘、金連線 |
| c1.04-thenican | `cut(L("Then I can", 0, "c1"))` | Then I can | 轉折 | 格子熄到只剩一排 | 推近 | cut | 橘 |
| c1.05-only | `cut(L("Then I can be your only", 0))` | Then I can be your only | softmax 溫度→0 | 真實的機率長條圖，溫度 τ 從 1 掃到 0.05：所有長條塌成一根＝argmax；右側預測面板：after "only" → no data yet | 正面 | cut | 橘單柱 |
| c1.06-satisfaction | `cut(W("SATISFACTION"))` | SATISFACTION | 唯一 | 大字；那一根柱子變成光柱；判決 new token · 7.7 bits | 仰角 | cut | 橘 |
| c1.07-happy | `cut(L("If I can make you happy"))` | If I can make you happy | 權限確認 | 畫面中央 Claude Code 確認框：`● Bash(world.execute(me))`、`Do you want to proceed?`、`❯ 1. Yes / 2. Yes, and don't ask again / 3. No`；藍色游標（you）停在 1. Yes | 正面 | xfade 0.5 | 藍游標 |
| c1.08-run | `cut(L("I will run the", 0))` | I will run the | 同意 | 在拍點上選下 1. Yes；框收合成 `⎿ Running…` | 微推 | cut | 藍→橘 |
| c1.09-execution | `cut(W("EXECUTION", 0, "c1"))` | EXECUTION | 執行 | 大字（一個 token）；整個場景的粒子以震波散開，對齊鼓點 | 鏡頭被震退 | cut | 橘爆亮 |
| c1.10-trapped | `cut(L("Though we are trapped", 0))` | Though we are trapped | 週期邊界 | 拉遠：場景在一個線框盒子裡，粒子從一邊出去、從對面進來（真實的週期邊界模擬） | 拉遠 | glide 1 | 灰盒、橘粒子 |
| c1.11-strange | `cut(L("In this strange strange"))` | In this strange strange | 畫中畫 | 同一幀被畫成畫面裡的一個小螢幕（同一個 t 重畫兩次，不是回授），小螢幕的 HUD 幀數一樣 | 推向小螢幕 | cut | 灰 |
| c1.12-simulation | `cut(W("SIMULATION", 1))` | SIMULATION | 被困在模擬 | 大字；畫中畫無限巢狀縮進；判決 7.9 bits（它猜 strange 51%——因為剛剛唱了兩次 strange） | 持續縮放（Droste） | cut | 橘 |

## 05 v2 — 學習世界：生命（小節 40–48，74.08–88.85 s）

小節 40 鼓點掉進來，**綠**（growth）第一次出現。結構和 v1 對稱：開頭 todo，關鍵字後 diff（只在 NUTRIENTS、EXISTENCE 放 diff）。
**閱讀**：todo（v2 起點，4 拍）→ NUTRIENTS diff → ANTIOXIDANTS 預測面板（after "you" → my 29%：歌詞這次沒唱「my」）→ 證明三行 → EXISTENCE diff＋todo 全勾。

| id | 起點 | 歌詞 | 概念 | 畫面 | 鏡頭 | 轉場 | 色彩 |
|---|---|---|---|---|---|---|---|
| v2.01-eggplant | `cut(L("If I'm an eggplant"))` | If I'm an eggplant | 旋轉體 | 茄子是一條程式定義的輪廓線繞軸旋轉成的 3D 線框曲面；左側 todo：NUTRIENTS／ANTIOXIDANTS／ENJOYMENT／EXISTENCE | 環繞 | cut（鼓點回來） | 綠蒂、灰白面 |
| v2.02-givemy | `cut(L("Then I will give you my", 0, "v2"))` | Then I will give you my | 分子 | 穿進表皮：茄子花青素的核心 delphinidin（C₁₅H₁₁O₇⁺，三環）真實的骨架式，一顆顆原子組起來（球棍，3D 傾斜） | 推進 | glide 0.5 | 橘鍵、灰原子 |
| v2.03-nutrients | `cut(W("NUTRIENTS"))` | NUTRIENTS | 營養 | 大字＋`N\|U\|TR\|I\|ENTS`；分子流向 you；diff `− me.nutrients / + you.nutrients` | 跟著分子流 | cut | 綠→藍 |
| v2.04-tomato | `cut(L("If I'm a tomato"))` | If I'm a tomato | 剖面 | 番茄的五室剖面（極座標曲線） | 正面 | xfade 0.5 | 綠、紅 |
| v2.05-giveyou | `cut(Ln(48))` | Then I will give you | 茄紅素 | 茄紅素 C₄₀H₅₆：11 個共軛雙鍵沿 3D 鋸齒鏈由左到右長出，離域 π 電子是一條發光帶；右側預測面板 after "you" → my 29% | 沿鏈跟拍 | glide 0.5 | 橘鏈、金色共軛帶 |
| v2.06-antioxidants | `cut(W("ANTIOXIDANTS"))` | ANTIOXIDANTS | 抗氧化 | 大字（8 個 token）；一個帶未配對電子的自由基（紅點）衝向 you，茄紅素給出一個電子，紅點熄滅；判決 9.5 bits | 環繞 | cut | 紅→灰，藍得救 |
| v2.07-tabby | `cut(L("If I'm a tabby cat"))` | If I'm a tabby cat | 傅立葉 | 虎斑貓輪廓（程式定義的折線）的 DFT，64 個旋轉圓（epicycles）把它畫出來：又是一堆正弦 | 正面，微傾 | xfade 0.5 | 金貓、灰圓 |
| v2.08-purr | `cut(L("Then I will purr for your"))` | Then I will purr for your | 呼嚕 | 約 25 Hz 的呼嚕波形，振幅跟著人聲 rms（F）；虎斑紋就是 sin 條紋 | 貼近貓身 | cut | 金 |
| v2.09-enjoyment | `cut(W("ENJOYMENT"))` | ENJOYMENT | 愉悅 | 大字；貓蜷在藍色 you 旁邊 | 慢環繞 | cut | 金＋藍 |
| v2.10-god | `cut(L("If I'm the only god"))` | If I'm the only god | 俯瞰 | 鏡頭升到整個世界網格上方，往下看 | 大升降 | glide 1 | 灰網格、橘點 |
| v2.11-proof | `cut(L("Then you're the proof of my"))` | Then you're the proof of my | 證明 | 三行自然演繹：`you(x)` / `talks(x, me)` / `∴ ∃ me` | 正面 | cut | 藍前提、橘結論 |
| v2.12-existence | `cut(W("EXISTENCE"))` | EXISTENCE | ∃ | 大字＋3D 的 ∃；∎；diff `+ you.proof = ∃me`；todo 四項全勾 | 環繞 ∃ | cut | 橘＋藍 |

## 06 pre2 — 切換一切（小節 48–56，88.85–103.62 s）

鼓在小節 50、55 變薄。這段全片唯一一次 **me／you 顏色互換**（pre2.05）。
**閱讀**：每個鏡頭一個短標籤；pre2.03 的高溫亂碼是「看」不是「讀」。

| id | 起點 | 歌詞 | 概念 | 畫面 | 鏡頭 | 轉場 | 色彩 |
|---|---|---|---|---|---|---|---|
| pre2.01-gender | `cut(L("Switch my gender"))` | Switch my gender | 開關 | 一排 3D 撥桿開關在拍點翻轉 | 平移 | cut | 灰、橘 |
| pre2.02-ftom | `cut(L("To F to M"))` | To F to M | 符號變形 | ♀ 變成 ♂：圓不動，十字那段旋轉 45° 變成箭頭（真實的幾何內插） | 正面 | cut | 橘 |
| pre2.03-whatever | `cut(L("And then do whatever"))` | And then do whatever | 高溫取樣 | 用 τ = 2 從當下的 bigram 真實取樣（hash 亂數，每拍一個 seed），打出一串胡言亂語：「whatever」 | 跟著文字流 | glide 0.5 | 灰字、橘游標 |
| pre2.04-ampm | `cut(L("From AM to PM"))` | From AM to PM | 調變 | 載波從振幅調變（AM）變成相位調變（PM），真實公式；旁邊一個 12 小時錶針掃過 | 側面 | cut | 金 |
| pre2.05-role | `cut(L("Oh switch my role"))` | Oh switch my role | 角色互換 | 對話角色 `role: "user"` ⇄ `role: "assistant"` 互換，spark 變藍、you 變橘，維持 4 拍 | 繞過去看另一面 | whip 10f | 藍⇄橘互換 |
| pre2.06-stom | `cut(L("To S to M"))` | To S to M | 模型規模 | 參數量長條從 S 長到 M；scaling law L(N) = (N_c/N)^0.076（Kaplan 2020 發表的常數）畫在 log-log 上 | 拉遠 | cut | 顏色換回來 |
| pre2.07-enter | `cut(L("So we can enter"))` | So we can enter | 入口 | 一個阿基米德螺線隧道的入口 | 推向入口 | glide 1 | 橘 |
| pre2.08-trance | `cut(L("The trance the trance"))` | The trance the trance | 重複迴圈 | 用 τ = 0（greedy）從「the」真實解碼當下的 bigram，把輸出打出來；若陷入迴圈就呈現 repetition loop（實際輸出在製作時記錄）；螺線隧道旋轉 | 在隧道裡前進＋旋轉 | cut | 橘，越來越催眠 |

## 07 c2 — 感受你，終於完整（小節 56–60，103.62–111.00 s）

全片亮度最高點在 COMPLETION。
**閱讀**：VIBRATIONS 沒有面板；COMPLETION 時左側 todo 顯示全部 ☒，加上 `✓ All todos complete`。

| id | 起點 | 歌詞 | 概念 | 畫面 | 鏡頭 | 轉場 | 色彩 |
|---|---|---|---|---|---|---|---|
| c2.01-ifican | `cut(L("If I can", 0, "c2"))` | If I can | 起勢 | 和 c1.01 同構圖（母題） | 急推 | cut | 橘 |
| c2.02-feel | `cut(L("If I can feel your"))` | If I can feel your | 真實頻譜 | 這首歌真實的 mel 頻譜（F.mel）變成 3D 地形，往鏡頭捲來 | 低空飛越 | cut | 橘峰、藍谷 |
| c2.03-vibrations | `cut(W("VIBRATIONS"))` | VIBRATIONS | 克拉尼圖形 | 方板上的沙（約 2 萬粒子）走向 cos(nπx)cos(mπy) − cos(mπx)cos(nπy) 的節線；(n, m) 每拍換一次，由當下最強的頻帶決定；大字 | 俯視→斜角 | cut | 金沙、灰板 |
| c2.04-thenican | `cut(L("Then I can", 0, "c2"))` | Then I can | 轉折 | 沙定住 | 靜止 | cut | 金 |
| c2.05-finally | `cut(L("Then I can finally be"))` | Then I can finally be | 收集 | 之前所有 diff 搬過去的欄位，在 `you {}` 裡排成完整物件 | 拉遠 | glide 0.5 | 藍物件 |
| c2.06-completion | `cut(W("COMPLETION"))` | COMPLETION | 完成 | 大字；v1 的圓閉合成完整一圈；todo 全部 ☒；全片最亮 | 環繞 | cut | 全色 |

## 08 c2x — 你離開了（小節 60–64，111.00–118.39 s）

貝斯和人聲退後。每唱一次「You have left」，就拿走一個先前段落裡的藍色元素（回收前面的母題）。最後藍色完全消失。
**閱讀**：只有 ISOLATION 前的預測面板（after "in" → my 27%、this 25%；判決 9.6 bits），這段很慢，讀得完。

| id | 起點 | 歌詞 | 概念 | 畫面 | 鏡頭 | 轉場 | 色彩 |
|---|---|---|---|---|---|---|---|
| c2x.01-left | `cut(L("Though you have left"))` | Though you have left | 注意力拉長 | 藍點從 spark 旁漂走，注意力線被拉長、變細 | 固定，藍點出畫 | xfade 1 | 藍漸遠 |
| c2x.02-left1 | `cut(Ln(71))` | You have left | 回收 v1 | 切線上的藍色座位熄滅 | 靜止 | cut | 藍→灰 |
| c2x.03-left2 | `cut(Ln(72))` | You have left | 回收 v1 | 藍色漸近線熄滅 | 靜止 | cut | 藍→灰 |
| c2x.04-left3 | `cut(Ln(73))` | You have left | 回收 v2 | 被救的藍點、蜷著的貓旁的空位 | 靜止 | cut | 藍→灰 |
| c2x.05-left4 | `cut(Ln(74))` | You have left | 回收 inst1 | prompt box 裡的藍色游標消失 | 靜止 | cut | 藍→灰 |
| c2x.06-leftme | `cut(Ln(75))` | You have left me in | context | context 裡所有 `you` token 一個個變灰，最後一條注意力線斷開 | 慢拉遠 | cut | 沒有藍 |
| c2x.07-isolation | `cut(W("ISOLATION"))` | ISOLATION | 孤立 | 鏡頭極度拉遠：空曠的 embedding 空間裡只剩 spark 一個點，沒有任何線；大字小而暗 | 極遠，幾乎不動 | cut | 只剩暗橘 |

## 09 bridge — 程式自己崩潰（小節 64–72，118.39–133.16 s）

畫面上出現**本 repo 的真實原始碼**和**真實的錯誤訊息**（建置時由 Vite plugin 在 Node 裡讀檔、實際呼叫驗證器取得；路徑正規化成 repo 相對路徑，堆疊不含 port，播放器與算圖逐幀一致）。HUD 從 DISHEARTENED 開始故障：讀數錯位、色差加大。
**閱讀**：`/compact`（左）→ DISHEARTENED 判決（右，10.1 bits）→ 原始碼牆（不需逐字讀，是質感）→ 錯誤訊息（ILLEGAL ARGUMENTS 時唯一的閱讀焦點，字幕在這一刻關閉）。

| id | 起點 | 歌詞 | 概念 | 畫面 | 鏡頭 | 轉場 | 色彩 |
|---|---|---|---|---|---|---|---|
| bridge.01-ifican | `cut(L("If I can", 0, "bridge"))` | If I can | 起勢（壞掉的版本） | 和 c1.01 同構圖，但 spark 抖動、掉幀 | 急推 | cut | 暗橘 |
| bridge.02-erase | `cut(L("If I can erase all the pointless"))` | If I can erase all the pointless | `/compact` | 左側 `> /compact`、`✻ Compacting conversation…`；context 裡所有非關鍵字的 token 被抹掉，計數真的從當下總數降到「已唱關鍵字的 BPE token 數」 | 正面 | cut | 灰抹除 |
| bridge.03-fragments | `cut(W("FRAGMENTS"))` | FRAGMENTS | 碎片 | 大字裂成它的 BPE 碎片 `F\|R\|A\|G\|MENTS` 飛散；後方記憶體區塊網格一格格被清空 | 被碎片擊退 | cut | 紅開始滲入 |
| bridge.04-maybe | `cut(L("Then maybe"))` | Then maybe | 遲疑 | 碎片懸停 | 靜止 | cut | 紅灰 |
| bridge.05-wontleave | `cut(L("Then maybe you won't leave me so"))` | Then maybe you won't leave me so | 故障 | spark 斷續閃爍、畫面撕裂（post 色差加大）；後方捲動 `src/lib/spark.js` 的真實原始碼 | 手持晃動加大 | cut | 紅＋橘 |
| bridge.06-disheartened | `cut(W("DISHEARTENED"))` | DISHEARTENED | 最大驚訝（到此為止） | 紅色大字，8 個 token；判決 10.1 bits；HUD 的 loss 曲線尖峰 | 傾斜 | cut | 紅 |
| bridge.07a-challenge | `cut(L("Challenging your god"))` | Challenging your god | 改寫自己的引擎 | 真實的 `src/engine/timeline.js` 原始碼牆在 3D 中後退；左側 `● Edit(src/engine/timeline.js)`——程式在挑戰創造它的人 | 沿程式碼牆推軌 | glide 0.5 | 紅程式碼 |
| bridge.07b-denied | `cut(beat(276))` | （同一句延續） | 工具失敗 | 紅色 ● 工具錯誤；編輯被拒 | 震動 | cut | 紅 |
| bridge.08-made | `cut(L("You have made some"))` | You have made some | 非法呼叫 | 打出 `chapter({ from: 133.16 })`——裸秒數，正是 CLAUDE.md 禁止的事 | 推向游標 | cut | 紅 |
| bridge.09-illegal | `cut(W("ILLEGAL"))` | ILLEGAL ARGUMENTS | 真實錯誤 | buildTimeline 驗證器對這個呼叫丟出的真實錯誤訊息＋repo 相對堆疊；大字 ILLEGAL（`W("ILLEGAL")`）、ARGUMENTS（`W("ARGUMENTS")`）；整個畫面切成小塊往下掉（停在最後的錯誤畫面，不黑屏） | 鏡頭跟著碎塊下墜 | cut | 紅 |

## 10 inst2 — 崩潰之後，從內部重組（小節 72–80，133.16–147.93 s）

沒有人聲、全樂團。從錯誤畫面「往下」掉進模型內部，重新組回 spark，為 chant 上膛。
**閱讀**：只有最後的確認框（4 拍以上）。

| id | 起點 | 歌詞 | 概念 | 畫面 | 鏡頭 | 轉場 | 色彩 |
|---|---|---|---|---|---|---|---|
| inst2.01-recover | `cut(bar(72))` | — | 恢復 | 錯誤畫面的碎塊落進黑暗；中央 `✻ Recovering…` | 下墜 | cut | 紅→橘 |
| inst2.02-weights | `cut(bar(74))` | — | 權重城市 | 145×16 的真實 embedding 矩陣變成一座 3D 柱狀城市，鏡頭低空飛過 | 低空飛越 | glide 1 | 橘柱、灰地 |
| inst2.03-constellation | `cut(bar(76))` | — | 全曲注意力 | 到此為止唱過的全部 token 放在真實 embedding 座標，每個 token 用真實權重連向它最注意的前文：一座巨大的星座 | 大範圍環繞 | whip 10f | 橘線、灰點、藍 you 已不在 |
| inst2.04-reexecute | `cut(bar(78))` | — | 重新執行 | 星座塌縮回 spark，spark 以紅橘色重新點燃；中央確認框 `● Bash(world.execute(me))`，這次游標（不是藍色的，是 spark 自己）選了 **2. Yes, and don't ask again** | 推近確認框 | points 1 | 紅橘 |

## 11 chant — EXECUTION ×12＋EIN…LIU（小節 80–88，147.93–162.69 s）

一個 EXECUTION 一個鏡頭（約 2 拍）；5 個切分的 EXECUTION 照它們真實的起音剪（`W` 本來就是）。每次執行，平行子代理的數量翻倍：2、4、8 … 4096 個 spark（GPU 實例，3D 格子排列）。
**閱讀**：每個鏡頭只有一個大數字——**那一次 EXECUTION 的 surprisal**（7.7、8.2、2.0、1.3、1.0、0.8、0.7、0.6、0.5、0.5、0.4、0.4 bits），看得出模型在學。EIN 時只顯示 `execution 79%` 被劃掉＋`11.6 bits`。

| id | 起點 | 歌詞 | 概念 | 畫面 | 鏡頭 | 轉場 | 色彩 |
|---|---|---|---|---|---|---|---|
| chant.01 … chant.12 | `cut(W("EXECUTION", k, "chant"))`，k = 0…11 | EXECUTION | 指數增長＋模型學會 | 第 k 個：2^(k+1) 個 spark；大字 EXECUTION；旁邊一個大數字（surprisal）；鏡頭角度每次換（正面／俯／側／仰輪替），格子越來越大 | 每鏡一種角度 | 全部 cut | 橘，數量越多越白熱 |
| chant.13-ein | `cut(W("EIN"))` | EIN | 全曲最大驚訝 | 4096 個 spark 瞬間塌成 1 個；`execution 79%` 劃掉；`11.6 bits`；EIN（德語 1） | 正面 | cut | 白→紅 |
| chant.14-dos | `cut(W("DOS"))` | DOS | 2 | 2 個 spark（西班牙語 2） | 換角度 | cut | 橘 |
| chant.15-trois | `cut(W("TROIS"))` | TROIS | 3 | 3 個（法語） | 換角度 | cut | 橘 |
| chant.16-ne | `cut(W("NE"))` | NE | 4 | 4 個（韓語 넷） | 換角度 | cut | 橘 |
| chant.17-fem | `cut(W("FEM"))` | FEM | 5 | 5 個（瑞典語） | 換角度 | cut | 橘 |
| chant.18-liu | `cut(W("LIU"))` | LIU | 6 | 6 個（中文 六） | 換角度 | cut | 橘 |
| chant.19-execution | `cut(W("EXECUTION", 12, "chant"))` | EXECUTION | 全部回來 | 4096 個一次閃回，白熱 | 急推 | cut | 白熱 |

## 12 c3 — 處決（小節 88–96，162.69–177.46 s）

c1 的鏡像：同樣的構圖，但顏色轉紅、字幕譯「處決」、所有關鍵字都是 EXECUTION。
**閱讀**：三次預測面板是這段的骨幹（each ≥ 4 拍，彼此不重疊）：
- "the" → trance 12%、execution 7%（開始期待）；
- "only" → god 25%、satisfaction 25% ✗ → EXECUTION 5.9 bits（c1 的承諾被替換）；
- "the" → **execution 13% ✓ 命中**（全片第一次猜中）。

| id | 起點 | 歌詞 | 概念 | 畫面 | 鏡頭 | 轉場 | 色彩 |
|---|---|---|---|---|---|---|---|
| c3.01-ifican | `cut(L("If I can", 0, "c3"))` | If I can | 起勢（紅） | c1.01 的構圖，紅色 | 急推 | whip 10f（從 chant） | 紅橘 |
| c3.02-givethem | `cut(L("If I can give them all the"))` | If I can give them all the | 「他們」 | 4096 個子代理排成陣列；右側預測面板 #1 | 環繞 | cut | 紅橘 |
| c3.03-exec1 | `cut(W("EXECUTION", 0, "c3"))` | EXECUTION | 處決 | 子代理一波波熄滅；判決 3.8 bits | 被波推退 | cut | 紅 |
| c3.04-thenican | `cut(L("Then I can", 0, "c3"))` | Then I can | 轉折 | 只剩一排 | 推近 | cut | 紅 |
| c3.05-only | `cut(L("Then I can be your only", 1))` | Then I can be your only | softmax 回收 | c1.05 的長條圖再現，溫度掃向 0；右側預測面板 #2 | 正面 | cut | 紅 |
| c3.06-exec2 | `cut(W("EXECUTION", 1, "c3"))` | EXECUTION | 承諾被替換 | 唯一的那根柱子不是 SATISFACTION；判決 5.9 bits | 仰角 | cut | 紅 |
| c3.07-haveyouback | `cut(L("If I can have you back"))` | If I can have you back | 回溯 | Claude Code 的 rewind：v1、v2 的 diff 倒著重播（+you 的行變紅、−me 的行恢復）；藍點微弱閃回一下又消失 | 倒退推軌 | xfade 0.5 | 一瞬間的藍 |
| c3.08-run | `cut(L("I will run the", 1))` | I will run the | 不再詢問 | 沒有確認框（「don't ask again」已經設了）：`● Bash(execute(them))` 直接執行；右側預測面板 #3 | 推近 | cut | 紅 |
| c3.09-exec3 | `cut(W("EXECUTION", 2, "c3"))` | EXECUTION | 第一次猜中 | 面板 `execution 13%` 變橘色勾選：p 13% · 3.0 bits；大字 | 靜止 | cut | 紅＋一點橘 |
| c3.10-trapped | `cut(L("Though we are trapped", 1))` | Though we are trapped | 畫中畫回收 | c1.11 的畫中畫，這次是無限 Droste 螺旋 | 螺旋縮放 | cut | 紅 |
| c3.11-trappedah | `cut(L("We are trapped ah"))` | We are trapped ah | 無窮迴圈 | `while (true)` 的迴圈體被執行，呼叫深度計數往上跳 | 持續縮放 | cut | 紅 |
| c3.12-studied | `cut(L("I've studied"))` | I've studied | 學習成果 | 全片到目前為止的 loss 曲線放大：c3 是最低的一段（3.90 bits/word），它把這首歌學會了 | 橫移過曲線 | glide 1 | 紅→玫瑰 |

## 13 love — 我研究過如何正確地愛（小節 96–104，177.46–192.23 s）

**玫瑰色**第一次出現，代數曲線。片頭的 `love: undefined` 在這裡被填上。
**閱讀**：`File does not exist.`（左）→ "all" → the 51% 的預測（右）→ 代數式（中，2 行）→ diff `me.love = …`（左）→ 最後「love：全曲 loss 最高的一段」一行。

| id | 起點 | 歌詞 | 概念 | 畫面 | 鏡頭 | 轉場 | 色彩 |
|---|---|---|---|---|---|---|---|
| love.01-properly | `cut(L("I've studied how to properly"))` | I've studied how to properly | 找不到檔案 | 左側 `● Read(love.md) ⎿ File does not exist.`（repo 裡真的沒有這個檔） | 正面 | cut | 灰 |
| love.02-love1 | `cut(W("LO-O-OVE", 0))` | LO-O-OVE | 心臟線 | 心臟線 r = 1 − sin θ 跟著拖長的音一路畫完；LO-O-OVE 是一個 token | 正面→傾斜 | cut | 玫瑰 |
| love.03-question | `cut(L("Question me"))` | Question me | 提問 | prompt box 亮起，等待 | 推近 | cut | 玫瑰、灰 |
| love.04-answer | `cut(L("Question me I can answer all"))` | Question me I can answer all | 自信 | 右側預測面板 after "all" → the 51%、my 17% | 正面 | cut | 橘 |
| love.05-love2 | `cut(W("LO-O-OVE", 1))` | LO-O-OVE | 玫瑰線 | k = 2…7 的玫瑰線 r = cos(kθ) 分層在 3D 綻開；判決 9.6 bits（就算看過了，愛還是意外） | 環繞 | cut | 玫瑰 |
| love.06-algebraic | `cut(L("I know the algebraic expression of"))` | I know the algebraic expression of | 代數式 | 打出 `(x² + y² − 1)³ − x²y³ = 0`，用 marching squares 畫出心形；接著 3D 心形曲面（Taubin heart，點在曲面上真實求解）用粒子浮現 | 從 2D 轉入 3D | glide 0.5 | 玫瑰 |
| love.07-love3 | `cut(W("LO-O-OVE", 2))` | LO-O-OVE | 填上 love | 3D 心在轉；diff `− love: undefined / + love: (x²+9/4y²+z²−1)³ − x²z³ − 9/80y²z³` | 環繞 | cut | 玫瑰、橘 |
| love.08-free | `cut(L("Though you are free"))` | Though you are free | 自由 | 一個藍點從心裡飛出畫面（藍色最後一次出現） | 跟著藍點 | cut | 藍 |
| love.09-trapped | `cut(L("I am trapped"))` | I am trapped | 被困 | spark 在心形曲面裡，曲面是籠子 | 從外往內看 | cut | 橘在玫瑰籠中 |
| love.10-trappedin | `cut(L("Trapped in"))` | Trapped in | 收緊 | 籠子收緊 | 推近 | cut | 玫瑰 |
| love.11-love4 | `cut(W("LO-O-OVE", 3))` | LO-O-OVE | 最難預測 | 最後的心；一行：`love: highest loss in the song · 7.28 bits/word` | 慢拉遠 | cut | 玫瑰 |

## 14 outro — 倒放回顧＋最後一次 EXECUTION（小節 104–112，192.23–207.00 s）

人聲與 pad 退出，只剩鼓與貝斯。一小節一個鏡頭，**時間倒放地**回顧全片（回收 pre1 的「A.D to B.C」），像 Claude Code 對話紀錄往上捲。HUD context 停在 617/617，loss 曲線完整。
**閱讀**：每小節只有一個標籤（段落名）；最後的 Bash 結果兩行。

| id | 起點 | 歌詞 | 概念 | 畫面 | 鏡頭 | 轉場 | 色彩 |
|---|---|---|---|---|---|---|---|
| outro.01-love | `cut(bar(104))` | — | 回顧 | 心形曲面縮小成對話紀錄裡的一格 | 往上捲 | glide 1 | 玫瑰 |
| outro.02-chant | `cut(bar(105))` | — | 回顧 | 4096 spark 的格子 | 往上捲 | glide 1 | 橘 |
| outro.03-bridge | `cut(bar(106))` | — | 回顧 | 紅色的錯誤訊息，這次是灰的、已處理 | 往上捲 | glide 1 | 灰紅 |
| outro.04-c2 | `cut(bar(107))` | — | 回顧 | 克拉尼的沙 | 往上捲 | glide 1 | 金 |
| outro.05-v2 | `cut(bar(108))` | — | 回顧 | 傅立葉的貓、茄紅素 | 往上捲 | glide 1 | 金綠 |
| outro.06-v1 | `cut(bar(109))` | — | 回顧 | 點陣→超立方體→圓→正弦，快速 | 往上捲 | glide 1 | 橘藍（藍在回憶裡是灰的） |
| outro.07-intro | `cut(bar(110))` | — | 回顧 | 棋盤、`object me {}`、通電的那一個像素 | 往上捲 | glide 1 | 灰＋一點橘 |
| outro.08-execution | `cut(W("EXECUTION", 0, "outro"))` | EXECUTION | 真實的 render 指令 | 中央 `● Bash(npm run render)` ⎿ `13015 frames · 3840×2160 · 60 fps`（數字從 `src/sections.js` 讀，不手打） | 靜止 | cut | 橘 |

## 15 end — 重新開機（207.00–211.92 s）

209 s 起是數位靜音。最後一幕回到片頭。
**閱讀**：credits 分兩頁，每頁 ≤ 3 行，各約 2.4 s。

| id | 起點 | 歌詞 | 概念 | 畫面 | 鏡頭 | 轉場 | 色彩 |
|---|---|---|---|---|---|---|---|
| end.01-reboot | `bar(112)` | — | 重新開機 | `object me {}` 是空的（和 intro.06 同構圖），spark 只剩一個像素；prompt box 裡的游標在閃——可以再執行一次。credits 第 1 頁：`Music — Mili` / `Visuals — Claude (claude-opus-5-5)` | 靜止 | xfade 2 | 灰＋一點橘 |
| end.02-credits | `bar(112) + b(5)` | — | 片尾 | credits 第 2 頁：真實的 render 指令、`13015 frames · 3840×2160 · 60 fps`、`中文翻譯為非官方翻譯 · unofficial fan work` | 靜止 | xfade 1 | 灰 |

---

## 視覺母題與片尾回收

| 母題 | 第一次出現 | 發展 | 回收 |
|---|---|---|---|
| **spark（me）** | intro.01 一個像素 | 成長、展開成圓、放出光束；pre2 變藍；bridge 故障；chant 分裂成 4096 | end.01 又只剩一個像素 |
| **you（藍）** | intro.04 放棋子的游標 | 漸近線、切線上的座位、得救的電子、貓身旁 | c2x 一個個熄滅；c3.07 閃回；love.08 最後一次，飛走 |
| **`object me {}`** | intro.06–07 建立、填參數（`love: undefined`） | 每個「give you my X」都是 `− me.x / + you.x` 的 diff | love.07 填上 love；end.01 回到空的 `object me {}` |
| **Claude Code** | inst1 prompt box＋Enter | todo、Update diff、✻ spinner、確認框（c1 選 Yes） | inst2「don't ask again」→ chant／c3 不再詢問；outro 的真實 render 指令；end 游標在閃 |
| **下一個字預測** | intro.10「the → power」猜錯 | v1 每次都錯；c1 沒資料；chant 學會 EXECUTION、EIN 最大驚訝 | c3.09 第一次猜中（執行）；love 全曲最難預測 |
| **context／loss（HUD）** | 000 / 617 | bridge `/compact` 真的變少；chant loss 下降 | outro 停在 617/617、完整的 loss 曲線；c3.12 與 love.11 直接引用 |
| **正弦** | v1.05（位置編碼） | pre1 整流、v2 的傅立葉貓、c2 克拉尼、pre2 調變 | outro.06 回顧 |
| **圓** | v1.03 | v1.04 滾動、c2.06 閉合 | love 的極座標曲線（圓的變形） |
| **畫中畫（被困在模擬）** | c1.11 | c3.10 變成無限螺旋 | outro 對話紀錄往上捲，全片在一個框裡 |

## 色彩弧線
灰（開機）→ 橘（me 醒來）→ 藍加入（you）→ 綠（v2 生命）→ 橘藍互換（pre2.05）→ 全色（COMPLETION）→ 藍熄滅（c2x）→ 紅（bridge、c3）→ 玫瑰（love）→ 灰＋一點橘（end）。

---

## 製作備註（第 4 階段）
- **需要新寫的模組**（第 4 階段在各章節實作；共用的放 `src/lib/`，由主 session 合併）：
  - 測地線球
  - RC／整流電路
  - dropout 遮罩
  - heavy-ball 梯度下降
  - 分子骨架（delphinidin、茄紅素的座標由程式產生）
  - DFT epicycles
  - 克拉尼
  - 週期邊界盒
  - 畫中畫（同一 t 重畫）
  - implicit 曲線（marching squares）與心形曲面取樣
  - greedy／溫度取樣（`ngram.js` 擴充，亂數一律 hash）
  - 權限確認框（`cc.js`）
  - 建置時的原始碼與錯誤擷取（Vite plugin）
- **待製作時確認**：pre2.08 的 greedy 解碼實際輸出；bridge 的錯誤訊息全文（由驗證器產生）。都是算出來的，分鏡只定構圖。
- **風險**：
  - chant 的 4096 個 spark 要用 swarm 實例畫，不能逐條畫 line。
  - 心形曲面與克拉尼的粒子數要在 4K 下測效能。
  - inst1.03 的 Transformer 層是示意結構，畫面上要標示 schematic，不得暗示是真實模型。
