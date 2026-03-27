'use client';

import { useEffect, useState } from 'react';
import { getRealmColor } from '@/lib/constants';

/** 학원 상세 데이터 */
export interface AcademyDetailData {
  id: string;
  academyNm: string;
  academyType: string | null;
  realmScNm: string | null;
  leOrdNm: string | null;
  leCrseNm: string | null;
  leSubjectNm: string | null;
  capacity: number | null;
  tuitionFee: number | null;
  address: string | null;
  addressDetail: string | null;
  zipCode: string | null;
  phoneNumber: string | null;
  latitude: number | null;
  longitude: number | null;
  regStatus: string | null;
  establishedDate: string | null;
  closedDate: string | null;
  atptOfcdcScNm: string | null;
  isBranch: string | null;
  totalCapacity: number | null;
  courseList: string | null;
  tuitionBreakdown: Array<{ subject: string; fee: number }>;
}

interface AcademyDetailProps {
  academyId: string;
  onClose: () => void;
  embedded?: boolean;
}

/** 날짜 문자열(YYYYMMDD) → 보기 좋은 형식 */
function formatDate(dateStr: string | null): string {
  if (!dateStr || dateStr.trim() === '' || dateStr === '99991231') return '-';
  const y = dateStr.slice(0, 4);
  const m = dateStr.slice(4, 6);
  const d = dateStr.slice(6, 8);
  return `${y}.${m}.${d}`;
}

/** 수강료 포맷 */
function formatFee(fee: number): string {
  return fee.toLocaleString() + '원';
}

export default function AcademyDetail({ academyId, onClose, embedded }: AcademyDetailProps) {
  const [academy, setAcademy] = useState<AcademyDetailData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDetail = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/academies/${academyId}`);
        if (!res.ok) throw new Error('조회 실패');
        const data = await res.json();
        setAcademy(data.academy);
      } catch {
        setError('학원 정보를 불러올 수 없습니다.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchDetail();
  }, [academyId]);

  // 분야별 색상 조회 (DB 원본명 → 그룹 색상 자동 변환)
  const realmColor = academy?.realmScNm
    ? getRealmColor(academy.realmScNm)
    : '#6B7280';

  return (
    <div className={embedded ? "flex flex-col h-full" : "fixed top-14 right-0 bottom-8 w-full sm:w-[400px] z-[1100] flex flex-col bg-white shadow-2xl border-l border-gray-200 animate-slide-in-right"}>
      {/* 헤더 */}
      <div className="flex-shrink-0 px-5 py-4 bg-gradient-to-r from-indigo-500 to-blue-600">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0 pr-3">
            {/* 분야 배지 */}
            {academy?.realmScNm && (
              <span
                className="inline-block px-2 py-0.5 text-xs font-medium text-white rounded-full mb-2"
                style={{ backgroundColor: realmColor }}
              >
                {academy.realmScNm}
              </span>
            )}
            {/* 학원명 */}
            <h2 className="text-lg font-bold text-white leading-tight truncate">
              {isLoading ? '불러오는 중...' : academy?.academyNm || '학원 정보'}
            </h2>
            {/* 학원 유형 */}
            {academy?.academyType && (
              <p className="text-sm text-blue-100 mt-0.5">
                {academy.academyType}
                {academy.isBranch === 'Y' && ' · 분원'}
              </p>
            )}
          </div>
          {/* 닫기 버튼 */}
          <button
            onClick={onClose}
            className="flex-shrink-0 p-1 rounded-full hover:bg-white/20 transition-colors"
            aria-label="닫기"
          >
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* 본문 */}
      <div className="flex-1 overflow-y-auto">
        {isLoading && (
          <div className="flex items-center justify-center h-40">
            <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {error && (
          <div className="p-5 text-center text-red-500 text-sm">{error}</div>
        )}

        {academy && !isLoading && (
          <div className="divide-y divide-gray-100">
            {/* 기본 정보 */}
            <Section title="기본 정보" icon="📍">
              <InfoRow label="주소" value={
                academy.address
                  ? `${academy.address}${academy.addressDetail || ''}`
                  : '-'
              } />
              {academy.phoneNumber && academy.phoneNumber.trim() !== '' && (
                <InfoRow label="전화번호" value={academy.phoneNumber} />
              )}
              <InfoRow label="교육청" value={academy.atptOfcdcScNm} />
              <InfoRow label="등록상태" value={
                <span className={`inline-flex items-center gap-1 ${
                  academy.regStatus === '개원' ? 'text-green-600' : 'text-gray-500'
                }`}>
                  <span className={`w-2 h-2 rounded-full ${
                    academy.regStatus === '개원' ? 'bg-green-500' : 'bg-gray-400'
                  }`} />
                  {academy.regStatus || '-'}
                </span>
              } />
              <InfoRow label="설립일" value={formatDate(academy.establishedDate)} />
            </Section>

            {/* 교습 정보 */}
            <Section title="교습 정보" icon="📚">
              <InfoRow label="교습계열" value={academy.leOrdNm} />
              <InfoRow label="교습과정" value={academy.leCrseNm} />
              {academy.leSubjectNm && (
                <InfoRow label="교습과목" value={academy.leSubjectNm} />
              )}
              {academy.courseList && (
                <InfoRow label="과목 목록" value={academy.courseList} />
              )}
              {academy.totalCapacity && (
                <InfoRow label="총 정원" value={`${academy.totalCapacity}명`} />
              )}
              {academy.capacity && (
                <InfoRow label="수용 인원" value={`${academy.capacity}명`} />
              )}
            </Section>

            {/* 수강료 */}
            <Section title="수강료" icon="💰">
              {academy.tuitionBreakdown.length > 0 ? (
                <div className="space-y-2">
                  {academy.tuitionBreakdown.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between py-1.5 px-3 bg-gray-50 rounded-lg">
                      <span className="text-sm text-gray-700">{item.subject}</span>
                      <span className="text-sm font-semibold text-blue-600">
                        {item.fee > 0 ? formatFee(item.fee) : '-'}
                      </span>
                    </div>
                  ))}
                </div>
              ) : academy.tuitionFee ? (
                <div className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg">
                  <span className="text-sm text-gray-700">수강료</span>
                  <span className="text-sm font-semibold text-blue-600">
                    {formatFee(academy.tuitionFee)}
                  </span>
                </div>
              ) : (
                <p className="text-sm text-gray-400">수강료 정보가 없습니다.</p>
              )}
            </Section>
          </div>
        )}
      </div>

      {/* 슬라이드인 애니메이션 */}
      <style jsx global>{`
        @keyframes slide-in-right {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        .animate-slide-in-right {
          animation: slide-in-right 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}

/** 섹션 컴포넌트 */
function Section({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <div className="px-5 py-4">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-800 mb-3">
        <span>{icon}</span>
        {title}
      </h3>
      <div className="space-y-2">
        {children}
      </div>
    </div>
  );
}

/** 정보 행 컴포넌트 */
function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <span className="text-xs text-gray-400 w-16 flex-shrink-0 pt-0.5">{label}</span>
      <span className="text-sm text-gray-700 flex-1">
        {value || '-'}
      </span>
    </div>
  );
}
