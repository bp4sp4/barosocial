'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface CreditBankEntry {
  id: number;
  major_category: string;
  sub_category: string;
  name: string;
  contact: string;
  education: string;
  created_at: string;
}

interface CsvRow {
  major_category: string;
  sub_category: string;
  name: string;
  contact: string;
  education: string;
}

const EDUCATION_OPTIONS = [
  '고등학교 졸업',
  '전문대 재학',
  '전문대 졸업',
  '대학교 재학',
  '대학교 졸업',
  '대학원 이상',
];

const ADMIN_COURSE_OPTIONS = [
  '사회복지사', '아동학사', '평생교육사', '편입/대학원',
  '건강가정사', '청소년지도사', '보육교사', '심리상담사',
];

// 대분류 → 중분류 카테고리 맵 (유입경로)
const CATEGORY_MAP: Record<string, string[]> = {
  '네이버': ['네이버카페', '네이버블로그', '네이버검색', '네이버플레이스', '네이버광고', '네이버쇼핑'],
  '맘카페': [
    '순광맘', '러브양산맘', '창원진해댁', '광주맘스팡', '충주아사모',
    '화성남양애', '율하맘', '춘천맘', '서산맘', '부천소사구',
    '둔산맘', '안평맘스비', '평택안포맘', '시맘수', '베이비러브',
    '중리사랑방', '안동맘', '기타맘카페',
  ],
  '당근': ['당근마켓', '당근채팅', '당근광고'],
  '인스타': ['인스타광고', '인스타게시물', '인스타DM', '인스타스토리'],
  '유튜브': ['유튜브광고', '유튜브영상'],
  '카카오': ['카카오톡채널', '카카오광고', '카카오채팅'],
  '지인소개': ['지인소개'],
  '기타': ['문자', '전화', '직접방문', '기타'],
};

const MAJOR_CATEGORIES = Object.keys(CATEGORY_MAP);

function formatDate(dateString: string) {
  const date = new Date(dateString);
  const y = date.getFullYear();
  const mo = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const h = String(date.getHours()).padStart(2, '0');
  const mi = String(date.getMinutes()).padStart(2, '0');
  return `${y}-${mo}-${d} ${h}:${mi}`;
}

function parseCsv(text: string): CsvRow[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, ''));

  const colMap: Record<string, number> = {};
  headers.forEach((h, i) => {
    const lower = h.toLowerCase();
    if (lower.includes('대분류') || lower === 'major_category') colMap['major_category'] = i;
    else if (lower.includes('중분류') || lower === 'sub_category') colMap['sub_category'] = i;
    else if (lower.includes('이름') || lower === 'name') colMap['name'] = i;
    else if (lower.includes('연락처') || lower === 'contact') colMap['contact'] = i;
    else if (lower.includes('최종학력') || lower === 'education') colMap['education'] = i;
  });

  const rows: CsvRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',').map((c) => c.trim().replace(/^"|"$/g, ''));
    if (cols.every((c) => !c)) continue;
    rows.push({
      major_category: cols[colMap['major_category'] ?? -1] ?? '',
      sub_category: cols[colMap['sub_category'] ?? -1] ?? '',
      name: cols[colMap['name'] ?? -1] ?? '',
      contact: cols[colMap['contact'] ?? -1] ?? '',
      education: cols[colMap['education'] ?? -1] ?? '',
    });
  }
  return rows;
}

export default function CreditBankAdminPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [entries, setEntries] = useState<CreditBankEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // CSV 관련 상태
  const [csvRows, setCsvRows] = useState<CsvRow[]>([]);
  const [csvFileName, setCsvFileName] = useState('');
  const [importing, setImporting] = useState(false);
  const [showCsvPreview, setShowCsvPreview] = useState(false);

  // 학점은행제 이동 모달
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [moveHopeCourse, setMoveHopeCourse] = useState('');
  const [moveClickSource, setMoveClickSource] = useState('');
  const [moving, setMoving] = useState(false);

  // 검색/필터
  const [searchText, setSearchText] = useState('');
  const [majorFilter, setMajorFilter] = useState('all');
  const [subFilter, setSubFilter] = useState('all');
  const [educationFilter, setEducationFilter] = useState('all');

  // 페이지
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  // 선택
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      router.push('/admin/login');
      return;
    }
    fetchEntries();
  }

  async function fetchEntries() {
    setLoading(true);
    const { data, error } = await supabase
      .from('credit_bank_contacts')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      setError(error.message);
    } else {
      setEntries(data || []);
    }
    setLoading(false);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvFileName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const rows = parseCsv(text);
      setCsvRows(rows);
      setShowCsvPreview(true);
    };
    reader.readAsText(file, 'utf-8');
    e.target.value = '';
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    setCsvFileName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const rows = parseCsv(text);
      setCsvRows(rows);
      setShowCsvPreview(true);
    };
    reader.readAsText(file, 'utf-8');
  }

  async function handleImport() {
    if (csvRows.length === 0) return;
    setImporting(true);
    const { error } = await supabase.from('credit_bank_contacts').insert(csvRows);
    if (error) {
      toast.error('가져오기 실패: ' + error.message);
    } else {
      toast.success(`${csvRows.length}건 임시 저장 완료`);
      setShowCsvPreview(false);
      setCsvRows([]);
      setCsvFileName('');
      fetchEntries();
    }
    setImporting(false);
  }

  async function handleDeleteSelected() {
    if (selectedIds.length === 0) return;
    if (!confirm(`${selectedIds.length}건을 삭제하시겠습니까?`)) return;
    const { error } = await supabase
      .from('credit_bank_contacts')
      .delete()
      .in('id', selectedIds);
    if (error) {
      toast.error('삭제 실패: ' + error.message);
    } else {
      toast.success(`${selectedIds.length}건 삭제 완료`);
      setSelectedIds([]);
      fetchEntries();
    }
  }

  // 학점은행제(consultations)로 이동
  async function handleMoveToConsultations() {
    setMoving(true);
    const targets = entries.filter((e) => selectedIds.includes(e.id));

    const insertData = targets.map((e) => ({
      name: e.name,
      contact: e.contact,
      education: e.education,
      hope_course: moveHopeCourse || e.major_category || null,
      click_source: moveClickSource || null,
      reason: '',
      status: '상담대기',
      memo: null,
      counsel_check: null,
      subject_cost: null,
      manager: null,
      residence: null,
    }));

    const { error: insertError } = await supabase.from('consultations').insert(insertData);
    if (insertError) {
      toast.error('이동 실패: ' + insertError.message);
      setMoving(false);
      return;
    }

    // 임시 테이블에서 삭제
    const { error: deleteError } = await supabase
      .from('credit_bank_contacts')
      .delete()
      .in('id', selectedIds);
    if (deleteError) {
      toast.error('임시 데이터 삭제 실패: ' + deleteError.message);
    } else {
      toast.success(`${targets.length}건이 학점은행제로 이동되었습니다`);
      setSelectedIds([]);
      setShowMoveModal(false);
      setMoveHopeCourse('');
      setMoveClickSource('');
      fetchEntries();
    }
    setMoving(false);
  }

  function handleDownloadTemplate() {
    const content = [
      '\uFEFF대분류,중분류,이름,연락처,최종학력',
      '네이버,네이버카페,홍길동,010-1234-5678,대학교 재학',
      '네이버,네이버블로그,김영수,010-2345-6789,전문대 졸업',
      '맘카페,순광맘,이미영,010-3456-7890,고등학교 졸업',
      '맘카페,율하맘,박지현,010-4567-8901,대학교 재학',
      '당근,당근마켓,최수진,010-5678-9012,대학교 졸업',
      '당근,당근채팅,정민호,010-6789-0123,전문대 재학',
      '인스타,인스타광고,한지우,010-7890-1234,고등학교 졸업',
      '카카오,카카오톡채널,오세훈,010-8901-2345,대학원 이상',
      '지인소개,지인소개,윤서연,010-9012-3456,대학교 재학',
      '',
    ].join('\n');
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'credit_bank_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  // 고유 대분류/중분류
  const majors = Array.from(new Set(entries.map((e) => e.major_category).filter(Boolean)));
  const subCategories = Array.from(
    new Set(
      entries
        .filter((e) => majorFilter === 'all' || e.major_category === majorFilter)
        .map((e) => e.sub_category)
        .filter(Boolean)
    )
  );

  const filtered = entries.filter((e) => {
    if (majorFilter !== 'all' && e.major_category !== majorFilter) return false;
    if (subFilter !== 'all' && e.sub_category !== subFilter) return false;
    if (educationFilter !== 'all' && e.education !== educationFilter) return false;
    if (searchText) {
      const s = searchText.toLowerCase();
      if (
        !e.name.toLowerCase().includes(s) &&
        !e.contact.includes(s) &&
        !e.major_category.toLowerCase().includes(s) &&
        !e.sub_category.toLowerCase().includes(s)
      )
        return false;
    }
    return true;
  });

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const paginated = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  function toggleSelect(id: number) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function toggleSelectAll() {
    const pageIds = paginated.map((e) => e.id);
    const allSelected = pageIds.every((id) => selectedIds.includes(id));
    if (allSelected) {
      setSelectedIds((prev) => prev.filter((id) => !pageIds.includes(id)));
    } else {
      setSelectedIds((prev) => Array.from(new Set([...prev, ...pageIds])));
    }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', color: '#888' }}>
        로딩 중...
      </div>
    );
  }

  return (
    <div style={{ padding: '24px 20px', maxWidth: 1400, margin: '0 auto' }}>
      {/* 헤더 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#191f28', margin: 0 }}>CSV 임시 저장소</h1>
          <p style={{ color: '#8b95a1', fontSize: 13, margin: '4px 0 0' }}>
            CSV 업로드 → 임시 저장 → 학점은행제로 이동 · 총 {entries.length}건
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button onClick={handleDownloadTemplate} style={btnStyle('#f2f4f6', '#4e5968')}>
            CSV 템플릿
          </button>
          <button onClick={() => fileInputRef.current?.click()} style={btnStyle('#3182f6', '#fff')}>
            CSV 업로드
          </button>
        </div>
      </div>

      <input ref={fileInputRef} type="file" accept=".csv" style={{ display: 'none' }} onChange={handleFileChange} />

      {/* 선택된 항목 액션 바 */}
      {selectedIds.length > 0 && (
        <div style={{
          background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 10,
          padding: '12px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
        }}>
          <span style={{ fontWeight: 600, color: '#1d4ed8', fontSize: 14 }}>
            {selectedIds.length}건 선택됨
          </span>
          <button
            onClick={() => setShowMoveModal(true)}
            style={btnStyle('#3182f6', '#fff')}
          >
            학점은행제로 이동 →
          </button>
          <button onClick={handleDeleteSelected} style={btnStyle('#f04452', '#fff')}>
            선택 삭제
          </button>
          <button onClick={() => setSelectedIds([])} style={btnStyle('#f2f4f6', '#4e5968')}>
            선택 해제
          </button>
        </div>
      )}

      {/* CSV 드롭 영역 */}
      {!showCsvPreview && (
        <div
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => fileInputRef.current?.click()}
          style={{
            border: '2px dashed #c8d6e5', borderRadius: 12, padding: '28px 20px',
            textAlign: 'center', cursor: 'pointer', marginBottom: 20,
            background: '#f8fafc', color: '#8b95a1', fontSize: 14,
          }}
        >
          <div style={{ fontSize: 28, marginBottom: 6 }}>📂</div>
          <div>CSV 파일을 끌어다 놓거나 클릭해서 업로드</div>
          <div style={{ fontSize: 12, marginTop: 4, color: '#b0bac6' }}>
            필요 컬럼: 대분류, 중분류, 이름, 연락처, 최종학력
          </div>
        </div>
      )}

      {/* CSV 미리보기 */}
      {showCsvPreview && csvRows.length > 0 && (
        <div style={{ background: '#fff', border: '1px solid #e5e8eb', borderRadius: 12, padding: 20, marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div>
              <span style={{ fontWeight: 700, color: '#191f28' }}>미리보기</span>
              <span style={{ color: '#8b95a1', fontSize: 13, marginLeft: 8 }}>{csvFileName} · {csvRows.length}건</span>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => { setShowCsvPreview(false); setCsvRows([]); setCsvFileName(''); }} style={btnStyle('#f2f4f6', '#4e5968')}>취소</button>
              <button onClick={handleImport} disabled={importing} style={btnStyle('#3182f6', '#fff')}>
                {importing ? '저장 중...' : `${csvRows.length}건 임시 저장`}
              </button>
            </div>
          </div>
          <div style={{ overflowX: 'auto', maxHeight: 260, overflowY: 'auto' }}>
            <table style={tableStyle}>
              <thead>
                <tr>{['대분류', '중분류', '이름', '연락처', '최종학력'].map((h) => <th key={h} style={thStyle}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {csvRows.slice(0, 50).map((row, i) => (
                  <tr key={i} style={{ background: i % 2 === 0 ? '#fff' : '#f8fafc' }}>
                    <td style={tdStyle}>{row.major_category || <span style={{ color: '#ccc' }}>-</span>}</td>
                    <td style={tdStyle}>{row.sub_category || <span style={{ color: '#ccc' }}>-</span>}</td>
                    <td style={tdStyle}>{row.name}</td>
                    <td style={tdStyle}>{row.contact}</td>
                    <td style={tdStyle}>{row.education || <span style={{ color: '#ccc' }}>-</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {csvRows.length > 50 && (
            <p style={{ color: '#8b95a1', fontSize: 12, marginTop: 8 }}>미리보기 50건 표시 중 (전체 {csvRows.length}건 저장됩니다)</p>
          )}
        </div>
      )}

      {/* 필터 */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          type="text" placeholder="이름, 연락처 검색..."
          value={searchText}
          onChange={(e) => { setSearchText(e.target.value); setCurrentPage(1); }}
          style={inputStyle}
        />
        <select value={majorFilter} onChange={(e) => { setMajorFilter(e.target.value); setSubFilter('all'); setCurrentPage(1); }} style={selectStyle}>
          <option value="all">대분류 전체</option>
          {majors.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
        <select value={subFilter} onChange={(e) => { setSubFilter(e.target.value); setCurrentPage(1); }} style={selectStyle}>
          <option value="all">중분류 전체</option>
          {subCategories.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={educationFilter} onChange={(e) => { setEducationFilter(e.target.value); setCurrentPage(1); }} style={selectStyle}>
          <option value="all">최종학력 전체</option>
          {EDUCATION_OPTIONS.map((e) => <option key={e} value={e}>{e}</option>)}
        </select>
        {(searchText || majorFilter !== 'all' || subFilter !== 'all' || educationFilter !== 'all') && (
          <button onClick={() => { setSearchText(''); setMajorFilter('all'); setSubFilter('all'); setEducationFilter('all'); setCurrentPage(1); }} style={btnStyle('#f2f4f6', '#4e5968')}>초기화</button>
        )}
        <span style={{ color: '#8b95a1', fontSize: 13, marginLeft: 4 }}>필터 결과 {filtered.length}건</span>
      </div>

      {/* 에러 (테이블 없을 때 SQL 안내) */}
      {error && (
        <div style={{ background: '#fff0f0', border: '1px solid #ffd0d0', borderRadius: 8, padding: '12px 16px', color: '#c0392b', marginBottom: 16, fontSize: 14 }}>
          오류: {error}
          <div style={{ fontSize: 12, marginTop: 6, color: '#888' }}>
            Supabase에서 아래 SQL로 테이블을 먼저 생성해 주세요:
          </div>
          <pre style={{ fontSize: 11, background: '#f8f8f8', padding: 8, borderRadius: 4, marginTop: 8, overflowX: 'auto', color: '#333' }}>
{`CREATE TABLE credit_bank_contacts (
  id bigint generated always as identity primary key,
  major_category text not null default '',
  sub_category text not null default '',
  name text not null default '',
  contact text not null default '',
  education text not null default '',
  created_at timestamptz not null default now()
);`}
          </pre>
        </div>
      )}

      {/* 데이터 테이블 */}
      <div style={{ background: '#fff', border: '1px solid #e5e8eb', borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={tableStyle}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                <th style={{ ...thStyle, width: 40 }}>
                  <input
                    type="checkbox"
                    checked={paginated.length > 0 && paginated.every((e) => selectedIds.includes(e.id))}
                    onChange={toggleSelectAll}
                  />
                </th>
                <th style={thStyle}>대분류</th>
                <th style={thStyle}>중분류</th>
                <th style={thStyle}>이름</th>
                <th style={thStyle}>연락처</th>
                <th style={thStyle}>최종학력</th>
                <th style={thStyle}>저장일</th>
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '40px 20px', color: '#b0bac6', fontSize: 14 }}>
                    데이터가 없습니다. CSV를 업로드해 주세요.
                  </td>
                </tr>
              ) : (
                paginated.map((entry, i) => (
                  <tr
                    key={entry.id}
                    style={{
                      background: selectedIds.includes(entry.id) ? '#eff6ff' : i % 2 === 0 ? '#fff' : '#f8fafc',
                      borderBottom: '1px solid #f0f2f4',
                    }}
                  >
                    <td style={{ ...tdStyle, textAlign: 'center' }}>
                      <input type="checkbox" checked={selectedIds.includes(entry.id)} onChange={() => toggleSelect(entry.id)} />
                    </td>
                    <td style={tdStyle}><span style={badgeStyle('#e8f4fd', '#1a73e8')}>{entry.major_category || '-'}</span></td>
                    <td style={tdStyle}><span style={badgeStyle('#f0fdf4', '#16a34a')}>{entry.sub_category || '-'}</span></td>
                    <td style={{ ...tdStyle, fontWeight: 600 }}>{entry.name}</td>
                    <td style={tdStyle}>{entry.contact}</td>
                    <td style={tdStyle}><span style={badgeStyle('#faf5ff', '#7c3aed')}>{entry.education || '-'}</span></td>
                    <td style={{ ...tdStyle, color: '#8b95a1', fontSize: 12 }}>{formatDate(entry.created_at)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 페이지네이션 */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 16 }}>
          <button onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1} style={pageBtn(currentPage === 1)}>이전</button>
          {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
            let page = i + 1;
            if (totalPages > 7) {
              if (currentPage <= 4) page = i + 1;
              else if (currentPage >= totalPages - 3) page = totalPages - 6 + i;
              else page = currentPage - 3 + i;
            }
            return (
              <button key={page} onClick={() => setCurrentPage(page)} style={pageBtn(false, page === currentPage)}>{page}</button>
            );
          })}
          <button onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} style={pageBtn(currentPage === totalPages)}>다음</button>
        </div>
      )}

      {/* 학점은행제 이동 모달 */}
      {showMoveModal && (
        <div style={overlayStyle} onClick={() => setShowMoveModal(false)}>
          <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 6px', fontSize: 18, fontWeight: 700 }}>학점은행제로 이동</h3>
            <p style={{ color: '#8b95a1', fontSize: 13, margin: '0 0 20px' }}>
              선택한 <strong style={{ color: '#191f28' }}>{selectedIds.length}건</strong>을 학점은행제 상담 목록으로 이동합니다.<br />
              이동 후 임시 저장소에서 삭제됩니다.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <label style={labelStyle}>
                희망과정 (hope_course)
                <select style={modalInputStyle} value={moveHopeCourse} onChange={(e) => setMoveHopeCourse(e.target.value)}>
                  <option value="">대분류 값 그대로 사용</option>
                  {ADMIN_COURSE_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
                <span style={{ fontSize: 11, color: '#aaa', marginTop: 2 }}>비워두면 CSV의 대분류 값을 희망과정으로 사용합니다</span>
              </label>
              <label style={labelStyle}>
                유입경로 (click_source)
                <div style={{ display: 'flex', gap: 6 }}>
                  <select
                    style={{ ...modalInputStyle, flex: 1 }}
                    value={moveClickSource.split('_')[0] || ''}
                    onChange={(e) => setMoveClickSource(e.target.value ? e.target.value + '_' : '')}
                  >
                    <option value="">각 행의 대분류 사용</option>
                    {MAJOR_CATEGORIES.map((m) => <option key={m} value={m}>{m}</option>)}
                  </select>
                  <select
                    style={{ ...modalInputStyle, flex: 1 }}
                    value={moveClickSource.split('_')[1] || ''}
                    onChange={(e) => {
                      const major = moveClickSource.split('_')[0] || '';
                      setMoveClickSource(major ? major + '_' + e.target.value : '');
                    }}
                    disabled={!moveClickSource.split('_')[0]}
                  >
                    <option value="">중분류 선택</option>
                    {(CATEGORY_MAP[moveClickSource.split('_')[0]] || []).map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <span style={{ fontSize: 11, color: '#aaa', marginTop: 2 }}>
                  저장 형식: <code style={{ background: '#f0f0f0', padding: '0 4px', borderRadius: 3 }}>{moveClickSource || '각 행의 대분류_중분류'}</code>
                </span>
              </label>
            </div>
            <div style={{ background: '#f8fafc', borderRadius: 8, padding: '10px 14px', marginTop: 16, fontSize: 12, color: '#6b7684' }}>
              <strong>이동 시 기본값</strong>: 상태 = 상담대기, 메모/담당자/비용 = 없음
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 20, justifyContent: 'flex-end' }}>
              <button onClick={() => setShowMoveModal(false)} style={btnStyle('#f2f4f6', '#4e5968')}>취소</button>
              <button onClick={handleMoveToConsultations} disabled={moving} style={btnStyle('#3182f6', '#fff')}>
                {moving ? '이동 중...' : `${selectedIds.length}건 이동`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// 스타일 헬퍼
function btnStyle(bg: string, color: string) {
  return {
    padding: '7px 14px', borderRadius: 8, fontSize: 13, fontWeight: 600,
    background: bg, color, border: 'none', cursor: 'pointer', whiteSpace: 'nowrap' as const,
  };
}

function pageBtn(disabled: boolean, active = false) {
  return {
    padding: '5px 12px', borderRadius: 6, fontSize: 13, border: '1px solid #e5e8eb',
    background: active ? '#3182f6' : disabled ? '#f8fafc' : '#fff',
    color: active ? '#fff' : disabled ? '#c8d6e5' : '#4e5968',
    cursor: disabled ? 'not-allowed' : 'pointer', fontWeight: active ? 700 : 400,
  };
}

function badgeStyle(bg: string, color: string) {
  return { display: 'inline-block', padding: '2px 8px', borderRadius: 4, fontSize: 12, fontWeight: 600, background: bg, color };
}

const tableStyle: React.CSSProperties = { width: '100%', borderCollapse: 'collapse', fontSize: 13 };
const thStyle: React.CSSProperties = { padding: '10px 12px', textAlign: 'left', fontWeight: 600, color: '#4e5968', borderBottom: '1px solid #e5e8eb', whiteSpace: 'nowrap' };
const tdStyle: React.CSSProperties = { padding: '10px 12px', color: '#191f28', verticalAlign: 'middle' };
const inputStyle: React.CSSProperties = { padding: '7px 12px', borderRadius: 8, border: '1px solid #e5e8eb', fontSize: 13, minWidth: 180, outline: 'none' };
const selectStyle: React.CSSProperties = { padding: '7px 10px', borderRadius: 8, border: '1px solid #e5e8eb', fontSize: 13, background: '#fff', cursor: 'pointer', outline: 'none' };
const overlayStyle: React.CSSProperties = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 };
const modalStyle: React.CSSProperties = { background: '#fff', borderRadius: 16, padding: 28, width: '100%', maxWidth: 440, boxShadow: '0 20px 60px rgba(0,0,0,0.15)' };
const labelStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13, fontWeight: 600, color: '#4e5968' };
const modalInputStyle: React.CSSProperties = { padding: '8px 12px', borderRadius: 8, border: '1px solid #e5e8eb', fontSize: 14, fontWeight: 400, outline: 'none', color: '#191f28' };
