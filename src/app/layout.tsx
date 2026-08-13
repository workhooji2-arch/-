import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "조교 급여 대장",
  description: "조교 등록, 근무 기록, 급여 계산을 관리하는 도구",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
