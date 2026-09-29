import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import type { ReactNode } from "react";
import "./globals.css";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope"
});

export const metadata: Metadata = {
  title: "暑期選修作品畫廊",
  description: "暑期選修課程的同學作品畫廊。",
  // 拒絕 AI 收集本站內容：noai / noimageai 是慣例標記，tdm-reservation 是歐盟 TDM 保留聲明。
  // 圖檔本身的同款標頭在 public/_headers。
  robots: "noai, noimageai",
  other: { "tdm-reservation": "1" }
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="zh-Hant" className={manrope.variable}>
      {/* ClassroomProvider 只掛在 /student 與 /teacher 之下（見 components/role-shell.tsx），
          登入與註冊頁不需要選課資料。 */}
      <body>{children}</body>
    </html>
  );
}
