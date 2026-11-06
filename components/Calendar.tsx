"use client";

import { useEffect, useMemo, useState } from "react";
import type { DailyForecast } from "@/lib/weather";

type Props = {
  daily: DailyForecast[];
  today: string; // "YYYY-MM-DD"
  selected: string;
  onSelect: (date: string) => void;
};

const WEEK = ["日", "月", "火", "水", "木", "金", "土"];

const pad = (n: number) => String(n).padStart(2, "0");
const ymd = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;

/** 月カレンダー。予報がある日だけ選べる（無料APIは今日から約5日分） */
export default function Calendar({ daily, today, selected, onSelect }: Props) {
  const byDate = useMemo(() => new Map(daily.map((d) => [d.date, d])), [daily]);

  // 表示する月（選択中の日付の月から開始）
  const [view, setView] = useState(() => {
    const [y, m] = selected.split("-").map(Number);
    return { y, m: m - 1 };
  });

  // 一覧側で別の月の日付が選ばれたら、カレンダーもその月へ移動
  useEffect(() => {
    const [y, m] = selected.split("-").map(Number);
    setView({ y, m: m - 1 });
  }, [selected]);

  const first = new Date(Date.UTC(view.y, view.m, 1));
  const daysInMonth = new Date(Date.UTC(view.y, view.m + 1, 0)).getUTCDate();
  const offset = first.getUTCDay();

  const cells: (number | null)[] = [
    ...Array(offset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7) cells.push(null);

  const monthKey = `${view.y}-${pad(view.m + 1)}`;
  const dates = daily.map((d) => d.date.slice(0, 7));
  const canPrev = dates.some((k) => k < monthKey);
  const canNext = dates.some((k) => k > monthKey);
  const move = (delta: number) =>
    setView(({ y, m }) => {
      const d = new Date(Date.UTC(y, m + delta, 1));
      return { y: d.getUTCFullYear(), m: d.getUTCMonth() };
    });

  return (
    <div className="calendar">
      <div className="cal-head">
        <button type="button" onClick={() => move(-1)} disabled={!canPrev} aria-label="前の月">‹</button>
        <span>{view.y}年 {view.m + 1}月</span>
        <button type="button" onClick={() => move(1)} disabled={!canNext} aria-label="次の月">›</button>
      </div>
      <div className="cal-grid">
        {WEEK.map((w, i) => (
          <div key={w} className={`cal-week ${i === 0 ? "sun" : i === 6 ? "sat" : ""}`}>{w}</div>
        ))}
        {cells.map((d, i) => {
          if (d === null) return <div key={`e${i}`} />;
          const date = ymd(view.y, view.m, d);
          const f = byDate.get(date);
          const cls = ["cal-day", f ? "has" : "", date === selected ? "selected" : "", date === today ? "today" : ""]
            .filter(Boolean)
            .join(" ");
          return (
            <button
              key={date}
              type="button"
              className={cls}
              disabled={!f}
              onClick={() => f && onSelect(date)}
              title={f ? `${f.description} ${Math.round(f.tempMax)}° / ${Math.round(f.tempMin)}°` : "予報なし"}
            >
              <span className="num">{d}</span>
              {f && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={`https://openweathermap.org/img/wn/${f.icon}.png`} alt="" width={28} height={28} />
              )}
            </button>
          );
        })}
      </div>
      <p className="cal-note">色のついた日付（今日から約5日間）の予報を選べます</p>
    </div>
  );
}
