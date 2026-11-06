import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "お天気カレンダー",
  description: "OpenWeatherMap の予報を日付ごとに見られる天気アプリ",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
