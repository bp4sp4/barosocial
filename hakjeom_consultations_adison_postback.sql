-- 엔비티(NBT) AdiSON 리워드 광고 포스트백 연동 컬럼 추가 (PostgreSQL / Supabase)
-- click_key: 매체가 랜딩 URL에 붙여준 값 (최대 255자)
-- postback_sent_at: 포스트백 발송 시도 시각 (휴대폰번호 기준 중복 방지 판단에 사용)
-- postback_status: 엔비티 응답 코드. 예: '200', '400:3', '403', 'error:timeout'
ALTER TABLE hakjeom_consultations ADD COLUMN IF NOT EXISTS click_key VARCHAR(255);
ALTER TABLE hakjeom_consultations ADD COLUMN IF NOT EXISTS postback_sent_at TIMESTAMPTZ;
ALTER TABLE hakjeom_consultations ADD COLUMN IF NOT EXISTS postback_status TEXT;

-- 중복 조회(contact + postback_sent_at) 속도용
CREATE INDEX IF NOT EXISTS hakjeom_consultations_contact_postback_idx
  ON hakjeom_consultations (contact)
  WHERE postback_sent_at IS NOT NULL;
