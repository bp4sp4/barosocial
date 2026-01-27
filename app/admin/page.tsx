'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import styles from './admin.module.css';

interface Consultation {
  id: number;
  name: string;
  contact: string;
  education: string;
  reason: string;
  click_source: string | null;
  created_at: string;
}

export default function AdminPage() {
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const router = useRouter();

  // 인증 상태 확인
  useEffect(() => {
    checkAuth();
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

      setConsultations(data || []);
    } catch (error: any) {
      setError(error.message || '데이터를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
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

  // 관리자 대시보드
  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>상담 신청 관리</h1>
        <div className={styles.headerActions}>
          <button onClick={fetchConsultations} className={styles.refreshButton}>
            새로고침
          </button>
          <button onClick={handleLogout} className={styles.logoutButton}>
            로그아웃
          </button>
        </div>
      </header>

      <div className={styles.stats}>
        <div className={styles.statCard}>
          <div className={styles.statValue}>{consultations.length}</div>
          <div className={styles.statLabel}>총 신청 건수</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statValue}>
            {consultations.filter(c => {
              const today = new Date();
              const created = new Date(c.created_at);
              return created.toDateString() === today.toDateString();
            }).length}
          </div>
          <div className={styles.statLabel}>오늘 신청</div>
        </div>
      </div>

      {loading ? (
        <div className={styles.loading}>로딩 중...</div>
      ) : error ? (
        <div className={styles.errorMessage}>{error}</div>
      ) : (
        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>번호</th>
                <th>이름</th>
                <th>연락처</th>
                <th>최종학력</th>
                <th>취득사유</th>
                <th>유입 경로</th>
                <th>신청일시</th>
              </tr>
            </thead>
            <tbody>
              {consultations.length === 0 ? (
                <tr>
                  <td colSpan={7} className={styles.empty}>
                    신청 내역이 없습니다.
                  </td>
                </tr>
              ) : (
                consultations.map((consultation, index) => (
                  <tr key={consultation.id}>
                    <td>{consultations.length - index}</td>
                    <td>{consultation.name}</td>
                    <td>{consultation.contact}</td>
                    <td>{consultation.education}</td>
                    <td className={styles.reasonCell}>{consultation.reason}</td>
                    <td>{consultation.click_source || '-'}</td>
                    <td>{formatDate(consultation.created_at)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
