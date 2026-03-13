'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

// ─── 타입 ────────────────────────────────────────────────────────────────────

type RowType = 'consult' | 'cert';

interface StagingRow {
  id: number;
  row_type: RowType;
  name: string;
  contact: string;
  education: string | null;
  major_category: string | null;
  hope_course: string | null;
  click_source: string | null;
  reason: string | null;
  memo: string | null;
  status: string;
  manager: string | null;
  residence: string | null;
  counsel_check: string | null;
  subject_cost: number | null;
  applied_at: string | null;
  created_at: string;
}

interface CsvRow {
  name: string; contact: string; education: string; major_category: string;
  hope_course: string; click_source: string; reason: string; memo: string;
  status: string; manager: string; residence: string; counsel_check: string;
  subject_cost: string; applied_at: string;
}

type Tab = 'upload' | 'staging';

// ─── CSV 파싱 ─────────────────────────────────────────────────────────────────

const HEADER_MAP: Record<string, keyof CsvRow> = {
  '이름': 'name', 'name': 'name',
  '연락처': 'contact', 'contact': 'contact',
  '최종학력': 'education', 'education': 'education',
  '과정분류': 'major_category', 'major_category': 'major_category',
  '희망과정': 'hope_course', 'hope_course': 'hope_course',
  '유입경로': 'click_source', 'click_source': 'click_source',
  '상담사유': 'reason', '취득사유': 'reason', 'reason': 'reason',
  '메모': 'memo', 'memo': 'memo',
  '상태': 'status', 'status': 'status',
  '담당자': 'manager', 'manager': 'manager',
  '거주지': 'residence', 'residence': 'residence',
  '상담체크': 'counsel_check', '고민': 'counsel_check', 'counsel_check': 'counsel_check',
  '과목비용': 'subject_cost', 'subject_cost': 'subject_cost',
  '신청일시': 'applied_at', 'applied_at': 'applied_at',
};

function parseCsv(text: string): CsvRow[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, ''));
  const majorIdx = headers.findIndex((h) => h === '대분류');
  const minorIdx = headers.findIndex((h) => h === '중분류');
  const colMap = headers
    .map((h, i) => ({ field: HEADER_MAP[h], idx: i }))
    .filter(({ field, idx }) => field && idx !== majorIdx && idx !== minorIdx);

  return lines.slice(1).map((line) => {
    const cols = line.split(',').map((c) => c.trim().replace(/^"|"$/g, ''));
    if (cols.every((c) => !c)) return null;
    const row: CsvRow = {
      name: '', contact: '', education: '', major_category: '',
      hope_course: '', click_source: '', reason: '', memo: '',
      status: '', manager: '', residence: '', counsel_check: '', subject_cost: '', applied_at: '',
    };
    colMap.forEach(({ field, idx }) => { if (cols[idx] !== undefined) row[field] = cols[idx]; });
    const major = majorIdx !== -1 ? cols[majorIdx] ?? '' : '';
    const minor = minorIdx !== -1 ? cols[minorIdx] ?? '' : '';
    if (!row.click_source) {
      if (major && minor) row.click_source = `${major}_${minor}`;
      else if (major) row.click_source = major;
    }
    if (!row.status) row.status = '상담대기';
    return row;
  }).filter(Boolean) as CsvRow[];
}

// ─── 템플릿 ───────────────────────────────────────────────────────────────────

const CONSULT_TEMPLATE = [
  '\uFEFF대분류,중분류,이름,연락처,최종학력,희망과정,취득사유,과목비용,담당자,거주지,메모,고민,신청일시,상태',
  '네이버,네이버카페,홍길동,010-1234-5678,대학교 재학,사회복지사,취업 때문에,580000,김담당,서울 강동구,,타기관,2026-03-01,상담대기',
  '맘카페,순광맘,김영희,010-2345-6789,고등학교 졸업,평생교육사,자격증 취득 목적,450000,이담당,경기 수원시,오전 연락 요망,,2026-03-03,상담대기',
  '당근,당근채팅,이민준,010-3456-7890,전문대 졸업,보육교사,이직 준비,520000,김담당,인천 남동구,,가격비교,2026-03-05,상담대기',
  '인스타,인스타광고,박서연,010-4567-8901,대학교 재학,사회복지사,전공 관련,580000,이담당,서울 송파구,주말 상담 원함,,2026-03-07,상담대기',
  '카카오,카카오톡채널,최지훈,010-5678-9012,대학교 졸업,청소년지도사,관심 분야,430000,박담당,경기 성남시,,직장,2026-03-08,상담대기',
  '지인소개,지인소개,정수아,010-6789-0123,전문대 재학,건강가정사,경력 개발,460000,김담당,서울 마포구,빠른 수료 문의,,2026-03-10,상담대기',
  '',
].join('\n');

const CERT_TEMPLATE = [
  '\uFEFF대분류,중분류,이름,연락처,희망과정,취득사유,과목비용,담당자,거주지,메모,고민,신청일시',
  '네이버,네이버카페,홍길동,010-1234-5678,생활지원사1급,취업 목적,280000,김담당,서울 강동구,,타기관,2026-03-01',
  '맘카페,순광맘,김영희,010-2345-6789,아동미술지도사1급,부업 준비,240000,이담당,경기 수원시,오전 연락,,가격비교,2026-03-03',
  '당근,당근채팅,이민준,010-3456-7890,심리상담사1급,이직 준비,260000,김담당,인천 남동구,,,직장,2026-03-05',
  '인스타,인스타광고,박서연,010-4567-8901,바리스타1급,창업 준비,180000,이담당,서울 송파구,주말 수업 가능 여부,,자체가격,2026-03-07',
  '카카오,카카오톡채널,최지훈,010-5678-9012,독서논술지도사1급,자기계발,220000,박담당,경기 성남시,,,육아,2026-03-08',
  '지인소개,지인소개,정수아,010-6789-0123,손유희지도사1급,부업,200000,김담당,서울 마포구,,타기관,2026-03-10',
  '',
].join('\n');

// ─── 유틸 ─────────────────────────────────────────────────────────────────────

function toCostInt(v: string | null | undefined): number | null {
  if (!v) return null;
  const n = parseInt(String(v).replace(/[^0-9]/g, ''));
  return isNaN(n) ? null : n;
}

function formatDate(d: string) {
  const dt = new Date(d);
  return `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')} ${String(dt.getHours()).padStart(2,'0')}:${String(dt.getMinutes()).padStart(2,'0')}`;
}

// ─── 컴포넌트 ─────────────────────────────────────────────────────────────────

export default function BulkRegisterPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 업로드 탭 상태
  const [uploadType, setUploadType] = useState<RowType>('consult');
  const [csvRows, setCsvRows] = useState<CsvRow[]>([]);
  const [fileName, setFileName] = useState('');
  const [saving, setSaving] = useState(false);

  const [showGuide, setShowGuide] = useState(false);
  const [guideStep, setGuideStep] = useState(0);

  // 임시저장 탭 상태
  const [staging, setStaging] = useState<StagingRow[]>([]);
  const [stagingLoading, setStagingLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [typeFilter, setTypeFilter] = useState<RowType | 'all'>('all');
  const [moving, setMoving] = useState(false);

  const [tab, setTab] = useState<Tab>('upload');

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) router.push('/admin/login');
      else fetchStaging();
    });
  }, []);

  async function fetchStaging() {
    setStagingLoading(true);
    const { data, error } = await supabase
      .from('csv_staging')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error) setStaging(data || []);
    setStagingLoading(false);
  }

  // ── 파일 처리 ──

  function handleFile(file: File) {
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => setCsvRows(parseCsv(ev.target?.result as string));
    reader.readAsText(file, 'utf-8');
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }

  // ── 임시 저장 ──

  async function handleSaveToStaging() {
    if (csvRows.length === 0) return;
    setSaving(true);
    const insertData = csvRows.map((r) => ({
      row_type: uploadType,
      name: r.name, contact: r.contact,
      education: uploadType === 'consult' ? (r.education || null) : null,
      major_category: uploadType === 'cert' ? (r.major_category || null) : null,
      hope_course: r.hope_course || null,
      click_source: r.click_source || null,
      reason: r.reason || null,
      memo: r.memo || null,
      status: r.status || '상담대기',
      manager: r.manager || null,
      residence: r.residence || null,
      counsel_check: r.counsel_check || null,
      subject_cost: toCostInt(r.subject_cost),
      applied_at: r.applied_at || null,
    }));
    const { error } = await supabase.from('csv_staging').insert(insertData);
    if (error) {
      toast.error('저장 실패: ' + error.message);
    } else {
      toast.success(`${csvRows.length}건 임시 저장 완료`);
      setCsvRows([]);
      setFileName('');
      fetchStaging();
      setTab('staging');
    }
    setSaving(false);
  }

  // ── 이동 ──

  async function handleMove() {
    if (selectedIds.length === 0) return;
    const targets = staging.filter((s) => selectedIds.includes(s.id));

    const consultTargets = targets.filter((t) => t.row_type === 'consult');
    const certTargets = targets.filter((t) => t.row_type === 'cert');

    setMoving(true);
    let failed = false;

    if (consultTargets.length > 0) {
      const { error } = await supabase.from('consultations').insert(
        consultTargets.map((r) => ({
          name: r.name, contact: r.contact, education: r.education || '',
          hope_course: r.hope_course, click_source: r.click_source,
          reason: r.reason || '', memo: r.memo, status: r.status,
          manager: r.manager, residence: r.residence,
          counsel_check: r.counsel_check, subject_cost: r.subject_cost,
        }))
      );
      if (error) { toast.error('학점은행제 이동 실패: ' + error.message); failed = true; }
    }

    if (!failed && certTargets.length > 0) {
      const res = await fetch('/api/private-cert/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows: certTargets }),
      });
      if (!res.ok) {
        const err = await res.json();
        toast.error('민간자격증 이동 실패: ' + (err.error || res.statusText));
        failed = true;
      }
    }

    if (!failed) {
      await supabase.from('csv_staging').delete().in('id', selectedIds);
      toast.success(`${selectedIds.length}건 이동 완료`);
      setSelectedIds([]);
      fetchStaging();
    }
    setMoving(false);
  }

  async function handleDeleteSelected() {
    if (selectedIds.length === 0) return;
    if (!confirm(`${selectedIds.length}건을 삭제하시겠습니까?`)) return;
    const { error } = await supabase.from('csv_staging').delete().in('id', selectedIds);
    if (error) { toast.error('삭제 실패: ' + error.message); return; }
    toast.success(`${selectedIds.length}건 삭제`);
    setSelectedIds([]);
    fetchStaging();
  }

  function handleDownloadTemplate() {
    const content = uploadType === 'consult' ? CONSULT_TEMPLATE : CERT_TEMPLATE;
    const name = uploadType === 'consult' ? '학점은행제_CSV템플릿.csv' : '민간자격증_CSV템플릿.csv';
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = name; a.click();
    URL.revokeObjectURL(url);
  }

  // ── 선택 ──

  const filteredStaging = typeFilter === 'all' ? staging : staging.filter((s) => s.row_type === typeFilter);

  function toggleSelect(id: number) {
    setSelectedIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  }
  function toggleAll() {
    const ids = filteredStaging.map((s) => s.id);
    const allSelected = ids.every((id) => selectedIds.includes(id));
    setSelectedIds(allSelected ? selectedIds.filter((id) => !ids.includes(id)) : Array.from(new Set([...selectedIds, ...ids])));
  }

  const stagingConsultCount = staging.filter((s) => s.row_type === 'consult').length;
  const stagingCertCount = staging.filter((s) => s.row_type === 'cert').length;

  return (
    <div style={{ padding: '24px 20px', maxWidth: 1400, margin: '0 auto' }}>
      {/* 헤더 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#191f28', margin: 0 }}>일괄 등록</h1>
          <p style={{ color: '#8b95a1', fontSize: 13, margin: '4px 0 0' }}>
            CSV 업로드 → 미리보기 → 임시 저장 → 목록 이동
          </p>
        </div>
        {tab === 'upload' && (
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => setShowGuide(true)}
              style={{ ...btn('#fff', '#3182f6'), border: '1px solid #d1e0ff' }}
            >
              ❓ 업로드 가이드
            </button>
            <button onClick={handleDownloadTemplate} style={btn('#f2f4f6', '#4e5968')}>
              {uploadType === 'consult' ? '학점은행제' : '민간자격증'} 템플릿 다운로드
            </button>
          </div>
        )}
      </div>

      {/* 탭 */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 24, borderBottom: '2px solid #f0f2f4' }}>
        {([['upload', 'CSV 업로드'], ['staging', `임시 저장 (${staging.length})`]] as [Tab, string][]).map(([t, label]) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: '10px 22px', border: 'none', cursor: 'pointer', fontSize: 14,
              fontWeight: tab === t ? 700 : 500,
              color: tab === t ? '#3182f6' : '#8b95a1',
              background: 'transparent',
              borderBottom: tab === t ? '2px solid #3182f6' : '2px solid transparent',
              marginBottom: -2,
            }}
          >
            {label}
          </button>
        ))}
      </div>

      <input ref={fileInputRef} type="file" accept=".csv" style={{ display: 'none' }}
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ''; }} />

      {/* ── 업로드 탭 ── */}
      {tab === 'upload' && (
        <>
          {/* 구분 선택 */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
            {(['consult', 'cert'] as RowType[]).map((t) => (
              <button
                key={t}
                onClick={() => { setUploadType(t); setCsvRows([]); setFileName(''); }}
                style={{
                  padding: '8px 20px', borderRadius: 8, border: '2px solid',
                  borderColor: uploadType === t ? '#3182f6' : '#e5e8eb',
                  background: uploadType === t ? '#eff6ff' : '#fff',
                  color: uploadType === t ? '#3182f6' : '#4e5968',
                  fontWeight: uploadType === t ? 700 : 500, fontSize: 14, cursor: 'pointer',
                }}
              >
                {t === 'consult' ? '학점은행제' : '민간자격증'}
              </button>
            ))}
          </div>

          {/* 드롭존 */}
          {csvRows.length === 0 && (
            <div
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: '2px dashed #c8d6e5', borderRadius: 16, padding: '48px 20px',
                textAlign: 'center', cursor: 'pointer', background: '#f8fafc', marginBottom: 20,
              }}
            >
              <div style={{ fontSize: 36, marginBottom: 10 }}>📂</div>
              <div style={{ fontSize: 15, fontWeight: 600, color: '#4e5968' }}>
                {uploadType === 'consult' ? '학점은행제' : '민간자격증'} CSV 파일 업로드
              </div>
              <div style={{ fontSize: 12, marginTop: 6, color: '#b0bac6' }}>
                {uploadType === 'consult'
                  ? '대분류·중분류·이름·연락처·최종학력·희망과정·취득사유·과목비용·담당자·거주지·메모·고민·신청일시·상태'
                  : '대분류·중분류·이름·연락처·희망과정·취득사유·과목비용·담당자·거주지·메모·고민·신청일시'
                }
              </div>
            </div>
          )}


          {/* 미리보기 */}
          {csvRows.length > 0 && (
            <div style={{ background: '#fff', border: '1px solid #e5e8eb', borderRadius: 12, overflow: 'hidden', marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: '1px solid #f0f2f4', background: '#fafbfc' }}>
                <div>
                  <span style={{ fontWeight: 700, color: '#191f28' }}>미리보기</span>
                  <span style={{ color: '#8b95a1', fontSize: 13, marginLeft: 8 }}>{fileName} · {csvRows.length}건</span>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => { setCsvRows([]); setFileName(''); }} style={btn('#f2f4f6', '#4e5968')}>취소</button>
                  <button onClick={handleSaveToStaging} disabled={saving} style={btn('#3182f6', '#fff')}>
                    {saving ? '저장 중...' : `${csvRows.length}건 임시 저장`}
                  </button>
                </div>
              </div>
              <div style={{ overflowX: 'auto', maxHeight: 400, overflowY: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead style={{ position: 'sticky', top: 0, background: '#f8fafc', zIndex: 1 }}>
                    <tr>
                      <th style={th}>#</th>
                      {(uploadType === 'consult'
                        ? ['대분류/중분류→유입경로','이름','연락처','최종학력','희망과정','취득사유','과목비용','담당자','거주지','메모','고민','신청일시','상태']
                        : ['대분류/중분류→유입경로','이름','연락처','희망과정','취득사유','과목비용','담당자','거주지','메모','고민','신청일시']
                      ).map((h) => <th key={h} style={th}>{h}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {csvRows.map((row, i) => (
                      <tr key={i} style={{ background: i % 2 === 0 ? '#fff' : '#f8fafc', borderBottom: '1px solid #f0f2f4' }}>
                        <td style={{ ...td, color: '#aaa', textAlign: 'center' }}>{i + 1}</td>
                        {(uploadType === 'consult'
                          ? [row.click_source, row.name, row.contact, row.education, row.hope_course, row.reason, row.subject_cost, row.manager, row.residence, row.memo, row.counsel_check, row.applied_at, row.status]
                          : [row.click_source, row.name, row.contact, row.hope_course, row.reason, row.subject_cost, row.manager, row.residence, row.memo, row.counsel_check, row.applied_at]
                        ).map((val, j) => (
                          <td key={j} style={td}>
                            {val || <span style={{ color: '#d1d5db' }}>-</span>}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 컬럼 안내 */}
          <div style={{ background: '#f8fafc', border: '1px solid #e5e8eb', borderRadius: 12, padding: '16px 20px' }}>
            <div style={{ fontWeight: 700, fontSize: 13, color: '#4e5968', marginBottom: 10 }}>컬럼 안내</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 8 }}>
              {(uploadType === 'consult' ? [
                { col: '대분류', req: false, desc: '네이버, 맘카페, 당근 등' },
                { col: '중분류', req: false, desc: '네이버카페, 당근채팅 → 유입경로 자동 조합' },
                { col: '이름', req: true, desc: '고객 이름' },
                { col: '연락처', req: true, desc: '010-0000-0000' },
                { col: '최종학력', req: false, desc: '고등학교 졸업 / 대학교 재학 등' },
                { col: '희망과정', req: false, desc: '사회복지사, 보육교사 등' },
                { col: '취득사유', req: false, desc: '자유 입력' },
                { col: '과목비용', req: false, desc: '숫자 (콤마 포함 가능)' },
                { col: '담당자', req: false, desc: '담당자 이름' },
                { col: '거주지', req: false, desc: '지역명' },
                { col: '메모', req: false, desc: '자유 입력' },
                { col: '고민', req: false, desc: '타기관, 자체가격 등' },
                { col: '신청일시', req: false, desc: '등록일 지정 (비우면 현재 시간)' },
                { col: '상태', req: false, desc: '비우면 상담대기 자동' },
              ] : [
                { col: '대분류', req: false, desc: '네이버, 맘카페, 당근 등' },
                { col: '중분류', req: false, desc: '네이버카페, 당근채팅 → 유입경로 자동 조합' },
                { col: '이름', req: true, desc: '고객 이름' },
                { col: '연락처', req: true, desc: '010-0000-0000' },
                { col: '희망과정', req: false, desc: '바리스타1급, 심리상담사1급 등' },
                { col: '취득사유', req: false, desc: '자유 입력' },
                { col: '과목비용', req: false, desc: '숫자 (콤마 포함 가능)' },
                { col: '담당자', req: false, desc: '담당자 이름' },
                { col: '거주지', req: false, desc: '지역명' },
                { col: '메모', req: false, desc: '자유 입력' },
                { col: '고민', req: false, desc: '타기관, 자체가격 등' },
                { col: '신청일시', req: false, desc: '등록일 지정 (비우면 현재 시간)' },
              ]).map(({ col, req, desc }) => (
                <div key={col} style={{ display: 'flex', gap: 6 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#191f28', whiteSpace: 'nowrap' }}>
                    {col}{req && <span style={{ color: '#f04452', marginLeft: 2 }}>*</span>}
                  </span>
                  <span style={{ fontSize: 11, color: '#8b95a1' }}>{desc}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* ── 임시 저장 탭 ── */}
      {tab === 'staging' && (
        <>
          {/* 필터 + 액션 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
            <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as RowType | 'all')} style={sel}>
              <option value="all">전체 ({staging.length})</option>
              <option value="consult">학점은행제 ({stagingConsultCount})</option>
              <option value="cert">민간자격증 ({stagingCertCount})</option>
            </select>
            <div style={{ flex: 1 }} />
            {selectedIds.length > 0 && (
              <>
                <span style={{ color: '#3182f6', fontWeight: 600, fontSize: 14 }}>{selectedIds.length}건 선택</span>
                <button onClick={handleMove} disabled={moving} style={btn('#3182f6', '#fff')}>
                  {moving ? '이동 중...' : '상담 목록으로 이동 →'}
                </button>
                <button onClick={handleDeleteSelected} style={btn('#f04452', '#fff')}>삭제</button>
                <button onClick={() => setSelectedIds([])} style={btn('#f2f4f6', '#4e5968')}>해제</button>
              </>
            )}
          </div>

          {/* 에러 안내 */}
          {stagingLoading && (
            <div style={{ textAlign: 'center', padding: 40, color: '#888' }}>로딩 중...</div>
          )}

          {!stagingLoading && staging.length === 0 && (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: '#b0bac6' }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>📭</div>
              <div style={{ fontSize: 14 }}>임시 저장된 데이터가 없습니다</div>
              <div style={{ fontSize: 12, marginTop: 4 }}>CSV 업로드 탭에서 파일을 업로드해 주세요</div>
            </div>
          )}

          {!stagingLoading && (
            <>
              {/* SQL 안내 */}
              {stagingLoading === false && staging.length === 0 && (
                <details style={{ marginBottom: 16 }}>
                  <summary style={{ cursor: 'pointer', fontSize: 12, color: '#8b95a1' }}>csv_staging 테이블 생성 SQL 보기</summary>
                  <pre style={{ fontSize: 11, background: '#f8f8f8', padding: 12, borderRadius: 8, marginTop: 8, overflowX: 'auto', color: '#333' }}>
{`CREATE TABLE csv_staging (
  id bigint generated always as identity primary key,
  row_type text not null,
  name text not null default '',
  contact text not null default '',
  education text,
  major_category text,
  hope_course text,
  click_source text,
  reason text,
  memo text,
  status text not null default '상담대기',
  manager text,
  residence text,
  counsel_check text,
  subject_cost integer,
  created_at timestamptz not null default now()
);`}
                  </pre>
                </details>
              )}

              <div style={{ background: '#fff', border: '1px solid #e5e8eb', borderRadius: 12, overflow: 'hidden' }}>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                    <thead>
                      <tr style={{ background: '#f8fafc' }}>
                        <th style={{ ...th, width: 40 }}>
                          <input type="checkbox"
                            checked={filteredStaging.length > 0 && filteredStaging.every((s) => selectedIds.includes(s.id))}
                            onChange={toggleAll}
                          />
                        </th>
                        <th style={th}>구분</th>
                        <th style={th}>이름</th>
                        <th style={th}>연락처</th>
                        <th style={th}>학력/과정분류</th>
                        <th style={th}>희망과정</th>
                        <th style={th}>유입경로</th>
                        <th style={th}>상태</th>
                        <th style={th}>담당자</th>
                        <th style={th}>저장일</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredStaging.length === 0 ? (
                        <tr><td colSpan={10} style={{ textAlign: 'center', padding: '40px 20px', color: '#b0bac6' }}>데이터 없음</td></tr>
                      ) : filteredStaging.map((row, i) => (
                        <tr key={row.id} style={{ background: selectedIds.includes(row.id) ? '#eff6ff' : i % 2 === 0 ? '#fff' : '#f8fafc', borderBottom: '1px solid #f0f2f4' }}>
                          <td style={{ ...td, textAlign: 'center' }}>
                            <input type="checkbox" checked={selectedIds.includes(row.id)} onChange={() => toggleSelect(row.id)} />
                          </td>
                          <td style={td}>
                            <span style={row.row_type === 'consult' ? badge('#eff6ff', '#3182f6') : badge('#faf5ff', '#7c3aed')}>
                              {row.row_type === 'consult' ? '학점은행제' : '민간자격증'}
                            </span>
                          </td>
                          <td style={{ ...td, fontWeight: 600 }}>{row.name}</td>
                          <td style={td}>{row.contact}</td>
                          <td style={td}>{row.education || row.major_category || <span style={{ color: '#d1d5db' }}>-</span>}</td>
                          <td style={td}>{row.hope_course || <span style={{ color: '#d1d5db' }}>-</span>}</td>
                          <td style={td}>
                            {row.click_source
                              ? <span style={badge('#e8f4fd', '#1a73e8')}>{row.click_source}</span>
                              : <span style={{ color: '#d1d5db' }}>-</span>}
                          </td>
                          <td style={td}>
                            <span style={badge('#f0fdf4', '#16a34a')}>{row.status}</span>
                          </td>
                          <td style={td}>{row.manager || <span style={{ color: '#d1d5db' }}>-</span>}</td>
                          <td style={{ ...td, color: '#8b95a1' }}>{formatDate(row.created_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </>
      )}
      {/* 가이드 모달 */}
      {showGuide && (() => {
        const GUIDES = [
          { img: '/guide/guide_01.png', step: 1, title: '템플릿 데이터 입력', desc: '다운로드한 CSV 템플릿 파일을 엑셀로 열어 데이터를 입력한후 저장후' },
          { img: '/guide/guide_02.png', step: 2, title: '다른 이름으로 저장', desc: '파일 메뉴 → 다른 이름으로 저장 → 내 컴퓨터를 선택합니다.' },
          { img: '/guide/guide_03.png', step: 3, title: 'CSV 형식으로 저장', desc: '파일 형식을 CSV(쉼표로 구분)(*.csv) 로 선택 후 저장합니다.' },
          { img: '/guide/guide_04.png', step: 4, title: '파일 업로드', desc: '저장한 CSV 파일을 업로드 영역에 드래그하거나 클릭해서 선택합니다.' },
        ];
        const current = GUIDES[guideStep];
        return (
          <div
            onClick={() => { setShowGuide(false); setGuideStep(0); }}
            style={{
              position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)',
              zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: 20,
            }}
          >
            <div
              onClick={e => e.stopPropagation()}
              style={{
                background: '#fff', borderRadius: 16,
                width: 'fit-content', maxWidth: '95vw', maxHeight: '95vh',
                display: 'flex', flexDirection: 'column',
                overflow: 'hidden',
              }}
            >
              {/* 헤더 */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: '1px solid #f0f2f4' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ background: '#3182f6', color: '#fff', borderRadius: 20, fontSize: 13, fontWeight: 700, padding: '4px 14px' }}>
                    STEP {current.step} / {GUIDES.length}
                  </span>
                  <span style={{ fontSize: 18, fontWeight: 700, color: '#191f28' }}>{current.title}</span>
                </div>
                <button
                  onClick={() => { setShowGuide(false); setGuideStep(0); }}
                  style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#8b95a1' }}
                >✕</button>
              </div>

              {/* 이미지 */}
              <div style={{ overflowY: 'auto' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={current.img} alt={`step${current.step}`} style={{ display: 'block', maxWidth: '70vw', maxHeight: '60vh', objectFit: 'contain' }} />
              </div>

              {/* 하단 */}
              <div style={{ padding: '16px 24px', borderTop: '1px solid #f0f2f4', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
                <p style={{ fontSize: 16, fontWeight: 500, color: '#191f28', margin: 0, lineHeight: 1.6 }}>{current.desc}</p>
                <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                  <button
                    onClick={() => setGuideStep(s => s - 1)}
                    disabled={guideStep === 0}
                    style={{ padding: '8px 20px', borderRadius: 8, border: '1px solid #e5e8eb', background: '#fff', color: guideStep === 0 ? '#c8d0d8' : '#4e5968', fontWeight: 600, fontSize: 14, cursor: guideStep === 0 ? 'default' : 'pointer' }}
                  >이전</button>
                  <button
                    onClick={() => guideStep === GUIDES.length - 1 ? (setShowGuide(false), setGuideStep(0)) : setGuideStep(s => s + 1)}
                    style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: '#3182f6', color: '#fff', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}
                  >{guideStep === GUIDES.length - 1 ? '완료' : '다음'}</button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

// ─── 스타일 ───────────────────────────────────────────────────────────────────
function btn(bg: string, color: string) {
  return { padding: '7px 14px', borderRadius: 8, fontSize: 13, fontWeight: 600, background: bg, color, border: 'none', cursor: 'pointer', whiteSpace: 'nowrap' as const };
}
function badge(bg: string, color: string): React.CSSProperties {
  return { display: 'inline-block', padding: '1px 6px', borderRadius: 4, fontSize: 11, fontWeight: 600, background: bg, color };
}
const th: React.CSSProperties = { padding: '8px 10px', textAlign: 'left', fontWeight: 600, color: '#4e5968', borderBottom: '1px solid #e5e8eb', whiteSpace: 'nowrap', fontSize: 12 };
const td: React.CSSProperties = { padding: '7px 10px', color: '#191f28', verticalAlign: 'middle', whiteSpace: 'nowrap' };
const sel: React.CSSProperties = { padding: '7px 10px', borderRadius: 8, border: '1px solid #e5e8eb', fontSize: 13, background: '#fff', cursor: 'pointer', outline: 'none' };
