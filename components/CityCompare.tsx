"use client";

import { useState } from "react";
import type { WeatherResponse } from "@/lib/weather";

// 追加機能3：2都市の比較
// 誰の：旅行先や出張先を選ぶ人、離れて住む家族の天気も気になる人
// 課題：2つの都市を交互に検索して見比べるのは手間で、違いを覚えておけない
// 解決：もう1つの都市を入力すると、日付ごとに2都市の天気・気温・降水確率を横に並べて表示する

const icon = (code: string) => `https://openweathermap.org/img/wn/${code}.png`;
const r = (n: number) => Math.round(n);

function shortDate(date: string) {
  const [y, m, d] = date.split("-").map(Number);
  const w = "日月火水木金土"[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
  return `${m}/${d}（${w}）`;
}

export default function CityCompare({ base }: { base: WeatherResponse }) {
  const [city, setCity] = useState("大阪");
  const [other, setOther] = useState<WeatherResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const compare = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!city.trim()) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/weather?city=${encodeURIComponent(city.trim())}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "取得に失敗しました");
      setOther(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "取得に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  // 両方にある日付だけを並べる
  const otherByDate = new Map(other?.daily.map((d) => [d.date, d]) ?? []);
  const rows = base.daily.filter((d) => otherByDate.has(d.date));

  return (
    <section className="card compare">
      <h2>2都市の比較</h2>
      <form onSubmit={compare} className="search">
        <input
          value={city}
          onChange={(e) => setCity(e.target.value)}
          placeholder="比べたい都市（例: 札幌, Seoul）"
          aria-label="比べたい都市"
        />
        <button type="submit" disabled={loading}>{loading ? "取得中…" : "比較する"}</button>
      </form>
      {error && <p className="error">{error}</p>}

      {other && (
        <div className="compare-wrap">
          <table className="compare-table">
            <thead>
              <tr>
                <th>日付</th>
                <th>{base.location.name}</th>
                <th>{other.location.name}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((a) => {
                const b = otherByDate.get(a.date)!;
                const warmer = r(a.tempMax) === r(b.tempMax) ? null : a.tempMax > b.tempMax ? "a" : "b";
                return (
                  <tr key={a.date}>
                    <td>{shortDate(a.date)}</td>
                    {[a, b].map((d, i) => (
                      <td key={i}>
                        <div className="cmp-cell">
                          <img src={icon(d.icon)} alt={d.description} width={36} height={36} />
                          <span className={warmer === (i ? "b" : "a") ? "warm" : ""}>
                            {r(d.tempMax)}° / {r(d.tempMin)}°
                          </span>
                          <span className="pop">☔ {d.pop}%</span>
                        </div>
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="muted chart-note">赤字はその日の最高気温が高いほうの都市です。</p>
        </div>
      )}
    </section>
  );
}
