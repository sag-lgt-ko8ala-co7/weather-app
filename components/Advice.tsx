import type { DailyForecast } from "@/lib/weather";

// 追加機能1：服装・傘のアドバイス
// 誰の：朝、出かける準備をする人
// 課題：数字（気温・降水確率）を見ても、何を着るか・傘が要るかをすぐ判断できない
// 解決：その日の最高/最低気温と降水確率から、ひと言のアドバイスに変換して表示する

type Tip = { icon: string; title: string; text: string };

export function getAdvice(day: DailyForecast): Tip[] {
  const tips: Tip[] = [];

  // 傘（その日の最大降水確率で判断）
  if (day.pop >= 50) {
    tips.push({ icon: "☂️", title: "傘を持って出かけましょう", text: `降水確率は最大${day.pop}%です` });
  } else if (day.pop >= 30) {
    tips.push({ icon: "🌂", title: "折りたたみ傘があると安心", text: `降水確率は最大${day.pop}%です` });
  } else {
    tips.push({ icon: "🙆", title: "傘はなくても大丈夫そう", text: `降水確率は最大${day.pop}%です` });
  }

  // 服装（最高気温で判断）
  const max = Math.round(day.tempMax);
  let clothes: Tip;
  if (max >= 28) clothes = { icon: "👕", title: "半袖でOK", text: "暑くなります。水分補給を忘れずに" };
  else if (max >= 23) clothes = { icon: "👚", title: "長袖シャツ1枚くらい", text: "日中は過ごしやすい気温です" };
  else if (max >= 18) clothes = { icon: "🧥", title: "薄手の上着があると安心", text: "カーディガンやジャケットがちょうどいい" };
  else if (max >= 12) clothes = { icon: "🧥", title: "コートかセーターを", text: "しっかりめの上着が必要です" };
  else clothes = { icon: "🧣", title: "冬のコートと防寒具を", text: "マフラーや手袋もあると安心です" };
  tips.push({ ...clothes, text: `最高${max}°C。${clothes.text}` });

  // 寒暖差（最高と最低の差が大きい日）
  const diff = Math.round(day.tempMax - day.tempMin);
  if (diff >= 8) {
    tips.push({ icon: "🌡️", title: "寒暖差に注意", text: `最高と最低の差が${diff}°C。脱ぎ着しやすい服装で` });
  }

  return tips;
}

export default function Advice({ day }: { day: DailyForecast }) {
  return (
    <div className="advice">
      {getAdvice(day).map((t) => (
        <div key={t.title} className="tip">
          <span className="tip-icon" aria-hidden>{t.icon}</span>
          <div>
            <b>{t.title}</b>
            <p className="muted">{t.text}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
