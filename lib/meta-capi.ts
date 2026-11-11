import crypto from 'crypto';

// Meta Conversions API (CAPI) - Lead 이벤트 서버 전송
// 값은 모두 환경변수로 관리한다.
//   META_CAPI_TOKEN            (필수) 액세스 토큰
//   META_PIXEL_ID              (선택) 픽셀/데이터소스 ID, 기본값 493927245155333
//   META_CAPI_TEST_EVENT_CODE  (선택) 값이 있으면 테스트 이벤트로 전송, 비우면 운영 전송

const GRAPH_VERSION = 'v21.0';
const PIXEL_ID = process.env.META_PIXEL_ID || '493927245155333';

function sha256(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

// 전화번호 정규화: 숫자만 남기고, 국내번호(0으로 시작)는 국가코드 82를 붙인다.
function normalizePhone(raw: string): string {
  let digits = raw.replace(/[^0-9]/g, '');
  if (!digits) return '';
  if (digits.startsWith('0')) digits = '82' + digits.slice(1);
  return digits;
}

function normalizeName(raw: string): string {
  return raw.trim().toLowerCase();
}

// 오피스가 나중에 보내는 Contact·Purchase 이벤트와 동일인으로 묶기 위한 키.
// 리드 ID를 SHA-256 해시해 external_id 로 보낸다. 오피스도 같은 규칙을 써야 한다.
export function hashExternalId(leadId: string | number): string {
  return sha256(String(leadId));
}

export interface MetaLeadParams {
  eventId?: string | null;
  eventSourceUrl?: string | null;
  name?: string | null;
  phone?: string | null;
  clientIp?: string | null;
  clientUserAgent?: string | null;
  fbp?: string | null;
  fbc?: string | null;
  /** 오피스 리드 ID (해시 전 원본). 지정하면 external_id 로 함께 전송한다. */
  leadId?: string | number | null;
}

// 폼 제출(오피스 DB 저장) 성공 시점에 호출한다. 실패해도 예외를 던지지 않는다.
export async function sendMetaLeadEvent(params: MetaLeadParams): Promise<void> {
  const token = process.env.META_CAPI_TOKEN;
  if (!token) {
    console.warn('[META CAPI] META_CAPI_TOKEN 미설정 - 전송 건너뜀');
    return;
  }

  const userData: Record<string, unknown> = {};
  if (params.phone) {
    const norm = normalizePhone(params.phone);
    if (norm) userData.ph = [sha256(norm)];
  }
  if (params.name) {
    const norm = normalizeName(params.name);
    if (norm) userData.fn = [sha256(norm)];
  }
  if (params.leadId !== undefined && params.leadId !== null && params.leadId !== '') {
    userData.external_id = [hashExternalId(params.leadId)];
  }
  if (params.clientIp) userData.client_ip_address = params.clientIp;
  if (params.clientUserAgent) userData.client_user_agent = params.clientUserAgent;
  if (params.fbp) userData.fbp = params.fbp;
  if (params.fbc) userData.fbc = params.fbc;

  const eventData: Record<string, unknown> = {
    event_name: 'Lead',
    event_time: Math.floor(Date.now() / 1000),
    action_source: 'website',
    user_data: userData,
  };
  if (params.eventId) eventData.event_id = params.eventId;
  if (params.eventSourceUrl) eventData.event_source_url = params.eventSourceUrl;

  const payload: Record<string, unknown> = { data: [eventData] };
  const testCode = process.env.META_CAPI_TEST_EVENT_CODE;
  if (testCode) payload.test_event_code = testCode;

  const url = `https://graph.facebook.com/${GRAPH_VERSION}/${PIXEL_ID}/events?access_token=${encodeURIComponent(token)}`;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const text = await res.text();
    if (res.ok) {
      console.log('[META CAPI] Lead 전송 성공:', text);
    } else {
      console.error('[META CAPI] Lead 전송 실패:', res.status, text);
    }
  } catch (e) {
    console.error('[META CAPI] Lead 전송 중 오류:', e);
  }
}
