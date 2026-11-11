-- Meta 전환 API 2판 · 3-1 선행 작업 — 브라우저 식별값 보존 (PostgreSQL / Supabase)
--
-- 랜딩 폼은 _fbp·_fbc 쿠키를 읽어 API로 넘기고 API는 IP·User-Agent를 붙여 Meta로 전송하지만,
-- 상담 테이블에는 저장하지 않아 보존율이 0%였다. 오피스에서 나중에 보내는
-- Contact·Purchase 이벤트가 기존 Lead와 같은 사람으로 매칭되려면 이 값들이 남아 있어야 한다.
--
-- fbp        : _fbp 쿠키 원본 (해시하지 않음)
-- fbc        : _fbc 쿠키 원본 (해시하지 않음)
-- client_ip  : 폼 제출 시점의 클라이언트 IP
-- user_agent : 폼 제출 시점의 User-Agent
ALTER TABLE hakjeom_consultations ADD COLUMN IF NOT EXISTS fbp TEXT;
ALTER TABLE hakjeom_consultations ADD COLUMN IF NOT EXISTS fbc TEXT;
ALTER TABLE hakjeom_consultations ADD COLUMN IF NOT EXISTS client_ip TEXT;
ALTER TABLE hakjeom_consultations ADD COLUMN IF NOT EXISTS user_agent TEXT;
