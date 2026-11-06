// OpenWeatherMap の無料 API（Current Weather / 5 day・3 hour Forecast / Geocoding）を扱う処理。
// このファイルはサーバー側（app/api/weather/route.ts）からだけ呼ばれる。

const BASE = "https://api.openweathermap.org";

// ---------- API レスポンスの型（使う項目だけ） ----------
type OwmWeather = { id: number; main: string; description: string; icon: string };

type OwmCurrent = {
  dt: number;
  timezone: number;
  name: string;
  sys: { country?: string };
  coord: { lat: number; lon: number };
  main: { temp: number; feels_like: number; humidity: number; temp_min: number; temp_max: number };
  weather: OwmWeather[];
  wind: { speed: number };
};

type OwmForecastItem = {
  dt: number;
  main: { temp: number; humidity: number; temp_min: number; temp_max: number };
  weather: OwmWeather[];
  pop: number; // 降水確率 0〜1
  wind: { speed: number };
};

type OwmForecast = {
  list: OwmForecastItem[];
  city: { name: string; country: string; timezone: number; coord: { lat: number; lon: number } };
};

// ---------- アプリで使う整形済みの型 ----------
export type HourlyItem = {
  time: string; // "HH:mm"（現地時刻）
  temp: number;
  humidity: number;
  pop: number; // 0〜100 (%)
  description: string;
  icon: string;
};

export type DailyForecast = {
  date: string; // "YYYY-MM-DD"（現地日付）
  tempMin: number;
  tempMax: number;
  humidity: number; // 平均
  pop: number; // その日の最大降水確率 (%)
  description: string;
  icon: string;
  hourly: HourlyItem[];
};

export type WeatherResponse = {
  location: { name: string; country: string; lat: number; lon: number };
  today: string; // 現地の今日 "YYYY-MM-DD"
  current: {
    temp: number;
    feelsLike: number;
    humidity: number;
    pop: number | null; // 現在値には降水確率が無いので直近の予報値を入れる
    description: string;
    icon: string;
    windSpeed: number;
  };
  daily: DailyForecast[];
};

export class WeatherError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

// ---------- 取得処理 ----------
async function owmFetch<T>(path: string, params: Record<string, string>, apiKey: string): Promise<T> {
  const url = new URL(path, BASE);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  url.searchParams.set("appid", apiKey);

  // 10 分キャッシュ（無料枠の呼び出し回数を節約）
  const res = await fetch(url, { next: { revalidate: 600 } });
  if (!res.ok) {
    if (res.status === 401) throw new WeatherError("API キーが無効です（発行直後は有効化まで数十分〜数時間かかることがあります）", 401);
    if (res.status === 404) throw new WeatherError("都市が見つかりませんでした", 404);
    if (res.status === 429) throw new WeatherError("API の呼び出し上限に達しました。しばらく待ってから試してください", 429);
    throw new WeatherError(`天気 API の取得に失敗しました (${res.status})`, 502);
  }
  return res.json() as Promise<T>;
}

/** 都市名 → 緯度経度（日本語の都市名もOK） */
async function geocode(city: string, apiKey: string) {
  const results = await owmFetch<Array<{ name: string; local_names?: Record<string, string>; lat: number; lon: number; country: string }>>(
    "/geo/1.0/direct",
    { q: city, limit: "1" },
    apiKey,
  );
  if (!results.length) throw new WeatherError(`「${city}」が見つかりませんでした`, 404);
  const r = results[0];
  return { lat: r.lat, lon: r.lon, name: r.local_names?.ja ?? r.name, country: r.country };
}

export async function getWeather(
  query: { city: string } | { lat: number; lon: number },
  apiKey: string,
): Promise<WeatherResponse> {
  let lat: number, lon: number;
  let displayName: string | undefined;

  if ("city" in query) {
    const g = await geocode(query.city, apiKey);
    ({ lat, lon } = g);
    displayName = g.name;
  } else {
    ({ lat, lon } = query);
  }

  const common = { lat: String(lat), lon: String(lon), units: "metric", lang: "ja" };
  const [current, forecast] = await Promise.all([
    owmFetch<OwmCurrent>("/data/2.5/weather", common, apiKey),
    owmFetch<OwmForecast>("/data/2.5/forecast", common, apiKey),
  ]);

  return buildResponse(current, forecast, displayName);
}

// ---------- 整形 ----------
/** UNIX 秒 + タイムゾーン差（秒）→ 現地の日付・時刻 */
function localParts(dt: number, tzOffsetSec: number) {
  const d = new Date((dt + tzOffsetSec) * 1000); // UTC として扱うと現地時刻になる
  const iso = d.toISOString(); // "YYYY-MM-DDTHH:mm:ss.sssZ"
  return { date: iso.slice(0, 10), time: iso.slice(11, 16), hour: d.getUTCHours() };
}

export function buildResponse(current: OwmCurrent, forecast: OwmForecast, displayName?: string): WeatherResponse {
  const tz = forecast.city.timezone ?? current.timezone;

  // 3 時間ごとの予報を「現地の日付」でまとめる
  const groups = new Map<string, OwmForecastItem[]>();
  for (const item of forecast.list) {
    const { date } = localParts(item.dt, tz);
    if (!groups.has(date)) groups.set(date, []);
    groups.get(date)!.push(item);
  }

  const daily: DailyForecast[] = [...groups.entries()].map(([date, items]) => {
    // 代表の天気: 12時に一番近いコマ
    const rep = items.reduce((best, it) =>
      Math.abs(localParts(it.dt, tz).hour - 12) < Math.abs(localParts(best.dt, tz).hour - 12) ? it : best,
    );
    return {
      date,
      tempMin: Math.min(...items.map((i) => i.main.temp_min)),
      tempMax: Math.max(...items.map((i) => i.main.temp_max)),
      humidity: Math.round(items.reduce((s, i) => s + i.main.humidity, 0) / items.length),
      pop: Math.round(Math.max(...items.map((i) => i.pop)) * 100),
      description: rep.weather[0]?.description ?? "",
      icon: rep.weather[0]?.icon ?? "01d",
      hourly: items.map((i) => ({
        time: localParts(i.dt, tz).time,
        temp: i.main.temp,
        humidity: i.main.humidity,
        pop: Math.round(i.pop * 100),
        description: i.weather[0]?.description ?? "",
        icon: i.weather[0]?.icon ?? "01d",
      })),
    };
  });

  const today = localParts(current.dt, tz).date;
  const nextPop = forecast.list[0] ? Math.round(forecast.list[0].pop * 100) : null;

  return {
    location: {
      name: displayName ?? current.name ?? forecast.city.name,
      country: current.sys.country ?? forecast.city.country,
      lat: current.coord.lat,
      lon: current.coord.lon,
    },
    today,
    current: {
      temp: current.main.temp,
      feelsLike: current.main.feels_like,
      humidity: current.main.humidity,
      pop: nextPop,
      description: current.weather[0]?.description ?? "",
      icon: current.weather[0]?.icon ?? "01d",
      windSpeed: current.wind.speed,
    },
    daily,
  };
}
