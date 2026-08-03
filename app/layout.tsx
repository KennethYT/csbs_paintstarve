import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import type { ReactNode } from "react";
import "./globals.css";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope"
});

export const metadata: Metadata = {
  title: "選課搶課系統",
  description: "Next.js 16 版的選課搶課系統"
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
