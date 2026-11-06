import { NextResponse, type NextRequest } from "next/server";
import { getWeather, WeatherError } from "@/lib/weather";

// ブラウザ → このAPIルート → OpenWeatherMap の順に中継する。
// API キーはサーバー側の環境変数からだけ読むので、ブラウザには一切渡らない。
export async function GET(req: NextRequest) {
  const apiKey = process.env.OPENWEATHER_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "OPENWEATHER_API_KEY が設定されていません（.env.local または Vercel の環境変数を確認）" },
      { status: 500 },
    );
  }

  const sp = req.nextUrl.searchParams;
  const city = sp.get("city")?.trim();
  const lat = Number(sp.get("lat"));
  const lon = Number(sp.get("lon"));

  try {
    if (city) {
      return NextResponse.json(await getWeather({ city }, apiKey));
    }
    if (sp.has("lat") && sp.has("lon") && Number.isFinite(lat) && Number.isFinite(lon)) {
      return NextResponse.json(await getWeather({ lat, lon }, apiKey));
    }
    return NextResponse.json({ error: "city または lat/lon を指定してください" }, { status: 400 });
  } catch (e) {
    if (e instanceof WeatherError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    console.error(e);
    return NextResponse.json({ error: "サーバーエラーが発生しました" }, { status: 500 });
  }
}
