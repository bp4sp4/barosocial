'use client';

import Image from 'next/image';
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './stepflow.module.css';

const formatClickSource = (
  utmSource: string,
  materialId: string | null
): string => {
  const sourceMap: { [key: string]: string } = {
    daangn: "당근",
    insta: "인스타",
    facebook: "페이스북",
    google: "구글",
    youtube: "유튜브",
    kakao: "카카오",
    naver: "네이버",
  };

  const shortSource = sourceMap[utmSource] || utmSource;
  const homepageName = "바로폼";

  if (materialId) {
    return `${homepageName}_${shortSource}_소재_${materialId}`;
  }
  return `${homepageName}_${shortSource}`;
};

// URL 파라미터를 읽는 컴포넌트
function ClickSourceHandler({ onSourceChange }: { onSourceChange: (source: string) => void }) {
  const searchParams = useSearchParams();

  useEffect(() => {
    const utmSource = searchParams.get('utm_source');
    const materialId = searchParams.get('material_id');

    if (utmSource) {
      const formatted = formatClickSource(utmSource, materialId);
      onSourceChange(formatted);
    }
  }, [searchParams, onSourceChange]);

  return null;
}

function StepFlowContent({ clickSource }: { clickSource: string }) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: '', // 이름
    contact: '', // 연락처
    education: '', // 최종학력
    reason: '', // 취득사유
  });
  const [loading, setLoading] = useState(false);
  const [contactError, setContactError] = useState('');
  const [privacyAgreed, setPrivacyAgreed] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);

  // 연락처 포맷팅 (010-XXXX-XXXX)
  const formatContact = (value: string) => {
    const cleaned = value.replace(/[^0-9]/g, '');
    if (cleaned.length <= 3) {
      return cleaned;
    } else if (cleaned.length <= 7) {
      return `${cleaned.slice(0, 3)}-${cleaned.slice(3)}`;
    } else {
      return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 7)}-${cleaned.slice(7, 11)}`;
    }
  };

  // 연락처 검증
  const validateContact = (contact: string) => {
    const cleaned = contact.replace(/[-\s]/g, '');
    if (cleaned.length === 0) {
      setContactError('');
      return true;
    }
    if (!cleaned.startsWith('010') && !cleaned.startsWith('011')) {
      setContactError('010 또는 011로 시작하는 번호를 입력해주세요');
      return false;
    }
    setContactError('');
    return true;
  };

  // 데이터 저장 로직
  const handleSubmit = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/consultations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          contact: formData.contact,
          education: formData.education,
          reason: formData.reason,
          click_source: clickSource,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '저장에 실패했습니다.');
      }

      setStep(2);
    } catch (error) {
      console.error('Error submitting form:', error);
      alert(error instanceof Error ? error.message : '저장에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setLoading(false);
    }
  };

  const isFormValid = formData.name.length > 0 && formData.contact.replace(/[-\s]/g, '').length >= 10 && !contactError && formData.education.length > 0 && formData.reason.length > 0 && privacyAgreed;

  // 프로그레스 계산
  const totalFields = 4;
  const filledFields = [
    formData.name.length > 0,
    formData.contact.replace(/[-\s]/g, '').length >= 10 && !contactError,
    formData.education.length > 0,
    formData.reason.length > 0,
  ].filter(Boolean).length;
  const progress = (filledFields / totalFields) * 100;

  return (
    <div className={styles.container}>
      {/* 헤더 - 전체 단계에 표시 */}
      <header className={styles.header}>
        {false && (
          <button
            className={styles.backButton}
            onClick={() => setStep(step - 1)}
            aria-label="뒤로가기"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M12.727 3.687C12.8172 3.59153 12.8878 3.47923 12.9346 3.3565C12.9814 3.23377 13.0036 3.10302 12.9999 2.97172C12.9961 2.84042 12.9666 2.71113 12.9129 2.59125C12.8592 2.47136 12.7825 2.36322 12.687 2.273C12.5915 2.18279 12.4792 2.11226 12.3565 2.06544C12.2338 2.01863 12.103 1.99644 11.9717 2.00016C11.8404 2.00387 11.7111 2.03341 11.5912 2.08709C11.4714 2.14077 11.3632 2.21753 11.273 2.313L2.77301 11.313C2.59747 11.4987 2.49966 11.7445 2.49966 12C2.49966 12.2555 2.59747 12.5013 2.77301 12.687L11.273 21.688C11.3626 21.7856 11.4707 21.8643 11.5911 21.9198C11.7114 21.9752 11.8415 22.0062 11.9739 22.0109C12.1063 22.0156 12.2383 21.9939 12.3623 21.9472C12.4863 21.9004 12.5997 21.8295 12.696 21.7386C12.7923 21.6476 12.8696 21.5384 12.9234 21.4173C12.9771 21.2963 13.0063 21.1657 13.0092 21.0333C13.0121 20.9008 12.9886 20.7691 12.9402 20.6458C12.8917 20.5225 12.8193 20.4101 12.727 20.315L4.87501 12L12.727 3.687Z" fill="black"/>
            </svg>
          </button>
        )}
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <Image
            src="/logo.png"
            alt="정책자금"
            width={130}
            height={34}
            className={styles.logo}
          />
        </div>
      </header>
      <AnimatePresence mode="wait">
        {/* STEP 1: 정보 입력 */}
        {step === 1 && (
          <motion.div
            key="step1"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className={styles.stepWrapper}
          >
            {/* 프로그레스 바 */}
            <div style={{ width: '100%', marginBottom: '20px' }}>
              <div style={{
                height: '4px',
                backgroundColor: '#E5E7EB',
                borderRadius: '2px',
                overflow: 'hidden'
              }}>
                <div style={{
                  height: '100%',
                  width: `${progress}%`,
                  backgroundColor: '#4C85FF',
                  transition: 'width 0.3s ease'
                }} />
              </div>
              <p style={{
                marginTop: '8px',
                fontSize: '14px',
                color: '#6B7280',
                textAlign: 'right'
              }}>
                {filledFields} / {totalFields}
              </p>
            </div>

            <div style={{ textAlign: 'left', marginBottom: '24px' }}>
              <h1 style={{
                fontSize: '28px',
                fontWeight: '700',
                color: '#111827',
                marginBottom: '8px',
                lineHeight: '1.3'
              }}>사회복지사</h1>
              <p style={{
                fontSize: '28px',
                fontWeight: '700',
                color: '#111827',
              }}>무료 상담신청</p>
            </div>

            <div className={styles.inputGroup}>
              <label className={styles.inputLabel}>이름을 입력해주세요</label>
              <input
                type="text"
                placeholder="이름을 입력해주세요"
                className={styles.inputField}
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                autoFocus
              />
            </div>

            {formData.name.length > 0 && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={styles.inputGroup}>
                <label className={styles.inputLabel}>연락처를 입력해주세요</label>
                <input
                  type="tel"
                  placeholder="010-0000-0000"
                  className={styles.inputField}
                  value={formData.contact}
                  onChange={(e) => {
                    const value = e.target.value;
                    const formatted = formatContact(value);
                    setFormData({ ...formData, contact: formatted });
                    validateContact(formatted);
                  }}
                />
                {contactError && (
                  <p className={styles.errorMessage}>{contactError}</p>
                )}
              </motion.div>
            )}

            {formData.contact.replace(/[-\s]/g, '').length >= 10 && !contactError && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={styles.inputGroup}>
                <label className={styles.inputLabel}>
                  최종학력을 선택해 주세요 <span style={{ fontSize: '16px', color: '#6B7280', fontWeight: '400' }}>최종학력마다 과정이 달라져요!</span>
                </label>
                <select
                  className={styles.inputField}
                  value={formData.education}
                  onChange={(e) => setFormData({ ...formData, education: e.target.value })}
                  style={{ cursor: 'pointer' }}
                >
                  <option value="">선택해주세요</option>
                  <option value="고졸">고졸</option>
                  <option value="전문대졸">전문대졸</option>
                  <option value="대졸">대졸</option>
                  <option value="대학원 이상">대학원 이상</option>
                </select>
              </motion.div>
            )}

            {formData.education.length > 0 && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={styles.inputGroup}>
                <label className={styles.inputLabel}>취득사유가 어떻게 되시나요?</label>
                <input
                  type="text"
                  placeholder="자세히 입력해주셔야 상담 시 도움이 됩니다"
                  className={styles.inputField}
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                />
              </motion.div>
            )}

            {formData.reason.length > 0 && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }} 
                animate={{ opacity: 1, y: 0 }} 
                className={styles.inputGroup}
              >
                <label className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={privacyAgreed}
                    onChange={(e) => setPrivacyAgreed(e.target.checked)}
                    className={styles.checkbox}
                  />
                  <span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        setShowPrivacyModal(true);
                      }}
                      className={styles.privacyLink}
                    >
                      개인정보처리방침
                    </button>
                    {' '}동의
                  </span>
                </label>
              </motion.div>
            )}

            <button
              className={styles.bottomButton}
              disabled={!isFormValid || loading}
              onClick={handleSubmit}
            >
              {loading ? '처리 중...' : '제출하기'}
            </button>
          </motion.div>
        )}

        {/* STEP 2: 완료 화면 */}
        {step === 2 && (
          <motion.div
            key="step2"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className={styles.stepWrapper}
            style={{ textAlign: 'center', justifyContent: 'center' }}
          >
            <Image
              src="/complete-check.png"
              alt="Done"
              width={300}
              height={300}
              priority
              style={{ margin: '0 auto 24px' }}
            />
            <h1 className={styles.title}>신청이 완료되었습니다.{"\n"}곧 연락드리겠습니다.</h1>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 개인정보처리방침 모달 */}
      {showPrivacyModal && (
        <div className={styles.modalOverlay} onClick={() => setShowPrivacyModal(false)}>
          <div className={styles.modalPrivacy} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalPrivacyHeader}>
              <h3 className={styles.modalPrivacyTitle}>개인정보처리방침</h3>
              <button
                className={styles.modalCloseButton}
                onClick={() => setShowPrivacyModal(false)}
                aria-label="닫기"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>
            <div className={styles.modalPrivacyContent}>
              <div className={styles.modalPrivacyScroll}>
                <p className={styles.modalPrivacyItem}>
                  <strong>1. 개인정보 수집 및 이용 목적</strong>
                  <br />
                  사회복지사 자격 취득 상담 진행, 문의사항 응대
                  <br />
                  개인정보는 상담 서비스 제공을 위한 목적으로만
                  수집 및 이용되며, 동의 없이 제3자에게 제공되지 않습니다
                </p>
                <p className={styles.modalPrivacyItem}>
                  <strong>2. 수집 및 이용하는 개인정보 항목</strong>
                  <br />
                  필수 - 이름, 연락처(휴대전화번호), 최종학력, 취득사유
            
                </p>
                <p className={styles.modalPrivacyItem}>
                  <strong>3. 보유 및 이용 기간</strong>
                  <br />
                  법령이 정하는 경우를 제외하고는 수집일로부터 1년 또는 동의
                  철회 시까지 보유 및 이용합니다.
                </p>
                <p className={styles.modalPrivacyItem}>
                  <strong>4. 동의 거부 권리</strong>
                  <br />
                  신청자는 동의를 거부할 권리가 있습니다. 단, 동의를 거부하는
                  경우 상담 서비스 이용이 제한됩니다.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function StepFlowPage() {
  const [clickSource, setClickSource] = useState<string>('바로폼');

  return (
    <Suspense fallback={
      <div className={styles.container}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
            <p className="mt-4 text-gray-600">로딩 중...</p>
          </div>
        </div>
      </div>
    }>
      <ClickSourceHandler onSourceChange={setClickSource} />
      <StepFlowContent clickSource={clickSource} />
    </Suspense>
  );
}