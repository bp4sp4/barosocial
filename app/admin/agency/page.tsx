'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import styles from '../admin.module.css';
import { toast } from 'sonner';

type AgencyStatus = '협약대기' | '협약중' | '보류' | '협약완료';

interface Agency {
  id: number;
  category: string | null;
  region: string | null;
  institution_name: string | null;
  contact: string | null;
  credit_commission: string | null;
  private_commission: string | null;
  manager: string | null;
  memo: string | null;
  status: AgencyStatus;
  created_at: string;
}

interface FieldModal {
  id: number;
  field: keyof Agency;
  label: string;
  value: string;
  multiline?: boolean;
}

const STATUS_OPTIONS: AgencyStatus[] = ['협약대기', '협약중', '보류', '협약완료'];

const STATUS_CLASS: Record<AgencyStatus, string> = {
  협약대기: 'status상담대기',
  협약중: 'status상담중',
  보류: 'status보류',
  협약완료: 'status등록완료',
};

const EMPTY_FORM = {
  category: '',
  region: '',
  institution_name: '',
  contact: '',
  credit_commission: '',
  private_commission: '',
  manager: '',
  memo: '',
  status: '협약대기' as AgencyStatus,
};

export default function AgencyPage() {
  const router = useRouter();
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState<Agency | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [filterStatus, setFilterStatus] = useState<AgencyStatus | 'all'>('all');
  const [searchText, setSearchText] = useState('');
  const [managerFilter, setManagerFilter] = useState('all');

  // 셀 클릭 편집 모달
  const [fieldModal, setFieldModal] = useState<FieldModal | null>(null);
  const [fieldSaving, setFieldSaving] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());


  useEffect(() => {
    checkAuth();
    fetchAgencies();
  }, []);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) router.push('/admin/login');
  };

  const fetchAgencies = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('agency_agreements')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      toast.error('데이터 로딩 실패: ' + error.message);
    } else {
      setAgencies(data || []);
    }
    setLoading(false);
  };

  const openFieldModal = (agency: Agency, field: keyof Agency, label: string, multiline = false) => {
    setFieldModal({
      id: agency.id,
      field,
      label,
      value: (agency[field] as string) || '',
      multiline,
    });
  };

  const handleFieldSave = async () => {
    if (!fieldModal) return;
    setFieldSaving(true);
    const { error } = await supabase
      .from('agency_agreements')
      .update({ [fieldModal.field]: fieldModal.value || null })
      .eq('id', fieldModal.id);
    if (error) {
      toast.error('저장 실패: ' + error.message);
    } else {
      setAgencies(prev => prev.map(a =>
        a.id === fieldModal.id ? { ...a, [fieldModal.field]: fieldModal.value || null } : a
      ));
      toast.success('저장되었습니다.');
      setFieldModal(null);
    }
    setFieldSaving(false);
  };

  const openAdd = () => {
    setEditTarget(null);
    setForm({ ...EMPTY_FORM });
    setShowModal(true);
  };

  const openEdit = (agency: Agency) => {
    setEditTarget(agency);
    setForm({
      category: agency.category || '',
      region: agency.region || '',
      institution_name: agency.institution_name || '',
      contact: agency.contact || '',
      credit_commission: agency.credit_commission || '',
      private_commission: agency.private_commission || '',
      manager: agency.manager || '',
      memo: agency.memo || '',
      status: agency.status,
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.institution_name.trim()) {
      toast.error('기관이름을 입력해주세요.');
      return;
    }
    setSaving(true);
    const payload = {
      category: form.category || null,
      region: form.region || null,
      institution_name: form.institution_name,
      contact: form.contact || null,
      credit_commission: form.credit_commission || null,
      private_commission: form.private_commission || null,
      manager: form.manager || null,
      memo: form.memo || null,
      status: form.status,
    };

    if (editTarget) {
      const { error } = await supabase
        .from('agency_agreements')
        .update(payload)
        .eq('id', editTarget.id);
      if (error) {
        toast.error('수정 실패: ' + error.message);
      } else {
        toast.success('수정되었습니다.');
        setShowModal(false);
        fetchAgencies();
      }
    } else {
      const { error } = await supabase
        .from('agency_agreements')
        .insert(payload);
      if (error) {
        toast.error('추가 실패: ' + error.message);
      } else {
        toast.success('추가되었습니다.');
        setShowModal(false);
        fetchAgencies();
      }
    }
    setSaving(false);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('삭제하시겠습니까?')) return;
    const { error } = await supabase.from('agency_agreements').delete().eq('id', id);
    if (error) {
      toast.error('삭제 실패: ' + error.message);
    } else {
      toast.success('삭제되었습니다.');
      fetchAgencies();
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`${selectedIds.size}건을 삭제하시겠습니까?`)) return;
    const ids = Array.from(selectedIds);
    const { error } = await supabase.from('agency_agreements').delete().in('id', ids);
    if (error) {
      toast.error('삭제 실패: ' + error.message);
    } else {
      toast.success(`${ids.length}건 삭제되었습니다.`);
      setSelectedIds(new Set());
      fetchAgencies();
    }
  };

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map(a => a.id)));
    }
  };

  const formatPhoneNumber = (value: string) => {
    const numbers = value.replace(/[^0-9]/g, '');
    if (numbers.length <= 3) return numbers;
    if (numbers.length <= 7) return `${numbers.slice(0, 3)}-${numbers.slice(3)}`;
    if (numbers.length <= 11) return `${numbers.slice(0, 3)}-${numbers.slice(3, 7)}-${numbers.slice(7)}`;
    return `${numbers.slice(0, 3)}-${numbers.slice(3, 7)}-${numbers.slice(7, 11)}`;
  };

  const handleStatusChange = async (id: number, status: AgencyStatus) => {
    const { error } = await supabase
      .from('agency_agreements')
      .update({ status })
      .eq('id', id);
    if (error) {
      toast.error('상태 변경 실패');
    } else {
      setAgencies(prev => prev.map(a => a.id === id ? { ...a, status } : a));
    }
  };

  const filtered = agencies.filter(a => {
    if (filterStatus !== 'all' && a.status !== filterStatus) return false;
    if (managerFilter !== 'all') {
      if (managerFilter === 'none' && a.manager) return false;
      if (managerFilter !== 'none' && a.manager !== managerFilter) return false;
    }
    if (searchText) {
      const q = searchText.toLowerCase();
      const match =
        (a.institution_name || '').toLowerCase().includes(q) ||
        (a.region || '').toLowerCase().includes(q) ||
        (a.category || '').toLowerCase().includes(q) ||
        (a.contact || '').toLowerCase().includes(q) ||
        (a.manager || '').toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });

  const uniqueManagers = Array.from(
    new Set(agencies.map(a => a.manager).filter(Boolean))
  ) as string[];

  const managerStats = uniqueManagers.map(name => {
    const all = agencies.filter(a => a.manager === name);
    const completed = all.filter(a => a.status === '협약완료').length;
    return { name, total: all.length, completed };
  }).sort((a, b) => b.total - a.total);

  const topManager = managerStats.length > 0 ? managerStats[0].name : null;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('ko-KR', {
      year: 'numeric', month: '2-digit', day: '2-digit',
    }).format(date);
  };

  // 클릭 가능한 셀 스타일
  const cellClickStyle: React.CSSProperties = {
    cursor: 'pointer',
    borderRadius: 6,
    padding: '4px 8px',
    transition: 'background 0.15s',
    display: 'inline-block',
    minWidth: 40,
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>기관협약 ({filtered.length}건)</h1>

        <div className={styles.filterRow}>
          <div className={styles.filterGroup}>
            <input
              type="text"
              placeholder="기관명, 지역, 분류, 담당자 검색..."
              value={searchText}
              onChange={e => setSearchText(e.target.value)}
              className={styles.searchInput}
            />
          </div>
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value as AgencyStatus | 'all')}
            className={styles.filterSelect}
            style={{ width: 'auto', minWidth: 100 }}
          >
            <option value="all">전체 상태</option>
            {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select
            value={managerFilter}
            onChange={e => setManagerFilter(e.target.value)}
            className={styles.filterSelect}
            style={{ width: 'auto', minWidth: 110 }}
          >
            <option value="all">전체 담당자</option>
            <option value="none">미배정</option>
            {uniqueManagers.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          {(searchText || filterStatus !== 'all' || managerFilter !== 'all') && (
            <button
              onClick={() => { setSearchText(''); setFilterStatus('all'); setManagerFilter('all'); }}
              className={styles.clearFilterButton}
            >
              필터 초기화
            </button>
          )}
        </div>

        <div className={styles.headerActions}>
          {selectedIds.size > 0 && (
            <>
              {selectedIds.size === 1 && (
                <button
                  onClick={() => {
                    const target = agencies.find(a => a.id === Array.from(selectedIds)[0]);
                    if (target) openEdit(target);
                  }}
                  className={styles.editButton}
                >
                  수정
                </button>
              )}
              <button onClick={handleDeleteSelected} className={styles.deleteButton}>
                삭제 ({selectedIds.size})
              </button>
            </>
          )}
          <button onClick={openAdd} className={styles.addButton}>+ 기관 추가</button>
        </div>

        {managerStats.length > 0 && (
          <div className={styles.statsTable}>
            <div className={styles.statsHeader}>
              <span className={styles.statsColName} />
              <span className={styles.statsColLabel}>총 건수</span>
              <span className={styles.statsColLabel}>협약완료</span>
            </div>
            {managerStats.map(m => {
              const isTop = m.name === topManager && m.total > 0;
              return (
                <div key={m.name} className={`${styles.statsRow} ${isTop ? styles.statsRowTop : ''}`}>
                  <span className={`${styles.statsName} ${isTop ? styles.statsNameTop : ''}`}>
                    {m.name}
                    {isTop && <span className={styles.rankBadge}>🥇</span>}
                  </span>
                  <div className={styles.statsCell}>
                    <span className={`${styles.statsRate} ${isTop ? styles.statsRateTop : ''}`}>{m.total}</span>
                  </div>
                  <div className={styles.statsCell}>
                    <span className={`${styles.statsRate} ${isTop ? styles.statsRateTop : ''}`}>{m.completed}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </header>

      <div className={styles.tableContainer}>
        {loading ? (
          <div className={styles.loading}>로딩 중...</div>
        ) : filtered.length === 0 ? (
          <div className={styles.agencyEmpty}>
            <div className={styles.agencyEmptyGrid}>
              {[
                ['분류 입력...', '지역 입력...'],
                ['기관이름 입력...', '연락처 입력...'],
                ['학점커미션 입력...', '민간커미션 입력...'],
              ].map((row, i) => (
                <div key={i} className={styles.agencyEmptyRow}>
                  {row.map((text, j) => (
                    <div key={j} className={styles.agencyEmptyCell}>{text}</div>
                  ))}
                </div>
              ))}
            </div>
            <p className={styles.agencyEmptyText}>등록된 기관이 없습니다</p>
          </div>
        ) : (
          <table className={styles.table} style={{ minWidth: 900 }}>
            <thead>
              <tr>
                <th style={{ width: 36, textAlign: 'center' }}>
                  <input
                    type="checkbox"
                    checked={filtered.length > 0 && selectedIds.size === filtered.length}
                    onChange={toggleSelectAll}
                    style={{ cursor: 'pointer', accentColor: '#3182f6' }}
                  />
                </th>
                <th>분류</th>
                <th>지역</th>
                <th>기관이름</th>
                <th>연락처</th>
                <th>학점커미션</th>
                <th>민간커미션</th>
                <th>담당자</th>
                <th>메모</th>
                <th>상태</th>
                <th>등록일</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(a => (
                <tr key={a.id} style={{ background: selectedIds.has(a.id) ? '#f0f7ff' : '' }}>
                  <td style={{ textAlign: 'center' }}>
                    <input
                      type="checkbox"
                      checked={selectedIds.has(a.id)}
                      onChange={() => toggleSelect(a.id)}
                      style={{ cursor: 'pointer', accentColor: '#3182f6' }}
                    />
                  </td>
                  <td>{a.category || '-'}</td>
                  <td>{a.region || '-'}</td>
                  <td style={{ fontWeight: 600 }}>{a.institution_name || '-'}</td>
                  <td>
                    {a.contact ? (
                      <span
                        onClick={() => { navigator.clipboard.writeText(a.contact!); toast.success('복사되었습니다.'); }}
                        style={{ cursor: 'pointer', borderRadius: 4, padding: '2px 4px', transition: 'background 0.15s' }}
                        onMouseEnter={e => (e.currentTarget.style.background = '#f2f4f6')}
                        onMouseLeave={e => (e.currentTarget.style.background = '')}
                        title="클릭하여 복사"
                      >
                        {a.contact}
                      </span>
                    ) : '-'}
                  </td>

                  {/* 학점커미션 - 클릭 편집 */}
                  <td>
                    <span
                      style={cellClickStyle}
                      className={a.credit_commission ? '' : styles.memoCell}
                      onClick={() => openFieldModal(a, 'credit_commission', '학점커미션')}
                      onMouseEnter={e => (e.currentTarget.style.background = '#f2f4f6')}
                      onMouseLeave={e => (e.currentTarget.style.background = '')}
                    >
                      {a.credit_commission || <span style={{ color: '#b0b8c1' }}>-</span>}
                    </span>
                  </td>

                  {/* 민간커미션 - 클릭 편집 */}
                  <td>
                    <span
                      style={cellClickStyle}
                      onClick={() => openFieldModal(a, 'private_commission', '민간커미션')}
                      onMouseEnter={e => (e.currentTarget.style.background = '#f2f4f6')}
                      onMouseLeave={e => (e.currentTarget.style.background = '')}
                    >
                      {a.private_commission || <span style={{ color: '#b0b8c1' }}>-</span>}
                    </span>
                  </td>

                  {/* 담당자 - 클릭 편집 */}
                  <td>
                    <span
                      style={cellClickStyle}
                      onClick={() => openFieldModal(a, 'manager', '담당자')}
                      onMouseEnter={e => (e.currentTarget.style.background = '#f2f4f6')}
                      onMouseLeave={e => (e.currentTarget.style.background = '')}
                    >
                      {a.manager || <span style={{ color: '#b0b8c1' }}>미배정</span>}
                    </span>
                  </td>

                  {/* 메모 - 클릭 편집 */}
                  <td>
                    <span
                      className={styles.memoCell}
                      style={{ maxWidth: 140, cursor: 'pointer' }}
                      title={a.memo || ''}
                      onClick={() => openFieldModal(a, 'memo', '메모', true)}
                    >
                      {a.memo || <span style={{ color: '#b0b8c1' }}>-</span>}
                    </span>
                  </td>

                  <td>
                    <select
                      value={a.status}
                      onChange={e => handleStatusChange(a.id, e.target.value as AgencyStatus)}
                      className={`${styles.statusSelect} ${styles[STATUS_CLASS[a.status]]}`}
                    >
                      {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </td>
                  <td style={{ fontSize: 12, color: '#8b95a1' }}>{formatDate(a.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* 셀 클릭 편집 모달 */}
      {fieldModal && (
        <div className={styles.modalOverlay} onClick={e => { if (e.target === e.currentTarget) setFieldModal(null); }}>
          <div className={styles.modalContent} style={{ maxWidth: 400 }}>
            <h2 className={styles.modalTitle}>{fieldModal.label} 수정</h2>

            {/* 담당자는 chip 선택 추가 */}
            {fieldModal.field === 'manager' && uniqueManagers.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                <div className={styles.sourceChips}>
                  {uniqueManagers.map(m => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setFieldModal(prev => prev ? { ...prev, value: prev.value === m ? '' : m } : prev)}
                      className={`${styles.sourceChip} ${fieldModal.value === m ? styles.sourceChipSelected : ''}`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className={styles.formGroup}>
              {fieldModal.multiline ? (
                <textarea
                  value={fieldModal.value}
                  onChange={e => setFieldModal(prev => prev ? { ...prev, value: e.target.value } : prev)}
                  placeholder={`${fieldModal.label} 입력`}
                  rows={4}
                  className={styles.memoTextarea}
                  autoFocus
                  onKeyDown={e => { if (e.key === 'Escape') setFieldModal(null); }}
                />
              ) : (
                <input
                  value={fieldModal.value}
                  onChange={e => setFieldModal(prev => prev ? { ...prev, value: e.target.value } : prev)}
                  placeholder={`${fieldModal.label} 입력`}
                  autoFocus
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleFieldSave();
                    if (e.key === 'Escape') setFieldModal(null);
                  }}
                />
              )}
            </div>

            <div className={styles.modalActions}>
              <button onClick={handleFieldSave} disabled={fieldSaving} className={styles.submitButton}>
                {fieldSaving ? '저장 중...' : '저장'}
              </button>
              <button onClick={() => setFieldModal(null)} className={styles.cancelButton}>취소</button>
            </div>
          </div>
        </div>
      )}

      {/* 추가/수정 모달 */}
      {showModal && (
        <div className={styles.modalOverlay} onClick={e => { if (e.target === e.currentTarget) setShowModal(false); }}>
          <div className={styles.modalContent}>
            <h2 className={styles.modalTitle}>
              {editTarget ? '기관 수정' : '기관 추가'}
            </h2>
            <div className={styles.modalForm}>
              {[
                { label: '분류', key: 'category', placeholder: '예) 복지관, 학교, 센터' },
                { label: '지역', key: 'region', placeholder: '예) 서울 강남구' },
                { label: '기관이름 *', key: 'institution_name', placeholder: '기관이름 입력' },
                { label: '연락처', key: 'contact', placeholder: '예) 02-1234-5678' },
                { label: '학점커미션', key: 'credit_commission', placeholder: '예) 10%, 5만원' },
                { label: '민간커미션', key: 'private_commission', placeholder: '예) 15%, 3만원' },
              ].map(({ label, key, placeholder }) => (
                <div key={key} className={styles.formGroup}>
                  <label>{label}</label>
                  <input
                    value={form[key as keyof typeof form]}
                    onChange={e => {
                      const value = key === 'contact' ? formatPhoneNumber(e.target.value) : e.target.value;
                      setForm(prev => ({ ...prev, [key]: value }));
                    }}
                    placeholder={placeholder}
                  />
                </div>
              ))}

              <div className={styles.formGroup}>
                <label>담당자</label>
                {uniqueManagers.length > 0 ? (
                  <>
                    <div className={styles.sourceChips}>
                      {uniqueManagers.map(m => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => setForm(prev => ({ ...prev, manager: prev.manager === m ? '' : m }))}
                          className={`${styles.sourceChip} ${form.manager === m ? styles.sourceChipSelected : ''}`}
                        >
                          {m}
                        </button>
                      ))}
                    </div>
                    <input
                      value={form.manager}
                      onChange={e => setForm(prev => ({ ...prev, manager: e.target.value }))}
                      placeholder="직접 입력"
                      style={{ marginTop: 8 }}
                    />
                  </>
                ) : (
                  <input
                    value={form.manager}
                    onChange={e => setForm(prev => ({ ...prev, manager: e.target.value }))}
                    placeholder="담당자 이름"
                  />
                )}
              </div>

              <div className={styles.formGroup}>
                <label>메모</label>
                <textarea
                  value={form.memo}
                  onChange={e => setForm(prev => ({ ...prev, memo: e.target.value }))}
                  placeholder="메모 입력"
                  rows={3}
                />
              </div>

              <div className={styles.formGroup}>
                <label>상태</label>
                <div className={styles.sourceChips}>
                  {STATUS_OPTIONS.map(s => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setForm(prev => ({ ...prev, status: s }))}
                      className={`${styles.sourceChip} ${form.status === s ? styles.sourceChipSelected : ''}`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className={styles.modalActions}>
              <button onClick={handleSave} disabled={saving} className={styles.submitButton}>
                {saving ? '저장 중...' : '저장'}
              </button>
              <button onClick={() => setShowModal(false)} className={styles.cancelButton}>취소</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
