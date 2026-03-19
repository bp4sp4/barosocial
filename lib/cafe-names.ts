// ✅ 카페 추가 시 여기에만 추가하면 됩니다
// id: 네이버카페 URL 아이디, name: 한글 이름, numericId: 카페 숫자 ID (선택)
export interface CafeConfig {
  id: string;
  name: string;
  numericId?: string;
}

export const CAFE_CONFIG: CafeConfig[] = [
  { id: 'cjsam',       name: '순광맘',      numericId: '20479493' },
  { id: 'chobomamy',   name: '러브양산맘',   numericId: '20655292' },
  { id: 'jinhaemam',   name: '창원진해댁',   numericId: '14952369' },
  { id: 'momspanggju', name: '광주맘스팡',   numericId: '26025763' },
  { id: 'cjasm',       name: '충주아사모',   numericId: '15857728' },
  { id: 'mygodsend',   name: '화성남양애',   numericId: '16565537' },
  { id: 'yul2moms',    name: '율하맘',       numericId: '30142013' },
  { id: 'chbabymom',   name: '춘천맘',       numericId: '20364180' },
  { id: 'seosanmom',   name: '서산맘',       numericId: '10328492' },
  { id: 'redog2oi',    name: '부천소사구',   numericId: '28111532' },
  { id: 'ksn82599',    name: '둔산맘',       numericId: '29019575' },
  { id: 'magic26',     name: '안평맘스비',   numericId: '20091703' },
  { id: 'anjungmom',   name: '평택안포맘',   numericId: '13186768' },
  { id: 'tlgmdaka0',   name: '시맘수',       numericId: '24302163' },
  { id: 'babylovecafe',name: '베이비러브',   numericId: '12688726' },
  { id: 'naese',       name: '중리사랑방',   numericId: '11790061' },
  { id: 'andongmom',   name: '안동맘' },
  { id: 'doanmom1004', name: '대전도안맘' },
];

// 이하는 CAFE_CONFIG에서 자동 생성 — 직접 수정 불필요
export const CAFE_NAMES: Record<string, string> = Object.fromEntries(
  CAFE_CONFIG.map(c => [c.id, c.name])
);

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

  if (major === '맘카페' && !CAFE_NAMES[rawMinor] && !KNOWN_CAFE_NAMES.has(rawMinor)) {
    return `${major} > ${resolvedMinor}(확인필요)`;
  }

  return `${major} > ${resolvedMinor}`;
}
