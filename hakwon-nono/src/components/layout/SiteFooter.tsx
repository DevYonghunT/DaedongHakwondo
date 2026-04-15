import Link from "next/link";

export default function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-border bg-card/40">
      <div className="container px-4 py-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-muted-foreground">
        <p>
          © {new Date().getFullYear()} 대동학원도 · 교육 공공데이터 활용 · 제8회 AI 활용대회
        </p>
        <div className="flex items-center gap-4">
          <Link href="https://open.neis.go.kr" className="hover:text-foreground transition-colors" target="_blank" rel="noreferrer">
            나이스 교육정보 개방포털
          </Link>
          <Link href="/dashboard" className="hover:text-foreground transition-colors">
            전국 통계
          </Link>
        </div>
      </div>
    </footer>
  );
}
