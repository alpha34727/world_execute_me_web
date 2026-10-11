# world.execute (me) ; — code-generated music video

**非官方二創（unofficial fan work）。** 歌曲〈world.execute (me) ;〉與歌詞版權屬於 **Mili** 及其權利人。
本 repo 不包含任何音訊檔；要算圖，請自行準備合法取得的 `Mili - world.execute(me);.mp3` 放在專案根目錄。
中文字幕為本專案自行翻譯的**非官方翻譯**。

畫面上的每一個像素都由本 repo 的程式碼即時算出（Three.js / WebGL2），沒有生成圖片、影片模型、圖庫素材或外部 3D 模型。
字型：JetBrains Mono、Space Grotesk、Noto Sans TC（皆為 SIL Open Font License，透過 @fontsource 套件提供）。

## 需求
- Node ≥ 22、ffmpeg
- Python（uv）— 只有重跑音訊分析時需要

## 指令
```
npm install
npm run dev                    # 網頁播放器
npm test
npm run stills -- <chapter>    # 接觸印樣 → renders/stills/
npm run preview -- <chapter>   # 1080p 章節預覽 → renders/preview/
npm run render                 # out/master.mp4 (4K60) + out/delivery.mp4 (1080p60)
node tools/synccheck.mjs <mp4> # 驗證引擎測試影片的逐幀同步
```

播放器：`npm run dev` 後開 `http://localhost:5173/?t=秒數`（`?ch=test` 為引擎測試章節）。空白鍵播放、←/→ 跳一拍、,/. 逐幀、c 切換中文字幕。音訊需要把 mp3 放在專案根目錄。

開發規範見 [CLAUDE.md](CLAUDE.md)，進度見 [docs/progress.md](docs/progress.md)。
