'use client';

import { Toaster } from 'react-hot-toast';

/** 토스트 알림 프로바이더 — layout.tsx에 배치 */
export default function ToastProvider() {
  return (
    <Toaster
      position="bottom-center"
      gutter={8}
      toastOptions={{
        duration: 3000,
        style: {
          background: '#1E293B',
          color: '#F8FAFC',
          fontSize: '0.875rem',
          fontWeight: '500',
          borderRadius: '0.75rem',
          padding: '0.75rem 1rem',
          boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
          maxWidth: '400px',
        },
        success: {
          iconTheme: {
            primary: '#22C55E',
            secondary: '#F8FAFC',
          },
        },
        error: {
          iconTheme: {
            primary: '#EF4444',
            secondary: '#F8FAFC',
          },
        },
      }}
    />
  );
}
