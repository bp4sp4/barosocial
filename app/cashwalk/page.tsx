"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// 캐시워크 광고 유입 — utm_source 를 붙여 메인 폼으로 넘긴다 (오피스 문의 DB 대분류 "캐시워크")
export default function CashwalkRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace(
      "/?utm_source=cashwalk&utm_medium=social&utm_campaign=recruitment"
    );
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
        <p className="mt-4 text-gray-600">이동 중...</p>
      </div>
    </div>
  );
}
