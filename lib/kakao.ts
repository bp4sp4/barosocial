interface AlimtalkData {
  contact: string;
}

export function parsePhones(raw: string | undefined): string[] {
  if (!raw) return []
  return raw.split(',').map((s) => s.trim()).filter(Boolean)
}

export async function sendAdminNewInquiryAlimtalk(customerName: string): Promise<void> {
  const phones = parsePhones(process.env.ALIGO_NEW_INQUIRY_PHONES)
  console.log('[ADMIN] ALIGO_NEW_INQUIRY_PHONES:', process.env.ALIGO_NEW_INQUIRY_PHONES, '→ phones:', phones)
  if (phones.length === 0) return

  const apikey = process.env.ALIGO_API_KEY
  const userid = process.env.ALIGO_USER_ID
  const senderkey = process.env.ALIGO_SENDER_KEY
  const sender = process.env.ALIGO_SENDER
  if (!apikey || !userid || !senderkey || !sender) return

  const tpl_code = 'UH_4559'
  const message = `${customerName}님, 새로운 문의가 등록되었습니다.`
  const proxyUrl = process.env.PROXY_URL
  const proxySecret = process.env.PROXY_SECRET

  const payload: Record<string, string> = { apikey, userid, senderkey, tpl_code, sender, failover: 'N' }
  phones.forEach((phone, i) => {
    payload[`receiver_${i + 1}`] = phone.replace(/-/g, '')
    payload[`subject_${i + 1}`] = '새 문의 알림'
    payload[`message_${i + 1}`] = message
  })

  try {
    if (proxyUrl && proxySecret) {
      await fetch(`${proxyUrl.replace(/\/$/, '')}/alimtalk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-proxy-secret': proxySecret },
        body: JSON.stringify(payload),
      })
    } else {
      const formData = new FormData()
      Object.entries(payload).forEach(([k, v]) => formData.append(k, v))
      await fetch('https://kakaoapi.aligo.in/akv10/alimtalk/send/', { method: 'POST', body: formData })
    }
    console.log('[KAKAO] ✅ 관리자 신규 문의 알림톡 전송')
  } catch (e) {
    console.error('[KAKAO] 관리자 알림톡 전송 실패:', e)
  }
}

export async function sendAlimtalk(data: AlimtalkData): Promise<{ success: boolean; error?: string }> {
  const apikey = process.env.ALIGO_API_KEY;
  const userid = process.env.ALIGO_USER_ID;
  const senderkey = process.env.ALIGO_SENDER_KEY;
  const sender = process.env.ALIGO_SENDER;
  const tpl_code = process.env.ALIGO_TEMPLATE_CODE;
  const templateMessage = process.env.ALIGO_TEMPLATE_MESSAGE;

  if (!apikey || !userid || !senderkey || !sender || !tpl_code) {
    console.warn('[KAKAO] 알리고 환경 변수가 설정되지 않아 알림톡 전송을 건너뜁니다');
    return { success: false, error: 'Aligo 환경 변수 미설정' };
  }

  if (!templateMessage) {
    console.warn('[KAKAO] ALIGO_TEMPLATE_MESSAGE 환경 변수가 없어 알림톡 전송을 건너뜁니다');
    return { success: false, error: 'ALIGO_TEMPLATE_MESSAGE 미설정' };
  }

  const receiverPhone = data.contact.replace(/-/g, '');
  const message = templateMessage;

  const proxyUrl = process.env.PROXY_URL;
  const proxySecret = process.env.PROXY_SECRET;

  try {
    console.log('[KAKAO] 알림톡 전송 시도:', receiverPhone);

    let result: { code: number; message: string; info?: unknown };

    if (proxyUrl && proxySecret) {
      // 카페24 프록시를 통해 전송 (고정 IP)
      const response = await fetch(`${proxyUrl.replace(/\/$/, '')}/alimtalk`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-proxy-secret': proxySecret,
        },
        body: JSON.stringify({
          apikey,
          userid,
          senderkey,
          tpl_code,
          sender,
          receiver_1: receiverPhone,
          subject_1: process.env.ALIGO_TEMPLATE_SUBJECT || '상담 신청 접수 안내',
          message_1: message,
          failover: 'N',
        }),
      });
      const text = await response.text();
      try {
        result = JSON.parse(text) as { code: number; message: string; info?: unknown };
      } catch {
        console.error('[KAKAO] ❌ 프록시 비-JSON 응답:', response.status, text.slice(0, 200));
        return { success: false, error: `프록시 응답 오류 (${response.status}): ${text.slice(0, 100)}` };
      }
    } else {
      // 프록시 미설정시 직접 호출
      const formData = new FormData();
      formData.append('apikey', apikey);
      formData.append('userid', userid);
      formData.append('senderkey', senderkey);
      formData.append('tpl_code', tpl_code);
      formData.append('sender', sender);
      formData.append('receiver_1', receiverPhone);
      formData.append('subject_1', process.env.ALIGO_TEMPLATE_SUBJECT || '상담 신청 접수 안내');
      formData.append('message_1', message);
      formData.append('failover', 'N');
      const response = await fetch('https://kakaoapi.aligo.in/akv10/alimtalk/send/', {
        method: 'POST',
        body: formData,
      });
      result = await response.json() as { code: number; message: string; info?: unknown };
    }

    if (result.code === 0) {
      console.log('[KAKAO] ✅ 알림톡 전송 성공:', result.message);
      return { success: true };
    } else {
      console.error('[KAKAO] ❌ 알림톡 전송 실패:', result.code, result.message);
      return { success: false, error: `${result.code}: ${result.message}` };
    }
  } catch (error) {
    console.error('[KAKAO] ❌ 알림톡 전송 중 오류:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '알 수 없는 오류',
    };
  }
}
