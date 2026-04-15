import type { Metadata } from "next";
import "./globals.css";
import ToastProvider from "@/components/ui/Toast";

export const metadata: Metadata = {
  title: "대동학원도 — 우리 동네 사교육 지도",
  description:
    "교육 공공데이터로 본 전국 학원·교습소 21만개. 분야·예산·접근성·수강료 분석을 한 화면에서. 제8회 교육 공공데이터 AI활용대회 출품작.",
  keywords: [
    "학원",
    "사교육",
    "교육데이터",
    "학원검색",
    "학원지도",
    "교육공공데이터",
    "대동학원도",
  ],
  openGraph: {
    title: "대동학원도 — 우리 동네 사교육 지도",
    description: "교육 공공데이터로 본 전국 학원 분포·수강료·접근성 분석",
    type: "website",
    locale: "ko_KR",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
        {/* Pretendard 본문 폰트 */}
        <link
          rel="stylesheet"
          as="style"
          crossOrigin="anonymous"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
        {/* Inter — Claude.ai 톤의 sans (라틴/숫자) */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Source+Serif+Pro:wght@600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased min-h-screen bg-background text-foreground">
        {children}
        <ToastProvider />
      </body>
    </html>
  );
}
