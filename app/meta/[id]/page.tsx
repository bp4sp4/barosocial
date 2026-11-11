"use client";

import { useEffect } from "react";
import { useRouter, useParams } from "next/navigation";

export default function MetaMaterialRedirect() {
  const router = useRouter();
  const params = useParams();

  useEffect(() => {
    const materialId = params.id as string;

    if (materialId) {
      router.replace(
        `/?utm_source=meta&utm_medium=social&utm_campaign=material_${materialId}&material_id=${materialId}`
      );
    } else {
      router.replace(
        "/?utm_source=meta&utm_medium=social&utm_campaign=recruitment"
      );
    }
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
