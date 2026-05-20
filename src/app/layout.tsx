import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "우리 학교 주변 배움지도 | 대동학원도 2.0",
  description:
    "실제 학교·학원 데이터로 가까운 학원, 학원비 부담, 오가는 길, 무료 배움터 빈틈을 살펴보는 교육 서비스"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
