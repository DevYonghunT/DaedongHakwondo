import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '학원노노 - 우리 동네 학원을 한눈에',
  description:
    '교육 공공데이터를 활용한 지역별 학원 분포 시각화 서비스. 나이스 학원교습소 데이터로 우리 동네 사교육 현황을 지도 위에서 한눈에 확인하세요.',
  keywords: [
    '학원',
    '사교육',
    '교육데이터',
    '학원검색',
    '학원지도',
    '교육공공데이터',
    '학원노노',
  ],
  openGraph: {
    title: '학원노노 - 우리 동네 학원을 한눈에',
    description:
      '교육 공공데이터를 활용한 지역별 학원 분포 시각화 서비스',
    type: 'website',
    locale: 'ko_KR',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <head>
        {/* Pretendard 폰트 CDN */}
        <link
          rel="stylesheet"
          as="style"
          crossOrigin="anonymous"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
      </head>
      <body className="antialiased flex flex-col min-h-screen">
        {children}
      </body>
    </html>
  );
}
