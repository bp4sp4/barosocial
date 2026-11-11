// 엔비티(NBT) AdiSON 오퍼월 리워드 광고 — Server to Server 포스트백
//
// 흐름: 랜딩 폼 제출 저장 완료 → 이 함수 → 고정 IP 릴레이 서버(/adison/postback) → 엔비티 포스트백 서버
// 엔비티는 사전 등록된 IP에서 온 요청만 허용하므로 Vercel에서 직접 보내지 않고 릴레이를 경유한다.
//
// 환경변수
//   ADISON_ADVERTISER_TOKEN  (필수) 엔비티가 발급한 광고주 토큰(고정값)
//   ADISON_PROXY_URL         (필수) 고정 IP 릴레이 주소. 예: http://114.207.245.105:8080
//   ADISON_PROXY_SECRET      (필수) 릴레이와 공유하는 인증 비밀키 (x-proxy-secret 헤더)
//
// 과금 원칙(연동 문서 기준)
//   - 발송된 포스트백은 전부 과금되고 디덕션이 없다. 재시도 로직을 두지 않는다.
//   - 응답 코드 7·9·45(이미 참여)는 정상 상황이므로 오류로 취급하지 않는다.
//   - 실패해도 상담 신청 저장은 정상 완료되어야 하므로 이 함수는 예외를 던지지 않는다.

export const ADISON_POSTBACK_URL =
  'https://postback-ao.adison.co/api/postbacks/server';
export const CLICK_KEY_MAX_LENGTH = 255;

// 리드 데이터에 저장할 결과 문자열. 예: "200", "400:3", "403", "error:timeout"
export interface AdisonPostbackResult {
  ok: boolean; // HTTP 200 + {} 여부
  status: string; // 저장용 응답 코드 문자열
  httpStatus: number | null;
  code: number | null; // 엔비티 응답 본문의 code (400 계열)
  message?: string;
}

// 이미 참여한 이벤트/클릭키 — 정상 상황으로 로그만 남긴다.
const ALREADY_PARTICIPATED_CODES = new Set([7, 9, 45]);

export function sanitizeClickKey(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, CLICK_KEY_MAX_LENGTH);
}

export async function sendAdisonPostback(
  clickKey: string
): Promise<AdisonPostbackResult> {
  const token = process.env.ADISON_ADVERTISER_TOKEN;
  const proxyUrl = process.env.ADISON_PROXY_URL;
  const proxySecret = process.env.ADISON_PROXY_SECRET;

  if (!token || !proxyUrl || !proxySecret) {
    console.warn(
      '[ADISON] 환경변수 누락 — 포스트백 미발송',
      JSON.stringify({
        ADISON_ADVERTISER_TOKEN: !!token,
        ADISON_PROXY_URL: !!proxyUrl,
        ADISON_PROXY_SECRET: !!proxySecret,
      })
    );
    return { ok: false, status: 'error:env', httpStatus: null, code: null };
  }

  // click_key 누락(빈 값)으로 발송하면 411 — 호출부에서 걸러지지만 한 번 더 방어
  if (!clickKey) {
    return { ok: false, status: 'error:no_click_key', httpStatus: null, code: null };
  }

  const base = proxyUrl.replace(/\/+$/, '');
  const target = /^https?:\/\//i.test(base) ? base : `http://${base}`;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10_000);
    const res = await fetch(`${target}/adison/postback`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-proxy-secret': proxySecret,
      },
      body: JSON.stringify({ advertiser_token: token, click_key: clickKey }),
      signal: controller.signal,
    });
    clearTimeout(timer);

    // 릴레이는 엔비티의 HTTP 상태와 본문을 그대로 넘겨준다.
    const text = await res.text();
    let body: { code?: number; message?: string } | null = null;
    try {
      body = text ? JSON.parse(text) : {};
    } catch {
      body = null;
    }

    const httpStatus = res.status;
    const code = typeof body?.code === 'number' ? body.code : null;
    const message = body?.message;

    if (httpStatus === 200) {
      console.log('[ADISON] ✅ 포스트백 성공', { clickKey: mask(clickKey) });
      return { ok: true, status: '200', httpStatus, code: null };
    }

    const status = code !== null ? `${httpStatus}:${code}` : String(httpStatus);

    if (code !== null && ALREADY_PARTICIPATED_CODES.has(code)) {
      console.log('[ADISON] ℹ️ 이미 참여한 클릭키 (정상 처리)', { status, message });
    } else {
      console.error('[ADISON] ❌ 포스트백 실패', {
        status,
        message,
        clickKey: mask(clickKey),
        raw: body === null ? text.slice(0, 200) : undefined,
      });
    }
    return { ok: false, status, httpStatus, code, message };
  } catch (e) {
    const reason =
      e instanceof Error && e.name === 'AbortError'
        ? 'timeout'
        : e instanceof Error
          ? e.message
          : 'unknown';
    console.error('[ADISON] ❌ 포스트백 전송 오류', reason);
    return {
      ok: false,
      status: `error:${reason.slice(0, 50)}`,
      httpStatus: null,
      code: null,
    };
  }
}

function mask(v: string): string {
  return v.length <= 8 ? '****' : `${v.slice(0, 4)}…${v.slice(-4)}`;
}
