# barosocial

상담 신청 폼, 관리자 화면, 상담 API를 독립 실행하는 Next.js 프로젝트입니다.

## 포함된 화면과 동작

- `/`: 기존 쿼리 문자열을 보존해 `/form`으로 이동
- `/form`: 별도 무료 학습 상담 신청 화면
- `/admin`: 상담 관리 및 통계
- `/api/consultations`: 상담 접수와 관리 API
- 기존 광고 채널 경로: UTM 값을 붙여 `/form`으로 이동
- `/privacy`, `/terms`: 안내 페이지

## 실행과 배포

1. `npm ci`
2. 기존 배포 환경의 환경 변수 값을 유지합니다. 필요한 변수 이름은 `.env.example`에 있습니다. 실제 비밀 값은 이 폴더에 포함되지 않았습니다.
3. 배포 주소가 `https://barosocial.vercel.app`과 다르면 `NEXT_PUBLIC_BAROSOCIAL_BASE_URL`도 설정합니다. 관리자 화면에서 생성하는 맘카페 링크와 상담 안내 메일의 로고 주소에 사용됩니다.
4. `npm run dev` 또는 `npm run build` 후 `npm run start`

주부랜딩페이지 프로젝트는 `BAROSOCIAL_API_ORIGIN`을 이 프로젝트 주소로 설정해야 상담 신청을 전달할 수 있습니다. 실제 접수 저장은 기존 Supabase 설정에 연결됩니다.
