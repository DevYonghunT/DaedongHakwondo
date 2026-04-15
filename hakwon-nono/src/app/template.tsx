"use client";

import { motion } from "framer-motion";

/**
 * 페이지 전환 애니메이션 템플릿.
 * Next.js의 template.tsx는 페이지 이동 시마다 새로 마운트되어 트랜지션 효과를 제공한다.
 */
export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}
