'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import styles from '../admin.module.css';
import Link from 'next/link';
import { CAFE_NAMES, KNOWN_CAFE_NAMES, CAFE_CONFIG } from '@/lib/cafe-names';
import { toast } from 'sonner';

const CERT_CATEGORIES = [
  {
    label: "전체과정",
    options: [
      "병원동행매니저1급","노인돌봄생활지원사1급","방과후돌봄교실지도사1급","바리스타1급","타로심리상담사1급",
      "심리상담사1급","아동요리지도사1급","노인심리상담사1급","다문화심리상담사1급","독서논술지도사1급",
      "독서지도사1급","동화구연지도사1급","디지털중독예방지도사1급","미술심리상담사1급","미술심리상담사2급",
      "방과후수학지도사1급","스토리텔링수학지도사1급","방과후아동지도사1급","방과후학교지도사1급",
      "병원코디네이터1급","부동산권리분석사1급","부모교육상담사1급","북아트1급","산모신생아건강관리사",
      "산후관리사","손유희지도사1급","스피치지도사1급","실버인지활동지도사1급","심리분석사1급",
      "아동공예지도자","아동미술심리상담사","아동미술지도사","아동미술심리상담사1급","안전교육지도사",
      "안전관리사","안전교육지도사1급","영어동화구연지도사","유튜브크리에이터","음악심리상담사",
      "이미지메이킹스피치","인성지도사1급","인성지도사2급","자기주도학습지도사1급","자기주도학습지도사2급",
      "자원봉사지도사1급","종이접기지도사","지역아동교육지도사1급","진로적성상담사1급","코딩지도사",
      "클레이아트지도사","프레젠테이션스피치","학교폭력예방상담사1급","NIE지도사1급","교육마술지도사1급",
      "POP디자인지도사","SNS마케팅전문가",
    ],
  },
  {
    label: "실버과정",
    options: ["생활지원사1급","노인심리상담사1급","병원동행매니저1급","실버인지활동지도사1급","안전교육지도사1급","자원봉사지도사1급"],
  },
  {
    label: "아동과정",
    options: ["아동미술지도사1급","아동요리지도사1급","손유희지도사1급","종이접기지도사1급","클레이아트지도사1급","북아트1급"],
  },
  {
    label: "방과후과정",
    options: ["방과후돌봄교실지도사1급","방과후아동지도사1급","영어동화구연지도사1급","코딩지도사1급","독서논술지도사1급","진로적성상담사1급","학교폭력예방상담사1급"],
  },
  {
    label: "심리과정",
    options: ["심리상담사1급","심리분석사1급","미술심리상담사1급","음악심리상담사1급","부모교육상담사1급","진로적성상담사1급","학교폭력예방상담사1급"],
  },
  {
    label: "커피과정",
    options: ["바리스타1급"],
  },
  {
    label: "취·창업과정",
    options: ["타로심리상담사1급","바리스타1급","안전관리사1급","안전교육지도사1급","산모신생아건강관리사1급","산후관리사1급","SNS마케팅전문가1급","유튜브크리에이터1급"],
  },
];

type ConsultationStatus = '상담대기' | '상담중' | '보류' | '등록대기' | '등록완료';

interface PrivateCert {
  id: number;
  name: string;
  contact: string;
  major_category: string | null;
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

// click_source 파싱: "바로폼_대분류_중분류" 또는 "대분류_중분류" → { major, minor }
function parseClickSource(source: string | null) {
  if (!source) return { major: '', minor: '' };
  const stripped = source.startsWith('바로폼_') ? source.slice(4) : source;
  const idx = stripped.indexOf('_');
  if (idx === -1) return { major: stripped, minor: '' };
  const major = stripped.slice(0, idx);
  const rawMinor = stripped.slice(idx + 1);
  // 맘카페 유입인데 알려진 카페 ID/이름과 다르면 확인필요 표시
  const minor =
    major === '맘카페' && !CAFE_NAMES[rawMinor] && !KNOWN_CAFE_NAMES.has(rawMinor)
      ? `${rawMinor}(확인필요)`
      : (CAFE_NAMES[rawMinor] || rawMinor);
  return { major, minor };
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
  const [majorCategoryFilter, setMajorCategoryFilter] = useState('all');
  const [minorCategoryFilter, setMinorCategoryFilter] = useState('all');
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
  const [showClickSourceModal, setShowClickSourceModal] = useState(false);
  const [clickSourceSearch, setClickSourceSearch] = useState('');
  const [cafes, setCafes] = useState<{ id: string; name: string; type: string }[]>([]);
  const [copiedContactId, setCopiedContactId] = useState<number | null>(null);
  const [showResidenceModal, setShowResidenceModal] = useState(false);
  const [showCounselCheckModal, setShowCounselCheckModal] = useState(false);

  const [selectedItem, setSelectedItem] = useState<PrivateCert | null>(null);
  const [memoText, setMemoText] = useState('');
  const [reasonText, setReasonText] = useState('');
  const [subjectCostText, setSubjectCostText] = useState('');
  const [managerText, setManagerText] = useState('');
  const [pcManagerDirect, setPcManagerDirect] = useState(false);
  const [pcManagerModalDirect, setPcManagerModalDirect] = useState(false);
  const [editingManagerId, setEditingManagerId] = useState<number | null>(null);
  const [editingManagerValue, setEditingManagerValue] = useState('');
  const [residenceText, setResidenceText] = useState('');
  const [counselCheckText, setCounselCheckText] = useState('');
  const [counselCheckEtcInput, setCounselCheckEtcInput] = useState('');

  // 추가/수정 폼
  const emptyForm = { name: '', contact: '', hope_course: '', reason: '', click_source: '', subject_cost: '', manager: '', residence: '', major_category: '' };
  const [formData, setFormData] = useState(emptyForm);
  const addCourseRef = useRef<HTMLDivElement>(null);
  const [addCourseOpen, setAddCourseOpen] = useState(false);
  const [addCourseSearch, setAddCourseSearch] = useState('');
  // 유입경로 칩 상태
  const [pcSourceMajor, setPcSourceMajor] = useState('');
  const [pcSourceMinor, setPcSourceMinor] = useState('');
  const [pcSourceCustom, setPcSourceCustom] = useState('');
  const [pcMamcafeTextInput, setPcMamcafeTextInput] = useState('');
  const [pcMamcafeNewId, setPcMamcafeNewId] = useState('');
  const [pcMamcafeNewName, setPcMamcafeNewName] = useState('');
  const [pcMamcafeAdding, setPcMamcafeAdding] = useState(false);

  // 인증 확인
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) { fetchItems(true); fetchCafes(); }
      else router.push('/admin/login');
    });
  }, []);

  const fetchCafes = async () => {
    try {
      const res = await fetch('/api/channels?type=mamcafe');
      const data = await res.json();
      if (Array.isArray(data)) setCafes(data);
    } catch {}
  };

  // 유입경로 칩 헬퍼
  const applyPcSource = (major: string, minor: string, custom: string) => {
    if (!major) { setFormData(p => ({ ...p, click_source: '' })); return; }
    if (minor && minor !== '직접입력') {
      setFormData(p => ({ ...p, click_source: `${major}_${minor}` }));
    } else if (minor === '직접입력' && custom) {
      setFormData(p => ({ ...p, click_source: `${major}_${custom}` }));
    } else {
      setFormData(p => ({ ...p, click_source: major }));
    }
  };

  const handlePcMamcafeTextInput = (text: string) => {
    setPcMamcafeTextInput(text);
    if (!text.trim()) { setPcSourceMinor(''); applyPcSource('맘카페', '', ''); return; }
    const matchedCafe = cafes.find(c => c.name === text.trim() || c.id === text.trim());
    const matchedId = matchedCafe?.id || Object.entries(CAFE_NAMES).find(([, name]) => name === text.trim())?.[0];
    if (matchedId) {
      setPcSourceMinor(matchedId);
      applyPcSource('맘카페', matchedId, '');
    } else {
      setPcSourceMinor('확인필요');
      setFormData(p => ({ ...p, click_source: '맘카페_확인필요' }));
    }
  };

  const handleAddPcMamcafe = async () => {
    const rawId = pcMamcafeNewId.trim();
    const name = pcMamcafeNewName.trim();
    if (!rawId || !name) { toast.warning('카페 ID와 이름을 모두 입력해주세요.'); return; }
    const match = rawId.match(/(?:https?:\/\/)?(?:m\.)?cafe\.naver\.com\/([a-zA-Z0-9_]+)/);
    const cafeId = match ? match[1] : rawId;
    setPcMamcafeAdding(true);
    try {
      const res = await fetch('/api/channels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: cafeId, name, type: 'mamcafe' }),
      });
      if (!res.ok) { const err = await res.json(); toast.error(err.error || '추가 실패'); return; }
      await fetchCafes();
      setPcSourceMinor(cafeId);
      setPcMamcafeNewId('');
      setPcMamcafeNewName('');
      applyPcSource('맘카페', cafeId, '');
    } catch {
      toast.error('카페 추가에 실패했습니다.');
    } finally {
      setPcMamcafeAdding(false);
    }
  };

  const resetPcSource = () => {
    setPcSourceMajor('');
    setPcSourceMinor('');
    setPcSourceCustom('');
    setPcMamcafeTextInput('');
    setPcMamcafeNewId('');
    setPcMamcafeNewName('');
  };

  // 드롭다운 외부 클릭 닫기
  useEffect(() => {
    const handle = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (filterDropdownRef.current && !filterDropdownRef.current.contains(target) && !target.closest(`.${styles.thFilterBtn}`)) {
        setOpenFilterColumn(null);
      }
      if (addCourseRef.current && !addCourseRef.current.contains(e.target as Node)) { setAddCourseOpen(false); setAddCourseSearch(''); }
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

  const fetchItems = async (isInitial = false) => {
    if (isInitial) setLoading(true);
    try {
      const res = await fetch('/api/private-cert');
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      setItems(data);
    } catch {
      setError('데이터를 불러오지 못했습니다.');
    } finally {
      if (isInitial) setLoading(false);
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
    const res = await fetch('/api/private-cert', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...formData,
        subject_cost: numericCost ? parseInt(numericCost) : null,
        is_manual_entry: true,
      }),
    });
    if (!res.ok) {
      toast.error('저장에 실패했습니다. 다시 시도해주세요.');
      return;
    }
    setFormData(emptyForm);
    resetPcSource();
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
    resetPcSource();
    setSelectedIds([]);
    fetchItems();
  };

  const openEditModal = () => {
    if (selectedIds.length !== 1) return;
    const item = items.find(i => i.id === selectedIds[0]);
    if (!item) return;
    // 유입경로 칩 상태 복원
    const { major, minor } = parseClickSource(item.click_source);
    setPcSourceMajor(major);
    setPcSourceMinor(minor && !minor.endsWith('(확인필요)') ? minor : '');
    setPcSourceCustom('');
    setPcMamcafeTextInput('');
    setSelectedItem(item);
    setFormData({
      name: item.name,
      contact: item.contact,
      major_category: item.major_category || '',
      hope_course: item.hope_course || '',
      reason: item.reason || '',
      click_source: item.click_source || '',
      subject_cost: item.subject_cost ? item.subject_cost.toLocaleString() : '',
      manager: item.manager || '',
      residence: item.residence || '',
    });
    const mgr = item.manager || '';
    setPcManagerDirect(mgr !== '' && !uniqueManagers.includes(mgr));
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

  // 학점은행제로 이동
  const handleMoveToConsultations = async () => {
    if (!confirm(`선택한 ${selectedIds.length}건을 학점은행제로 이동하시겠습니까?`)) return;
    const targets = items.filter(i => selectedIds.includes(i.id));
    try {
      for (const item of targets) {
        await fetch('/api/consultations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: item.name,
            contact: item.contact,
            education: null,
            hope_course: item.hope_course,
            reason: item.reason,
            click_source: item.click_source,
            memo: item.memo,
            counsel_check: item.counsel_check,
            status: item.status,
            subject_cost: item.subject_cost,
            manager: item.manager,
            residence: item.residence,
            is_manual_entry: true,
          }),
        });
      }
      await fetch('/api/private-cert', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedIds }),
      });
      setSelectedIds([]);
      fetchItems();
      toast.success(`${targets.length}건이 학점은행제로 이동되었습니다.`);
    } catch {
      toast.error('이동에 실패했습니다.');
    }
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

  // 맘카페 click_source 모달
  const openClickSourceModal = (item: PrivateCert) => {
    setSelectedItem(item);
    setClickSourceSearch('');
    setShowClickSourceModal(true);
  };

  const closeClickSourceModal = () => {
    setShowClickSourceModal(false);
    setSelectedItem(null);
    setClickSourceSearch('');
  };

  const handleUpdateClickSource = async (cafeId: string) => {
    if (!selectedItem) return;
    try {
      const response = await fetch('/api/private-cert', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: selectedItem.id, click_source: `맘카페_${cafeId}` }),
      });
      if (!response.ok) throw new Error('저장 실패');
      closeClickSourceModal();
      fetchItems();
    } catch {
      toast.error('저장에 실패했습니다.');
    }
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
    if (majorCategoryFilter !== 'all') {
      if (parseClickSource(item.click_source).major !== majorCategoryFilter) return false;
    }
    if (minorCategoryFilter === '__needs_check__') {
      if (!parseClickSource(item.click_source).minor.includes('(확인필요)')) return false;
    } else if (minorCategoryFilter !== 'all') {
      if (parseClickSource(item.click_source).minor !== minorCategoryFilter) return false;
    }
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
  const needsCheckCount = items.filter(i => parseClickSource(i.click_source).minor.includes('(확인필요)')).length;


  // 등록률 통계
  const calcRegRate = (list: PrivateCert[]) => {
    const total = list.length;
    const registered = list.filter(c => c.status === '등록완료').length;
    const rate = total > 0 ? Math.round((registered / total) * 100) : 0;
    return { total, registered, rate };
  };
  const managerStats = uniqueManagers.map(name => {
    const all = items.filter(i => i.manager === name);
    const recent30 = [...all]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 30);
    return { name, overall: calcRegRate(all), recent: calcRegRate(recent30) };
  });
  const privateCertAll = items.filter(i => i.manager && uniqueManagers.includes(i.manager));
  const privateCertRecent30 = [...privateCertAll]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 30);
  const privateCertStats = { overall: calcRegRate(privateCertAll), recent: calcRegRate(privateCertRecent30) };
  const topManagerName = managerStats.length > 0
    ? managerStats.reduce((best, m) => m.recent.rate > best.recent.rate ? m : best).name
    : null;

  // 고유 대분류 / 중분류 목록 (click_source 파싱)
  const uniqueMajorCategories = Array.from(
    new Set(items.map(i => parseClickSource(i.click_source).major).filter(Boolean))
  ).sort() as string[];

  const uniqueMinorCategories = Array.from(
    new Set(
      items
        .filter(i => majorCategoryFilter === 'all' || parseClickSource(i.click_source).major === majorCategoryFilter)
        .map(i => parseClickSource(i.click_source).minor)
        .filter(v => Boolean(v) && !v.includes('(확인필요)'))
    )
  ).sort() as string[];

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
    const headers = ['대분류', '중분류', '이름', '연락처', '희망과정', '취득사유', '과목비용', '담당자', '거주지', '메모', '고민', '신청일시', '상태'];
    const rows = targets.map(i => [
      parseClickSource(i.click_source).major, parseClickSource(i.click_source).minor,
      i.name, i.contact, i.hope_course || '',
      i.reason || '',
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
            <label>희망과정</label>
            <div className={styles.tossDropdown} ref={addCourseRef}>
              <button type="button" className={styles.tossDropdownTrigger} onClick={() => { setAddCourseOpen(o => !o); setAddCourseSearch(''); }}>
                <span className={formData.hope_course ? '' : styles.tossDropdownPlaceholder}>
                  {formData.hope_course || '선택하세요 (선택사항)'}
                </span>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d={addCourseOpen ? 'M4 10l4-4 4 4' : 'M4 6l4 4 4-4'} stroke="#8b95a1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
              {addCourseOpen && (
                <div className={`${styles.tossDropdownMenu} ${styles.courseDropdownMenu}`}>
                  <div className={styles.courseSearchHeader}>
                    <input
                      type="text"
                      autoFocus
                      value={addCourseSearch}
                      onChange={e => setAddCourseSearch(e.target.value)}
                      placeholder="과정 검색..."
                      onClick={e => e.stopPropagation()}
                      className={styles.courseSearchInput}
                    />
                  </div>
                  <button type="button" className={`${styles.tossDropdownItem} ${!formData.hope_course ? styles.tossDropdownItemActive : ''}`}
                    onClick={() => { setFormData(p => ({ ...p, hope_course: '', major_category: '' })); setAddCourseOpen(false); setAddCourseSearch(''); }}>
                    <span>선택 안 함</span>
                  </button>
                  {addCourseSearch.trim()
                    ? CERT_CATEGORIES.flatMap(cat => cat.options.filter(opt => opt.includes(addCourseSearch.trim())).map(opt => ({ opt, catLabel: cat.label }))).map(({ opt, catLabel }) => (
                          <button type="button" key={opt}
                            className={`${styles.tossDropdownItem} ${formData.hope_course === opt ? styles.tossDropdownItemActive : ''}`}
                            onClick={() => { setFormData(p => ({ ...p, hope_course: opt, major_category: catLabel })); setAddCourseOpen(false); setAddCourseSearch(''); }}>
                            <span>{opt}</span>
                          </button>
                        ))
                    : CERT_CATEGORIES.map(cat => (
                        <div key={cat.label}>
                          <div className={styles.courseCategoryLabel}>{cat.label}</div>
                          {cat.options.map(opt => (
                            <button type="button" key={`${cat.label}-${opt}`}
                              className={`${styles.tossDropdownItem} ${formData.hope_course === opt ? styles.tossDropdownItemActive : ''}`}
                              onClick={() => { setFormData(p => ({ ...p, hope_course: opt, major_category: cat.label })); setAddCourseOpen(false); setAddCourseSearch(''); }}>
                              <span>{opt}</span>
                            </button>
                          ))}
                        </div>
                      ))
                  }
                </div>
              )}
            </div>
          </div>
          <div className={styles.formGroup}>
            <label>유입 경로</label>
            {/* 대분류 칩 */}
            <div className={styles.sourceChips}>
              {['당근', '맘카페', '네이버', '인스타', '유튜브', '카카오', '페이스북', '기타'].map(m => (
                <button type="button" key={m}
                  className={`${styles.sourceChip} ${pcSourceMajor === m ? styles.sourceChipSelected : ''}`}
                  onClick={() => {
                    const newMajor = pcSourceMajor === m ? '' : m;
                    setPcSourceMajor(newMajor);
                    setPcSourceMinor('');
                    setPcSourceCustom('');
                    setPcMamcafeTextInput('');
                    applyPcSource(newMajor, '', '');
                  }}>{m}</button>
              ))}
            </div>
            {/* 맘카페 서브 */}
            {pcSourceMajor === '맘카페' && (
              <div className={styles.sourceSubChips}>
                {cafes.map(c => (
                  <button type="button" key={c.id}
                    className={`${styles.sourceChip} ${pcSourceMinor === c.id ? styles.sourceChipSelected : ''}`}
                    onClick={() => {
                      const newMinor = pcSourceMinor === c.id ? '' : c.id;
                      setPcSourceMinor(newMinor);
                      setPcSourceCustom('');
                      setPcMamcafeNewId('');
                      setPcMamcafeNewName('');
                      setPcMamcafeTextInput(newMinor ? (c.name.startsWith('http') ? c.id : c.name) : '');
                      applyPcSource('맘카페', newMinor, '');
                    }}>{c.name.startsWith('http') ? c.id : c.name}</button>
                ))}
                <button type="button"
                  className={`${styles.sourceChip} ${pcSourceMinor === '직접입력' ? styles.sourceChipSelected : ''}`}
                  onClick={() => {
                    setPcSourceMinor(pcSourceMinor === '직접입력' ? '' : '직접입력');
                    setPcMamcafeNewId('');
                    setPcMamcafeNewName('');
                    applyPcSource('맘카페', '', '');
                  }}>+ 직접 추가</button>
              </div>
            )}
            {pcSourceMajor === '맘카페' && (
              <div className={styles.mamcafeInputWrapper}>
                <input
                  type="text"
                  className={styles.mamcafeTextInput}
                  placeholder="활동하고 계신 맘카페를 적어주세요 (제휴여부 확인)"
                  value={pcMamcafeTextInput}
                  onChange={e => handlePcMamcafeTextInput(e.target.value)}
                />
                {pcMamcafeTextInput && (
                  <div className={`${styles.sourceFeedback} ${pcSourceMinor === '확인필요' ? styles.sourceFeedbackWarn : styles.sourceFeedbackOk}`}>
                    {pcSourceMinor === '확인필요'
                      ? '⚠ 지정된 제휴 맘카페가 아닙니다 → 확인필요로 분류됩니다'
                      : `✓ 제휴 맘카페 확인: ${cafes.find(c => c.id === pcSourceMinor)?.name || CAFE_NAMES[pcSourceMinor] || pcSourceMinor}`}
                  </div>
                )}
              </div>
            )}
            {pcSourceMajor === '맘카페' && pcSourceMinor === '직접입력' && (
              <div className={styles.sourceAddForm}>
                <input type="text" className={styles.sourceAddInput} value={pcMamcafeNewId} placeholder="카페 ID 또는 네이버 카페 URL"
                  onChange={async e => {
                    const val = e.target.value;
                    const urlMatch = val.match(/(?:https?:\/\/)?(?:m\.)?cafe\.naver\.com\/([a-zA-Z0-9_]+)/);
                    if (urlMatch) {
                      setPcMamcafeNewId(urlMatch[1]);
                      try {
                        const res = await fetch(`/api/cafe-lookup?id=${encodeURIComponent(urlMatch[1])}`);
                        const data = await res.json();
                        if (data.name) setPcMamcafeNewName(data.name);
                      } catch {}
                    } else {
                      setPcMamcafeNewId(val);
                    }
                  }} />
                <input type="text" className={styles.sourceAddInput} value={pcMamcafeNewName} placeholder="카페 이름 (예: 순광맘)"
                  onChange={e => setPcMamcafeNewName(e.target.value)} />
                <button type="button" className={styles.sourceAddBtn} onClick={handleAddPcMamcafe} disabled={pcMamcafeAdding}>
                  {pcMamcafeAdding ? '추가 중...' : '카페 추가'}
                </button>
              </div>
            )}
            {/* 당근 서브 */}
            {pcSourceMajor === '당근' && (
              <div className={styles.sourceSubChips}>
                {['당근채팅', '대표전화(당근)'].map(opt => (
                  <button type="button" key={opt}
                    className={`${styles.sourceChip} ${pcSourceMinor === opt ? styles.sourceChipSelected : ''}`}
                    onClick={() => {
                      const newMinor = pcSourceMinor === opt ? '' : opt;
                      setPcSourceMinor(newMinor);
                      setPcSourceCustom('');
                      applyPcSource('당근', newMinor, '');
                    }}>{opt}</button>
                ))}
                <button type="button"
                  className={`${styles.sourceChip} ${pcSourceMinor === '직접입력' ? styles.sourceChipSelected : ''}`}
                  onClick={() => {
                    setPcSourceMinor(pcSourceMinor === '직접입력' ? '' : '직접입력');
                    setPcSourceCustom('');
                    applyPcSource('당근', '', '');
                  }}>직접입력</button>
              </div>
            )}
            {pcSourceMajor === '당근' && pcSourceMinor === '직접입력' && (
              <input type="text" className={styles.sourceCustomInput} value={pcSourceCustom}
                placeholder="당근 경로 입력 (예: 채팅, 전화 등)"
                onChange={e => { setPcSourceCustom(e.target.value); applyPcSource('당근', '직접입력', e.target.value); }} />
            )}
            {/* 네이버 서브 */}
            {pcSourceMajor === '네이버' && (
              <div className={styles.sourceSubChips}>
                {['카페', '블로그', '검색', '지식인', '쇼핑'].map(opt => (
                  <button type="button" key={opt}
                    className={`${styles.sourceChip} ${pcSourceMinor === opt ? styles.sourceChipSelected : ''}`}
                    onClick={() => {
                      const newMinor = pcSourceMinor === opt ? '' : opt;
                      setPcSourceMinor(newMinor);
                      applyPcSource('네이버', newMinor, '');
                    }}>{opt}</button>
                ))}
              </div>
            )}
            {/* 인스타 서브 */}
            {pcSourceMajor === '인스타' && (
              <div className={styles.sourceSubChips}>
                {['홈피드', '릴스', '스토리', '광고', '프로필'].map(opt => (
                  <button type="button" key={opt}
                    className={`${styles.sourceChip} ${pcSourceMinor === opt ? styles.sourceChipSelected : ''}`}
                    onClick={() => {
                      const newMinor = pcSourceMinor === opt ? '' : opt;
                      setPcSourceMinor(newMinor);
                      applyPcSource('인스타', newMinor, '');
                    }}>{opt}</button>
                ))}
              </div>
            )}
            {/* 기타 서브 */}
            {pcSourceMajor === '기타' && (
              <input type="text" className={styles.sourceCustomInput} value={pcSourceCustom}
                placeholder="경로를 입력해주세요"
                onChange={e => { setPcSourceCustom(e.target.value); applyPcSource('기타', '직접입력', e.target.value); }} />
            )}
            {formData.click_source && (
              <span className={styles.sourcePreview}>{formData.click_source}</span>
            )}
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
<div className={styles.titleRow}>
          <h1 className={styles.title}>민간자격증 상담 관리 ({filteredItems.length}건)</h1>
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
          {(searchText || statusFilter !== 'all' || managerFilter !== 'all' || majorCategoryFilter !== 'all' || minorCategoryFilter !== 'all' || startDate || endDate) && (
            <button onClick={() => { setSearchText(''); setStatusFilter('all'); setManagerFilter('all'); setMajorCategoryFilter('all'); setMinorCategoryFilter('all'); setStartDate(''); setEndDate(''); setCurrentPage(1); }} className={styles.clearFilterButton}>
              필터 초기화
            </button>
          )}
        </div>

        {/* 액션 버튼 */}
        <div className={styles.headerActions}>
          <button onClick={() => { setShowAddModal(true); setPcManagerDirect(false); }} className={styles.addButton}>추가</button>
          {selectedIds.length === 1 && (
            <button onClick={openEditModal} className={styles.editButton}>수정</button>
          )}
          {selectedIds.length > 0 && (
            <button onClick={handleMoveToConsultations} className={styles.editButton}>학점이동 ({selectedIds.length})</button>
          )}
          {selectedIds.length > 0 && (
            <button onClick={handleBulkDelete} className={styles.deleteButton}>삭제 ({selectedIds.length})</button>
          )}
          <button onClick={handleExcelDownload} className={styles.excelButton}>
            {selectedIds.length > 0 ? `선택 항목 다운로드 (${selectedIds.length})` : '엑셀 다운로드'}
          </button>
        </div>
        <div className={styles.statsTable}>
          <div className={styles.statsHeader}>
            <span className={styles.statsColName} />
            <span className={styles.statsColLabel}>최근 30건</span>
            <span className={styles.statsColLabel}>전체</span>
          </div>
          <div className={`${styles.statsRow} ${styles.statsRowGroup}`}>
            <span className={styles.statsName}>민간사업부</span>
            <div className={styles.statsCell}>
              <span className={styles.statsRate}>{privateCertStats.recent.rate}%</span>
            </div>
            <div className={styles.statsCell}>
              <span className={styles.statsRate}>{privateCertStats.overall.rate}%</span>
            </div>
          </div>
          {[...managerStats].sort((a, b) => b.recent.rate - a.recent.rate).map(m => {
            const isTop = m.name === topManagerName && m.recent.rate > 0;
            return (
              <div key={m.name} className={`${styles.statsRow} ${isTop ? styles.statsRowTop : ''}`}>
                <span className={`${styles.statsName} ${isTop ? styles.statsNameTop : ''}`}>
                  {m.name}
                  {isTop && <span className={styles.rankBadge}>🥇</span>}
                </span>
                <div className={styles.statsCell}>
                  <span className={`${styles.statsRate} ${isTop ? styles.statsRateTop : ''}`}>{m.recent.rate}%</span>
                </div>
                <div className={styles.statsCell}>
                  <span className={`${styles.statsRate} ${isTop ? styles.statsRateTop : ''}`}>{m.overall.rate}%</span>
                </div>
              </div>
            );
          })}
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
              {/* 대분류 */}
              <th className={`${styles.thFilterable} ${majorCategoryFilter !== 'all' ? styles.thFiltered : ''}`}>
                <div className={styles.thInner}>
                  <span>대분류</span>
                  <button className={`${styles.thFilterBtn} ${majorCategoryFilter !== 'all' ? styles.thFilterBtnActive : ''}`}
                    onClick={e => {
                      e.stopPropagation();
                      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                      setDropdownPos({ top: rect.bottom + 4, left: rect.left });
                      setOpenFilterColumn(openFilterColumn === 'major' ? null : 'major');
                    }}>▾</button>
                </div>
              </th>
              {/* 중분류 */}
              <th className={`${styles.thFilterable} ${minorCategoryFilter !== 'all' ? styles.thFiltered : ''}`}>
                <div className={styles.thInner}>
                  <span>중분류</span>
                  <button className={`${styles.thFilterBtn} ${minorCategoryFilter !== 'all' ? styles.thFilterBtnActive : ''}`}
                    onClick={e => {
                      e.stopPropagation();
                      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                      setDropdownPos({ top: rect.bottom + 4, left: rect.left });
                      setOpenFilterColumn(openFilterColumn === 'minor' ? null : 'minor');
                    }}>▾</button>
                </div>
              </th>
              <th className={styles.thNameMin}>이름</th>
              <th>연락처</th>
              <th>희망과정</th>
              <th>취득사유</th>
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
                  <td>{parseClickSource(item.click_source).major || '-'}</td>
                  <td className={styles.tdNoPadding}>
                    {parseClickSource(item.click_source).major === '맘카페' ? (
                      <div
                        className={`${styles.minorCell} ${styles.minorCellEditable} ${!parseClickSource(item.click_source).minor ? styles.minorCellEmpty : ''} ${parseClickSource(item.click_source).minor.includes('(확인필요)') ? styles.needsCheck : ''}`}
                        onClick={() => openClickSourceModal(item)}
                        title="클릭하여 카페 수정"
                      >
                        <span className={styles.minorCellText}>
                          {parseClickSource(item.click_source).minor || '카페 선택...'}
                        </span>
                      </div>
                    ) : (
                      <div
                        className={`${styles.minorCell} ${parseClickSource(item.click_source).minor.includes('(확인필요)') ? styles.needsCheckText : ''}`}
                      >
                        {parseClickSource(item.click_source).minor || '-'}
                      </div>
                    )}
                  </td>
                  <td>{highlightText(item.name, searchText)}</td>
                  <td
                    className={styles.tdClickable}
                    onClick={() => {
                      navigator.clipboard.writeText(item.contact.replace(/-/g, ''));
                      setCopiedContactId(-(item.id));
                      setTimeout(() => setCopiedContactId(null), 1500);
                    }}
                    title="클릭하여 복사"
                  >
                    {copiedContactId === -(item.id)
                      ? <span className={styles.copiedText}>복사됨!</span>
                      : item.contact}
                  </td>
                  <td>{item.hope_course || '-'}</td>
                  <td>
                    <div className={`${styles.memoCell} ${!item.reason ? styles.empty : ''}`}
                      onClick={() => { setSelectedItem(item); setReasonText(item.reason || ''); setShowReasonModal(true); }}
                      title={item.reason || '취득사유 입력...'}>
                      {item.reason ? highlightText(item.reason, searchText) : '취득사유 입력...'}
                    </div>
                  </td>
                  <td>
                    <div className={`${styles.memoCell} ${!item.subject_cost ? styles.empty : ''}`}
                      onClick={() => { setSelectedItem(item); setSubjectCostText(item.subject_cost ? item.subject_cost.toLocaleString() : ''); setShowSubjectCostModal(true); }}>
                      {item.subject_cost ? item.subject_cost.toLocaleString() + '원' : '비용 입력...'}
                    </div>
                  </td>
                  <td>
                    <div className={`${styles.memoCell} ${!item.manager ? styles.empty : ''}`}
                      onClick={() => { setSelectedItem(item); const mgr = item.manager || ''; setManagerText(mgr); setPcManagerModalDirect(mgr !== '' && !uniqueManagers.includes(mgr)); setShowManagerModal(true); }}>
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

      {/* TH 필터 드롭다운 */}
      {openFilterColumn && (
        <div ref={filterDropdownRef} className={styles.thFilterDropdown} style={{ top: dropdownPos.top, left: dropdownPos.left }}
          onMouseDown={e => e.stopPropagation()}>
          {openFilterColumn === 'major' && (
            <div className={styles.thFilterSection}>
              {['all', ...uniqueMajorCategories].map(cat => (
                <div key={cat}
                  className={`${styles.thFilterItem} ${majorCategoryFilter === cat ? styles.thFilterItemSelected : ''}`}
                  onClick={() => { setMajorCategoryFilter(cat); setMinorCategoryFilter('all'); setCurrentPage(1); setOpenFilterColumn(null); }}>
                  {cat === 'all' ? '전체' : cat}
                </div>
              ))}
            </div>
          )}
          {openFilterColumn === 'minor' && (
            <div className={styles.thFilterSection}>
              {['all', '__needs_check__', ...uniqueMinorCategories].map(cat => (
                <div key={cat}
                  className={`${styles.thFilterItem} ${minorCategoryFilter === cat ? styles.thFilterItemSelected : ''} ${cat === '__needs_check__' ? styles.needsCheckText : ''}`}
                  onClick={() => { setMinorCategoryFilter(cat); setCurrentPage(1); setOpenFilterColumn(null); }}>
                  {cat === 'all' ? '전체' : cat === '__needs_check__' ? `확인필요 (${needsCheckCount})` : cat}
                </div>
              ))}
            </div>
          )}
          {openFilterColumn === 'manager' && (
            <div className={styles.thFilterSection}>
              {[{ val: 'all', label: '전체' }, ...uniqueManagers.map(m => ({ val: m, label: m }))].map(({ val, label }) => (
                <div key={val}
                  className={`${styles.thFilterItem} ${managerFilter === val ? styles.thFilterItemSelected : ''}`}
                  onClick={() => { setManagerFilter(val); setCurrentPage(1); setOpenFilterColumn(null); }}>
                  {label}
                </div>
              ))}
            </div>
          )}
          {openFilterColumn === 'status' && (
            <div className={styles.thFilterSection}>
              {['all', ...STATUS_OPTIONS].map(opt => (
                <div key={opt}
                  className={`${styles.thFilterItem} ${statusFilter === opt ? styles.thFilterItemSelected : ''}`}
                  onClick={() => { setStatusFilter(opt as ConsultationStatus | 'all'); setCurrentPage(1); setOpenFilterColumn(null); }}>
                  {opt === 'all' ? '전체' : opt}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 추가 모달 */}
      {showAddModal && renderForm(handleAdd, '민간자격증 신청 추가', () => { setShowAddModal(false); setFormData(emptyForm); resetPcSource(); })}

      {/* 수정 모달 */}
      {showEditModal && renderForm(handleEdit, '민간자격증 신청 수정', () => { setShowEditModal(false); setFormData(emptyForm); resetPcSource(); setSelectedItem(null); })}

      {/* 메모 모달 */}
      {showMemoModal && (
        <div className={styles.modalOverlay} onClick={() => setShowMemoModal(false)}>
          <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
            <h2 className={styles.modalTitle}>메모 편집</h2>
            {selectedItem && (
              <div className={styles.memoInfo}>
                <p><strong>이름:</strong> {selectedItem.name}</p>
                <p><strong>연락처:</strong> {selectedItem.contact}</p>
              </div>
            )}
            <label className={styles.fieldLabel}>메모</label>
            <textarea className={styles.memoTextarea} value={memoText} onChange={e => setMemoText(e.target.value)} rows={4} placeholder="메모를 입력하세요..." />
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
            <h2 className={styles.modalTitle}>취득사유 편집</h2>
            {selectedItem && (
              <div className={styles.memoInfo}>
                <p><strong>이름:</strong> {selectedItem.name}</p>
                <p><strong>연락처:</strong> {selectedItem.contact}</p>
              </div>
            )}
            <div className={styles.formGroup}>
              <label>취득사유 (복수 선택 가능)</label>
              <div className={styles.checkboxGroup}>
                {['즉시취업', '이직', '미래준비', '취업'].map((opt) => {
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
                        className={styles.hiddenCheckbox}
                      />
                      {opt}
                    </label>
                  );
                })}
              </div>
            </div>
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
            <h2 className={styles.modalTitle}>과목비용 편집</h2>
            {selectedItem && (
              <div className={styles.memoInfo}>
                <p><strong>이름:</strong> {selectedItem.name}</p>
                <p><strong>연락처:</strong> {selectedItem.contact}</p>
              </div>
            )}
            <label className={styles.fieldLabel}>과목비용</label>
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
            <h2 className={styles.modalTitle}>담당자 편집</h2>
            {selectedItem && (
              <div className={styles.memoInfo}>
                <p><strong>이름:</strong> {selectedItem.name}</p>
                <p><strong>연락처:</strong> {selectedItem.contact}</p>
              </div>
            )}
            {uniqueManagers.length > 0 && (
              <div className={styles.counselCheckOptions}>
                {uniqueManagers.map(m => (
                  <button
                    key={m}
                    type="button"
                    className={`${styles.counselCheckOption} ${managerText === m ? styles.counselCheckOptionActive : ''}`}
                    onClick={() => setManagerText(managerText === m ? '' : m)}
                  >
                    {m}
                  </button>
                ))}
              </div>
            )}
            <label className={styles.fieldLabel}>직접 입력</label>
            <input
              type="text"
              className={styles.inputField}
              value={managerText}
              onChange={e => setManagerText(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleUpdateManager(); }}
              placeholder="담당자 이름을 입력하세요"
            />
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
            <h2 className={styles.modalTitle}>거주지 수정</h2>
            {selectedItem && (
              <div className={styles.memoInfo}>
                <p><strong>이름:</strong> {selectedItem.name}</p>
                <p><strong>연락처:</strong> {selectedItem.contact}</p>
              </div>
            )}
            <label className={styles.fieldLabel}>거주지</label>
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
            <h2 className={styles.modalTitle}>고민</h2>
            {selectedItem && (
              <div className={styles.memoInfo}>
                <p><strong>이름:</strong> {selectedItem.name}</p>
                <p><strong>연락처:</strong> {selectedItem.contact}</p>
              </div>
            )}
            <label className={styles.fieldLabel}>항목 선택 (복수 선택 가능)</label>
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

      {/* 맘카페 click_source 편집 모달 */}
      {showClickSourceModal && selectedItem && (
        <div className={styles.modalOverlay} onClick={closeClickSourceModal}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h2 className={styles.modalTitle}>맘카페 수정</h2>
            <div className={styles.memoInfo}>
              <p><strong>{selectedItem.name}</strong> · 현재: <span className={styles.highlightBlue}>{parseClickSource(selectedItem.click_source).minor || '미선택'}</span></p>
            </div>
            {/* 검색 */}
            <div className={styles.cafeSearchBox}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className={styles.flexShrink0}>
                <circle cx="6.5" cy="6.5" r="5" stroke="#8b95a1" strokeWidth="1.5"/>
                <path d="M10 10l3 3" stroke="#8b95a1" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              <input
                type="text"
                value={clickSourceSearch}
                onChange={(e) => setClickSourceSearch(e.target.value)}
                placeholder="카페 이름 검색..."
                autoFocus
                className={styles.cafeSearchInput}
              />
              {clickSourceSearch && (
                <button type="button" onClick={() => setClickSourceSearch('')} className={styles.cafeSearchClear}>✕</button>
              )}
            </div>
            {/* 리스트 */}
            <div className={styles.cafeList}>
              {(() => {
                const currentCafeId = selectedItem.click_source?.replace('맘카페_', '');
                const filtered = CAFE_CONFIG.filter(c =>
                  !clickSourceSearch ||
                  c.name.includes(clickSourceSearch) ||
                  c.id.includes(clickSourceSearch)
                );
                if (filtered.length === 0) return (
                  <div className={styles.cafeListEmpty}>검색 결과가 없습니다</div>
                );
                return filtered.map(cafe => {
                  const isSelected = currentCafeId === cafe.id;
                  return (
                    <button
                      key={cafe.id}
                      type="button"
                      onClick={() => handleUpdateClickSource(cafe.id)}
                      className={`${styles.cafeListItem} ${isSelected ? styles.cafeListItemSelected : ''}`}
                    >
                      <span className={styles.cafeListName}>{cafe.name}</span>
                      <span className={styles.cafeListId}>{cafe.id}</span>
                      {isSelected && (
                        <svg width="14" height="10" viewBox="0 0 14 10" fill="none" className={styles.flexShrink0}>
                          <path d="M1 5l4 4 8-8" stroke="#3182f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                    </button>
                  );
                });
              })()}
            </div>
            <div className={styles.modalActions}>
              <button onClick={closeClickSourceModal} className={styles.cancelButton}>닫기</button>
            </div>
          </div>
        </div>
      )}

      {/* 담당자 datalist */}
      <datalist id="pcManagerOptions">
        {uniqueManagers.map(m => <option key={m} value={m} />)}
      </datalist>

      {/* 맘카페 click_source datalist */}
      <datalist id="pcClickSourceOptions">
        {CAFE_CONFIG.map(c => <option key={c.id} value={`맘카페_${c.id}`} label={`맘카페 > ${c.name}`} />)}
      </datalist>
    </div>
  );
}
