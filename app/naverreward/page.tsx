"use client";

import { Suspense, useEffect } from "react";
import { useRouter } from "next/navigation";
import { readClickKeyFromSearch } from "@/lib/click-key";

// 네이버페이 리워드(엔비티 AdiSON) 광고 유입 — utm_source 를 붙여 메인 폼으로 넘긴다 (오피스 문의 DB 대분류 "네이버리워드")
// 매체가 붙여주는 click_key 는 값 검사 없이 원본 그대로 넘긴다(포스트백 연동용).
// click_key 외의 추적 파라미터도 유실 없이 함께 넘긴다.
function NaverRewardRedirect() {
  const router = useRouter();

  useEffect(() => {
    const search = window.location.search;
    const clickKey = readClickKeyFromSearch(search);

    const target = new URLSearchParams();
    target.set("utm_source", "naverreward");
    target.set("utm_medium", "reward");
    target.set("utm_campaign", "recruitment");

    for (const [key, value] of new URLSearchParams(search)) {
      if (key === "click_key" || target.has(key)) continue;
      target.set(key, value);
    }

    const clickKeyQuery = clickKey
      ? `&click_key=${encodeURIComponent(clickKey)}`
      : "";

    router.replace(`/?${target.toString()}${clickKeyQuery}`);
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

export default function NaverRewardPage() {
  return (
    <Suspense fallback={null}>
      <NaverRewardRedirect />
    </Suspense>
  );
}
