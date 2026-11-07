import type { HourlyItem } from "@/lib/weather";

// 追加機能2：気温・降水確率のグラフ
// 誰の：その日の予定（外出・洗濯など）を立てたい人
// 課題：3時間ごとの数字が横に並ぶだけだと、いつ暖かくなり、いつ雨が降りそうかが分かりにくい
// 解決：気温を折れ線、降水確率を棒グラフにして、1日の変化をひと目で分かるようにする

const W = 640;
const H = 220;
const PAD = { top: 24, right: 16, bottom: 28, left: 16 };

export default function HourlyChart({ hourly }: { hourly: HourlyItem[] }) {
  if (hourly.length < 2) {
    return <p className="muted chart-note">この日はデータが1件だけなのでグラフは表示されません（夜遅くは今日の予報が残っていません）。</p>;
  }

  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const step = innerW / hourly.length;
  const cx = (i: number) => PAD.left + step * i + step / 2;

  const temps = hourly.map((h) => h.temp);
  const tMin = Math.floor(Math.min(...temps)) - 2;
  const tMax = Math.ceil(Math.max(...temps)) + 2;
  // 気温の線は上半分〜中央に、降水確率の棒は下から
  const ty = (t: number) => PAD.top + (1 - (t - tMin) / (tMax - tMin)) * innerH * 0.65;
  const barMaxH = innerH * 0.3;
  const baseY = PAD.top + innerH;

  const line = hourly.map((h, i) => `${i ? "L" : "M"}${cx(i).toFixed(1)},${ty(h.temp).toFixed(1)}`).join(" ");

  return (
    <figure className="chart">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="3時間ごとの気温と降水確率のグラフ">
        {/* 降水確率（棒） */}
        {hourly.map((h, i) => {
          const bh = (h.pop / 100) * barMaxH;
          return (
            <g key={`b${h.time}`}>
              <rect
                x={cx(i) - step * 0.3}
                y={baseY - bh}
                width={step * 0.6}
                height={Math.max(bh, 1)}
                rx={3}
                className="bar"
              />
              {h.pop > 0 && (
                <text x={cx(i)} y={baseY - bh - 4} textAnchor="middle" className="bar-label">{h.pop}%</text>
              )}
            </g>
          );
        })}
        <line x1={PAD.left} x2={W - PAD.right} y1={baseY} y2={baseY} className="axis" />

        {/* 気温（折れ線） */}
        <path d={line} className="temp-line" fill="none" />
        {hourly.map((h, i) => (
          <g key={`p${h.time}`}>
            <circle cx={cx(i)} cy={ty(h.temp)} r={4} className="temp-dot" />
            <text x={cx(i)} y={ty(h.temp) - 10} textAnchor="middle" className="temp-label">{Math.round(h.temp)}°</text>
          </g>
        ))}

        {/* 時刻 */}
        {hourly.map((h, i) => (
          <text key={`t${h.time}`} x={cx(i)} y={H - 8} textAnchor="middle" className="time-label">{h.time}</text>
        ))}
      </svg>
      <figcaption className="legend">
        <span><i className="sw sw-line" />気温（°C）</span>
        <span><i className="sw sw-bar" />降水確率（%）</span>
      </figcaption>
    </figure>
  );
}
