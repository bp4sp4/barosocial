// 매체(엔비티 AdiSON)가 랜딩 링크에 붙여주는 click_key 를 원본 그대로 읽어낸다.
//
// 주의 1) URLSearchParams 는 쿼리스트링의 '+' 를 공백으로 해석한다.
//        click_key 는 유저마다 달라지는 base64 계열 문자열이라 '+' 가 들어올 수 있고,
//        공백으로 바뀌면 포스트백이 실패한다. 그래서 원본 쿼리에서 직접 잘라 쓴다.
// 주의 2) 값의 형식을 검사하지 않는다. 어떤 문자열이 와도 그대로 받아 그대로 돌려보낸다.
//        (길이 제한 255자는 저장·발송 직전 sanitizeClickKey 에서 처리한다.)

export function readClickKeyFromSearch(search: string): string | null {
  if (!search) return null;
  const query = search.startsWith("?") ? search.slice(1) : search;

  for (const pair of query.split("&")) {
    if (!pair) continue;
    const eq = pair.indexOf("=");
    const name = eq === -1 ? pair : pair.slice(0, eq);
    if (name !== "click_key") continue;

    const rawValue = eq === -1 ? "" : pair.slice(eq + 1);
    let value = rawValue;
    try {
      // %2B 등으로 인코딩되어 와도 원본으로 되돌린다. '+' 는 공백으로 바뀌지 않는다.
      value = decodeURIComponent(rawValue);
    } catch {
      // 잘못된 인코딩이면 원문을 그대로 쓴다.
    }
    const trimmed = value.trim();
    return trimmed || null;
  }

  return null;
}

// 매체가 '?' 없는 링크 뒤에 "&click_key=..." 를 그대로 이어붙이는 경우가 있다.
//   .../naverreward/test&click_key=XXX  →  경로 조각이 "test&click_key=XXX" 가 되어버린다.
// 이때도 소재코드와 click_key 를 정상적으로 분리해 낸다.
export function splitPathSegment(segment: string): {
  id: string;
  embeddedQuery: string;
} {
  // Next.js 의 동적 경로 값은 URL 인코딩된 상태로 들어온다("test%26click_key%3DXXX").
  let decoded = segment;
  try {
    decoded = decodeURIComponent(segment);
  } catch {
    // 잘못된 인코딩이면 원문을 그대로 쓴다.
  }

  const cut = decoded.search(/[&?]/);
  if (cut === -1) return { id: decoded, embeddedQuery: "" };
  return { id: decoded.slice(0, cut), embeddedQuery: decoded.slice(cut + 1) };
}
