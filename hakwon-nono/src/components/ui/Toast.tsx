"use client";

import { Toaster as SonnerToaster } from "sonner";

/** 토스트 프로바이더 (sonner 기반) — layout.tsx에 배치 */
export default function ToastProvider() {
  return (
    <SonnerToaster
      position="bottom-center"
      richColors
      closeButton
      duration={3500}
      toastOptions={{
        classNames: {
          toast:
            "bg-card text-card-foreground border border-border rounded-lg shadow-overlay",
          title: "text-sm font-medium",
          description: "text-xs text-muted-foreground",
        },
      }}
    />
  );
}

export { toast } from "sonner";
