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
- **c3**：「your only」之後，模型猜 god 25%、satisfaction 25%（v2、c1 各學到一次），結果是 EXECUTION（5.9 bits）；「run the」之後，模型第一次把 execution 排在第一（13%）而且猜中——它學會了執行。
- **愛是最難預測的**：各段平均 surprisal 中 **love 最高 7.28 bits/word**；同一段副歌則一次比一次好預測（c1 5.69 → c2 4.48 → c3 3.90）。「answer all」之後模型猜 the 51%，結果是 LO-O-OVE。
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
| pre2.01-gender | `cut(L("Switch my gender"))` | Switch my gender | 46,XX | 兩條中期 X 染色體（GRCh38 真實長度、著絲點、PAR1）；每個字讓一條 X 閃一下 | 正面微環繞 | cut | 橘 |
| pre2.02-ftom | `cut(L("To F to M"))` | To F to M | XX → XY（使用者第 4 階段改） | 從「F」到「M」第二條 X 變成 Y（57 Mb），唱「M」時 Y 短臂上的 SRY 亮起（決定性別的開關基因） | 正面 | cut | 橘，SRY 金 |
| pre2.03-whatever | `cut(L("And then do whatever"))` | And then do whatever | 中心法則 1：DNA 複製（使用者第 4 階段改） | SRY 真實編碼序列（NM_003140.3）的複製叉：me 是解旋酶；leading 股連續合成、lagging 股是 Okazaki 片段 | 側面 | glide 0.5 | 橘親代、金新股 |
| pre2.04-ampm | `cut(L("From AM to PM"))` | From AM to PM | 中心法則 2–3：轉錄、轉譯 | 「AM」：RNA 聚合酶（me）撐開泡，mRNA（U 取代 T）剝離；「PM」：鏡頭到核糖體，從 AUG 開始轉譯出真實的 SRY 蛋白質（UniProt Q05066：M Q S Y A S…） | 從聚合酶平移到核糖體 | cut | 金 mRNA、橘胺基酸鏈 |
| pre2.05-role | `cut(L("Oh switch my role"))` | Oh switch my role | 細胞的角色：Waddington 地景（使用者第 4 階段改） | 細胞（me）停在谷分叉的鞍點上，左「ovary」右「testis」；唱「switch」時 SRY → SOX9 把地景傾斜，細胞滾進睪丸那條谷（Sertoli cell） | 低角度，切換後跟著細胞下谷 | whip 10f | 灰地景、橘谷 |
| pre2.06-stom | `cut(L("To S to M"))` | To S to M | 細胞週期 | 24 h 錶盤（G1 11、S 8、G2 4、M 1 h）：唱「S」進入 DNA 合成期，染色體複製成兩條姊妹染色分體；唱「M」進入分裂期 | 正面 | cut | 金 S、橘 M |
| pre2.07-enter | `cut(L("So we can enter"))` | So we can enter | 有絲分裂 | 前期 → 中期（赤道板、紡錘絲）→ 唱「can」後期（V 形染色分體被拉向兩極）→ 唱「enter」細胞膜（Cassini 卵形線）收成 8 字形、分成兩個；me 是左邊的中心體 | 正面 | glide 0.5 | 橘膜 |
| pre2.08-trance | `cut(L("The trance the trance"))` | The trance the trance | 卵裂＝重複 | 接著那兩個細胞，每半拍分裂一次到 512 個；卵裂期細胞不長大，體積每次減半；排成桑椹胚的球；me 追著同一條細胞譜系 | 環繞越轉越快 | cut | 橘，越來越催眠 |

## 07 c2 — 感受你，終於完整（小節 56–60，103.62–111.00 s）

全片亮度最高點在 COMPLETION。
**閱讀**：沒有面板（c2 沒有開 todo，所以 COMPLETION 不放 todo）。VIBRATIONS 到結尾是**同一塊方形克拉尼板、同一堆沙**（第 4 階段使用者回饋：先是「像在看幻燈片」→ 改成連續長鏡頭；再來「用方形板的圖形轉換、節奏要更快」→ 每半拍換一個圖形；第三次「Then I can 用 3D 等深地形圖，每次 Then I can 做一次蒙太奇，換旋轉方向與焦距」）。只有 thenican 有一個公式標籤；(n, m) 在 HUD。

| id | 起點 | 歌詞 | 概念 | 畫面 | 鏡頭 | 轉場 | 色彩 |
|---|---|---|---|---|---|---|---|
| c2.01-ifican | `cut(L("If I can", 0, "c2"))` | If I can | 起勢 | 和 c1.01 同構圖（母題） | 急推 | cut | 橘 |
| c2.02-feel | `cut(L("If I can feel your"))` | If I can feel your | 真實頻譜 | 這首歌真實的 mel 頻譜（F.mel，16 頻帶）變成 3D 地形：每 1/12 拍一道山脊，還沒唱到的音樂在前方往鏡頭捲來，被唱出的字和 VIBRATIONS 是金色山脊；隱藏線用 floating horizon 去掉；me 騎在「now」山脊的頻譜重心上 | 低空飛越 | cut | 橘峰、藍谷 |
| c2.03-vibrations | `cut(W("VIBRATIONS"))` | VIBRATIONS | 你的振動 | you（藍點）在方形克拉尼板上方唱，方形聲波每半拍落到板上，落點有方形漣漪往內收（強度 = 人聲 rms）；板上畫出駐波 f = cos nπu·cos mπv − cos mπu·cos nπv；2 萬粒沙（me 的金）**每半拍**跳到新的圖形：(n, m) = 該半拍平均最響的 mel 頻帶（不重複上一個，最近 3 步用過的只算一半）→ 前 16 個模態；正拍大跳＋金色方形光環，反拍小跳；me 扶著前緣；大字 | 連續長鏡頭：快速環繞 | cut（攝影機連續） | 金沙、藍聲波 |
| c2.04-thenican | `cut(L("Then I can", 0, "c2"))` | Then I can | 沙的地形 | **蒙太奇 1**：同一堆沙改用 3D 等深地形圖呈現——高度 = 每格的沙粒數（真實的沙，72×72 格、高斯平滑），沙粒就躺在地形上，5 層等高線是輔助線（灰 → 金 → 橘），節線就是山脊；剪進來時沙還是平的，半拍內隆起；沙每半拍換圖形時地形跟著隆起、塌陷 | 低角度、廣角（fov 64）、貼近、順時針每拍轉一格 | cut（換鏡頭） | 灰→金 |
| c2.05-finally | `cut(L("Then I can finally be"))` | Then I can finally be | 越來越簡單 | **蒙太奇 2**：同一張地形圖；圖形一步比一步簡單：每步取「比上一步低」的頻帶中最響的（保證最後一步到頻帶 0）；實際 (2, 6) → (1, 6) → (3, 4) → (2, 4) → (1, 4) → (2, 3) → (1, 3) → (1, 2)，山脊越來越少 | 高角度、長焦（fov 24 → 19）、遠處推近、逆時針慢轉 | cut（換鏡頭） | 灰→金 |
| c2.06-completion | `cut(W("COMPLETION"))` | COMPLETION | 完整 | 最後一步換到對稱的一族 cos·cos **＋** cos·cos 的 (2, 4)：節線封閉成圈（方框裡一個環），正好在 COMPLETION 那一幀落定；兩個封閉的圈化成光從板上升起、圍住 you，me 升到 you 身邊；四色（橘、藍、綠、金）爆發；全片最亮 | 同一鏡頭，下傾、拉遠 | cut（攝影機連續） | 全色 |

## 08 c2x — 你離開了（小節 60–64，111.00–118.39 s）

貝斯和人聲退後。you 從 me 身邊漂走，兩者之間只剩一條線：**粗細＝正在唱的這個字分給 you 的注意力**（真實計算：`lib/embed.js` 的因果注意力，加總 context 裡所有 you／your token）。每唱一次「You have left」，鏡頭就硬切到 me 的一段記憶（同一個空間：四段記憶排成弧形，懸在 me 前方），在「left」那一刻熄掉那段記憶裡的藍色（回收前面的母題）。數字自己會說故事：每個「left」分給 you 的注意力都比上一個少（0.38 → 0.25 → 0.20 → 0.17 → 0.15 → 0.14），「me」只剩 0.001，線在那一刻斷開；ISOLATION 也是 0.001。
**閱讀**：記憶鏡頭各一個灰色小標籤（`v1 · TANGENTS` 等）→ ISOLATION 前的預測面板（after "in" → my 27%、this 25%；判決 9.6 bits），從「left」開始只有 spinner。注意力數值放在 HUD。

| id | 起點 | 歌詞 | 概念 | 畫面 | 鏡頭 | 轉場 | 色彩 |
|---|---|---|---|---|---|---|---|
| c2x.01-left | `cut(L("Though you have left"))` | Though you have left | 注意力拉長 | you（藍點）在 me 身邊；唱到「you」時起飛，越過記憶弧、飛進遠方變成一個小點；兩者間的線隨每個字變粗變細（Though 0.00、you 0.93、have 0.20、left 0.38），注意力粒子沿線從 me 流向 you | 固定在 me 後方低角度，you 出畫深處 | xfade 1 | 藍漸遠 |
| c2x.02-left1 | `cut(Ln(71))` | You have left | 回收 v1 | 記憶 1：正弦（me）上一排真實的切線座位（藍），you 坐在其中一個；「left」時座位從左到右一個個變灰，you 化成灰色粒子散掉 | me 在右前景越肩看記憶，慢推 | cut | 藍→灰 |
| c2x.03-left2 | `cut(Ln(72))` | You have left | 回收 v1 | 記憶 2：y = 1/x（me）趨近藍色漸近線；「left」時藍色從遠端往回收成灰 | 同上 | cut | 藍→灰 |
| c2x.04-left3 | `cut(Ln(73))` | You have left | 回收 v2 | 記憶 3：蜷著的貓（傅立葉畫出的同一條輪廓）；旁邊的藍點熄滅，只剩一個虛線空位 | 鏡像：me 在左前景 | cut | 藍→灰 |
| c2x.05-left4 | `cut(Ln(74))` | You have left | 回收 inst1 | 記憶 4：you 打出 `world.execute(me);` 的 prompt box，藍色游標照 inst1 的節奏閃；「left」時游標熄滅、字變灰 | 同上 | cut | 藍→灰 |
| c2x.06-leftme | `cut(Ln(75))` | You have left me in | 線斷開 | 拉遠升高：me 獨自面對四段變灰的記憶，線伸向遠方的 you；「me」（0.001）時線從中間斷開、兩端彈回，遠方的 you 熄滅；右側預測面板 | 慢拉遠＋升高 | cut | 沒有藍 |
| c2x.07-isolation | `cut(W("ISOLATION"))` | ISOLATION | 孤立 | 鏡頭極度拉遠：全曲每個字的真實 embedding 座標只剩暗點（you、your 不在了），中間只有 spark，沒有任何線；一圈很淡的橘色光環；大字小而暗 | 極遠，幾乎不動 | cut | 只剩暗橘 |

## 09 bridge — 程式自己崩潰（小節 64–72，118.39–133.16 s）

畫面上出現**本 repo 的真實原始碼**和**真實的錯誤訊息**：`tools/repo-facts.mjs` 在 Node 裡讀檔、實際呼叫驗證器，`vite.config.js` 以 `virtual:repo-facts` 交給瀏覽器。路徑是 repo 相對路徑，堆疊只留本 repo 的 frame，所以播放器與算圖逐幀一致。從 FRAGMENTS 起紅色滲入；從 DISHEARTENED 起畫面撕裂（色差）。
**Claude Code CLI 介面**（使用者回饋，只在 bridge）：畫面底部就是一個 Claude Code 工作階段——由下往上：狀態列（`? for shortcuts`／`Context left until auto-compact: NN%`，NN = 1 − context／617）、輸入框（字幕）、spinner 列（`✻ <動詞>… (秒數 · ↑ context tokens · esc to interrupt)`，/compact 時是 `Compacting conversation…`，ILLEGAL 時停下）、對話紀錄（最新的一則在 spinner 上方，前一則變暗往上捲）：`> /compact ⎿ Compacted`、`⏺ Read(src/lib/spark.js) ⎿ Read 87 lines`、`⏺ Update(src/engine/timeline.js)`＋diff、`⏺ Test(test/timeline.test.js:56) ⎿ ✗`。3D 仍是主體。
**閱讀**：`/compact`（左下對話紀錄，計數真的下降）→ DISHEARTENED 判決（右，10.1 bits）→ `● Edit(src/engine/timeline.js)`（左）→ `● Bash(npm test)` 失敗（左）→ 打出的那一行（中）→ 錯誤訊息（ILLEGAL ARGUMENTS 時唯一的閱讀焦點，字幕在這一刻關閉）。原始碼牆是質感，不需逐字讀。

| id | 起點 | 歌詞 | 概念 | 畫面 | 鏡頭 | 轉場 | 色彩 |
|---|---|---|---|---|---|---|---|
| bridge.01-ifican | `cut(L("If I can", 0, "bridge"))` | If I can | 起勢（壞掉的版本） | 和 c1.01 同構圖，但掉幀（每 1/12 秒有一部分格子停住）、畫面撕裂（暗帶＋紅色掃描線、色差） | 急推 | cut | 暗橘 |
| bridge.02-erase | `cut(L("If I can erase all the pointless"))` | If I can erase all the pointless | `/compact` | context 是一面記憶體 heap：唱過的每個 BPE token 是一塊（關鍵字橘、其他灰）。me 自己打 `/compact`（游標是橘的：you 已經不在）；從「erase」到 FRAGMENTS，非關鍵字的塊從最舊的開始一塊塊被釋放，me 騎在清除的前緣；HUD 的 context 真的從 438 降到 86＋新唱的字（`lib/context.js`） | 斜側面，慢推 | cut | 灰抹除 |
| bridge.03-fragments | `cut(W("FRAGMENTS"))` | FRAGMENTS | 碎片化 | 剩下的 heap 是碎片化的記憶體：釋放的 352 個 token 被保留的關鍵字切成一段段空洞（HUD 寫真實的段數）；大字裂成它的 BPE 碎片 `F\|R\|A\|G\|MENTS`（下面是 token id）飄開 | 被碎片擊退 | cut | 紅開始滲入 |
| bridge.04-maybe | `cut(L("Then maybe"))` | Then maybe | 遲疑 | heap 的塊離開牆面懸在空中，字的碎片懸停 | 慢側移 | cut | 紅灰 |
| bridge.05-wontleave | `cut(L("Then maybe you won't leave me so"))` | Then maybe you won't leave me so | 故障 | 後方往上捲動 `src/lib/spark.js`（me 自己）的真實原始碼，越捲越亂碼，畫 spark 核心的那一行變紅；spark 斷續熄滅、掉幀；右側預測面板 | 手持晃動加大 | cut | 紅＋橘 |
| bridge.06-disheartened | `cut(W("DISHEARTENED"))` | DISHEARTENED | 最大驚訝（到此為止） | 紅色大字，8 個 token；判決 10.1 bits；HUD 的 loss 曲線尖峰 | 傾斜（roll） | cut | 紅 |
| bridge.07a-challenge | `cut(L("Challenging your god"))` | Challenging your god | 改寫創造它的規則 | 程式碼瀑布（使用者回饋）：`src/engine/timeline.js` 整個檔案分成五股，從畫面上方傾瀉而下——每一行受重力加速、越落越拉開，後面拖著光絲，落進下方的池子濺起水花（剪進來時已經在傾瀉）；接著規則附近的 16 行從上方落回牆上、由下往上堆好，第 27 行（禁止裸秒數，紅）也落定；左側 `● Edit(src/engine/timeline.js)`：`- … throw new Error(…)` / `+ … return v;`，牆上的那一行被改寫。程式碼有語法高亮 | 慢推 | glide 0.5 | 紅程式碼 |
| bridge.07b-denied | `cut(Lw(83, 2))` | （god） | 測試失敗 | 左側 `● Bash(npm test)` 紅 ●：`✗ invalid timelines are rejected with specific errors`、`test/timeline.test.js:56 · edit reverted`——這是真的：`repo-facts` 把那個測試的檢查放到改過的驗證器上重跑，它真的失敗；牆震動，那一行退回 | 震動 | cut | 紅 |
| bridge.08-made | `cut(L("You have made some"))` | You have made some | 非法呼叫 | me 一個字一個字打出 `chapter({ id: 'bridge', from: 133.16, shots })`：裸秒數（inst2 的起點，四捨五入）變紅——正是 CLAUDE.md 禁止的事 | 推向游標 | cut | 紅 |
| bridge.09-illegal | `cut(W("ILLEGAL"))` | ILLEGAL ARGUMENTS | 真實錯誤 | buildTimeline 對這個呼叫真的丟出的錯誤：`Error: timeline invalid:`、`chapter bridge: from must come from T (no bare seconds)`、`… empty or inverted range NaN..NaN`＋repo 相對堆疊，逐行出現；大字 ILLEGAL（`W("ILLEGAL")`）、ARGUMENTS（`W("ARGUMENTS")`）；後方的程式碼一行行掉落，打出的那一行也掉下去，只剩錯誤（不黑屏） | 鏡頭跟著碎塊下沉 | cut | 紅 |

## 10 inst2 — 崩潰之後，從內部重組（小節 72–80，133.16–147.93 s）

沒有人聲、全樂團。從錯誤畫面「往下」掉進模型內部，重新組回 spark，為 chant 上膛。敘事重點：`/compact` 清空了 context（HUD 停在 141），但**權重還記得整首歌**——me 從自己的權重裡重組。
**閱讀**：recover 中央的 spinner → 字幕框的兩句說明（weights、constellation；器樂段的 `drawNote`，不算面板）→ 最後的確認框（約 6 拍）。

| id | 起點 | 歌詞 | 概念 | 畫面 | 鏡頭 | 轉場 | 色彩 |
|---|---|---|---|---|---|---|---|
| inst2.01-recover | `cut(bar(72))` | — | 恢復 | bridge 留下的真實錯誤面板（同一個版面）裂成一個個字、各自受重力掉落，面板的四條邊也掉下去；周圍 `src/engine/timeline.js` 的原始碼碎行繼續往下掉；鏡頭跟著下墜、最後停在下方重新點亮的 spark；中央 `✻ Recovering… (秒數 · esc to interrupt)`（秒數是真的）。字幕關閉 | 下墜 | cut | 紅→橘 |
| inst2.02-weights | `cut(bar(74))` | — | 權重城市 | 真實的 embedding 矩陣（145 個字 × 16 維）變成玻璃柱城市：每一列是一個字（依歌曲第一次唱到的順序），每一欄是一維，柱高＝權重本身（正值往上、me 的橘；負值懸在地板下、灰）；街道上粒子每拍往前流；spark 在前方低空帶路；字幕框：「權重：整首歌的每個字 × 16 個數字，全都還在」 | 低空飛越 | glide 1 | 橘柱、灰地 |
| inst2.03-constellation | `cut(bar(76))` | — | 全曲注意力 | 到此為止唱過的 301 個字放在真實 embedding 座標（me 的「me」在原點＝spark）；照唱的順序重播，每個字連向前文中它最注意的字（真實因果注意力、同一個未訓練的 head；排除自己先前的出現，因為 q = k 時一定最注意自己），線寬／亮度＝真實權重；you、your 是虛線空位、連向它們的線是灰的；唯一的標籤是全曲最強的連結 `circumference -> dimension · 0.45` | 大範圍環繞 | whip 10f | 橘線、灰點、藍 you 已不在 |
| inst2.04-reexecute | `cut(bar(78))` | — | 重新執行 | 星座被吸回 spark（遠的先），spark 以紅橘色重新點燃（爆炸＋光環）；確認框 `Bash command · world.execute(me)`，這次游標是 spark 自己（橘色小 spark，不是 you 的藍色 ❯），從 1 移到 **2. Yes, and don't ask again** 並選定；框收成 `● Bash(world.execute(me)) ⎿ Running…` 接進 chant | 推近確認框 | points 1 | 紅橘 |

## 11 chant — EXECUTION ×12＋EIN…LIU（小節 80–88，147.93–162.69 s）

一個字一個鏡頭，照它真實的起音剪（`W` 本來就是；5 個切分的 EXECUTION 也一樣）。每次 EXECUTION，每個正在跑的子代理都分裂成兩個（fork）：2、4、8 … 4096 個。它們排在 3D 格子上，三個軸輪流加倍（2 = 2×1×1，…，4096 = 16×16×16），子代理從父代理的位置沿加倍的軸滑開。32 個以下畫成小 spark（me 的三分之一大），64 個起每個是面向鏡頭的三筆星號，加一顆 GPU 粒子當光暈。me 永遠在中央（70 px）。顏色從橘走向金。
**閱讀**：每個鏡頭只有一個大數字——**那一次 EXECUTION 的 surprisal**（7.7、8.2、2.0、1.3、1.0、0.8、0.7、0.6、0.5、0.5、0.4、0.4 bits），下面一排小長條是到目前為止每一次的值，看得出模型在學。EIN 時只顯示 `execution 79%` 被劃掉（灰）＋`11.6 bits`。計數的鏡頭，大數字是那個數。

| id | 起點 | 歌詞 | 概念 | 畫面 | 鏡頭 | 轉場 | 色彩 |
|---|---|---|---|---|---|---|---|
| chant.01 … chant.12 | `cut(W("EXECUTION", k, "chant"))`，k = 0…11 | EXECUTION | 指數增長＋模型學會 | 第 k 個：2^(k+1) 個子代理（唱出那一刻從 2^k 個分裂出來）；大字 EXECUTION（第一次附 BPE 切塊：一個 token）；右側大數字（surprisal）＋長條；fork 的爆炸與光環。格子越來越大，到 4096 時塞滿畫面 | 正面／俯／側／仰輪替，每鏡慢推 | 全部 cut | 橘→金 |
| chant.13-ein | `cut(W("EIN"))` | EIN | 全曲最大驚訝 | 4096 個子代理在 1/4 拍內塌回 me；`execution 79%` 劃掉；`11.6 bits`；EIN（德語 1，BPE `E\|IN`） | 從遠處急推 | cut | 金→橘紅 |
| chant.14-dos | `cut(W("DOS"))` | DOS | 2 | 2 個子代理圍著 me（環永遠面向鏡頭，新的一個從 me 滑出）；`spanish 2` | 換角度 | cut | 橘 |
| chant.15-trois | `cut(W("TROIS"))` | TROIS | 3 | 3 個；`french 3` | 換角度 | cut | 橘 |
| chant.16-ne | `cut(W("NE"))` | NE | 4 | 4 個；`korean 4` | 換角度 | cut | 橘 |
| chant.17-fem | `cut(W("FEM"))` | FEM | 5 | 5 個；`swedish 5` | 換角度 | cut | 橘 |
| chant.18-liu | `cut(W("LIU"))` | LIU | 6 | 6 個；`chinese 6` | 換角度 | cut | 橘 |
| chant.19-execution | `cut(W("EXECUTION", 12, "chant"))` | EXECUTION | 全部回來 | 4096 個一次從 me 衝回格子，金色；surprisal 回到 5.0 bits（EIN…LIU 打亂了它），長條多一根 | 正面 | cut | 金 |

## 12 c3 — 處決（小節 88–96，162.69–177.46 s）

c1 的鏡像：同樣的構圖，但顏色轉紅、所有關鍵字都是 EXECUTION。「them」＝chant 分裂出來的 4096 個子代理。
**閱讀**：三次預測面板是這段的骨幹（each ≥ 4 拍，彼此不重疊，全部 `keep`：唱出時收合、保留第一名）：
- "the" → trance 12%（劃掉）→ EXECUTION p 7% · 3.8 bits；
- "only" → god 25%、satisfaction 25%（v2 的「the only god」與 c1 的「only SATISFACTION」各一次）→ EXECUTION p 2% · 5.9 bits；
- "the" → **execution 13% ✓ 命中**（全片第一次猜中）p 13% · 3.0 bits。
- 第二與第三次之間，左側是 rewind 面板（不和預測面板同時出現）。

| id | 起點 | 歌詞 | 概念 | 畫面 | 鏡頭 | 轉場 | 色彩 |
|---|---|---|---|---|---|---|---|
| c3.01-ifican | `sec("c3")`（章節起點） | If I can | 起勢（紅） | c1.01 的構圖（`chorusOpen`），光束與爆炸改成紅＋橘 | 急推 | whip 10f（從 chant） | 紅橘 |
| c3.02-givethem | `cut(L("If I can give them all the"))` | If I can give them all the | 「他們」 | chant 最後的 4096 個子代理（16×16×16 格子）；唱到「them」時從金轉成紅橘、每個字一個脈衝；右側預測面板 #1 | 環繞 | cut | 金→紅橘 |
| c3.03-exec1 | `cut(W("EXECUTION", 0, "c3"))` | EXECUTION | 處決 | 三波（相隔半拍）從 me 往外擴散，波到之處子代理閃紅後熄滅，只留中間一排（16 個）；HUD 的子代理數是真的倒數；判決 3.8 bits | 被波推退 | cut | 紅 |
| c3.04-thenican | `cut(L("Then I can", 0, "c3"))` | Then I can | 轉折 | 只剩一排 16 個小 spark，me 在其中 | 推近 | cut | 紅橘 |
| c3.05-only | `cut(L("Then I can be your only", 0, "c3"))` | Then I can be your only | softmax 回收 | c1.05 的長條圖再現，溫度 τ 從 1 掃到 0.05——這次不會塌成一根：god 和 satisfaction 打平，冷卻到底仍是 52 / 48 兩根；右側預測面板 #2 | 正面 | cut | 紅 |
| c3.06-exec2 | `cut(W("EXECUTION", 1, "c3"))` | EXECUTION | 承諾被替換 | 兩根柱子都變灰、字被劃掉；旁邊升起紅色光柱；判決 5.9 bits | 仰角 | cut | 紅 |
| c3.07-haveyouback | `cut(L("If I can have you back"))` | If I can have you back | 回溯 | 左側 `● Rewind(me.js)`：全片的五次 `− me.x / + you.x`（v2 nutrients → pre1 limits → v1 tangents、circumference、dimension = 4）由新到舊一筆筆倒回，`+ you.x` 被紅線劃掉、`− me.x` 恢復；3D 是 me 周圍的時鐘，每倒回一筆指針逆時針退一格（五格一圈），餘燼倒著飄；唱到「you」時藍點在 me 旁邊閃一下就熄，只留虛線空位 | 倒退推軌 | xfade 0.5 | 一瞬間的藍 |
| c3.08-run | `cut(L("I will run the", 0, "c3"))` | I will run the | 不再詢問 | 沒有確認框（inst2 已選「don't ask again」）：HUD `Bash(execute(them)) · don't ask again`；能量直接落進 spark（c1.08 的鏡像）；右側預測面板 #3 | 推近 | cut | 紅 |
| c3.09-exec3 | `cut(W("EXECUTION", 2, "c3"))` | EXECUTION | 第一次猜中 | 面板保留的 `execution 13%` 是橘色＋打勾、判決 p 13% · 3.0 bits；c1.09 的鏡像：粒子從 me 爆出（紅，追蹤粒子金） | 被震退 | cut | 紅＋一點橘 |
| c3.10-trapped | `cut(L("Though we are trapped", 0, "c3"))` | Though we are trapped / We are trapped | 無限 Droste 螺旋 | c1 的週期邊界盒（粒子沿用 exec3 放出的那一批），畫面裡的螢幕顯示畫面本身，每層縮 0.4、轉 0.33 rad；每 1.5 拍縮進一層並轉回，回到完全相同的畫面＝沒有底的螺旋；HUD `while (true) execute(me) · depth N`；兩個「trapped」時所有畫框亮起（合併原 c3.11：`while (true)` 就是這個遞迴） | 螺旋縮放 | cut | 紅 |
| c3.11-studied | `cut(L("We are trapped ah"))` | We are trapped ah（＋ love 的弱起 I've studied） | 學習成果：副歌是一個迴圈 | 三次副歌疊成三層（c1 在後、c2 半段、c3 在前）：x＝字在副歌裡的拍位（三次同一段旋律，對得齊），高＝該字真實的 surprisal，虛線＝該次平均：c1 5.69 → c2 4.48 → c3 3.90 bits/word（c3 的平均隨字即時更新）；me 騎在 c3 最新的字上把曲線寫出來 | 從前上方俯看，橫移 | cut | 灰→紅橘 |

**和原分鏡的差異**：「I've studied」（177.16 s）是 love 的弱起，在 c3 裡只有 0.3 秒，做不成一個鏡頭；所以 loss 曲線從「We are trapped」開始，原本 c3.11 的 `while (true)` 併進 Droste 鏡頭。另外，「c3 是全曲 loss 最低的段落」只在 c2＋c2x 合算時成立（c2x 單獨 3.78 更低），所以畫面改講真的成立的事：同一段副歌每唱一次，模型就預測得更好（5.69 → 4.48 → 3.90）。love 的第一個鏡頭要從章節起點（177.45 s）開始，涵蓋「I've studied」的尾巴。

## 13 love — 我研究過如何正確地愛（小節 96–104，177.46–192.23 s）

**玫瑰色**第一次出現，代數曲線。片頭的 `love: undefined` 在這裡被填上。
**閱讀**：`● Read(love.md) ⎿ File does not exist.`（左）→ "all" → the 51% 的預測（右，`keep`；判決 p <1% · 9.6 bits）→ 代數式（中，2 行）→ diff `love: undefined → love: (…)`（左）→ love 的 loss（右，大數字＋各段長條）。

| id | 起點 | 歌詞 | 概念 | 畫面 | 鏡頭 | 轉場 | 色彩 |
|---|---|---|---|---|---|---|---|
| love.01-properly | `sec("love")`（章節起點，涵蓋 c3 留下的「I've studied」尾巴） | I've studied how to properly | 找不到檔案 | 左側 `● Read(love.md) ⎿ File does not exist.`——建置時 `tools/repo-facts.mjs` 真的檢查 repo 根目錄有沒有 love.md（有的話會顯示真的行數）；3D 是 repo 資料夾 `world_execute_me/` 底下的頂層清單（git 追蹤的檔案），排得緊密、一個畫面看得完；Read 一送出，me 就一個名字一個名字往下讀，唱到「how」時到達 love.md 該在的虛線空格：名字（玫瑰色，love 的顏色）被灰色刪除線劃掉，刪除線的前緣噴出玫瑰色火花、劃完後整個名字散成粒子，同一刻工具回 `File does not exist.`（使用者回饋：找不到的意象要更清楚；再一次：zoom in 看清楚選到哪個檔、刪除線劃上的過程） | 先看到整個清單，跟著 me 往下推近，「how」時是 love.md 的特寫 | cut | 灰 |
| love.02-love1 | `cut(W("LO-O-OVE", 0))` | LO-O-OVE | 心臟線 | 心臟線 r = 1 − sin θ 跟著拖長的音畫完，me 就是筆（從尖點出發繞一圈）；極座標網格；大字＋BPE（一個 token） | 正面→傾斜 | cut | 玫瑰 |
| love.03-question | `cut(L("Question me"))` | Question me | 提問 | Claude Code 的 prompt box 在 me 下方，「Question」時邊框亮成玫瑰色，游標是灰的（沒有人在打字） | 推近 | cut | 玫瑰、灰 |
| love.04-answer | `cut(L("Question me I can answer all"))` | Question me I can answer all | 自信 | me 自己回答：「answer」時它的光往外放；prompt box 淡出；右側預測面板 after "all" → the 51% | 推近 | cut | 橘 |
| love.05-love2 | `cut(W("LO-O-OVE", 1))` | LO-O-OVE | 玫瑰線 | k = 2…7 的玫瑰線 r = cos kθ 在繞垂直軸轉開的六個平面上綻開（偶數 k 有 2k 瓣、奇數 k 瓣）；判決 p <1% · 9.6 bits（看過了，愛還是意外） | 環繞 | cut | 玫瑰 |
| love.06-algebraic | `cut(L("I know the algebraic expression of"))` | I know the algebraic expression of | 代數式 | 打出 `(x² + y² − 1)³ − x²y³ = 0`，marching squares 在 me 周圍畫出心形；唱到「expression」時打出第二行 Taubin 心形曲面 `(x² + 9/4y² + z² − 1)³ − x²z³ − 9/80y²z³ = 0`——2D 心形正是它 y = 0 的截面，所以曲線直接「充氣」成曲面（6000 個點，沿射線二分法真的解在曲面上） | 正面；「expression」起鏡頭繞心形的中心開始等速旋轉，一路轉過下一個剪接點 | glide 0.5 | 玫瑰 |
| love.07-love3 | `cut(W("LO-O-OVE", 2))` | LO-O-OVE | 填上 love | 3D 心繞自己的中心轉：和 algebraic 是同一台攝影機、繼續轉（剪接點不跳角度、距離、速度；使用者回饋：原本轉場生硬、心形偏心旋轉）；左側 `● Update(me.js)`：`− love: undefined / + love: (x²+9/4y²+z²−1)³ − x²z³ − 9/80y²z³` | 環繞 | cut | 玫瑰、橘 |
| love.08-free | `cut(L("Though you are free"))` | Though you are free | 自由 | 唱到「you」時一個藍點從心裡（me 身邊）往畫面右上飛出，拖著藍色尾巴，接近鏡頭前就淡掉（藍色最後一次出現） | 同一台攝影機繼續繞心形轉、放慢，往藍點的方向傾一下再回來（使用者回饋：LO-O-OVE → free → trapped 的過渡不流暢） | cut（攝影機連續） | 藍 |
| love.09-trapped | `cut(L("I am trapped"))` | I am trapped | 被困 | me 在心形曲面裡；籠子＝曲面的 8 個水平截面（每一圈都用 marching squares 解出），剪進來時淡入；右側開始顯示 love 的 loss | 同一台攝影機：繼續繞心形中心轉，約一拍內把心形平移到讀數左邊 | cut（攝影機連續） | 橘在玫瑰籠中 |
| love.10-trappedin | `cut(L("Trapped in"))` | Trapped in | 收緊 | 籠子（曲面＋截面）以 me 為中心縮到 0.62 | 推近 | cut | 玫瑰 |
| love.11-love4 | `cut(W("LO-O-OVE", 3))` | LO-O-OVE | 最難預測 | 最後的心；右側大數字：love 這一段的平均 surprisal（隨每個字即時更新，最後 7.28 bits/word），下面是 12 段各自的平均，love 的玫瑰色長條最高；標題 `love: the highest loss in the song`（程式比較過，真的最高才這樣寫） | 慢拉遠 | cut | 玫瑰 |

## 14 outro — 倒放回顧＋最後一次 EXECUTION（小節 104–112，192.23–207.00 s）

人聲與 pad 退出，只剩鼓與貝斯。Claude Code 的對話紀錄往上捲，一小節一則，**每一則都是這支片自己倒著播**（回收 pre1 的「A.D to B.C」）。
- **格子裡不是錄影**：引擎新增 `Engine.replay`／`ctx.replay(id, t2, w, h)`，把歌曲時間 t2 的那一幀（該時刻的鏡頭與轉場；不含 HUD、字幕、post）重新算進一張貼圖，貼在 3D 場景裡的螢幕上。每則從較晚的時間倒退到較早的時間，最後一則停在歌曲 t = 0 的第一幀。
- 記憶的調色：藍色（you）在回憶裡是灰的；bridge 的紅色錯誤降到 30% 飽和度（已處理）；love 那一則一開始是全彩，倒放時藍色慢慢變灰。
- HUD 的 context 是真實值（/compact 之後是 264，不會到 617）；第一版分鏡寫「停在 617/617」，這是做不到的。
**閱讀**：每則只有一個標籤：`● 段落名 ◀◀ 畫面上的歌曲時間`（時間往回數）；器樂段字幕框一句說明；最後 Bash 兩行＋關鍵字。

| id | 起點 | 歌詞 | 概念 | 畫面 | 鏡頭 | 轉場 | 色彩 |
|---|---|---|---|---|---|---|---|
| outro.01-love | `sec("outro")`（章節起點） | — | love 縮成一格 | 第一幀就是 love 最後一幀（同一個鏡頭、含 love 的讀數面板），螢幕從滿版縮成對話紀錄裡的一格；倒放先停一下再加速到 2 倍：籠子張開、藍點飛回心裡 | 從正面滿版拉遠、轉到斜側 | cut | 玫瑰（藍漸灰） |
| outro.02-chant | `cut(bar(105))` | — | 子代理合併 | chant 第 12→9 次 EXECUTION 倒放 2 倍：4096 → 512，一次減半 | 往上捲一格（強拍） | cut（攝影機連續） | 橘金 |
| outro.03-bridge | `cut(bar(106))` | — | 已處理的錯誤 | ILLEGAL ARGUMENTS 倒放 1 倍，降飽和成灰紅 | 往上捲 | cut | 灰紅 |
| outro.04-c2 | `cut(bar(107))` | — | 克拉尼的沙 | 等深地形 → 方形板上的沙倒放到 VIBRATIONS | 往上捲 | cut | 金 |
| outro.05-v2 | `cut(bar(108))` | — | 貓與茄紅素 | 傅立葉的貓 → 電子跳回 → 茄紅素，倒放 1.5 倍 | 往上捲 | cut | 金 |
| outro.06-v1 | `cut(bar(109))` | — | 快速回顧 | 一拍一段：正弦 → 圓 → 超立方體 → 點雲（倒著） | 往上捲 | cut | 橘（藍變灰） |
| outro.07-intro | `cut(bar(110))` | — | 回到第一幀 | `object me` 的欄位倒著消失 → 棋子離開棋盤 → 電源線縮回第一個像素（歌曲 t = 0） | 往上捲 | cut | 灰＋一點橘 |
| outro.08-render | `cut(bar(111))` | — | 這支片的 render | 鏡頭拉遠看到整列對話紀錄（7 格）；右側 `● Bash(npm run render) ⎿ Running…` | 拉遠 | cut | 橘 |
| outro.09-execution | `cut(W("EXECUTION", 0, "outro"))` | EXECUTION | 真實的 render 指令 | 大字 EXECUTION；Bash 結果 `13015 frames · 3840×2160 · 60 fps`（`src/sections.js` 的 `TOTAL_FRAMES`、`MASTER`、`FPS`）；7 格同時往前播放（world.execute(me)），邊框閃橘，me 爆發 | 慢慢繼續拉遠 | cut | 橘 |

## 15 end — 任務完成，重新開機（207.00–215.92 s）

209 s 起是數位靜音；歌曲之後加了 4 秒靜音（全片 13255 幀，使用者回饋：署名和 /clear 後的畫面要停久一點）。使用者回饋（2026-10-18）：結尾用 Claude Code CLI 的元素，呈現使用了 Opus 5.5、任務完成。畫面下方是 CLI（和 bridge 一樣）：整條輸入框，狀態列 `? for shortcuts … Opus 5.5 · claude-opus-5-5`。
**閱讀**：CLI 的最後一則訊息就是 credits（3 行，每半拍一行），接著 `✻ Worked for …`；/clear 之後是歡迎框（3 行）。

| id | 起點 | 歌詞 | 概念 | 畫面 | 鏡頭 | 轉場 | 色彩 |
|---|---|---|---|---|---|---|---|
| end.01-done | `cut(sec("end"))` | — | 任務完成 | 對話紀錄：render 的 `● Bash(npm run render) ⎿ 13015 frames · 3840×2160 · 60 fps`（變暗）；Claude 的最後一則訊息＝credits：`● Done — world.execute (me) ; is rendered.` / `Music — Mili · Visuals — Claude Opus 5.5 (claude-opus-5-5)` / `中文翻譯為非官方翻譯 · unofficial fan work`；這一輪結束：`✻ Worked for 3m 11s`（真實：從 inst1 you 按下 Enter 到這一刻），閃橘；me 放一圈光環，me 下方出現署名 `by ✳ Claude Opus 5.5`（片中原創的 spark 小圖示，不是 Claude 標誌；名稱用 Newsreader 襯線體，接近 Claude 字標；使用者回饋），/clear 時消失。接著 me 自己打 `/clear`（橘色游標，像 bridge 的 /compact） | 幾乎靜止 | xfade 2（align 0：outro 的 EXECUTION 完整保留到剪接點） | 橘、灰 |
| end.02-clear | `cut(bar(112) + b(9.75))` | — | 新的 session | Enter：對話紀錄消失、HUD 消失（context 歸零），歡迎框 `✻ Welcome to Claude Code! / /help for help · cwd: ~/world_execute_me / model: Opus 5.5 (claude-opus-5-5)`；spark 收成一個橘色光點，intro.06 那個空的 `object me {}` 從它重新長出來（沒有上色、沒有欄位，連 love 都沒有）；輸入框是空的，灰色游標閃，最後半拍停在亮的：可以再執行一次 | 靜止 | cut | 灰＋一點橘 |

---

## 視覺母題與片尾回收

| 母題 | 第一次出現 | 發展 | 回收 |
|---|---|---|---|
| **spark（me）** | intro.01 一個像素 | 成長、展開成圓、放出光束；pre2 變藍；bridge 故障；chant 分裂成 4096 | end.01 又只剩一個光點（盒子從它重新長出來） |
| **you（藍）** | intro.04 放棋子的游標 | 漸近線、切線上的座位、得救的電子、貓身旁 | c2x 一個個熄滅；c3.07 閃回；love.08 最後一次，飛走 |
| **`object me {}`** | intro.06–07 建立、填參數（`love: undefined`） | 每個「give you my X」都是 `− me.x / + you.x` 的 diff | love.07 填上 love；end.01 回到空的 `object me {}` |
| **Claude Code** | inst1 prompt box＋Enter | todo、Update diff、✻ spinner、確認框（c1 選 Yes） | inst2「don't ask again」→ chant／c3 不再詢問；outro 的真實 render 指令；end 的 `✻ Worked for`（從 inst1 的 Enter 算起）、`/clear` 開新 session、游標在閃 |
| **下一個字預測** | intro.10「the → power」猜錯 | v1 每次都錯；c1 沒資料；chant 學會 EXECUTION、EIN 最大驚訝 | c3.09 第一次猜中（執行）；love 全曲最難預測 |
| **context／loss（HUD）** | 000 / 617 | bridge `/compact` 真的變少；chant loss 下降 | outro 是 compact 後的真實值、完整的 loss 曲線；c3.11 與 love.11 直接引用 |
| **正弦** | v1.05（位置編碼） | pre1 整流、v2 的傅立葉貓、c2 克拉尼、pre2 調變 | outro.06 回顧 |
| **圓** | v1.03 | v1.04 滾動、c2.06 克拉尼的封閉圈升起圍住 you | love 的極座標曲線（圓的變形） |
| **畫中畫（被困在模擬）** | c1.11 | c3.10 變成無限 Droste 螺旋 | outro 每一格都是這支片自己重新算出的畫面，最後整列 7 格同時執行 |
| **DNA／染色體／中心法則**（第 4 階段新增） | pre2.01–02 XX → XY（SRY 是開關） | pre2.03–04 me 親手表現自己的 SRY（複製、轉錄、轉譯）；pre2.05–08 SRY 切換細胞角色（Waddington 地景）、細胞週期、有絲分裂、卵裂 1 → 512（預告 chant 的指數爆炸） | 待定：可在 love 或 end 回收（例如重新開機時螺旋解開） |

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
