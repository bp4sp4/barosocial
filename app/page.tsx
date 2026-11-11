"use client";

import { useEffect } from "react";

export default function BarosocialHome() {
  useEffect(() => {
    // Preserve campaign parameters, including the original click_key encoding.
    window.location.replace(`/form${window.location.search}`);
  }, []);

  return <main style={{ padding: 24 }}>상담 신청 페이지로 이동 중입니다.</main>;
}
