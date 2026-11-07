"use client";

import { useCallback, useEffect, useState } from "react";
import Calendar from "@/components/Calendar";
import Advice from "@/components/Advice";
import HourlyChart from "@/components/HourlyChart";
import CityCompare from "@/components/CityCompare";
import type { WeatherResponse } from "@/lib/weather";

const icon = (code: string, size: "" | "@2x" | "@4x" = "@2x") =>
  `https://openweathermap.org/img/wn/${code}${size}.png`;

const r = (n: number) => Math.round(n);

function formatDate(date: string) {
  const [y, m, d] = date.split("-").map(Number);
  const w = "日月火水木金土"[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
  return `${m}月${d}日（${w}）`;
}

export default function Home() {
  const [city, setCity] = useState("東京");
  const [data, setData] = useState<WeatherResponse | null>(null);
  const [selected, setSelected] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async (query: string) => {
    setLoading(true);
    setError("");
    try {
      // 自分のサーバー（/api/weather）を叩く。API キーはサーバー側にだけある。
      const res = await fetch(`/api/weather?${query}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "取得に失敗しました");
      setData(json);
      setSelected(json.today);
    } catch (e) {
      setError(e instanceof Error ? e.message : "取得に失敗しました");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(`city=${encodeURIComponent("東京")}`);
  }, [load]);

  const searchCity = (e: React.FormEvent) => {
    e.preventDefault();
    if (city.trim()) load(`city=${encodeURIComponent(city.trim())}`);
  };

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      setError("このブラウザは位置情報に対応していません");
      return;
    }
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => load(`lat=${pos.coords.latitude}&lon=${pos.coords.longitude}`),
      () => {
        setLoading(false);
        setError("位置情報を取得できませんでした（ブラウザの許可を確認してください）");
      },
      { timeout: 10000 },
    );
  };

  const day = data?.daily.find((d) => d.date === selected);
  const isToday = data && selected === data.today;

  return (
    <main className="container">
      <header className="top">
        <h1>お天気カレンダー</h1>
        <form onSubmit={searchCity} className="search">
          <input
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="都市名（例: 大阪, Toyama, London）"
            aria-label="都市名"
          />
          <button type="submit" disabled={loading}>検索</button>
          <button type="button" className="ghost" onClick={useMyLocation} disabled={loading}>
            📍 現在地
          </button>
        </form>
      </header>

      {error && <p className="error">{error}</p>}
      {loading && !data && <p className="muted">読み込み中…</p>}

      {data && (
        <div className={`layout ${loading ? "dim" : ""}`}>
          <section className="card main-card">
            <p className="place">
              {data.location.name}
              <span className="muted"> {data.location.country}</span>
            </p>
            <p className="date">{formatDate(selected)}{isToday && <span className="badge">今日・現在</span>}</p>

            {isToday ? (
              <div className="now">
                <img src={icon(data.current.icon, "@4x")} alt={data.current.description} width={120} height={120} />
                <div>
                  <p className="big">{r(data.current.temp)}°C</p>
                  <p>{data.current.description}</p>
                  <p className="muted">体感 {r(data.current.feelsLike)}°C ・ 風 {data.current.windSpeed} m/s</p>
                </div>
              </div>
            ) : (
              day && (
                <div className="now">
                  <img src={icon(day.icon, "@4x")} alt={day.description} width={120} height={120} />
                  <div>
                    <p className="big">
                      {r(day.tempMax)}° <span className="low">/ {r(day.tempMin)}°</span>
                    </p>
                    <p>{day.description}</p>
                  </div>
                </div>
              )
            )}

            {day && (
              <div className="stats">
                <div><span>最高 / 最低</span><b>{r(day.tempMax)}° / {r(day.tempMin)}°</b></div>
                <div><span>湿度</span><b>{isToday ? data.current.humidity : day.humidity}%</b></div>
                <div><span>降水確率</span><b>{day.pop}%</b></div>
              </div>
            )}

            {day && (
              <>
                <h2>服装・傘のアドバイス</h2>
                <Advice day={day} />
              </>
            )}

            {day && (
              <>
                <h2>気温と降水確率の変化</h2>
                <HourlyChart hourly={day.hourly} />
              </>
            )}

            {day && (
              <>
                <h2>3時間ごとの予報</h2>
                <div className="hourly">
                  {day.hourly.map((h) => (
                    <div key={h.time} className="hour">
                      <span className="muted">{h.time}</span>
                      <img src={icon(h.icon)} alt={h.description} width={48} height={48} />
                      <b>{r(h.temp)}°</b>
                      <span className="pop">☔ {h.pop}%</span>
                      <span className="muted">💧{h.humidity}%</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </section>

          <aside className="card">
            <Calendar
              key={`${data.location.lat},${data.location.lon}`}
              daily={data.daily}
              today={data.today}
              selected={selected}
              onSelect={setSelected}
            />
            <ul className="week">
              {data.daily.map((d) => (
                <li key={d.date}>
                  <button
                    type="button"
                    className={d.date === selected ? "active" : ""}
                    onClick={() => setSelected(d.date)}
                  >
                    <span>{formatDate(d.date)}</span>
                    <img src={icon(d.icon)} alt={d.description} width={36} height={36} />
                    <span>{r(d.tempMax)}° / {r(d.tempMin)}°</span>
                    <span className="pop">☔ {d.pop}%</span>
                  </button>
                </li>
              ))}
            </ul>
          </aside>
        </div>
      )}

      {data && <CityCompare base={data} />}

      <footer className="muted foot">
        Weather data © <a href="https://openweathermap.org/" target="_blank" rel="noreferrer">OpenWeatherMap</a>
      </footer>
    </main>
  );
}
