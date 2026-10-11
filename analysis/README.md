# analysis/ — 音訊與歌詞分析管線

輸入：根目錄的 mp3 與 vtt。輸出：`analysis/out/`（**禁止手動修改**，有問題就重跑）。管線是確定性的：同一個 mp3 重跑，所有產物位元相同（demucs 有固定 seed，並開啟 deterministic 模式）。

## 安裝與執行
見 `requirements.txt` 開頭的三行安裝指令（uv + Python 3.12 + CUDA 12.8 torch）。
```
.venv/Scripts/python.exe run.py              # 全部重跑（GPU 約 3 分鐘）
.venv/Scripts/python.exe run.py s06_timing   # 從某一步開始重跑
```

| 步驟 | 內容 |
|---|---|
| `s01_separate.py` | ffmpeg 解碼 → demucs `htdemucs_ft` 分軌 drums/bass/vocals/other → `stems/`（gitignored） |
| `s02_onsets.py` | drums、vocals 起音 → `out/onsets.json` |
| `s03_beats.py` | beat_this（主要）+ madmom RNN/DBN（交叉驗證）→ 穩健最小平方法固定 BPM 網格，鼓軌起音修相位 → `out/beats_raw.json` |
| `s04_align.py` | 對 vocals 軌做 CTC 強制對齊（wav2vec2 LV60K 為主、MMS_FA 為備援，4 個子幀偏移取中位數）→ `out/align_raw.json` |
| `s05_refine.py` | torchcrepe f0 + 有聲能量把每個字修正到「音符起點」，另標前導子音 attack → `out/align.json` |
| `s06_timing.py` | 網格 + 段落 + 字級歌詞 + 人工驗證的關鍵字 → `out/timing.json`（含 notes 誤差統計） |
| `s07_features.py` | 60 列／秒 × 25 通道 → `out/features.f32` + `out/features.json` |
| `s08_overview.py` | 波形＋節拍網格＋段落＋字級歌詞 → `out/overview.png` |

## 人工驗證
- `keywords_verified.json`：51 個大寫關鍵字逐一對照音訊確認，44 個確認、7 個更正。這些時間會直接採用；重跑時 s06 會回報自動結果離驗證值多遠（超過 120 ms 時警告）。
- 檢查工具（不屬於管線）：`check_keywords.py`（每個字的頻譜＋f0＋novelty）、`check_lines.py`（整行上下文，對照 f0 音符數音節）→ `out/check/`（gitignored）。
