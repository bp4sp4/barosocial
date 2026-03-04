'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import styles from '../admin.module.css';
import Link from 'next/link';

const EDUCATION_OPTIONS = ['고등학교 졸업', '전문대 졸업', '대학교 재학', '대학교 졸업', '대학원 이상'];
const COURSE_OPTIONS = ['심리상담사'];

type ConsultationStatus = '상담대기' | '상담중' | '보류' | '등록대기' | '등록완료';

interface PrivateCert {
  id: number;
  name: string;
  contact: string;
  education: string | null;
  hope_course: string | null;
  reason: string | null;
  click_source: string | null;
  memo: string | null;
  counsel_check: string | null;
  status: ConsultationStatus;
  subject_cost: number | null;
  manager: string | null;
  residence: string | null;
  created_at: string;
}

const COUNSEL_CHECK_OPTIONS = ['타기관', '자체가격', '직장', '육아', '가격비교', '기타'];
const STATUS_OPTIONS: ConsultationStatus[] = ['상담대기', '상담중', '보류', '등록대기', '등록완료'];

function formatDate(dateString: string) {
  const date = new Date(dateString);
  const y = date.getFullYear();
  const mo = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const h = String(date.getHours()).padStart(2, '0');
  const mi = String(date.getMinutes()).padStart(2, '0');
  return `${y}-${mo}-${d} ${h}:${mi}`;
}

function formatPhoneNumber(value: string) {
  const numbers = value.replace(/[^0-9]/g, '');
  if (numbers.length <= 3) return numbers;
  if (numbers.length <= 7) return `${numbers.slice(0, 3)}-${numbers.slice(3)}`;
  if (numbers.length <= 11) return `${numbers.slice(0, 3)}-${numbers.slice(3, 7)}-${numbers.slice(7)}`;
  return `${numbers.slice(0, 3)}-${numbers.slice(3, 7)}-${numbers.slice(7, 11)}`;
}

function formatCost(value: string) {
  const numbers = value.replace(/[^0-9]/g, '');
  if (!numbers) return '';
  return parseInt(numbers).toLocaleString();
}

export default function PrivateCertAdminPage() {
  const router = useRouter();
  const [items, setItems] = useState<PrivateCert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // 필터
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<ConsultationStatus | 'all'>('all');
  const [managerFilter, setManagerFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [openFilterColumn, setOpenFilterColumn] = useState<string | null>(null);
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const filterDropdownRef = useRef<HTMLDivElement>(null);

  // 모달
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showMemoModal, setShowMemoModal] = useState(false);
  const [showReasonModal, setShowReasonModal] = useState(false);
  const [showSubjectCostModal, setShowSubjectCostModal] = useState(false);
  const [showManagerModal, setShowManagerModal] = useState(false);
  const [showResidenceModal, setShowResidenceModal] = useState(false);
  const [showCounselCheckModal, setShowCounselCheckModal] = useState(false);

  const [selectedItem, setSelectedItem] = useState<PrivateCert | null>(null);
  const [memoText, setMemoText] = useState('');
  const [reasonText, setReasonText] = useState('');
  const [subjectCostText, setSubjectCostText] = useState('');
  const [managerText, setManagerText] = useState('');
  const [residenceText, setResidenceText] = useState('');
  const [counselCheckText, setCounselCheckText] = useState('');
  const [counselCheckEtcInput, setCounselCheckEtcInput] = useState('');

  // 추가/수정 폼
  const emptyForm = { name: '', contact: '', education: '', hope_course: '', reason: '', click_source: '', subject_cost: '', manager: '', residence: '' };
  const [formData, setFormData] = useState(emptyForm);
  const addEduRef = useRef<HTMLDivElement>(null);
  const addCourseRef = useRef<HTMLDivElement>(null);
  const [addEduOpen, setAddEduOpen] = useState(false);
  const [addCourseOpen, setAddCourseOpen] = useState(false);

  // 인증 확인
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) fetchItems();
      else router.push('/admin/login');
    });
  }, []);

  // 드롭다운 외부 클릭 닫기
  useEffect(() => {
    const handle = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (filterDropdownRef.current && !filterDropdownRef.current.contains(target) && !target.closest(`.${styles.thFilterBtn}`)) {
        setOpenFilterColumn(null);
      }
      if (addEduRef.current && !addEduRef.current.contains(e.target as Node)) setAddEduOpen(false);
      if (addCourseRef.current && !addCourseRef.current.contains(e.target as Node)) setAddCourseOpen(false);
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  // 모달 열릴 때 스크롤 방지
  useEffect(() => {
    if (showAddModal || showEditModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [showAddModal, showEditModal]);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/private-cert');
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      setItems(data);
    } catch {
      setError('데이터를 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/admin/login');
  };

  const handleStatusChange = async (id: number, newStatus: ConsultationStatus) => {
    await fetch('/api/private-cert', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status: newStatus }),
    });
    fetchItems();
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const numericCost = formData.subject_cost.replace(/,/g, '');
    await fetch('/api/private-cert', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...formData,
        subject_cost: numericCost ? parseInt(numericCost) : null,
        is_manual_entry: true,
      }),
    });
    setFormData(emptyForm);
    setShowAddModal(false);
    fetchItems();
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) return;
    const numericCost = formData.subject_cost.replace(/,/g, '');
    await fetch('/api/private-cert', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: selectedItem.id,
        ...formData,
        subject_cost: numericCost ? parseInt(numericCost) : null,
      }),
    });
    setShowEditModal(false);
    setSelectedItem(null);
    setFormData(emptyForm);
    setSelectedIds([]);
    fetchItems();
  };

  const openEditModal = () => {
    if (selectedIds.length !== 1) return;
    const item = items.find(i => i.id === selectedIds[0]);
    if (!item) return;
    setSelectedItem(item);
    setFormData({
      name: item.name,
      contact: item.contact,
      education: item.education || '',
      hope_course: item.hope_course || '',
      reason: item.reason || '',
      click_source: item.click_source || '',
      subject_cost: item.subject_cost ? item.subject_cost.toLocaleString() : '',
      manager: item.manager || '',
      residence: item.residence || '',
    });
    setShowEditModal(true);
  };

  const handleBulkDelete = async () => {
    if (!confirm(`${selectedIds.length}건을 삭제하시겠습니까?`)) return;
    await fetch('/api/private-cert', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: selectedIds }),
    });
    setSelectedIds([]);
    fetchItems();
  };

  // 메모
  const handleUpdateMemo = async () => {
    if (!selectedItem) return;
    await fetch('/api/private-cert', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: selectedItem.id, memo: memoText }) });
    setShowMemoModal(false); setSelectedItem(null); setMemoText(''); fetchItems();
  };
  // 취득사유
  const handleUpdateReason = async () => {
    if (!selectedItem) return;
    await fetch('/api/private-cert', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: selectedItem.id, reason: reasonText }) });
    setShowReasonModal(false); setSelectedItem(null); setReasonText(''); fetchItems();
  };
  // 과목비용
  const handleUpdateSubjectCost = async () => {
    if (!selectedItem) return;
    const numericValue = subjectCostText.replace(/,/g, '');
    await fetch('/api/private-cert', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: selectedItem.id, subject_cost: numericValue ? parseInt(numericValue) : null }) });
    setShowSubjectCostModal(false); setSelectedItem(null); setSubjectCostText(''); fetchItems();
  };
  // 담당자
  const handleUpdateManager = async () => {
    if (!selectedItem) return;
    await fetch('/api/private-cert', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: selectedItem.id, manager: managerText || null }) });
    setShowManagerModal(false); setSelectedItem(null); setManagerText(''); fetchItems();
  };
  // 거주지
  const handleUpdateResidence = async () => {
    if (!selectedItem) return;
    await fetch('/api/private-cert', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: selectedItem.id, residence: residenceText }) });
    setShowResidenceModal(false); setSelectedItem(null); setResidenceText(''); fetchItems();
  };
  // 상담체크
  const handleUpdateCounselCheck = async (newValue: string) => {
    if (!selectedItem) return;
    await fetch('/api/private-cert', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: selectedItem.id, counsel_check: newValue || null }) });
    setCounselCheckText(newValue); fetchItems();
  };

  // 필터링
  const filteredItems = items.filter(item => {
    if (searchText) {
      const q = searchText.toLowerCase();
      const contactNums = item.contact.replace(/-/g, '');
      const searchNums = q.replace(/[^0-9]/g, '');
      const matchContact = searchNums.length >= 3 ? contactNums.includes(searchNums) : item.contact.toLowerCase().includes(q);
      if (
        !item.name.toLowerCase().includes(q) &&
        !matchContact &&
        !(item.reason || '').toLowerCase().includes(q) &&
        !(item.memo || '').toLowerCase().includes(q) &&
        !(item.manager || '').toLowerCase().includes(q)
      ) return false;
    }
    if (statusFilter !== 'all' && item.status !== statusFilter) return false;
    if (managerFilter !== 'all' && item.manager !== managerFilter) return false;
    if (startDate || endDate) {
      const dt = new Date(item.created_at);
      if (startDate) { const s = new Date(startDate); s.setHours(0,0,0,0); if (dt < s) return false; }
      if (endDate) { const e = new Date(endDate); e.setHours(23,59,59,999); if (dt > e) return false; }
    }
    return true;
  });

  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
  const paginatedItems = filteredItems.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const uniqueManagers = Array.from(new Set(items.map(i => i.manager).filter(Boolean))) as string[];

  const toggleSelect = (id: number) => setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  const toggleSelectAll = () => setSelectedIds(selectedIds.length === paginatedItems.length && paginatedItems.length > 0 ? [] : paginatedItems.map(i => i.id));

  const highlightText = (text: string | null | undefined, query: string) => {
    if (!text || !query) return text || '';
    const parts = text.split(new RegExp(`(${query})`, 'gi'));
    return parts.map((part, i) =>
      part.toLowerCase() === query.toLowerCase()
        ? <span key={i} className={styles.highlight}>{part}</span>
        : part
    );
  };

  const handleExcelDownload = () => {
    const targets = selectedIds.length > 0 ? filteredItems.filter(i => selectedIds.includes(i.id)) : filteredItems;
    const headers = ['이름', '연락처', '최종학력', '희망과정', '취득사유', '유입경로', '과목비용', '담당자', '거주지', '메모', '고민', '신청일시', '상태'];
    const rows = targets.map(i => [
      i.name, i.contact, i.education || '', i.hope_course || '',
      i.reason || '', i.click_source || '',
      i.subject_cost ? i.subject_cost.toLocaleString() : '',
      i.manager || '', i.residence || '', i.memo || '', i.counsel_check || '',
      formatDate(i.created_at), i.status,
    ]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `민간자격증_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  // 상담체크 토글
  const toggleCounselCheck = (opt: string) => {
    const current = counselCheckText.split(', ').filter(Boolean);
    if (opt === '기타') {
      const hasEtc = current.some(c => c.startsWith('기타'));
      if (hasEtc) {
        const next = current.filter(c => !c.startsWith('기타')).join(', ');
        setCounselCheckText(next); handleUpdateCounselCheck(next); setCounselCheckEtcInput('');
      }
      return;
    }
    const next = current.includes(opt) ? current.filter(c => c !== opt) : [...current, opt];
    const nextStr = next.join(', ');
    setCounselCheckText(nextStr); handleUpdateCounselCheck(nextStr);
  };

  const addEtcCounselCheck = () => {
    if (!counselCheckEtcInput.trim()) return;
    const current = counselCheckText.split(', ').filter(c => !c.startsWith('기타') && Boolean(c));
    const next = [...current, `기타:${counselCheckEtcInput.trim()}`].join(', ');
    setCounselCheckText(next); handleUpdateCounselCheck(next);
  };

  // 공통 폼 렌더링 (추가/수정 공통)
  const renderForm = (onSubmit: (e: React.FormEvent) => void, title: string, onCancel: () => void) => (
    <div className={styles.modalOverlay} onClick={onCancel}>
      <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
        <h2 className={styles.modalTitle}>{title}</h2>
        <form onSubmit={onSubmit} className={styles.modalForm}>
          <div className={styles.formGroup}>
            <label>이름 *</label>
            <input type="text" required value={formData.name} onChange={e => setFormData(p => ({ ...p, name: e.target.value }))} placeholder="이름을 입력하세요" />
          </div>
          <div className={styles.formGroup}>
            <label>연락처 *</label>
            <input type="text" required value={formData.contact}
              onChange={e => setFormData(p => ({ ...p, contact: formatPhoneNumber(e.target.value) }))}
              placeholder="010-1234-5678" maxLength={13} />
          </div>
          <div className={styles.formGroup}>
            <label>최종학력</label>
            <div className={styles.tossDropdown} ref={addEduRef}>
              <button type="button" className={styles.tossDropdownTrigger} onClick={() => setAddEduOpen(o => !o)}>
                <span className={formData.education ? '' : styles.tossDropdownPlaceholder}>
                  {formData.education || '선택하세요 (선택사항)'}
                </span>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d={addEduOpen ? 'M4 10l4-4 4 4' : 'M4 6l4 4 4-4'} stroke="#8b95a1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
              {addEduOpen && (
                <div className={styles.tossDropdownMenu}>
                  <button type="button" className={`${styles.tossDropdownItem} ${!formData.education ? styles.tossDropdownItemActive : ''}`}
                    onClick={() => { setFormData(p => ({ ...p, education: '' })); setAddEduOpen(false); }}>
                    <span>선택 안 함</span>
                  </button>
                  {EDUCATION_OPTIONS.map(opt => (
                    <button type="button" key={opt}
                      className={`${styles.tossDropdownItem} ${formData.education === opt ? styles.tossDropdownItemActive : ''}`}
                      onClick={() => { setFormData(p => ({ ...p, education: opt })); setAddEduOpen(false); }}>
                      <span>{opt}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className={styles.formGroup}>
            <label>희망과정</label>
            <div className={styles.tossDropdown} ref={addCourseRef}>
              <button type="button" className={styles.tossDropdownTrigger} onClick={() => setAddCourseOpen(o => !o)}>
                <span className={formData.hope_course ? '' : styles.tossDropdownPlaceholder}>
                  {formData.hope_course || '선택하세요 (선택사항)'}
                </span>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d={addCourseOpen ? 'M4 10l4-4 4 4' : 'M4 6l4 4 4-4'} stroke="#8b95a1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
              {addCourseOpen && (
                <div className={styles.tossDropdownMenu}>
                  <button type="button" className={`${styles.tossDropdownItem} ${!formData.hope_course ? styles.tossDropdownItemActive : ''}`}
                    onClick={() => { setFormData(p => ({ ...p, hope_course: '' })); setAddCourseOpen(false); }}>
                    <span>선택 안 함</span>
                  </button>
                  {COURSE_OPTIONS.map(opt => (
                    <button type="button" key={opt}
                      className={`${styles.tossDropdownItem} ${formData.hope_course === opt ? styles.tossDropdownItemActive : ''}`}
                      onClick={() => { setFormData(p => ({ ...p, hope_course: opt })); setAddCourseOpen(false); }}>
                      <span>{opt}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className={styles.formGroup}>
            <label>유입경로</label>
            <input type="text" value={formData.click_source} onChange={e => setFormData(p => ({ ...p, click_source: e.target.value }))} placeholder="예: 인스타_홈피드" />
          </div>
          <div className={styles.formGroup}>
            <label>취득사유</label>
            <input type="text" value={formData.reason} onChange={e => setFormData(p => ({ ...p, reason: e.target.value }))} placeholder="취득사유" />
          </div>
          <div className={styles.formGroup}>
            <label>과목비용</label>
            <input type="text" value={formData.subject_cost}
              onChange={e => setFormData(p => ({ ...p, subject_cost: formatCost(e.target.value) }))}
              placeholder="0" />
          </div>
          <div className={styles.formGroup}>
            <label>담당자</label>
            <input type="text" value={formData.manager} onChange={e => setFormData(p => ({ ...p, manager: e.target.value }))} placeholder="담당자 이름" />
          </div>
          <div className={styles.formGroup}>
            <label>거주지</label>
            <input type="text" value={formData.residence} onChange={e => setFormData(p => ({ ...p, residence: e.target.value }))} placeholder="거주지" />
          </div>
          <div className={styles.modalActions}>
            <button type="submit" className={styles.submitButton}>저장</button>
            <button type="button" onClick={onCancel} className={styles.cancelButton}>취소</button>
          </div>
        </form>
      </div>
    </div>
  );

  if (loading) return <div className={styles.container}><div className={styles.loading}>로딩 중...</div></div>;
  if (error) return <div className={styles.container}><div className={styles.errorMessage}>{error}</div></div>;

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        {/* 메인 탭 */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <Link href="/admin" style={{ padding: '8px 20px', borderRadius: 8, background: '#f2f4f6', color: '#4e5968', fontWeight: 500, textDecoration: 'none', fontSize: 15 }}>
            학점은행제
          </Link>
          <span style={{ padding: '8px 20px', borderRadius: 8, background: '#3182f6', color: '#fff', fontWeight: 700, fontSize: 15 }}>
            민간자격증
          </span>
        </div>

        <div className={styles.titleRow}>
          <h1 className={styles.title}>민간자격증 상담 관리 ({filteredItems.length}건)</h1>
          <button onClick={handleLogout} className={styles.logoutButton}>로그아웃</button>
        </div>

        {/* 필터 */}
        <div className={styles.filterRow}>
          <div className={styles.filterGroup}>
            <input type="text" placeholder="이름, 연락처, 취득사유, 메모 검색..."
              value={searchText} onChange={e => { setSearchText(e.target.value); setCurrentPage(1); }}
              className={styles.searchInput} />
          </div>
          <div className={styles.filterGroup}>
            <input type="date" value={startDate} onChange={e => { setStartDate(e.target.value); setCurrentPage(1); }} className={styles.dateInput} />
          </div>
          <span className={styles.dateSeparator}>~</span>
          <div className={styles.filterGroup}>
            <input type="date" value={endDate} onChange={e => { setEndDate(e.target.value); setCurrentPage(1); }} className={styles.dateInput} />
          </div>
          {(searchText || statusFilter !== 'all' || managerFilter !== 'all' || startDate || endDate) && (
            <button onClick={() => { setSearchText(''); setStatusFilter('all'); setManagerFilter('all'); setStartDate(''); setEndDate(''); setCurrentPage(1); }} className={styles.clearFilterButton}>
              필터 초기화
            </button>
          )}
        </div>

        {/* 액션 버튼 */}
        <div className={styles.headerActions}>
          <button onClick={() => setShowAddModal(true)} className={styles.addButton}>추가</button>
          {selectedIds.length === 1 && (
            <button onClick={openEditModal} className={styles.editButton}>수정</button>
          )}
          {selectedIds.length > 0 && (
            <button onClick={handleBulkDelete} className={styles.deleteButton}>삭제 ({selectedIds.length})</button>
          )}
          <button onClick={handleExcelDownload} className={styles.excelButton}>
            {selectedIds.length > 0 ? `선택 항목 다운로드 (${selectedIds.length})` : '엑셀 다운로드'}
          </button>
        </div>
      </header>

      {/* 테이블 */}
      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.checkboxCell}>
                <input type="checkbox"
                  checked={selectedIds.length === paginatedItems.length && paginatedItems.length > 0}
                  onChange={toggleSelectAll} />
              </th>
              <th style={{ minWidth: 80 }}>이름</th>
              <th>연락처</th>
              <th>최종학력</th>
              <th>희망과정</th>
              <th>취득사유</th>
              <th>유입경로</th>
              <th>과목비용</th>
              {/* 담당자 필터 */}
              <th className={`${styles.thFilterable} ${managerFilter !== 'all' ? styles.thFiltered : ''}`}>
                <div className={styles.thInner}>
                  <span>담당자</span>
                  <button className={`${styles.thFilterBtn} ${managerFilter !== 'all' ? styles.thFilterBtnActive : ''}`}
                    onClick={e => {
                      e.stopPropagation();
                      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                      setDropdownPos({ top: rect.bottom + 4, left: rect.left });
                      setOpenFilterColumn(openFilterColumn === 'manager' ? null : 'manager');
                    }}>▾</button>
                </div>
              </th>
              <th>거주지</th>
              <th>메모</th>
              <th>고민</th>
              <th>신청일시</th>
              {/* 상태 필터 */}
              <th className={`${styles.thFilterable} ${statusFilter !== 'all' ? styles.thFiltered : ''}`}>
                <div className={styles.thInner}>
                  <span>상태</span>
                  <button className={`${styles.thFilterBtn} ${statusFilter !== 'all' ? styles.thFilterBtnActive : ''}`}
                    onClick={e => {
                      e.stopPropagation();
                      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                      setDropdownPos({ top: rect.bottom + 4, left: rect.left - 60 });
                      setOpenFilterColumn(openFilterColumn === 'status' ? null : 'status');
                    }}>▾</button>
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            {paginatedItems.length === 0 ? (
              <tr><td colSpan={14} className={styles.empty}>신청 내역이 없습니다.</td></tr>
            ) : (
              paginatedItems.map(item => (
                <tr key={item.id} className={selectedIds.includes(item.id) ? styles.selectedRow : ''}>
                  <td className={styles.checkboxCell}>
                    <input type="checkbox" checked={selectedIds.includes(item.id)} onChange={() => toggleSelect(item.id)} />
                  </td>
                  <td>{highlightText(item.name, searchText)}</td>
                  <td>{item.contact}</td>
                  <td>{item.education || '-'}</td>
                  <td>{item.hope_course || '-'}</td>
                  <td>
                    <div className={`${styles.memoCell} ${!item.reason ? styles.empty : ''}`}
                      onClick={() => { setSelectedItem(item); setReasonText(item.reason || ''); setShowReasonModal(true); }}
                      title={item.reason || '취득사유 입력...'}>
                      {item.reason ? highlightText(item.reason, searchText) : '취득사유 입력...'}
                    </div>
                  </td>
                  <td>{item.click_source || '-'}</td>
                  <td>
                    <div className={`${styles.memoCell} ${!item.subject_cost ? styles.empty : ''}`}
                      onClick={() => { setSelectedItem(item); setSubjectCostText(item.subject_cost ? item.subject_cost.toLocaleString() : ''); setShowSubjectCostModal(true); }}>
                      {item.subject_cost ? item.subject_cost.toLocaleString() + '원' : '비용 입력...'}
                    </div>
                  </td>
                  <td>
                    <div className={`${styles.memoCell} ${!item.manager ? styles.empty : ''}`}
                      onClick={() => { setSelectedItem(item); setManagerText(item.manager || ''); setShowManagerModal(true); }}>
                      {item.manager ? highlightText(item.manager, searchText) : '담당자 입력...'}
                    </div>
                  </td>
                  <td>
                    <div className={`${styles.memoCell} ${!item.residence ? styles.empty : ''}`}
                      onClick={() => { setSelectedItem(item); setResidenceText(item.residence || ''); setShowResidenceModal(true); }}
                      title={item.residence || '거주지 입력...'}>
                      {item.residence ? highlightText(item.residence, searchText) : '거주지 입력...'}
                    </div>
                  </td>
                  <td>
                    <div className={`${styles.memoCell} ${!item.memo ? styles.empty : ''}`}
                      onClick={() => { setSelectedItem(item); setMemoText(item.memo || ''); setShowMemoModal(true); }}
                      title={item.memo || '메모 추가...'}>
                      {item.memo ? highlightText(item.memo, searchText) : '메모 추가...'}
                    </div>
                  </td>
                  <td>
                    <div className={styles.counselCheckCell}
                      onClick={() => {
                        setSelectedItem(item);
                        const raw = item.counsel_check || '';
                        setCounselCheckText(raw);
                        const etcItem = raw.split(', ').find(i => i.startsWith('기타:'));
                        setCounselCheckEtcInput(etcItem ? etcItem.slice(3) : '');
                        setShowCounselCheckModal(true);
                      }}>
                      {item.counsel_check
                        ? item.counsel_check.split(', ').filter(Boolean).map(t => (
                            <span key={t} className={styles.counselCheckTag}>{t.startsWith('기타:') ? `기타: ${t.slice(3)}` : t}</span>
                          ))
                        : <span className={styles.empty}>체크...</span>
                      }
                    </div>
                  </td>
                  <td>{formatDate(item.created_at)}</td>
                  <td>
                    <select value={item.status || '상담대기'}
                      onChange={e => handleStatusChange(item.id, e.target.value as ConsultationStatus)}
                      className={`${styles.statusSelect} ${styles[`status${(item.status || '상담대기').replace(/\s/g, '')}`]}`}>
                      {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* 페이징 */}
        {totalPages > 1 && (
          <div className={styles.pagination}>
            <button onClick={() => setCurrentPage(p => p - 1)} disabled={currentPage === 1} className={styles.pageButton}>이전</button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
              <button key={page} onClick={() => setCurrentPage(page)}
                className={`${styles.pageButton} ${currentPage === page ? styles.activePage : ''}`}>
                {page}
              </button>
            ))}
            <button onClick={() => setCurrentPage(p => p + 1)} disabled={currentPage === totalPages} className={styles.pageButton}>다음</button>
          </div>
        )}
      </div>

      {/* 필터 드롭다운 */}
      {openFilterColumn && (
        <div ref={filterDropdownRef} className={styles.filterDropdown} style={{ top: dropdownPos.top, left: dropdownPos.left }}>
          {openFilterColumn === 'status' && (
            <>
              <button className={`${styles.filterOption} ${statusFilter === 'all' ? styles.filterOptionActive : ''}`}
                onClick={() => { setStatusFilter('all'); setOpenFilterColumn(null); setCurrentPage(1); }}>전체</button>
              {STATUS_OPTIONS.map(s => (
                <button key={s} className={`${styles.filterOption} ${statusFilter === s ? styles.filterOptionActive : ''}`}
                  onClick={() => { setStatusFilter(s); setOpenFilterColumn(null); setCurrentPage(1); }}>{s}</button>
              ))}
            </>
          )}
          {openFilterColumn === 'manager' && (
            <>
              <button className={`${styles.filterOption} ${managerFilter === 'all' ? styles.filterOptionActive : ''}`}
                onClick={() => { setManagerFilter('all'); setOpenFilterColumn(null); setCurrentPage(1); }}>전체</button>
              {uniqueManagers.map(m => (
                <button key={m} className={`${styles.filterOption} ${managerFilter === m ? styles.filterOptionActive : ''}`}
                  onClick={() => { setManagerFilter(m); setOpenFilterColumn(null); setCurrentPage(1); }}>{m}</button>
              ))}
            </>
          )}
        </div>
      )}

      {/* 추가 모달 */}
      {showAddModal && renderForm(handleAdd, '민간자격증 신청 추가', () => { setShowAddModal(false); setFormData(emptyForm); })}

      {/* 수정 모달 */}
      {showEditModal && renderForm(handleEdit, '민간자격증 신청 수정', () => { setShowEditModal(false); setFormData(emptyForm); setSelectedItem(null); })}

      {/* 메모 모달 */}
      {showMemoModal && (
        <div className={styles.modalOverlay} onClick={() => setShowMemoModal(false)}>
          <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
            <h2 className={styles.modalTitle}>메모</h2>
            <textarea className={styles.memoTextarea} value={memoText} onChange={e => setMemoText(e.target.value)} rows={4} />
            <div className={styles.modalActions}>
              <button onClick={handleUpdateMemo} className={styles.submitButton}>저장</button>
              <button onClick={() => setShowMemoModal(false)} className={styles.cancelButton}>취소</button>
            </div>
          </div>
        </div>
      )}

      {/* 취득사유 모달 */}
      {showReasonModal && (
        <div className={styles.modalOverlay} onClick={() => setShowReasonModal(false)}>
          <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
            <h2 className={styles.modalTitle}>취득사유</h2>
            <textarea className={styles.memoTextarea} value={reasonText} onChange={e => setReasonText(e.target.value)} rows={3} />
            <div className={styles.modalActions}>
              <button onClick={handleUpdateReason} className={styles.submitButton}>저장</button>
              <button onClick={() => setShowReasonModal(false)} className={styles.cancelButton}>취소</button>
            </div>
          </div>
        </div>
      )}

      {/* 과목비용 모달 */}
      {showSubjectCostModal && (
        <div className={styles.modalOverlay} onClick={() => setShowSubjectCostModal(false)}>
          <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
            <h2 className={styles.modalTitle}>과목비용</h2>
            <input type="text" className={styles.inputField} value={subjectCostText}
              onChange={e => setSubjectCostText(formatCost(e.target.value))} placeholder="금액 입력" />
            <div className={styles.modalActions}>
              <button onClick={handleUpdateSubjectCost} className={styles.submitButton}>저장</button>
              <button onClick={() => setShowSubjectCostModal(false)} className={styles.cancelButton}>취소</button>
            </div>
          </div>
        </div>
      )}

      {/* 담당자 모달 */}
      {showManagerModal && (
        <div className={styles.modalOverlay} onClick={() => setShowManagerModal(false)}>
          <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
            <h2 className={styles.modalTitle}>담당자</h2>
            <input type="text" className={styles.inputField} value={managerText} onChange={e => setManagerText(e.target.value)} placeholder="담당자 이름" />
            <div className={styles.modalActions}>
              <button onClick={handleUpdateManager} className={styles.submitButton}>저장</button>
              <button onClick={() => setShowManagerModal(false)} className={styles.cancelButton}>취소</button>
            </div>
          </div>
        </div>
      )}

      {/* 거주지 모달 */}
      {showResidenceModal && (
        <div className={styles.modalOverlay} onClick={() => setShowResidenceModal(false)}>
          <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
            <h2 className={styles.modalTitle}>거주지</h2>
            <input type="text" className={styles.inputField} value={residenceText} onChange={e => setResidenceText(e.target.value)} placeholder="거주지 입력" />
            <div className={styles.modalActions}>
              <button onClick={handleUpdateResidence} className={styles.submitButton}>저장</button>
              <button onClick={() => setShowResidenceModal(false)} className={styles.cancelButton}>취소</button>
            </div>
          </div>
        </div>
      )}

      {/* 상담체크 모달 */}
      {showCounselCheckModal && (
        <div className={styles.modalOverlay} onClick={() => setShowCounselCheckModal(false)}>
          <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
            <h2 className={styles.modalTitle}>고민 체크</h2>
            <div className={styles.counselCheckOptions}>
              {COUNSEL_CHECK_OPTIONS.map(opt => {
                const current = counselCheckText.split(', ').filter(Boolean);
                const isActive = opt === '기타'
                  ? current.some(c => c.startsWith('기타'))
                  : current.includes(opt);
                return (
                  <button key={opt} type="button"
                    className={`${styles.counselCheckOption} ${isActive ? styles.counselCheckOptionActive : ''}`}
                    onClick={() => toggleCounselCheck(opt)}>
                    {opt}
                  </button>
                );
              })}
            </div>
            {counselCheckText.split(', ').some(c => c.startsWith('기타')) && (
              <div className={styles.counselCheckEtcRow}>
                <input type="text" value={counselCheckEtcInput}
                  onChange={e => setCounselCheckEtcInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addEtcCounselCheck(); } }}
                  placeholder="기타 내용 입력" className={styles.counselCheckEtcInput} />
                <button type="button" onClick={addEtcCounselCheck} className={styles.counselCheckEtcBtn}>저장</button>
              </div>
            )}
            <div className={styles.modalActions}>
              <button onClick={() => setShowCounselCheckModal(false)} className={styles.submitButton}>닫기</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
