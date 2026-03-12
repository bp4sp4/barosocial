'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import {
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  AreaChart, Area, ComposedChart, Line,
} from 'recharts';

// ─── 타입 ──────────────────────────────────────────
type ConsultationStatus = '상담대기' | '상담중' | '보류' | '등록대기' | '등록완료';
type Tab = 'overview' | 'status' | 'source' | 'time' | 'course';

interface Consultation {
  id: number;
  status: ConsultationStatus;
  click_source: string | null;
  hope_course: string | null;
  major_category?: string | null;
  created_at: string;
}

// ─── 상수 ──────────────────────────────────────────
const STATUS_COLORS: Record<string, string> = {
  '상담대기': '#94a3b8', '상담중': '#3b82f6',
  '보류': '#f59e0b', '등록대기': '#8b5cf6', '등록완료': '#22c55e',
};
const STATUS_LIST: ConsultationStatus[] = ['상담대기', '상담중', '보류', '등록대기', '등록완료'];
const WEEKDAY = ['일', '월', '화', '수', '목', '금', '토'];
const SRC_COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#64748b'];

const TABS: { id: Tab; label: string }[] = [
  { id: 'overview', label: '개요' },
  { id: 'status',   label: '상태 분석' },
  { id: 'source',   label: '유입 경로' },
  { id: 'time',     label: '시간 패턴' },
  { id: 'course',   label: '과정 수요' },
];

// ─── 유틸 ──────────────────────────────────────────
function getMajor(source: string | null): string {
  if (!source) return '바로폼';
  const s = source.startsWith('바로폼_') ? source.slice(4) : source;
  const i = s.indexOf('_');
  return i === -1 ? s : s.slice(0, i);
}

function toKST(dateStr: string): Date {
  const d = new Date(dateStr);
  d.setHours(d.getHours() + 9);
  return d;
}

function ym(d: Date): string { return d.toISOString().slice(0, 7); }
function ymd(d: Date): string { return d.toISOString().slice(0, 10); }

// ─── 공통 컴포넌트 ──────────────────────────────────
const Tip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: '#fff', borderRadius: 10, padding: '10px 14px', fontSize: 12, boxShadow: '0 4px 16px rgba(0,0,0,0.1)', border: '1px solid #f2f4f6' }}>
      {label && <div style={{ color: '#b0b8c1', marginBottom: 6, fontSize: 11 }}>{label}</div>}
      {payload.map((p: any, i: number) => (
        <div key={i} style={{ color: '#191f28', fontWeight: 600, fontSize: 13 }}>
          {p.name ? <span style={{ color: '#8b95a1', fontWeight: 400 }}>{p.name} </span> : null}{p.value}건
        </div>
      ))}
    </div>
  );
};

function Card({ label, value, sub, color, badge, badgeColor }: {
  label: string; value: string | number; sub?: string;
  color?: string; badge?: string; badgeColor?: string;
}) {
  return (
    <div style={{ background: '#fff', borderRadius: 12, padding: '20px 20px 18px', border: '1px solid #f2f4f6' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <span style={{ fontSize: 13, color: '#8b95a1', fontWeight: 400, letterSpacing: '-0.01em' }}>{label}</span>
        {badge && (
          <span style={{ fontSize: 11, fontWeight: 700, color: badgeColor || '#22c55e', background: (badgeColor || '#22c55e') + '15', borderRadius: 5, padding: '2px 6px', letterSpacing: 0 }}>
            {badge}
          </span>
        )}
      </div>
      <div style={{ fontSize: 28, fontWeight: 700, color: color || '#191f28', lineHeight: 1, letterSpacing: '-0.03em' }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: '#b0b8c1', marginTop: 6 }}>{sub}</div>}
    </div>
  );
}

function Panel({ title, sub, children, style }: {
  title: string; sub?: string; children: React.ReactNode; style?: React.CSSProperties;
}) {
  return (
    <div style={{ background: '#fff', borderRadius: 12, padding: '22px 24px', border: '1px solid #f2f4f6', ...style }}>
      <div style={{ marginBottom: 18 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: '#191f28', letterSpacing: '-0.02em' }}>{title}</div>
        {sub && <div style={{ fontSize: 12, color: '#b0b8c1', marginTop: 3 }}>{sub}</div>}
      </div>
      {children}
    </div>
  );
}

type Source = 'hakjeom' | 'private' | 'all';

const SOURCE_LABELS: { id: Source; label: string }[] = [
  { id: 'hakjeom', label: '학점은행제' },
  { id: 'private', label: '민간자격증' },
  { id: 'all',     label: '전체' },
];

// ─── 메인 ──────────────────────────────────────────
export default function StatsPage() {
  const router = useRouter();
  const [hakjeomData, setHakjeomData] = useState<Consultation[]>([]);
  const [privateData, setPrivateData] = useState<Consultation[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('overview');
  const [source, setSource] = useState<Source>('hakjeom');
  const [selectedCourse, setSelectedCourse] = useState<string | null>(null);
  const srcRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const srcBarRef = useRef<HTMLDivElement>(null);
  const [srcPill, setSrcPill] = useState<{ left: number; width: number } | null>(null);

  useEffect(() => {
    const idx = SOURCE_LABELS.findIndex(s => s.id === source);
    const el = srcRefs.current[idx];
    const bar = srcBarRef.current;
    if (!el || !bar) return;
    const barRect = bar.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();
    setSrcPill({ left: elRect.left - barRect.left, width: elRect.width });
  }, [source, loading]);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/admin/login'); return; }
      const [r1, r2] = await Promise.all([
        supabase.from('consultations').select('id, status, click_source, hope_course, created_at').order('created_at', { ascending: false }),
        // private-cert API는 major_category 포함
        fetch('/api/private-cert').then(r => r.json()),
      ]);
      if (r1.data) setHakjeomData(r1.data.map((d: any) => ({ ...d, status: d.status || '상담대기' })));
      if (Array.isArray(r2)) setPrivateData(r2.map((d: any) => ({ ...d, status: d.status || '상담대기' })));
      setLoading(false);
    })();
  }, [router]);

  const data = source === 'hakjeom' ? hakjeomData : source === 'private' ? privateData : [...hakjeomData, ...privateData];

  // ── 기준
  const now = toKST(new Date().toISOString());
  const thisMonthKey = ym(now);
  const prevM = new Date(now); prevM.setMonth(prevM.getMonth() - 1);
  const prevMonthKey = ym(prevM);

  // ── 집계
  const total = data.length;
  const thisMonth = data.filter(c => c.created_at.slice(0, 7) === thisMonthKey).length;
  const prevMonth = data.filter(c => c.created_at.slice(0, 7) === prevMonthKey).length;
  const growth = prevMonth > 0 ? Math.round(((thisMonth - prevMonth) / prevMonth) * 100) : null;

  const ago30 = new Date(now); ago30.setDate(ago30.getDate() - 29); ago30.setHours(0, 0, 0, 0);
  const recent30 = data.filter(c => new Date(c.created_at) >= ago30).length;

  const registered = data.filter(c => c.status === '등록완료').length;
  const regRate = total > 0 ? Math.round((registered / total) * 100) : 0;
  const waiting = data.filter(c => c.status === '상담대기').length;

  // ── 상태
  const statusData = STATUS_LIST.map(s => ({
    name: s, value: data.filter(c => c.status === s).length, fill: STATUS_COLORS[s],
  }));

  // ── 월별 (데이터 시작 월 ~ 현재, 최대 6개월)
  const monthlyData = (() => {
    const sixAgo = new Date(now); sixAgo.setDate(1); sixAgo.setMonth(sixAgo.getMonth() - 5);
    const sixAgoYm = ym(sixAgo);
    let startYm: string;
    if (data.length > 0) {
      const earliest = data.reduce((min, c) => c.created_at < min ? c.created_at : min, data[0].created_at);
      const earliestYm = earliest.slice(0, 7);
      startYm = earliestYm > sixAgoYm ? earliestYm : sixAgoYm;
    } else {
      startYm = thisMonthKey;
    }
    const months: { month: string; 신규: number; 등록: number }[] = [];
    const cur = new Date(startYm + '-01T00:00:00');
    while (ym(cur) <= thisMonthKey) {
      const key = ym(cur);
      const list = data.filter(c => c.created_at.slice(0, 7) === key);
      months.push({ month: key.slice(5) + '월', 신규: list.length, 등록: list.filter(c => c.status === '등록완료').length });
      cur.setMonth(cur.getMonth() + 1);
    }
    return months;
  })();
  const monthlySub = monthlyData.length >= 6 ? '최근 6개월' : monthlyData.length > 1 ? `최근 ${monthlyData.length}개월` : '이번달';

  // ── 일별 30일
  const dailyData = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(now); d.setDate(d.getDate() - (29 - i));
    const key = ymd(d);
    return { date: key.slice(5), count: data.filter(c => c.created_at.slice(0, 10) === key).length };
  });

  // ── 시간대
  const hourData = Array.from({ length: 24 }, (_, h) => ({
    hour: String(h).padStart(2, '0'),
    count: data.filter(c => toKST(c.created_at).getHours() === h).length,
  }));
  const peakCount = Math.max(...hourData.map(d => d.count));
  const peaks = hourData.filter(d => d.count === peakCount);

  // ── 요일
  const weekData = WEEKDAY.map((day, i) => ({
    day, count: data.filter(c => toKST(c.created_at).getDay() === i).length,
  }));

  // ── 유입경로
  const srcMap: Record<string, number> = {};
  data.forEach(c => { const m = getMajor(c.click_source); srcMap[m] = (srcMap[m] || 0) + 1; });
  const srcData = Object.entries(srcMap).sort((a, b) => b[1] - a[1]).map(([name, value]) => ({ name, value }));

  // ── 희망과정 (별칭 정규화)
  const COURSE_ALIAS: Record<string, string> = {
    '사회복지사2급': '사회복지사', '사복': '사회복지사',
    '사회복지': '사회복지사', '사회복지사 2급': '사회복지사',
    '사회복지사2': '사회복지사', '사복지': '사회복지사',
    '보육교사2급': '보육교사', '보육': '보육교사',
    '심리상담': '심리상담사', '상담사': '심리상담사',
    '평생교육': '평생교육사',
  };
  function normalizeCourse(raw: string): string {
    const t = raw.trim();
    return COURSE_ALIAS[t] ?? t;
  }
  const courseMap: Record<string, number> = {};
  data.forEach(c => {
    // 민간자격증은 major_category 우선, 없으면 hope_course
    const raw = c.major_category || c.hope_course;
    if (!raw) return;
    raw.split(',').forEach(part => {
      const name = normalizeCourse(part);
      if (name) courseMap[name] = (courseMap[name] || 0) + 1;
    });
  });
  const courseData = Object.entries(courseMap).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([name, value]) => ({ name, value }));

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh', color: '#94a3b8', fontSize: 14 }}>
      로딩 중...
    </div>
  );

  return (
    <div style={{ background: '#f9fafb', minHeight: '100vh', padding: '32px 28px' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>

        {/* 헤더 */}
        <div style={{ marginBottom: 16 }}>
          <h2 style={{ fontSize: 24, fontWeight: 800, color: '#4e5968', margin: '0 0 14px', letterSpacing: '-0.04em' }}>통계</h2>
          {/* 소스 토글 */}
          <div style={{ marginBottom: 16 }}>
            <div ref={srcBarRef} style={{ position: 'relative', display: 'inline-flex', gap: 0, background: 'rgba(2, 32, 71, 0.05)', borderRadius: 32, overflow: 'hidden' }}>
              {srcPill && (
                <div style={{
                  position: 'absolute', bottom: 0, left: srcPill.left, width: srcPill.width, height: '100%',
                  background: '#0220470d', borderRadius: 32,
                  transition: 'left 0.22s cubic-bezier(0.4, 0, 0.2, 1), width 0.22s cubic-bezier(0.4, 0, 0.2, 1)',
                  zIndex: 0,
                }} />
              )}
              {SOURCE_LABELS.map((s, i) => (
                <button
                  key={s.id}
                  ref={el => { srcRefs.current[i] = el; }}
                  onClick={() => setSource(s.id)}
                  style={{
                    position: 'relative', zIndex: 1,
                    padding: '11px 16px', border: 'none', borderRadius: 32, cursor: 'pointer',
                    fontSize: 15, fontWeight: source === s.id ? 700 : 500,
                    background: 'transparent',
                    color: source === s.id ? '#191f28' : '#8b95a1',
                    transition: 'color 0.22s',
                    letterSpacing: '-0.01em',
                    whiteSpace: 'nowrap',
                  }}
                >{s.label}</button>
              ))}
            </div>
          </div>
        </div>

        {/* 탭 */}
        <div style={{ display: 'flex', gap: 0, marginBottom: 28, borderBottom: '1px solid #f0f0f0' }}>
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                padding: '10px 20px',
                border: 'none',
                borderBottom: tab === t.id ? '2px solid #020913e8' : '2px solid transparent',
                marginBottom: -1,
                background: 'transparent',
                fontSize: 14,
                fontWeight: tab === t.id ? 700 : 400,
                color: tab === t.id ? '#191f28' : '#8b95a1',
                cursor: 'pointer',
                transition: 'color 0.18s, border-color 0.18s',
                letterSpacing: '-0.02em',
                whiteSpace: 'nowrap',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* ════ 개요 탭 ════ */}
        {tab === 'overview' && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 16 }}>
              <Card label="전체 신청" value={total.toLocaleString()} sub="누적 전체" />
              <Card
                label="이번달 신규" value={thisMonth} sub={`전월 ${prevMonth}건`}
                badge={growth !== null ? `${growth >= 0 ? '+' : ''}${growth}%` : undefined}
                badgeColor={growth !== null && growth < 0 ? '#3182f6' : '#f04452'}
              />
              <Card label="최근 30일" value={recent30} sub="오늘 포함 30일" color="#6366f1" />
              <Card label="등록완료" value={registered} sub={`전환율 ${regRate}%`} color="#22c55e"
                badge={`${regRate}%`} badgeColor="#22c55e" />
              <Card label="상담 대기중" value={waiting} sub="미처리 건수" color={waiting > 20 ? '#f04452' : '#f59e0b'} />
            </div>

            <Panel title="월별 신규 신청 vs 등록완료" sub={monthlySub} style={{ marginBottom: 16 }}>
              <ResponsiveContainer width="100%" height={220}>
                <ComposedChart data={monthlyData} margin={{ top: 4, right: 16, bottom: 0, left: -16 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip content={<Tip />} />
                  <Bar dataKey="신규" fill="#bfdbfe" radius={[4, 4, 0, 0]} barSize={28} name="신규" />
                  <Bar dataKey="등록" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={28} name="등록완료" />
                  <Line type="monotone" dataKey="신규" stroke="#6366f1" strokeWidth={2} dot={{ fill: '#6366f1', r: 3 }} name="신규 추세" />
                </ComposedChart>
              </ResponsiveContainer>
              <div style={{ display: 'flex', gap: 16, marginTop: 8 }}>
                {[['#bfdbfe', '신규 신청'], ['#3b82f6', '등록완료'], ['#6366f1', '신규 추세']].map(([c, l]) => (
                  <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#4e5968' }}>
                    <div style={{ width: 10, height: 10, borderRadius: 2, background: c }} />{l}
                  </div>
                ))}
              </div>
            </Panel>

            <Panel title="일별 신규 상담" sub="최근 30일">
              <ResponsiveContainer width="100%" height={160}>
                <AreaChart data={dailyData} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
                  <defs>
                    <linearGradient id="g30" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.18} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} interval={4} />
                  <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip content={<Tip />} />
                  <Area type="monotone" dataKey="count" stroke="#6366f1" strokeWidth={2} fill="url(#g30)" dot={false} activeDot={{ r: 4, fill: '#6366f1' }} name="신규" />
                </AreaChart>
              </ResponsiveContainer>
            </Panel>
          </div>
        )}

        {/* ════ 상태 분석 탭 ════ */}
        {tab === 'status' && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 16 }}>
              {statusData.map(d => (
                <Card
                  key={d.name} label={d.name} value={d.value}
                  sub={total > 0 ? `전체의 ${Math.round((d.value / total) * 100)}%` : '-'}
                  color={d.fill}
                />
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 16 }}>
              <Panel title="상태 분포">
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={statusData} cx="50%" cy="50%" innerRadius={52} outerRadius={84} paddingAngle={2} dataKey="value">
                      {statusData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                    </Pie>
                    <Tooltip content={<Tip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
                  {statusData.map(d => (
                    <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                      <div style={{ width: 10, height: 10, borderRadius: 2, background: d.fill }} />
                      <span style={{ color: '#4e5968', flex: 1 }}>{d.name}</span>
                      <span style={{ fontWeight: 700, color: '#191f28' }}>{d.value}건</span>
                      <span style={{ color: '#94a3b8', fontSize: 12 }}>({total > 0 ? Math.round((d.value / total) * 100) : 0}%)</span>
                    </div>
                  ))}
                </div>
              </Panel>

              <Panel title="전환 퍼널" sub="신청 → 등록 흐름">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 8 }}>
                  {statusData.map((d, i) => {
                    const pct = total > 0 ? (d.value / total) * 100 : 0;
                    return (
                      <div key={d.name}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                          <span style={{ color: '#4e5968' }}>{d.name}</span>
                          <span style={{ fontWeight: 700, color: '#191f28' }}>{d.value}건 ({Math.round(pct)}%)</span>
                        </div>
                        <div style={{ background: '#f2f4f6', borderRadius: 6, height: 28, overflow: 'hidden' }}>
                          <div style={{
                            width: `${pct}%`, height: '100%', background: d.fill,
                            borderRadius: 6, transition: 'width 0.5s ease',
                            display: 'flex', alignItems: 'center', paddingLeft: 8,
                          }}>
                            {pct > 8 && <span style={{ fontSize: 11, color: '#fff', fontWeight: 600 }}>{d.value}</span>}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div style={{ marginTop: 20, padding: '14px 16px', background: '#f0fdf4', borderRadius: 12 }}>
                  <div style={{ fontSize: 13, color: '#166534', fontWeight: 600, marginBottom: 4 }}>등록 전환율</div>
                  <div style={{ fontSize: 28, fontWeight: 800, color: '#22c55e' }}>{regRate}%</div>
                  <div style={{ fontSize: 12, color: '#4ade80', marginTop: 2 }}>전체 {total}건 중 {registered}건 등록완료</div>
                </div>
              </Panel>
            </div>
          </div>
        )}

        {/* ════ 유입 경로 탭 ════ */}
        {tab === 'source' && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16 }}>
              {srcData.slice(0, 4).map((d, i) => (
                <Card key={d.name} label={d.name} value={d.value}
                  sub={total > 0 ? `전체의 ${Math.round((d.value / total) * 100)}%` : '-'}
                  color={SRC_COLORS[i]} />
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 16 }}>
              <Panel title="유입 경로별 신청 건수" sub="대분류 기준">
                <ResponsiveContainer width="100%" height={Math.max(200, srcData.length * 42)}>
                  <BarChart data={srcData} layout="vertical" margin={{ top: 4, right: 32, bottom: 0, left: 56 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} allowDecimals={false} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 12, fill: '#4e5968' }} tickLine={false} axisLine={false} width={56} />
                    <Tooltip content={<Tip />} />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={22} name="건수">
                      {srcData.map((_, i) => <Cell key={i} fill={SRC_COLORS[i % SRC_COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </Panel>

              <Panel title="비율">
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={srcData} cx="50%" cy="50%" outerRadius={90} paddingAngle={2} dataKey="value">
                      {srcData.map((_, i) => <Cell key={i} fill={SRC_COLORS[i % SRC_COLORS.length]} />)}
                    </Pie>
                    <Tooltip content={<Tip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginTop: 4 }}>
                  {srcData.map((d, i) => (
                    <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                      <div style={{ width: 8, height: 8, borderRadius: 2, background: SRC_COLORS[i % SRC_COLORS.length], flexShrink: 0 }} />
                      <span style={{ color: '#4e5968', flex: 1 }}>{d.name}</span>
                      <span style={{ fontWeight: 700, color: '#191f28' }}>{d.value}</span>
                    </div>
                  ))}
                </div>
              </Panel>
            </div>
          </div>
        )}

        {/* ════ 시간 패턴 탭 ════ */}
        {tab === 'time' && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 16 }}>
              <Card label="피크 시간대" value={peaks.map(p => `${p.hour}시`).join(', ')} sub={`${peakCount}건 접수`} color="#3b82f6" />
              <Card label="평일 평균" value={
                Math.round(weekData.filter((_, i) => i >= 1 && i <= 5).reduce((a, b) => a + b.count, 0) / 5)
              } sub="월~금 하루 평균" color="#22c55e" />
              <Card label="주말 평균" value={
                Math.round((weekData[0].count + weekData[6].count) / 2)
              } sub="토·일 하루 평균" color="#f59e0b" />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <Panel title="시간대별 신청 건수" sub="0시~23시 (KST)">
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={hourData} margin={{ top: 4, right: 4, bottom: 0, left: -28 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                    <XAxis dataKey="hour" tick={{ fontSize: 9, fill: '#94a3b8' }} tickLine={false} axisLine={false} interval={1} />
                    <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} allowDecimals={false} />
                    <Tooltip content={<Tip />} />
                    <Bar dataKey="count" radius={[3, 3, 0, 0]} barSize={13} name="건수">
                      {hourData.map((d, i) => <Cell key={i} fill={peaks.some(p => p.hour === d.hour) ? '#3b82f6' : '#dbeafe'} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </Panel>

              <Panel title="요일별 신청 건수">
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={weekData} margin={{ top: 4, right: 4, bottom: 0, left: -28 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                    <XAxis dataKey="day" tick={{ fontSize: 13, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} allowDecimals={false} />
                    <Tooltip content={<Tip />} />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]} barSize={28} name="건수">
                      {(() => { const maxCount = Math.max(...weekData.map(d => d.count)); return weekData.map((d, i) => <Cell key={i} fill={d.count === maxCount && maxCount > 0 ? '#3b82f6' : i === 0 || i === 6 ? '#fca5a5' : '#bfdbfe'} />); })()}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                  {[['#bfdbfe', '평일'], ['#fca5a5', '주말']].map(([c, l]) => (
                    <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#4e5968' }}>
                      <div style={{ width: 10, height: 10, borderRadius: 2, background: c }} />{l}
                    </div>
                  ))}
                </div>
              </Panel>
            </div>
          </div>
        )}

        {/* ════ 과정 수요 탭 ════ */}
        {tab === 'course' && (
          <div>
            {courseData.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 0', color: '#94a3b8', fontSize: 14 }}>
                희망 과정 데이터가 없습니다
              </div>
            ) : (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16 }}>
                  {courseData.slice(0, 4).map((d, i) => (
                    <Card key={d.name} label={d.name} value={d.value}
                      sub={total > 0 ? `전체의 ${Math.round((d.value / total) * 100)}%` : '-'}
                      color={SRC_COLORS[i]} />
                  ))}
                </div>

                {/* 드릴다운 패널 */}
                {selectedCourse && (() => {
                  const top3 = Object.entries(
                    data
                      .filter(c => (c.major_category || c.hope_course || '').includes(selectedCourse))
                      .reduce<Record<string, number>>((acc, c) => {
                        const key = c.hope_course?.trim() || '';
                        if (key) acc[key] = (acc[key] || 0) + 1;
                        return acc;
                      }, {})
                  ).sort((a, b) => b[1] - a[1]).slice(0, 3);

                  return (
                    <div style={{ background: '#f9fafb', border: '1px solid #e5e8eb', borderRadius: 12, padding: '16px 20px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 24 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#191f28', minWidth: 80 }}>{selectedCourse}</div>
                      <div style={{ display: 'flex', gap: 12, flex: 1 }}>
                        {top3.map(([name, count], i) => (
                          <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#fff', border: '1px solid #f2f4f6', borderRadius: 10, padding: '8px 16px' }}>
                            <span style={{ fontSize: 12, color: '#94a3b8', fontWeight: 700 }}>{i + 1}</span>
                            <span style={{ fontSize: 13, color: '#191f28', fontWeight: 500 }}>{name}</span>
                            <span style={{ fontSize: 13, fontWeight: 700, color: SRC_COLORS[i] }}>{count}건</span>
                          </div>
                        ))}
                        {top3.length === 0 && <span style={{ fontSize: 13, color: '#94a3b8' }}>세부 과정 데이터 없음</span>}
                      </div>
                      <button onClick={() => setSelectedCourse(null)} style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: 18, cursor: 'pointer', lineHeight: 1 }}>×</button>
                    </div>
                  );
                })()}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 16 }}>
                  <Panel title="과정별 희망 건수" sub="바를 클릭하면 세부 과정을 볼 수 있어요">
                    <ResponsiveContainer width="100%" height={Math.max(200, courseData.length * 44)}>
                      <BarChart
                        data={courseData}
                        layout="vertical"
                        margin={{ top: 4, right: 32, bottom: 0, left: 72 }}
                        onClick={(e) => { if (e?.activeLabel) setSelectedCourse(String(e.activeLabel)); }}
                        style={{ cursor: 'pointer' }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                        <XAxis type="number" tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} allowDecimals={false} />
                        <YAxis type="category" dataKey="name" tick={{ fontSize: 12, fill: '#4e5968' }} tickLine={false} axisLine={false} width={72} />
                        <Tooltip content={<Tip />} />
                        <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={24} name="건수">
                          {courseData.map((d, i) => (
                            <Cell key={i} fill={d.name === selectedCourse ? SRC_COLORS[i % SRC_COLORS.length] : SRC_COLORS[i % SRC_COLORS.length] + 'cc'} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </Panel>

                  <Panel title="비율">
                    <ResponsiveContainer width="100%" height={220}>
                      <PieChart>
                        <Pie data={courseData} cx="50%" cy="50%" outerRadius={90} paddingAngle={2} dataKey="value">
                          {courseData.map((_, i) => <Cell key={i} fill={SRC_COLORS[i % SRC_COLORS.length]} />)}
                        </Pie>
                        <Tooltip content={<Tip />} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginTop: 4 }}>
                      {courseData.map((d, i) => (
                        <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                          <div style={{ width: 8, height: 8, borderRadius: 2, background: SRC_COLORS[i % SRC_COLORS.length], flexShrink: 0 }} />
                          <span style={{ color: '#4e5968', flex: 1 }}>{d.name}</span>
                          <span style={{ fontWeight: 700, color: '#191f28' }}>{d.value}</span>
                        </div>
                      ))}
                    </div>
                  </Panel>
                </div>
              </>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
