'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import styles from './admin.module.css';

type ConsultationStatus = '상담대기' | '상담중' | '보류' | '등록대기' | '등록완료';

interface Consultation {
  id: number;
  name: string;
  contact: string;
  education: string;
  hope_course: string | null;
  reason: string;
  click_source: string | null;
  memo: string | null;
  counsel_check: string | null;
  status: ConsultationStatus;
  subject_cost: number | null;
  manager: string | null;
  residence: string | null;
  created_at: string;
}

export default function AdminPage() {
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showMemoModal, setShowMemoModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showSubjectCostModal, setShowSubjectCostModal] = useState(false);
  const [showManagerModal, setShowManagerModal] = useState(false);
  const [showResidenceModal, setShowResidenceModal] = useState(false);
  const [residenceText, setResidenceText] = useState('');
  const [showReasonModal, setShowReasonModal] = useState(false);
  const [reasonText, setReasonText] = useState('');
  const [showCounselCheckModal, setShowCounselCheckModal] = useState(false);
  const [counselCheckText, setCounselCheckText] = useState('');
  const [counselCheckEtcInput, setCounselCheckEtcInput] = useState('');
    // 거주지 모달 열기/닫기
    const openResidenceModal = (consultation: Consultation) => {
      setSelectedConsultation(consultation);
      setResidenceText(consultation.residence || '');
      setShowResidenceModal(true);
    };

    const closeResidenceModal = () => {
      setShowResidenceModal(false);
      setSelectedConsultation(null);
      setResidenceText('');
    };

    // 거주지 업데이트
    const handleUpdateResidence = async () => {
      if (!selectedConsultation) return;
      try {
        const response = await fetch('/api/consultations', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ id: selectedConsultation.id, residence: residenceText }),
        });
        if (!response.ok) throw new Error('거주지 업데이트 실패');
        closeResidenceModal();
        fetchConsultations();
      } catch (error) {
        alert('거주지 저장에 실패했습니다.');
      }
    };
  const [selectedConsultation, setSelectedConsultation] = useState<Consultation | null>(null);
  const [memoText, setMemoText] = useState('');
  const [subjectCostText, setSubjectCostText] = useState('');
  const [managerText, setManagerText] = useState('');
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  // 필터 상태
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<ConsultationStatus | 'all'>('all');
  const [managerFilter, setManagerFilter] = useState('all');
  const [majorCategoryFilter, setMajorCategoryFilter] = useState('all');
  const [minorCategoryFilter, setMinorCategoryFilter] = useState('all');
  const [reasonFilter, setReasonFilter] = useState('all');
  const [counselCheckFilter, setCounselCheckFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [openFilterColumn, setOpenFilterColumn] = useState<string | null>(null);
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const filterDropdownRef = useRef<HTMLDivElement>(null);
  const [formData, setFormData] = useState({
    name: '',
    contact: '',
    education: '',
    hope_course: '',
    reason: '',
    click_source: '',
    subject_cost: '',
    manager: '',
    residence: ''
  });
  const router = useRouter();

  // 인증 상태 확인
  useEffect(() => {
    checkAuth();
  }, []);

  // 드롭다운 외부 클릭 닫기
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      // filterDropdownRef(드롭다운 패널) 또는 .thFilterBtn 클래스가 아니면 닫기
      if (
        filterDropdownRef.current &&
        !filterDropdownRef.current.contains(target) &&
        !target.closest(`.${styles.thFilterBtn}`)
      ) {
        setOpenFilterColumn(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      fetchConsultations();
    } else {
      router.push('/admin/login');
    }
  };

  // 로그아웃
  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/admin/login');
  };

  // 상담 신청 목록 가져오기
  const fetchConsultations = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('consultations')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // status가 없는 데이터에 기본값 설정
      const consultationsWithStatus = (data || []).map(item => ({
        ...item,
        status: item.status || '상담대기'
      }));

      setConsultations(consultationsWithStatus);
    } catch (error: any) {
      setError(error.message || '데이터를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 특수 케이스: 언더스코어 없이 저장된 값의 대분류/중분류 매핑
  const specialSourceMappings: Record<string, { major: string; minor: string }> = {
    '당근채팅': { major: '당근', minor: '당근채팅' },
    '대표전화(당근)': { major: '당근', minor: '대표전화(당근)' },
  };

  // click_source 파싱: "바로폼_대분류_중분류" → { major, minor, display }
  const parseClickSource = (source: string | null) => {
    if (!source) return { major: '', minor: '', display: '-' };
    // 바로폼_ 접두사 제거
    const stripped = source.startsWith('바로폼_') ? source.slice(4) : source;
    // 특수 케이스 매핑 확인
    if (specialSourceMappings[stripped]) {
      const { major, minor } = specialSourceMappings[stripped];
      return { major, minor, display: stripped };
    }
    // 첫 번째 _ 기준으로 대분류 / 중분류 분리
    const underscoreIdx = stripped.indexOf('_');
    if (underscoreIdx === -1) {
      return { major: stripped, minor: '', display: stripped };
    }
    const major = stripped.slice(0, underscoreIdx);
    const minor = stripped.slice(underscoreIdx + 1);
    return { major, minor, display: stripped };
  };

  // 날짜 포맷팅
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  // 상담 신청 추가
  const handleAddConsultation = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/consultations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          is_manual_entry: true, // 수동 추가 플래그
        }),
      });

      if (!response.ok) throw new Error('추가 실패');

      // 폼 초기화 및 목록 새로고침
      setFormData({
        name: '',
        contact: '',
        education: '',
        hope_course: '',
        reason: '',
        click_source: '',
        subject_cost: '',
        manager: '',
        residence: ''
      });
      setShowAddModal(false);
      fetchConsultations();
    } catch (error) {
      alert('상담 신청 추가에 실패했습니다.');
    }
  };

  // 메모 수정
  const handleUpdateMemo = async () => {
    if (!selectedConsultation) return;
    
    try {
      const response = await fetch('/api/consultations', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id: selectedConsultation.id, memo: memoText }),
      });

      if (!response.ok) throw new Error('메모 업데이트 실패');

      setShowMemoModal(false);
      setSelectedConsultation(null);
      setMemoText('');
      fetchConsultations();
    } catch (error) {
      alert('메모 저장에 실패했습니다.');
    }
  };

  const openMemoModal = (consultation: Consultation) => {
    setSelectedConsultation(consultation);
    setMemoText(consultation.memo || '');
    setShowMemoModal(true);
  };

  const closeMemoModal = () => {
    setShowMemoModal(false);
    setSelectedConsultation(null);
    setMemoText('');
  };

  // 취득사유 수정
  const handleUpdateReason = async () => {
    if (!selectedConsultation) return;
    try {
      const response = await fetch('/api/consultations', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: selectedConsultation.id, reason: reasonText }),
      });
      if (!response.ok) throw new Error('취득사유 업데이트 실패');
      setShowReasonModal(false);
      setSelectedConsultation(null);
      setReasonText('');
      fetchConsultations();
    } catch (error) {
      alert('취득사유 저장에 실패했습니다.');
    }
  };

  const openReasonModal = (consultation: Consultation) => {
    setSelectedConsultation(consultation);
    setReasonText(consultation.reason || '');
    setShowReasonModal(true);
  };

  const closeReasonModal = () => {
    setShowReasonModal(false);
    setSelectedConsultation(null);
    setReasonText('');
  };

  // 상담체크 모달 열기/닫기
  const openCounselCheckModal = (consultation: Consultation) => {
    setSelectedConsultation(consultation);
    const raw = consultation.counsel_check || '';
    setCounselCheckText(raw);
    // "기타:내용" 에서 내용 파싱
    const etcItem = raw.split(', ').find(i => i.startsWith('기타:'));
    setCounselCheckEtcInput(etcItem ? etcItem.slice(3) : '');
    setShowCounselCheckModal(true);
  };

  const closeCounselCheckModal = () => {
    setShowCounselCheckModal(false);
    setSelectedConsultation(null);
    setCounselCheckText('');
    setCounselCheckEtcInput('');
  };

  // 상담체크 업데이트
  const handleUpdateCounselCheck = async (newValue: string) => {
    if (!selectedConsultation) return;
    try {
      const response = await fetch('/api/consultations', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: selectedConsultation.id, counsel_check: newValue || null }),
      });
      if (!response.ok) throw new Error('상담체크 업데이트 실패');
      setCounselCheckText(newValue);
      fetchConsultations();
    } catch (error) {
      alert('상담체크 저장에 실패했습니다.');
    }
  };

  // 과목비용 모달 열기/닫기
  const openSubjectCostModal = (consultation: Consultation) => {
    setSelectedConsultation(consultation);
    setSubjectCostText(consultation.subject_cost ? consultation.subject_cost.toLocaleString() : '');
    setShowSubjectCostModal(true);
  };

  const closeSubjectCostModal = () => {
    setShowSubjectCostModal(false);
    setSelectedConsultation(null);
    setSubjectCostText('');
  };

  // 과목비용 업데이트
  const handleUpdateSubjectCost = async () => {
    if (!selectedConsultation) return;
    
    try {
      const numericValue = subjectCostText.replace(/,/g, '');
      const response = await fetch('/api/consultations', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          id: selectedConsultation.id, 
          subject_cost: numericValue ? parseInt(numericValue) : null 
        }),
      });

      if (!response.ok) throw new Error('과목비용 업데이트 실패');

      closeSubjectCostModal();
      fetchConsultations();
    } catch (error) {
      alert('과목비용 저장에 실패했습니다.');
    }
  };

  // 담당자 모달 열기/닫기
  const openManagerModal = (consultation: Consultation) => {
    setSelectedConsultation(consultation);
    setManagerText(consultation.manager || '');
    setShowManagerModal(true);
  };

  const closeManagerModal = () => {
    setShowManagerModal(false);
    setSelectedConsultation(null);
    setManagerText('');
  };

  // 담당자 업데이트
  const handleUpdateManager = async () => {
    if (!selectedConsultation) return;
    
    try {
      const response = await fetch('/api/consultations', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          id: selectedConsultation.id, 
          manager: managerText || null 
        }),
      });

      if (!response.ok) throw new Error('담당자 업데이트 실패');

      closeManagerModal();
      fetchConsultations();
    } catch (error) {
      alert('담당자 저장에 실패했습니다.');
    }
  };

  // 전화번호 자동 포맷팅
  const formatPhoneNumber = (value: string) => {
    const numbers = value.replace(/[^0-9]/g, '');
    if (numbers.length <= 3) return numbers;
    if (numbers.length <= 7) return `${numbers.slice(0, 3)}-${numbers.slice(3)}`;
    if (numbers.length <= 11) return `${numbers.slice(0, 3)}-${numbers.slice(3, 7)}-${numbers.slice(7)}`;
    return `${numbers.slice(0, 3)}-${numbers.slice(3, 7)}-${numbers.slice(7, 11)}`;
  };

  const handleContactChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value);
    setFormData({ ...formData, contact: formatted });
  };

  // 과목비용 포맷팅 (콤마 추가)
  const formatSubjectCost = (value: string) => {
    const numbers = value.replace(/[^0-9]/g, '');
    if (!numbers) return '';
    return parseInt(numbers).toLocaleString();
  };

  const handleSubjectCostChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatSubjectCost(e.target.value);
    setSubjectCostText(formatted);
  };

  const handleFormSubjectCostChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatSubjectCost(e.target.value);
    setFormData({ ...formData, subject_cost: formatted });
  };

  // 수정 모달 열기
  const openEditModal = () => {
    if (selectedIds.length !== 1) {
      alert('수정할 항목을 1개만 선택해주세요.');
      return;
    }
    const consultation = consultations.find(c => c.id === selectedIds[0]);
    if (consultation) {
      setSelectedConsultation(consultation);
      setFormData({
        name: consultation.name,
        contact: consultation.contact,
        education: consultation.education || '',
        hope_course: consultation.hope_course || '',
        reason: consultation.reason || '',
        click_source: consultation.click_source || '',
        subject_cost: consultation.subject_cost ? consultation.subject_cost.toLocaleString() : '',
        manager: consultation.manager || '',
        residence: consultation.residence || ''
      });
      setShowEditModal(true);
    }
  };

  // 수정 저장
  const handleEditConsultation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedConsultation) return;

    try {
      const response = await fetch('/api/consultations', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: selectedConsultation.id,
          name: formData.name,
          contact: formData.contact,
          education: formData.education || null,
          reason: formData.reason || null,
          click_source: formData.click_source || null,
          subject_cost: formData.subject_cost ? parseInt(formData.subject_cost.replace(/,/g, '')) : null,
          manager: formData.manager || null,
          residence: formData.residence || null,
        }),
      });

      if (!response.ok) throw new Error('수정 실패');

      setFormData({
        name: '',
        contact: '',
        education: '',
        hope_course: '',
        reason: '',
        click_source: '',
        subject_cost: '',
        manager: '',
        residence: ''
      });
      setShowEditModal(false);
      setSelectedConsultation(null);
      setSelectedIds([]);
      fetchConsultations();
    } catch (error) {
      alert('상담 신청 수정에 실패했습니다.');
    }
  };

  // 개별 상태 변경
  const handleStatusChange = async (id: number, newStatus: ConsultationStatus) => {
    try {
      const response = await fetch('/api/consultations', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id, status: newStatus }),
      });

      if (!response.ok) throw new Error('상태 업데이트 실패');

      fetchConsultations();
    } catch (error) {
      alert('상태 변경에 실패했습니다.');
    }
  };

  // 체크박스 관련 함수
  const toggleSelectAll = () => {
    if (selectedIds.length === paginatedConsultations.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(paginatedConsultations.map(c => c.id));
    }
  };

  const toggleSelect = (id: number) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(selectedId => selectedId !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  // 일괄 삭제
  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) {
      alert('삭제할 항목을 선택해주세요.');
      return;
    }

    if (!confirm(`선택한 ${selectedIds.length}개의 항목을 삭제하시겠습니까?`)) {
      return;
    }

    try {
      const response = await fetch('/api/consultations', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ids: selectedIds }),
      });

      if (!response.ok) throw new Error('삭제 실패');

      setSelectedIds([]);
      fetchConsultations();
    } catch (error) {
      alert('삭제에 실패했습니다.');
    }
  };

  // 필터링
  const filteredConsultations = consultations.filter(consultation => {
    // 검색 텍스트 필터 (이름, 연락처, 취득사유, 메모, 유입경로)
    if (searchText) {
      const searchLower = searchText.toLowerCase();
      // 연락처는 하이픈 제거하고 비교
      const contactWithoutHyphen = consultation.contact.replace(/-/g, '');
      const searchWithoutHyphen = searchText.replace(/-/g, '');
      const matchesSearch = 
        consultation.name.toLowerCase().includes(searchLower) ||
        contactWithoutHyphen.toLowerCase().includes(searchWithoutHyphen.toLowerCase()) ||
        (consultation.reason && consultation.reason.toLowerCase().includes(searchLower)) ||
        (consultation.memo && consultation.memo.toLowerCase().includes(searchLower)) ||
        (consultation.click_source && consultation.click_source.toLowerCase().includes(searchLower));
      if (!matchesSearch) return false;
    }
    // 상태 필터
    if (statusFilter !== 'all' && consultation.status !== statusFilter) {
      return false;
    }
    // 담당자 필터
    if (managerFilter !== 'all') {
      if (managerFilter === 'none' && consultation.manager) return false;
      if (managerFilter !== 'none' && consultation.manager !== managerFilter) return false;
    }
    // 대분류 필터
    if (majorCategoryFilter !== 'all') {
      const { major } = parseClickSource(consultation.click_source);
      if (major !== majorCategoryFilter) return false;
    }
    // 중분류 필터
    if (minorCategoryFilter !== 'all') {
      const { minor } = parseClickSource(consultation.click_source);
      if (minor !== minorCategoryFilter) return false;
    }
    // 취득사유 필터
    if (reasonFilter !== 'all') {
      const reasons = (consultation.reason || '').split(', ').map(r => r.trim()).filter(Boolean);
      if (!reasons.includes(reasonFilter)) return false;
    }
    // 고민 필터
    if (counselCheckFilter !== 'all') {
      const checks = (consultation.counsel_check || '').split(', ').map(c => c.trim()).filter(Boolean);
      const matchesCounsel = checks.some(c => {
        if (counselCheckFilter === '기타') return c.startsWith('기타');
        return c === counselCheckFilter;
      });
      if (!matchesCounsel) return false;
    }
    // 날짜 필터
    if (startDate || endDate) {
      const consultationDate = new Date(consultation.created_at);
      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        if (consultationDate < start) return false;
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        if (consultationDate > end) return false;
      }
    }
    return true;
  });

  // 페이징 계산 (필터링된 데이터 기준)
  const totalPages = Math.ceil(filteredConsultations.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedConsultations = filteredConsultations.slice(startIndex, endIndex);

  // 고유 담당자 목록
  const uniqueManagers = Array.from(new Set(consultations.map(c => c.manager).filter(Boolean))) as string[];

  // 고유 대분류 / 중분류 목록
  const uniqueMajorCategories = Array.from(
    new Set(consultations.map(c => parseClickSource(c.click_source).major).filter(Boolean))
  ).sort() as string[];

  // 고유 취득사유 목록
  const uniqueReasons = ['즉시취업', '이직', '미래', '취미', '준비'];

  // 고유 고민(상담체크) 목록
  const uniqueCounselChecks = ['타기관', '자체가격', '직장', '육아', '가격비교', '기타'];

  // 대분류별 사전 정의 중분류
  const predefinedMinorCategories: Record<string, string[]> = {
    '당근': ['당근채팅', '대표전화(당근)'],
    '맘카페': ['순광맘', '러브양산맘', '창원진해댁', '광주맘스팡', '충주아사모', '화성남양애', '율하맘', '춘천맘', '서산맘', '부천소사구', '둔산맘'],
  };

  // 대분류 선택 시 해당하는 중분류만 표시 (사전 정의 값 포함)
  const uniqueMinorCategories = Array.from(
    new Set([
      ...(majorCategoryFilter !== 'all' ? (predefinedMinorCategories[majorCategoryFilter] || []) : []),
      ...consultations
        .filter(c => {
          if (majorCategoryFilter === 'all') return true;
          return parseClickSource(c.click_source).major === majorCategoryFilter;
        })
        .map(c => parseClickSource(c.click_source).minor)
        .filter(Boolean),
    ])
  ).sort() as string[];

  const goToPage = (page: number) => {
    setCurrentPage(page);
    setSelectedIds([]);
  };

  // 검색어 하이라이트 함수
  const highlightText = (text: string | null | undefined, query: string) => {
    if (!text || !query) return text || '';
    
    const parts = text.split(new RegExp(`(${query})`, 'gi'));
    return parts.map((part, index) => 
      part.toLowerCase() === query.toLowerCase() 
        ? <span key={index} className={styles.highlight}>{part}</span>
        : part
    );
  };

  // 연락처 하이라이트 함수 (하이픈 무시)
  const highlightContact = (contact: string, query: string) => {
    if (!query) return contact;
    
    // 검색어에 하이픈이 포함되어 있으면 일반 하이라이트 사용
    if (query.includes('-')) {
      return highlightText(contact, query);
    }
    
    // 검색어에서 숫자만 추출
    const searchNumbers = query.replace(/[^0-9]/g, '');
    if (searchNumbers.length < 3) return contact;
    
    // 연락처를 숫자만 추출
    const contactNumbers = contact.replace(/-/g, '');
    
    // 검색어가 포함되어 있는지 확인
    const matchIndex = contactNumbers.toLowerCase().indexOf(searchNumbers.toLowerCase());
    if (matchIndex === -1) return contact;
    
    // 하이픈 포함한 원본에서 매칭 위치 찾기
    let currentNumberIndex = 0;
    let startPos = -1;
    let endPos = -1;
    
    for (let i = 0; i < contact.length; i++) {
      if (contact[i] !== '-') {
        if (currentNumberIndex === matchIndex && startPos === -1) {
          startPos = i;
        }
        if (currentNumberIndex === matchIndex + searchNumbers.length - 1) {
          endPos = i + 1;
          break;
        }
        currentNumberIndex++;
      }
    }
    
    if (startPos === -1 || endPos === -1) return contact;
    
    // 하이라이트 적용
    return (
      <>
        {contact.substring(0, startPos)}
        <span className={styles.highlight}>{contact.substring(startPos, endPos)}</span>
        {contact.substring(endPos)}
      </>
    );
  };

  // 엑셀 다운로드 함수
  const handleExcelDownload = () => {
    // 선택된 항목이 있으면 선택된 것만, 없으면 필터링된 전체 다운로드
    const dataToDownload = selectedIds.length > 0 
      ? consultations.filter(c => selectedIds.includes(c.id))
      : filteredConsultations;

    if (dataToDownload.length === 0) {
      alert('다운로드할 데이터가 없습니다.');
      return;
    }

    // CSV 형식으로 다운로드
    const headers = ['이름', '연락처', '최종학력', '취득사유', '유입 경로', '과목비용', '담당자', '거주지', '메모', '신청일시', '상태'];
    const csvData = dataToDownload.map(consultation => [
      consultation.name,
      consultation.contact,
      consultation.education || '',
      consultation.reason || '',
      consultation.click_source || '',
      consultation.subject_cost || '',
      consultation.manager || '',
      consultation.residence || '',
      consultation.memo || '',
      formatDate(consultation.created_at),
      consultation.status || '상담대기중'
    ]);

    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    // UTF-8 BOM 추가 (엑셀에서 한글 깨짐 방지)
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    const fileName = selectedIds.length > 0 
      ? `상담신청_선택${selectedIds.length}건_${new Date().toISOString().split('T')[0]}.csv`
      : `상담신청_${new Date().toISOString().split('T')[0]}.csv`;
    
    link.setAttribute('href', url);
    link.setAttribute('download', fileName);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 관리자 대시보드
  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>상담 신청 관리 ({filteredConsultations.length}건)</h1>
        
        {/* 필터 영역 */}
        <div className={styles.filterRow}>
          <div className={styles.filterGroup}>
            <input
              type="text"
              placeholder="이름, 연락처, 취득사유, 메모 검색..."
              value={searchText}
              onChange={(e) => {
                setSearchText(e.target.value);
                setCurrentPage(1);
              }}
              className={styles.searchInput}
            />
          </div>
          <div className={styles.filterGroup}>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setCurrentPage(1);
              }}
              className={styles.dateInput}
            />
          </div>
          <span className={styles.dateSeparator}>~</span>
          <div className={styles.filterGroup}>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setCurrentPage(1);
              }}
              className={styles.dateInput}
            />
          </div>
          {(searchText || statusFilter !== 'all' || managerFilter !== 'all' || majorCategoryFilter !== 'all' || minorCategoryFilter !== 'all' || reasonFilter !== 'all' || counselCheckFilter !== 'all' || startDate || endDate) && (
            <button
              onClick={() => {
                setSearchText('');
                setStatusFilter('all');
                setManagerFilter('all');
                setMajorCategoryFilter('all');
                setMinorCategoryFilter('all');
                setReasonFilter('all');
                setCounselCheckFilter('all');
                setStartDate('');
                setEndDate('');
                setCurrentPage(1);
              }}
              className={styles.clearFilterButton}
            >
              필터 초기화
            </button>
          )}
        </div>

        <div className={styles.headerActions}>
          <button onClick={() => setShowAddModal(true)} className={styles.addButton}>
            추가
          </button>
          {selectedIds.length === 1 && (
            <button onClick={openEditModal} className={styles.editButton}>
              수정
            </button>
          )}
          {selectedIds.length > 0 && (
            <button onClick={handleBulkDelete} className={styles.deleteButton}>
              삭제 ({selectedIds.length})
            </button>
          )}
          <button onClick={handleExcelDownload} className={styles.excelButton}>
            {selectedIds.length > 0 ? `선택 항목 다운로드 (${selectedIds.length})` : '엑셀 다운로드'}
          </button>
          <button onClick={fetchConsultations} className={styles.refreshButton}>
            새로고침
          </button>
          <button onClick={handleLogout} className={styles.logoutButton}>
            로그아웃
          </button>
        </div>
      </header>

      {loading ? (
        <div className={styles.loading}>로딩 중...</div>
      ) : error ? (
        <div className={styles.errorMessage}>{error}</div>
      ) : (
        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.checkboxCell}>
                  <input
                    type="checkbox"
                    checked={selectedIds.length === paginatedConsultations.length && paginatedConsultations.length > 0}
                    onChange={toggleSelectAll}
                  />
                </th>
                {/* 유입경로 */}
                <th className={`${styles.thFilterable} ${(majorCategoryFilter !== 'all' || minorCategoryFilter !== 'all') ? styles.thFiltered : ''}`}>
                  <div className={styles.thInner}>
                    <span>유입 경로</span>
                    <button
                      className={`${styles.thFilterBtn} ${(majorCategoryFilter !== 'all' || minorCategoryFilter !== 'all') ? styles.thFilterBtnActive : ''}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                        setDropdownPos({ top: rect.bottom + 4, left: rect.left });
                        setOpenFilterColumn(openFilterColumn === 'source' ? null : 'source');
                      }}
                    >▾</button>
                  </div>
                </th>
                <th>이름</th>
                <th>연락처</th>
                <th>최종학력</th>
                <th>희망과정</th>
                {/* 취득사유 */}
                <th className={`${styles.thFilterable} ${reasonFilter !== 'all' ? styles.thFiltered : ''}`}>
                  <div className={styles.thInner}>
                    <span>취득사유</span>
                    <button
                      className={`${styles.thFilterBtn} ${reasonFilter !== 'all' ? styles.thFilterBtnActive : ''}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                        setDropdownPos({ top: rect.bottom + 4, left: rect.left });
                        setOpenFilterColumn(openFilterColumn === 'reason' ? null : 'reason');
                      }}
                    >▾</button>
                  </div>
                </th>
                <th>과목비용</th>
                {/* 담당자 */}
                <th className={`${styles.thFilterable} ${managerFilter !== 'all' ? styles.thFiltered : ''}`}>
                  <div className={styles.thInner}>
                    <span>담당자</span>
                    <button
                      className={`${styles.thFilterBtn} ${managerFilter !== 'all' ? styles.thFilterBtnActive : ''}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                        setDropdownPos({ top: rect.bottom + 4, left: rect.left });
                        setOpenFilterColumn(openFilterColumn === 'manager' ? null : 'manager');
                      }}
                    >▾</button>
                  </div>
                </th>
                <th>거주지</th>
                <th>메모</th>
                {/* 고민 */}
                <th className={`${styles.thFilterable} ${counselCheckFilter !== 'all' ? styles.thFiltered : ''}`}>
                  <div className={styles.thInner}>
                    <span>고민</span>
                    <button
                      className={`${styles.thFilterBtn} ${counselCheckFilter !== 'all' ? styles.thFilterBtnActive : ''}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                        setDropdownPos({ top: rect.bottom + 4, left: rect.left });
                        setOpenFilterColumn(openFilterColumn === 'counselCheck' ? null : 'counselCheck');
                      }}
                    >▾</button>
                  </div>
                </th>
                <th>신청일시</th>
                {/* 상태 */}
                <th className={`${styles.thFilterable} ${statusFilter !== 'all' ? styles.thFiltered : ''}`}>
                  <div className={styles.thInner}>
                    <span>상태</span>
                    <button
                      className={`${styles.thFilterBtn} ${statusFilter !== 'all' ? styles.thFilterBtnActive : ''}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                        setDropdownPos({ top: rect.bottom + 4, left: rect.left - 60 });
                        setOpenFilterColumn(openFilterColumn === 'status' ? null : 'status');
                      }}
                    >▾</button>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {paginatedConsultations.length === 0 ? (
                <tr>
                  <td colSpan={12} className={styles.empty}>
                    신청 내역이 없습니다.
                  </td>
                </tr>
              ) : (
                paginatedConsultations.map((consultation) => (
                  <tr key={consultation.id} className={selectedIds.includes(consultation.id) ? styles.selectedRow : ''}>
                    <td className={styles.checkboxCell}>
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(consultation.id)}
                        onChange={() => toggleSelect(consultation.id)}
                      />
                    </td>
                    <td>{highlightText(parseClickSource(consultation.click_source).display, searchText) || '-'}</td>
                    <td>{highlightText(consultation.name, searchText)}</td>
                    <td>{highlightContact(consultation.contact, searchText)}</td>
                    <td>{consultation.education || '-'}</td>
                    <td>{consultation.hope_course || '-'}</td>
                    <td>
                      <div
                        className={`${styles.memoCell} ${!consultation.reason ? styles.empty : ''}`}
                        onClick={() => openReasonModal(consultation)}
                        title={consultation.reason || '취득사유 입력...'}
                      >
                        {consultation.reason ? highlightText(consultation.reason, searchText) : '취득사유 입력...'}
                      </div>
                    </td>
                    <td>
                      <div 
                        className={`${styles.memoCell} ${!consultation.subject_cost ? styles.empty : ''}`}
                        onClick={() => openSubjectCostModal(consultation)}
                      >
                        {consultation.subject_cost ? consultation.subject_cost.toLocaleString() + '원' : '비용 입력...'}
                      </div>
                    </td>
                    <td>
                      <div 
                        className={`${styles.memoCell} ${!consultation.manager ? styles.empty : ''}`}
                        onClick={() => openManagerModal(consultation)}
                      >
                        {consultation.manager ? highlightText(consultation.manager, searchText) : '담당자 입력...'}
                      </div>
                    </td>
                    <td>
                      <div
                        className={`${styles.memoCell} ${!consultation.residence ? styles.empty : ''}`}
                        onClick={() => openResidenceModal(consultation)}
                        title={consultation.residence || '거주지 입력...'}
                      >
                        {consultation.residence ? highlightText(consultation.residence, searchText) : '거주지 입력...'}
                      </div>
                    </td>
                    <td>
                      <div
                        className={`${styles.memoCell} ${!consultation.memo ? styles.empty : ''}`}
                        onClick={() => openMemoModal(consultation)}
                        title={consultation.memo || '메모 추가...'}
                      >
                        {consultation.memo ? highlightText(consultation.memo, searchText) : '메모 추가...'}
                      </div>
                    </td>
                    <td>
                      <div
                        className={styles.counselCheckCell}
                        onClick={() => openCounselCheckModal(consultation)}
                      >
                        {consultation.counsel_check
                          ? consultation.counsel_check.split(', ').filter(Boolean).map((item) => (
                              <span key={item} className={styles.counselCheckTag}>
                                {item.startsWith('기타:') ? `기타: ${item.slice(3)}` : item}
                              </span>
                            ))
                          : <span className={styles.empty}>체크...</span>
                        }
                      </div>
                    </td>
                    <td>{formatDate(consultation.created_at)}</td>
                    <td>
                      <select
                        value={consultation.status || '상담대기'}
                        onChange={(e) => handleStatusChange(consultation.id, e.target.value as ConsultationStatus)}
                        className={`${styles.statusSelect} ${styles[`status${(consultation.status || '상담대기').replace(/\s/g, '')}`]}`}
                      >
                        <option value="상담대기">상담대기</option>
                        <option value="상담중">상담중</option>
                        <option value="보류">보류</option>
                        <option value="등록대기">등록대기</option>
                        <option value="등록완료">등록완료</option>
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
              <button
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage === 1}
                className={styles.pageButton}
              >
                이전
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                <button
                  key={page}
                  onClick={() => goToPage(page)}
                  className={`${styles.pageButton} ${currentPage === page ? styles.activePage : ''}`}
                >
                  {page}
                </button>
              ))}
              <button
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage === totalPages}
                className={styles.pageButton}
              >
                다음
              </button>
            </div>
          )}
        </div>
      )}

      {/* 수동 추가 모달 */}
      {showAddModal && (
        <div className={styles.modalOverlay} onClick={() => setShowAddModal(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h2 className={styles.modalTitle}>상담 신청 추가</h2>
            <form onSubmit={handleAddConsultation} className={styles.modalForm}>
              <div className={styles.formGroup}>
                <label>이름 *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="이름을 입력하세요"
                />
              </div>
              <div className={styles.formGroup}>
                <label>연락처 *</label>
                <input
                  type="text"
                  required
                  value={formData.contact}
                  onChange={handleContactChange}
                  placeholder="010-1234-5678"
                  maxLength={13}
                />
              </div>
              <div className={styles.formGroup}>
                <label>최종학력</label>
                <select
                  value={formData.education}
                  onChange={(e) => setFormData({ ...formData, education: e.target.value })}
                >
                  <option value="">선택하세요 (선택사항)</option>
                  <option value="고등학교 졸업">고등학교 졸업</option>
                  <option value="전문대 졸업">전문대 졸업</option>
                  <option value="대학교 재학">대학교 재학</option>
                  <option value="대학교 졸업">대학교 졸업</option>
                  <option value="대학원 이상">대학원 이상</option>
                </select>
              </div>
              <div className={styles.formGroup}>
                <label>희망과정</label>
                <input
                  type="text"
                  value={formData.hope_course}
                  onChange={(e) => setFormData({ ...formData, hope_course: e.target.value })}
                  placeholder="희망과정을 입력하세요 (선택사항)"
                />
              </div>
              <div className={styles.formGroup}>
                <label>취득사유 (복수 선택 가능)</label>
                <div className={styles.checkboxGroup}>
                  {['즉시취업', '이직', '미래', '취미', '준비'].map((opt) => {
                    const selected = formData.reason.split(', ').filter(Boolean).includes(opt);
                    return (
                      <label key={opt} className={`${styles.checkboxOption} ${selected ? styles.checkboxOptionSelected : ''}`}>
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={() => {
                            const current = formData.reason.split(', ').filter(Boolean);
                            const updated = selected ? current.filter(r => r !== opt) : [...current, opt];
                            setFormData({ ...formData, reason: updated.join(', ') });
                          }}
                          style={{ display: 'none' }}
                        />
                        {opt}
                      </label>
                    );
                  })}
                </div>
              </div>
              <div className={styles.formGroup}>
                <label>유입 경로</label>
                <input
                  type="text"
                  list="clickSourceOptions"
                  value={formData.click_source}
                  onChange={(e) => setFormData({ ...formData, click_source: e.target.value })}
                  placeholder="예: 당근_당근채팅, 네이버_검색 등 (선택사항)"
                />
                <datalist id="clickSourceOptions">
                  <option value="당근" />
                  <option value="당근채팅" />
                  <option value="대표전화(당근)" />
                  <option value="맘카페_순광맘" />
                  <option value="맘카페_러브양산맘" />
                  <option value="맘카페_창원진해댁" />
                  <option value="맘카페_광주맘스팡" />
                  <option value="맘카페_충주아사모" />
                  <option value="맘카페_화성남양애" />
                  <option value="맘카페_율하맘" />
                  <option value="맘카페_춘천맘" />
                  <option value="맘카페_서산맘" />
                  <option value="맘카페_부천소사구" />
                </datalist>
              </div>
              <div className={styles.formGroup}>
                <label>과목비용</label>
                <input
                  type="text"
                  value={formData.subject_cost}
                  onChange={handleFormSubjectCostChange}
                  placeholder="숫자만 입력 (선택사항)"
                />
              </div>
              <div className={styles.formGroup}>
                <label>담당자</label>
                <input
                  type="text"
                  value={formData.manager}
                  onChange={(e) => setFormData({ ...formData, manager: e.target.value })}
                  placeholder="담당자 이름 (선택사항)"
                />
              </div>
              <div className={styles.formGroup}>
                <label>거주지</label>
                <input
                  type="text"
                  value={formData.residence}
                  onChange={(e) => setFormData({ ...formData, residence: e.target.value })}
                  placeholder="거주지 (선택사항)"
                />
              </div>
              <div className={styles.modalActions}>
                <button type="submit" className={styles.submitButton}>추가하기</button>
                <button type="button" onClick={() => setShowAddModal(false)} className={styles.cancelButton}>
                  취소
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 수정 모달 */}
      {showEditModal && selectedConsultation && (
        <div className={styles.modalOverlay} onClick={() => setShowEditModal(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h2 className={styles.modalTitle}>상담 신청 수정</h2>
            <form onSubmit={handleEditConsultation} className={styles.modalForm}>
              <div className={styles.formGroup}>
                <label>이름 *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="이름을 입력하세요"
                />
              </div>
              <div className={styles.formGroup}>
                <label>연락처 *</label>
                <input
                  type="text"
                  required
                  value={formData.contact}
                  onChange={handleContactChange}
                  placeholder="010-1234-5678"
                  maxLength={13}
                />
              </div>
              <div className={styles.formGroup}>
                <label>최종학력</label>
                <select
                  value={formData.education}
                  onChange={(e) => setFormData({ ...formData, education: e.target.value })}
                >
                  <option value="">선택하세요 (선택사항)</option>
                  <option value="고등학교 졸업">고등학교 졸업</option>
                  <option value="전문대 졸업">전문대 졸업</option>
                  <option value="대학교 재학">대학교 재학</option>
                  <option value="대학교 졸업">대학교 졸업</option>
                  <option value="대학원 이상">대학원 이상</option>
                </select>
              </div>
              <div className={styles.formGroup}>
                <label>취득사유 (복수 선택 가능)</label>
                <div className={styles.checkboxGroup}>
                  {['즉시취업', '이직', '미래', '취미', '준비'].map((opt) => {
                    const selected = formData.reason.split(', ').filter(Boolean).includes(opt);
                    return (
                      <label key={opt} className={`${styles.checkboxOption} ${selected ? styles.checkboxOptionSelected : ''}`}>
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={() => {
                            const current = formData.reason.split(', ').filter(Boolean);
                            const updated = selected ? current.filter(r => r !== opt) : [...current, opt];
                            setFormData({ ...formData, reason: updated.join(', ') });
                          }}
                          style={{ display: 'none' }}
                        />
                        {opt}
                      </label>
                    );
                  })}
                </div>
              </div>
              <div className={styles.formGroup}>
                <label>유입 경로</label>
                <input
                  type="text"
                  list="clickSourceOptions"
                  value={formData.click_source}
                  onChange={(e) => setFormData({ ...formData, click_source: e.target.value })}
                  placeholder="예: 당근_당근채팅, 네이버_검색 등 (선택사항)"
                />
              </div>
              <div className={styles.formGroup}>
                <label>과목비용</label>
                <input
                  type="text"
                  value={formData.subject_cost}
                  onChange={handleFormSubjectCostChange}
                  placeholder="숫자만 입력 (선택사항)"
                />
              </div>
              <div className={styles.formGroup}>
                <label>담당자</label>
                <input
                  type="text"
                  value={formData.manager}
                  onChange={(e) => setFormData({ ...formData, manager: e.target.value })}
                  placeholder="담당자 이름 (선택사항)"
                />
              </div>
              <div className={styles.modalActions}>
                <button type="submit" className={styles.submitButton}>수정하기</button>
                <button type="button" onClick={() => setShowEditModal(false)} className={styles.cancelButton}>
                  취소
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 거주지 수정 모달 */}
      {showResidenceModal && selectedConsultation && (
        <div className={styles.modalOverlay} onClick={closeResidenceModal}>
          <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
            <h2 className={styles.modalTitle}>거주지 수정</h2>
            <div className={styles.memoInfo}>
              <p><strong>이름:</strong> {selectedConsultation.name}</p>
              <p><strong>연락처:</strong> {selectedConsultation.contact}</p>
            </div>
            <div className={styles.formGroup}>
              <label>거주지</label>
              <input
                type="text"
                value={residenceText}
                onChange={e => setResidenceText(e.target.value)}
                placeholder="거주지 입력"
              />
            </div>
            <div className={styles.modalActions}>
              <button type="button" className={styles.submitButton} onClick={handleUpdateResidence}>저장</button>
              <button type="button" className={styles.cancelButton} onClick={closeResidenceModal}>취소</button>
            </div>
          </div>
        </div>
      )}

      {/* 메모 편집 모달 */}
      {showMemoModal && selectedConsultation && (
        <div className={styles.modalOverlay} onClick={closeMemoModal}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h2 className={styles.modalTitle}>메모 편집</h2>
            <div className={styles.memoInfo}>
              <p><strong>이름:</strong> {selectedConsultation.name}</p>
              <p><strong>연락처:</strong> {selectedConsultation.contact}</p>
            </div>
            <div className={styles.formGroup}>
              <label>메모</label>
              <textarea
                value={memoText}
                onChange={(e) => setMemoText(e.target.value)}
                rows={5}
                placeholder="메모를 입력하세요..."
                className={styles.memoTextarea}
              />
            </div>
            <div className={styles.modalActions}>
              <button onClick={handleUpdateMemo} className={styles.submitButton}>
                저장
              </button>
              <button onClick={closeMemoModal} className={styles.cancelButton}>
                취소
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 취득사유 편집 모달 */}
      {showReasonModal && selectedConsultation && (
        <div className={styles.modalOverlay} onClick={closeReasonModal}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h2 className={styles.modalTitle}>취득사유 편집</h2>
            <div className={styles.memoInfo}>
              <p><strong>이름:</strong> {selectedConsultation.name}</p>
              <p><strong>연락처:</strong> {selectedConsultation.contact}</p>
            </div>
            <div className={styles.formGroup}>
              <label>취득사유 (복수 선택 가능)</label>
              <div className={styles.checkboxGroup}>
                {['즉시취업', '이직', '미래', '취미', '준비'].map((opt) => {
                  const selected = reasonText.split(', ').filter(Boolean).includes(opt);
                  return (
                    <label key={opt} className={`${styles.checkboxOption} ${selected ? styles.checkboxOptionSelected : ''}`}>
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => {
                          const current = reasonText.split(', ').filter(Boolean);
                          const updated = selected ? current.filter(r => r !== opt) : [...current, opt];
                          setReasonText(updated.join(', '));
                        }}
                        style={{ display: 'none' }}
                      />
                      {opt}
                    </label>
                  );
                })}
              </div>
            </div>
            <div className={styles.modalActions}>
              <button onClick={handleUpdateReason} className={styles.submitButton}>
                저장
              </button>
              <button onClick={closeReasonModal} className={styles.cancelButton}>
                취소
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 고민 모달 */}
      {showCounselCheckModal && selectedConsultation && (
        <div className={styles.modalOverlay} onClick={closeCounselCheckModal}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h2 className={styles.modalTitle}>고민</h2>
            <div className={styles.memoInfo}>
              <p><strong>이름:</strong> {selectedConsultation.name}</p>
              <p><strong>연락처:</strong> {selectedConsultation.contact}</p>
            </div>
            <div className={styles.formGroup}>
              <label>항목 선택 (복수 선택 가능)</label>
              <div className={styles.checkboxGroup}>
                {['타기관', '자체가격', '직장', '육아', '가격비교', '기타'].map((opt) => {
                  // 기타는 "기타" 또는 "기타:xxx" 형태로 저장되므로 prefix 체크
                  const selected = opt === '기타'
                    ? counselCheckText.split(', ').some(i => i === '기타' || i.startsWith('기타:'))
                    : counselCheckText.split(', ').filter(Boolean).includes(opt);
                  return (
                    <label key={opt} className={`${styles.checkboxOption} ${selected ? styles.checkboxOptionSelected : ''}`}>
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => {
                          // 기타 제외한 현재 항목들
                          const current = counselCheckText.split(', ').filter(Boolean).filter(i => opt === '기타' ? !(i === '기타' || i.startsWith('기타:')) : i !== opt);
                          let updated: string[];
                          if (selected) {
                            updated = current;
                            if (opt === '기타') setCounselCheckEtcInput('');
                          } else {
                            updated = [...current, opt === '기타' ? (counselCheckEtcInput ? `기타:${counselCheckEtcInput}` : '기타') : opt];
                          }
                          const newVal = updated.join(', ');
                          setCounselCheckText(newVal);
                          handleUpdateCounselCheck(newVal);
                        }}
                        style={{ display: 'none' }}
                      />
                      {opt}
                    </label>
                  );
                })}
              </div>
              {/* 기타 선택 시 텍스트 입력 */}
              {counselCheckText.split(', ').some(i => i === '기타' || i.startsWith('기타:')) && (
                <input
                  type="text"
                  className={styles.etcInput}
                  placeholder="기타 내용을 입력하세요..."
                  value={counselCheckEtcInput}
                  onChange={(e) => setCounselCheckEtcInput(e.target.value)}
                  onBlur={() => {
                    const current = counselCheckText.split(', ').filter(Boolean).filter(i => !(i === '기타' || i.startsWith('기타:')));
                    const etcVal = counselCheckEtcInput ? `기타:${counselCheckEtcInput}` : '기타';
                    const newVal = [...current, etcVal].join(', ');
                    setCounselCheckText(newVal);
                    handleUpdateCounselCheck(newVal);
                  }}
                  autoFocus
                />
              )}
            </div>
            <div className={styles.modalActions}>
              <button onClick={closeCounselCheckModal} className={styles.cancelButton}>
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 과목비용 편집 모달 */}
      {showSubjectCostModal && selectedConsultation && (
        <div className={styles.modalOverlay} onClick={closeSubjectCostModal}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h2 className={styles.modalTitle}>과목비용 편집</h2>
            <div className={styles.memoInfo}>
              <p><strong>이름:</strong> {selectedConsultation.name}</p>
              <p><strong>연락처:</strong> {selectedConsultation.contact}</p>
            </div>
            <div className={styles.formGroup}>
              <label>과목비용</label>
              <input
                type="text"
                value={subjectCostText}
                onChange={handleSubjectCostChange}
                placeholder="숫자만 입력하세요..."
              />
            </div>
            <div className={styles.modalActions}>
              <button onClick={handleUpdateSubjectCost} className={styles.submitButton}>
                저장
              </button>
              <button onClick={closeSubjectCostModal} className={styles.cancelButton}>
                취소
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 담당자 편집 모달 */}
      {showManagerModal && selectedConsultation && (
        <div className={styles.modalOverlay} onClick={closeManagerModal}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h2 className={styles.modalTitle}>담당자 편집</h2>
            <div className={styles.memoInfo}>
              <p><strong>이름:</strong> {selectedConsultation.name}</p>
              <p><strong>연락처:</strong> {selectedConsultation.contact}</p>
            </div>
            <div className={styles.formGroup}>
              <label>담당자</label>
              <input
                type="text"
                value={managerText}
                onChange={(e) => setManagerText(e.target.value)}
                placeholder="담당자 이름을 입력하세요..."
              />
            </div>
            <div className={styles.modalActions}>
              <button onClick={handleUpdateManager} className={styles.submitButton}>
                저장
              </button>
              <button onClick={closeManagerModal} className={styles.cancelButton}>
                취소
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ───── TH 필터 드롭다운 (position: fixed) ───── */}
      {openFilterColumn && (
        <div
          ref={filterDropdownRef}
          className={styles.thFilterDropdown}
          style={{ top: dropdownPos.top, left: dropdownPos.left }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          {openFilterColumn === 'source' && (
            <>
              <div className={styles.thFilterSection}>
                <div className={styles.thFilterSectionTitle}>대분류</div>
                {['all', ...uniqueMajorCategories].map(cat => (
                  <div
                    key={cat}
                    className={`${styles.thFilterItem} ${majorCategoryFilter === cat ? styles.thFilterItemSelected : ''}`}
                    onClick={() => { setMajorCategoryFilter(cat); setMinorCategoryFilter('all'); setCurrentPage(1); }}
                  >{cat === 'all' ? '전체' : cat}</div>
                ))}
              </div>
              {majorCategoryFilter !== 'all' && uniqueMinorCategories.length > 0 && (
                <div className={styles.thFilterSection}>
                  <div className={styles.thFilterSectionTitle}>중분류</div>
                  {['all', ...uniqueMinorCategories].map(cat => (
                    <div
                      key={cat}
                      className={`${styles.thFilterItem} ${minorCategoryFilter === cat ? styles.thFilterItemSelected : ''}`}
                      onClick={() => { setMinorCategoryFilter(cat); setCurrentPage(1); }}
                    >{cat === 'all' ? '전체' : cat}</div>
                  ))}
                </div>
              )}
            </>
          )}
          {openFilterColumn === 'manager' && (
            <div className={styles.thFilterSection}>
              {[{ val: 'all', label: '전체' }, { val: 'none', label: '담당자 없음' }, ...uniqueManagers.map(m => ({ val: m, label: m }))].map(({ val, label }) => (
                <div
                  key={val}
                  className={`${styles.thFilterItem} ${managerFilter === val ? styles.thFilterItemSelected : ''}`}
                  onClick={() => { setManagerFilter(val); setCurrentPage(1); }}
                >{label}</div>
              ))}
            </div>
          )}
          {openFilterColumn === 'status' && (
            <div className={styles.thFilterSection}>
              {['all', '상담대기', '상담중', '보류', '등록대기', '등록완료'].map(opt => (
                <div
                  key={opt}
                  className={`${styles.thFilterItem} ${statusFilter === opt ? styles.thFilterItemSelected : ''}`}
                  onClick={() => { setStatusFilter(opt as ConsultationStatus | 'all'); setCurrentPage(1); }}
                >{opt === 'all' ? '전체' : opt}</div>
              ))}
            </div>
          )}
          {openFilterColumn === 'reason' && (
            <div className={styles.thFilterSection}>
              {['all', ...uniqueReasons].map(opt => (
                <div
                  key={opt}
                  className={`${styles.thFilterItem} ${reasonFilter === opt ? styles.thFilterItemSelected : ''}`}
                  onClick={() => { setReasonFilter(opt); setCurrentPage(1); }}
                >{opt === 'all' ? '전체' : opt}</div>
              ))}
            </div>
          )}
          {openFilterColumn === 'counselCheck' && (
            <div className={styles.thFilterSection}>
              {['all', ...uniqueCounselChecks].map(opt => (
                <div
                  key={opt}
                  className={`${styles.thFilterItem} ${counselCheckFilter === opt ? styles.thFilterItemSelected : ''}`}
                  onClick={() => { setCounselCheckFilter(opt); setCurrentPage(1); }}
                >{opt === 'all' ? '전체' : opt}</div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
