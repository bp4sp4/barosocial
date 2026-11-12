import { NextResponse, type NextRequest } from 'next/server'

// 업셀링 캠페인 짧은 링크 — /u/018 → /?utm_source=upsell&campaign_id=UP-018
// 문자에 들어가는 주소를 짧게 하려고 만든 주소다(2026-11-12 오피스 DB관리 › 업셀링 캠페인). 들어온 뒤는 예전 긴 링크와 똑같이 처리된다
export function GET(req: NextRequest) {
  const last = req.nextUrl.pathname.split('/').filter(Boolean).pop() ?? ''
  const num = decodeURIComponent(last).toUpperCase().replace(/^UP-?/, '')
  const target = new URL('/', req.nextUrl.origin)
  if (/^\d{3,}$/.test(num)) {
    target.searchParams.set('utm_source', 'upsell')
    target.searchParams.set('campaign_id', `UP-${num}`)
  }
  return NextResponse.redirect(target, 302)
}
