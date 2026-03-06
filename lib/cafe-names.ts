// 맘카페 ID → 이름 매핑 (어드민 추적링크 관리에서 관리)
export const CAFE_NAMES: Record<string, string> = {
  cjsam: '순광맘',
  chobomamy: '러브양산맘',
  jinhaemam: '창원진해댁',
  momspanggju: '광주맘스팡',
  cjasm: '충주아사모',
  mygodsend: '화성남양애',
  yul2moms: '율하맘',
  chbabymom: '춘천맘',
  seosanmom: '서산맘',
  redog2oi: '부천소사구',
  ksn82599: '둔산맘',
  magic26: '안평맘스비',
  anjungmom: '평택안포맘',
  tlgmdaka0: '시맘수',
  babylovecafe: '베이비러브',
  naese: '중리사랑방',
  andongmom: '안동맘',
};

// 알려진 카페 한글명 집합 (사용자가 직접 입력한 값 검증용)
export const KNOWN_CAFE_NAMES = new Set(Object.values(CAFE_NAMES));

export function resolveCafeName(cafeId: string): string {
  return CAFE_NAMES[cafeId] || cafeId;
}

// click_source (예: "맘카페_cjsam") → 읽기 좋은 문자열 반환
export function formatClickSource(clickSource: string | null): string {
  if (!clickSource) return '미입력';
  const stripped = clickSource.startsWith('바로폼_') ? clickSource.slice(4) : clickSource;
  const idx = stripped.indexOf('_');
  if (idx === -1) return stripped;
  const major = stripped.slice(0, idx);
  const rawMinor = stripped.slice(idx + 1);
  const resolvedMinor = resolveCafeName(rawMinor);

  // 맘카페 유입인데 알려진 카페 ID/이름과 다르면 확인필요 표시
  if (major === '맘카페' && !CAFE_NAMES[rawMinor] && !KNOWN_CAFE_NAMES.has(rawMinor)) {
    return `${major} > ${resolvedMinor}(확인필요)`;
  }

  return `${major} > ${resolvedMinor}`;
}
