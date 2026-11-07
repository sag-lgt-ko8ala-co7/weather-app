# お天気カレンダー 🌤️

OpenWeatherMap の無料 API と連携した天気予報 Web アプリ（Next.js / TypeScript）。

- 都市名検索（日本語OK）または **📍現在地** で天気を取得
- **気温・天気・湿度・降水確率** を表示
- **カレンダーで日付を選ぶと予報が切り替わる**（今日〜約5日間）＋ 3時間ごとの予報
- API キーは **環境変数（`.env.local`）で管理**。コードには一切書いていない

## 追加機能（自分で課題を見つけて実装した3つ）

| 機能 | 誰の | どんな課題を | どう解決するか |
| --- | --- | --- | --- |
| 服装・傘のアドバイス（`components/Advice.tsx`） | 朝、出かける準備をする人 | 気温や降水確率の数字を見ても、何を着るか・傘が要るかをすぐ判断できない | 最高/最低気温と降水確率から「傘を持って」「薄手の上着を」などのひと言に変換して表示する |
| 気温・降水確率のグラフ（`components/HourlyChart.tsx`） | その日の外出や洗濯の予定を立てたい人 | 3時間ごとの数字が並ぶだけだと、いつ暖かくなり、いつ雨が降りそうかが分かりにくい | 気温を折れ線、降水確率を棒グラフにして1日の変化をひと目で分かるようにする |
| 2都市の比較（`components/CityCompare.tsx`） | 旅行先・出張先を選ぶ人、離れて住む家族の天気が気になる人 | 2つの都市を交互に検索して見比べるのは手間で、違いを覚えておけない | もう1つの都市を入力すると、日付ごとに2都市の天気・気温・降水確率を横に並べて表示する |

## 仕組み（「読んで・触って・連動する」）

```
ブラウザ (app/page.tsx)
   │  fetch("/api/weather?city=富山")      ← APIキーを持たない
   ▼
自分のサーバー (app/api/weather/route.ts)
   │  process.env.OPENWEATHER_API_KEY を付けて中継
   ▼
OpenWeatherMap
   ├ /geo/1.0/direct      都市名 → 緯度経度
   ├ /data/2.5/weather    現在の天気
   └ /data/2.5/forecast   5日分・3時間ごとの予報（降水確率 pop 含む）
```

- 3時間ごとの予報を **現地の日付ごとにまとめて** 日別予報を作っています（`lib/weather.ts`）
  - 最高/最低 = その日の最大/最小、降水確率 = その日の最大値、湿度 = 平均、天気 = 12時に一番近いコマ
- キー名に `NEXT_PUBLIC_` を付けていないので、キーはブラウザに送られません

## ファイル構成

```
app/
  page.tsx              画面（検索・現在地・表示・カレンダー連動）
  api/weather/route.ts  APIキーを使う中継API（サーバー側）
  layout.tsx, globals.css
components/Calendar.tsx 月カレンダー（予報のある日だけ選べる）
lib/weather.ts          OpenWeatherMap 呼び出しとデータ整形
.env.local.example      環境変数のひな形（これはコミットしてOK）
```

## 1. ローカルで動かす

1. [OpenWeatherMap](https://home.openweathermap.org/users/sign_up) で無料登録 → **API keys** でキーをコピー
   - ※ 発行直後のキーは有効になるまで数十分〜数時間かかることがあります（401 エラーになる）
2. 環境変数ファイルを作成
   ```bash
   cp .env.local.example .env.local
   # .env.local を開いて OPENWEATHER_API_KEY=取得したキー に書き換え
   ```
3. 起動
   ```bash
   npm install
   npm run dev
   ```
   → http://localhost:3000

## 2. GitHub にリポジトリ作成

```bash
git init
git add .
git status            # ← .env.local が一覧に「無い」ことを必ず確認！
git commit -m "first commit: weather app"
git branch -M main
git remote add origin https://github.com/<あなたのユーザー名>/weather-app.git
git push -u origin main
```
（GitHub 側で先に空のリポジトリ `weather-app` を作っておく。`gh` CLI があれば `gh repo create weather-app --public --source=. --push` でも可）

## 3. Vercel にデプロイ

1. https://vercel.com に GitHub でログイン → **Add New… → Project** → `weather-app` を Import
2. **Environment Variables** に追加
   - Key: `OPENWEATHER_API_KEY`
   - Value: 自分の API キー
3. **Deploy** を押す → 発行された URL で動作確認

> デプロイ後に環境変数を追加・変更した場合は **Deployments → Redeploy** が必要です。

## 注意

- 無料プランの予報は **今日から約5日分** までです。カレンダーで選べるのはその範囲だけ
- 現在地ボタンは HTTPS（Vercel）か localhost でのみ動きます（ブラウザの仕様）
- API の結果はキャッシュせず毎回最新を取得しています（無料枠は60回/分あるので十分）
