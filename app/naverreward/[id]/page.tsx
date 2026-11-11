"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { readClickKeyFromSearch, splitPathSegment } from "@/lib/click-key";

// 네이버페이 리워드 소재별 유입 — /naverreward/{소재코드} → click_source "네이버리워드_소재_{코드}"
// 매체가 붙여주는 click_key 는 값 검사 없이 원본 그대로 메인 폼으로 넘긴다(포스트백 연동용).
// click_key 외의 추적 파라미터도 유실 없이 함께 넘긴다.
function NaverRewardMaterialRedirect() {
  const router = useRouter();
  const params = useParams();

  useEffect(() => {
    const search = window.location.search;
    const rawSegment = (params.id as string) ?? "";
    const { id: materialId, embeddedQuery } = splitPathSegment(rawSegment);

    // 정상 쿼리에서 먼저 찾고, 없으면 경로에 끼어 들어온 click_key 를 쓴다.
    const clickKey =
      readClickKeyFromSearch(search) ?? readClickKeyFromSearch(embeddedQuery);

    const target = new URLSearchParams();
    target.set("utm_source", "naverreward");
    target.set("utm_medium", "reward");
    target.set(
      "utm_campaign",
      materialId ? `material_${materialId}` : "recruitment"
    );
    if (materialId) target.set("material_id", materialId);

    // 매체가 붙인 나머지 추적 파라미터 승계
    for (const [key, value] of new URLSearchParams(search)) {
      if (key === "click_key" || target.has(key)) continue;
      target.set(key, value);
    }

    const clickKeyQuery = clickKey
      ? `&click_key=${encodeURIComponent(clickKey)}`
      : "";

    router.replace(`/?${target.toString()}${clickKeyQuery}`);
  }, [router, params]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
        <p className="mt-4 text-gray-600">이동 중...</p>
      </div>
    </div>
  );
}

export default function NaverRewardMaterialPage() {
  return (
    <Suspense fallback={null}>
      <NaverRewardMaterialRedirect />
    </Suspense>
  );
}
