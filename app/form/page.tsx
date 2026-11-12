"use client";

import Image from "next/image";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { readClickKeyFromSearch } from "@/lib/click-key";
import { motion, AnimatePresence } from "framer-motion";
import styles from "../stepflow.module.css";
import formStyles from "./form.module.css";

const formatClickSource = (
  utmSource: string,
  materialId: string | null,
  blogId: string | null = null,
  cafeId: string | null = null,
): string => {
  const sourceMap: { [key: string]: string } = {
    daangn: "당근",
    tiktok: "틱톡",
    insta: "인스타",
    facebook: "페이스북",
    google: "구글",
    youtube: "유튜브",
    kakao: "카카오",
    naver: "네이버",
    naverblog: "네이버블로그",
    toss: "토스",
    mamcafe: "맘카페",
    cashslide: "캐시슬라이드",
    cashwalk: "캐시워크",
    naverreward: "네이버리워드",
  };

  const cafeNameMap: { [key: string]: string } = {
    mygodsend: "화성남양애",
    yul2moms: "율하맘",
    chbabymom: "춘천맘",
    seosanmom: "서산맘",
    redog2oi: "부천소사구",
    cjsam: "순광맘",
    chobomamy: "러브양산맘",
    jinhaemam: "창원진해댁",
    momspanggju: "광주맘스팡",
    cjasm: "충주아사모",
    ksn82599: "둔산맘",
    magic26: "안평맘스비",
    anjungmom: "평택안포맘",
    tlgmdaka0: "시맘수",
    babylovecafe: "베이비러브",
    naese: "중리사랑방",
  };

  // 한직훈 LMS 홈 "국가자격증은 여기서!" 카드/버튼 유입 — 오피스 문의 DB 에서
  // 대분류 "한직훈" / 중분류 "국가자격증" 으로 보이게 고정 문자열을 씁니다.
  if (utmSource === "hanjikhun") return "한직훈_국가자격증";

  // 바로취업 배너 유입 — 오피스 문의 DB 대분류 "바로취업" / 중분류 "배너" (2026-10-07)
  if (utmSource === "barojob") return "바로취업_배너";

  const shortSource = sourceMap[utmSource] || utmSource;

  if (blogId) return `${shortSource}_${blogId}`;
  if (cafeId) {
    const cafeName = cafeNameMap[cafeId] || cafeId;
    return `${shortSource}_${cafeName}`;
  }
  if (materialId) return `${shortSource}_소재_${materialId}`;
  return shortSource;
};

function ClickSourceHandler({
  onSourceChange,
}: {
  onSourceChange: (source: string) => void;
}) {
  const searchParams = useSearchParams();

  useEffect(() => {
    const utmSource = searchParams.get("utm_source");
    const materialId = searchParams.get("material_id");
    const blogId = searchParams.get("blog_id");
    const cafeId = searchParams.get("cafe_id");

    // 오피스 「업셀링 캠페인」 문자 링크 — ?utm_source=upsell&campaign_id=UP-012 → 문의 DB 대분류 「업셀링」 / 중분류 캠페인 코드 (2026-11-12)
    const upsellCode = searchParams.get("campaign_id");
    if (utmSource === "upsell") {
      const t = { "1": "1팀", "2": "2팀", e: "교육지원팀" }[searchParams.get("t") ?? ""]; // 팀별 상담 링크(&t=1 · 2 · e) → 중분류 앞에 팀
      onSourceChange(upsellCode && /^UP-\d{3,}$/.test(upsellCode) ? `업셀링_${upsellCode}${t ? `_${t}` : ""}` : "업셀링");
      return;
    }
    if (utmSource) {
      const formatted = formatClickSource(utmSource, materialId, blogId, cafeId);
      onSourceChange(formatted);
    } else {
      const referrer = document.referrer;
      if (referrer.includes("cafe.naver.com/redog2oi") || referrer.includes("/cafes/redog2oi") || referrer.includes("cafes/28111532")) {
        onSourceChange("맘카페_부천소사구");
      } else if (referrer.includes("cafe.naver.com/babylovecafe") || referrer.includes("/cafes/babylovecafe") || referrer.includes("cafes/12688726")) {
        onSourceChange("맘카페_베이비러브");
      } else if (referrer.includes("cafe.naver.com/magic26") || referrer.includes("/cafes/magic26") || referrer.includes("cafes/20091703")) {
        onSourceChange("맘카페_안평맘스비");
      } else if (referrer.includes("cafe.naver.com/chobomamy") || referrer.includes("/cafes/chobomamy") || referrer.includes("cafes/20655292")) {
        onSourceChange("맘카페_러브양산맘");
      } else if (referrer.includes("cafe.naver.com/jinhaemam") || referrer.includes("/cafes/jinhaemam") || referrer.includes("cafes/14952369")) {
        onSourceChange("맘카페_창원진해댁");
      } else if (referrer.includes("cafe.naver.com/momspanggju") || referrer.includes("/cafes/momspanggju") || referrer.includes("cafes/26025763")) {
        onSourceChange("맘카페_광주맘스팡");
      } else if (referrer.includes("cafe.naver.com/cjasm") || referrer.includes("/cafes/cjasm") || referrer.includes("cafes/15857728")) {
        onSourceChange("맘카페_충주아사모");
      } else if (referrer.includes("cafe.naver.com/yul2moms") || referrer.includes("/cafes/yul2moms") || referrer.includes("cafes/30142013")) {
        onSourceChange("맘카페_율하맘");
      } else if (referrer.includes("cafe.naver.com/chbabymom") || referrer.includes("/cafes/chbabymom") || referrer.includes("cafes/20364180")) {
        onSourceChange("맘카페_춘천맘");
      } else if (referrer.includes("cafe.naver.com/ksn82599") || referrer.includes("/cafes/ksn82599") || referrer.includes("cafes/29019575")) {
        onSourceChange("맘카페_둔산맘");
      } else if (referrer.includes("cafe.naver.com/anjungmom") || referrer.includes("/cafes/anjungmom") || referrer.includes("cafes/13186768")) {
        onSourceChange("맘카페_평택안포맘");
      } else if (referrer.includes("cafe.naver.com/tlgmdaka0") || referrer.includes("/cafes/tlgmdaka0") || referrer.includes("cafes/24302163")) {
        onSourceChange("맘카페_시맘수");
      } else if (referrer.includes("cafe.naver.com/naese") || referrer.includes("/cafes/naese") || referrer.includes("cafes/11790061")) {
        onSourceChange("맘카페_중리사랑방");
      } else if (referrer.includes("cafe.naver.com/mygodsend") || referrer.includes("/cafes/mygodsend") || referrer.includes("cafes/16565537")) {
        onSourceChange("맘카페_화성남양애");
      } else if (referrer.includes("cafe.naver.com/cjsam") || referrer.includes("/cafes/cjsam") || referrer.includes("cafes/20479493")) {
        onSourceChange("맘카페_순광맘");
      } else if (referrer.includes("cafe.naver.com/seosanmom") || referrer.includes("/cafes/seosanmom") || referrer.includes("cafes/10328492")) {
        onSourceChange("맘카페_서산맘");
      } else if (referrer.includes("cafe.naver.com")) {
        onSourceChange("네이버카페_referrer");
      }
    }
  }, [searchParams, onSourceChange]);

  return null;
}

function FormContent({ clickSource }: { clickSource: string }) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: "",
    contact: "",
    education: "",
    hope_course: "",
    reason: "",
  });
  const [loading, setLoading] = useState(false);
  const [contactError, setContactError] = useState("");
  const [privacyAgreed, setPrivacyAgreed] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [fastConsult, setFastConsult] = useState(false);
  const [preferredTimes, setPreferredTimes] = useState<string[]>([]);
  const [consultTimeMemo, setConsultTimeMemo] = useState("");

  const formatContact = (value: string) => {
    const cleaned = value.replace(/[^0-9]/g, "");
    if (cleaned.length <= 3) return cleaned;
    if (cleaned.length <= 7) return `${cleaned.slice(0, 3)}-${cleaned.slice(3)}`;
    return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 7)}-${cleaned.slice(7, 11)}`;
  };

  const validateContact = (contact: string) => {
    const cleaned = contact.replace(/[-\s]/g, "");
    if (cleaned.length === 0) { setContactError(""); return true; }
    if (!cleaned.startsWith("010") && !cleaned.startsWith("011")) {
      setContactError("010 또는 011로 시작하는 번호를 입력해주세요");
      return false;
    }
    setContactError("");
    return true;
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const getCookie = (n: string) =>
        document.cookie.split("; ").find((r) => r.startsWith(n + "="))?.split("=")[1];
      const eventId =
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `lead_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      const response = await fetch("/api/consultations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          contact: formData.contact,
          education: formData.education,
          hope_course: formData.hope_course,
          reason: formData.reason,
          fast_consultation: fastConsult,
          preferred_times: preferredTimes,
          consult_time_memo: consultTimeMemo || null,
          // 오피스 문의 DB 가 앞 토막을 대분류로 쓰므로 접두어 없이 그대로 보낸다 (기존 메인 폼과 동일)
          click_source: clickSource,
          event_id: eventId,
          fbp: getCookie("_fbp") || null,
          fbc: getCookie("_fbc") || null,
          event_source_url: window.location.href,
          // 엔비티 리워드 광고 유입 시 매체가 붙여준 click_key (포스트백용). 없으면 null → 미발송
          // URLSearchParams 는 '+' 를 공백으로 바꾸므로 원본 쿼리에서 직접 읽는다.
          click_key: readClickKeyFromSearch(window.location.search),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "저장에 실패했습니다.");
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).dataLayer = (window as any).dataLayer || [];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).dataLayer.push({ event: "form_submit_success", event_id: eventId });
      setStep(2);
    } catch (error) {
      alert(error instanceof Error ? error.message : "저장에 실패했습니다. 다시 시도해주세요.");
    } finally {
      setLoading(false);
    }
  };

  const isFormValid =
    formData.name.length > 0 &&
    formData.contact.replace(/[-\s]/g, "").length >= 10 &&
    !contactError &&
    formData.education.length > 0 &&
    formData.hope_course.length > 0 &&
    formData.reason.length > 0 &&
    privacyAgreed;

  return (
    <div className={formStyles.page}>
      <div className={formStyles.shell}>
        <header className={formStyles.header}>
          <Image src="/hanpyeong-education-logo.png" alt="한평생원격교육원" width={690} height={153} className={formStyles.logo} priority />
        </header>
        <main className={formStyles.content}>
      <AnimatePresence mode="wait">
        {/* STEP 1: 폼 */}
        {step === 1 && (
          <motion.div
            key="form"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className={formStyles.form}
          >
            <h1 className={formStyles.title}>무료 학습 상담 신청</h1>

            <div className={formStyles.field}>
              <label htmlFor="form-name" className={formStyles.label}>
                이름 <span className={formStyles.required}>*</span>
              </label>
              <input
                id="form-name"
                type="text"
                placeholder="이름을 입력해주세요"
                className={formStyles.lineInput}
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                autoFocus
              />
            </div>

            <div className={formStyles.field}>
              <label htmlFor="form-contact" className={formStyles.label}>
                연락처 <span className={formStyles.required}>*</span>
              </label>
              <input
                id="form-contact"
                type="tel"
                placeholder="010-0000-0000"
                className={formStyles.lineInput}
                value={formData.contact}
                onChange={(e) => {
                  const formatted = formatContact(e.target.value);
                  setFormData({ ...formData, contact: formatted });
                  validateContact(formatted);
                }}
              />
              {contactError && <p className={styles.errorMessage}>{contactError}</p>}
            </div>

            <div className={formStyles.field}>
              <p id="form-education-label" className={formStyles.label}>
                최종학력 <span className={formStyles.required}>*</span>
              </p>
              <p className={formStyles.hint}>최종학력마다 과정이 달라져요!</p>
              <div className={`${formStyles.choiceGrid} ${formStyles.educationChoices}`} role="radiogroup" aria-labelledby="form-education-label">
                {["고졸", "전문대졸", "대학교 중퇴", "4년제 대졸", "대학원생 이상"].map((option) => (
                  <label key={option} className={`${formStyles.choiceBox} ${formData.education === option ? formStyles.choiceSelected : ""}`}>
                    <input type="radio" name="education" value={option} checked={formData.education === option} onChange={() => setFormData({ ...formData, education: option })} className={formStyles.choiceInput} />
                    <span>{option}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className={formStyles.field}>
              <p id="form-course-label" className={formStyles.label}>
                희망과정 <span className={formStyles.required}>*</span>
              </p>
              <div className={`${formStyles.choiceGrid} ${formStyles.courseChoices}`} role="radiogroup" aria-labelledby="form-course-label">
                {["사회복지사", "아동학사", "기타"].map((option) => (
                  <label key={option} className={`${formStyles.choiceBox} ${formData.hope_course === option ? formStyles.choiceSelected : ""}`}>
                    <input type="radio" name="hope_course" value={option} checked={formData.hope_course === option} onChange={() => setFormData({ ...formData, hope_course: option })} className={formStyles.choiceInput} />
                    <span>{option}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className={formStyles.field}>
              <p id="form-reason-label" className={formStyles.label}>
                취득사유가 어떻게 되시나요? <span className={formStyles.required}>*</span>
              </p>
              <p className={formStyles.hint}>복수선택 가능</p>
              <div className={`${formStyles.choiceGrid} ${formStyles.reasonChoices}`} role="group" aria-labelledby="form-reason-label">
                {["즉시취업", "이직", "미래준비", "취미"].map((opt) => {
                  const selected = formData.reason
                    ? formData.reason.split(", ").filter(Boolean).includes(opt)
                    : false;
                  return (
                    <label key={opt} className={`${formStyles.choiceBox} ${selected ? formStyles.choiceSelected : ""}`}>
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => {
                          const current = formData.reason ? formData.reason.split(", ").filter(Boolean) : [];
                          const updated = selected ? current.filter((r) => r !== opt) : [...current, opt];
                          setFormData({ ...formData, reason: updated.join(", ") });
                        }}
                        className={formStyles.choiceInput}
                      />
                      <span>{opt}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className={formStyles.fastSection}>
              <label className={formStyles.checkRow}>
                <span><strong>빠른 상담을 원합니다.</strong></span>
                <input type="checkbox" checked={fastConsult} onChange={(e) => setFastConsult(e.target.checked)} />
              </label>
              <p className={formStyles.helpText}>영업시간 9:00~18:00 사이 연락 드립니다.</p>
            </div>

            <div className={formStyles.timeSection}>
              <p className={formStyles.label}>상담이 편하신 시간대를 알려주세요.</p>
              <p className={formStyles.timeLabel}>상담 선호 시간</p>
              <p className={formStyles.hint}>복수선택 가능</p>
              <div className={formStyles.timeOptions}>
                {["9:00~12:30", "13:30~15:00", "15:00~18:00"].map((time) => {
                  const selected = preferredTimes.includes(time);
                  return <button type="button" key={time} aria-pressed={selected} className={`${formStyles.timeOption} ${selected ? formStyles.timeSelected : ""}`} onClick={() => setPreferredTimes((previous) => selected ? previous.filter((value) => value !== time) : [...previous, time])}>{time}</button>;
                })}
              </div>
            </div>

            <div className={formStyles.memoSection}>
              <label htmlFor="form-time-memo" className={formStyles.memoLabel}>상담 시간 관련 메모</label>
              <p className={formStyles.helpText}>편하신 요일, 시간 관련 메모를 남겨주시면 최대한 맞춰서 연락드려요.</p>
              <div className={formStyles.memoInputWrap}>
                <input id="form-time-memo" type="text" maxLength={25} className={formStyles.memoInput} placeholder="월/수/금 오전, 화/목 오후 선호" value={consultTimeMemo} aria-describedby="form-time-memo-count" onChange={(e) => setConsultTimeMemo(e.target.value)} />
                <span id="form-time-memo-count" className={`${formStyles.memoCounter} ${consultTimeMemo.length >= 25 ? formStyles.memoCounterLimit : ""}`}>
                  {consultTimeMemo.length}/25
                </span>
              </div>
            </div>

            <div className={formStyles.consentSection}>
              <label className={formStyles.privacyRow}>
                <span><button type="button" onClick={(e) => { e.preventDefault(); setShowPrivacyModal(true); }} className={formStyles.privacyLink}>개인정보처리방침</button> 동의 <span className={formStyles.optional}>(필수)</span></span>
                <input type="checkbox" checked={privacyAgreed} onChange={(e) => setPrivacyAgreed(e.target.checked)} />
              </label>

              <button
                className={formStyles.submit}
                type="button"
                disabled={!isFormValid || loading}
                onClick={handleSubmit}
              >
                {loading ? "처리 중..." : "제출하기"}
              </button>
            </div>
          </motion.div>
        )}

        {/* STEP 2: 완료 */}
        {step === 2 && (
          <motion.div
            key="done"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className={styles.stepWrapper}
            style={{ textAlign: "center", justifyContent: "center" }}
          >
            <Image
              src="/complete-check.png"
              alt="Done"
              width={300}
              height={300}
              priority
              style={{ margin: "0 auto 24px" }}
            />
            <h1 className={styles.title}>
              신청이 완료되었습니다.{"\n"}곧 연락드리겠습니다.
            </h1>
          </motion.div>
        )}
      </AnimatePresence>
        </main>
        <footer className={formStyles.footer}>
          <Image src="/hanpyeong-education-footer-logo.png" alt="한평생원격교육원" width={790} height={171} className={formStyles.footerLogo} />
          <p>대표 양병웅 | 사업자등록번호 227-88-03196</p>
          <nav><a href="/terms">이용약관</a><span>|</span><a href="/privacy">개인정보처리방침</a></nav>
          <p className={formStyles.copyright}>2026 © KorhrdGroupCo., Ltd. All rights reserved.</p>
        </footer>
      </div>

      {/* 개인정보처리방침 모달 */}
      {showPrivacyModal && (
        <div className={styles.modalOverlay} onClick={() => setShowPrivacyModal(false)}>
          <div className={styles.modalPrivacy} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalPrivacyHeader}>
              <h3 className={styles.modalPrivacyTitle}>개인정보처리방침</h3>
              <button className={styles.modalCloseButton} onClick={() => setShowPrivacyModal(false)} aria-label="닫기">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
            <div className={styles.modalPrivacyContent}>
              <div className={styles.modalPrivacyScroll}>
                <p className={styles.modalPrivacyItem}>
                  <strong>1. 개인정보 수집 및 이용 목적</strong><br />
                  사회복지사 자격 취득 상담 진행, 문의사항 응대<br />
                  개인정보는 상담 서비스 제공을 위한 목적으로만 수집 및 이용되며, 동의 없이 제3자에게 제공되지 않습니다
                </p>
                <p className={styles.modalPrivacyItem}>
                  <strong>2. 수집 및 이용하는 개인정보 항목</strong><br />
                  필수 - 이름, 연락처(휴대전화번호), 최종학력, 희망과정, 취득사유<br />
                  선택 - 빠른 상담 여부, 상담 선호 시간, 상담 시간 메모
                </p>
                <p className={styles.modalPrivacyItem}>
                  <strong>3. 보유 및 이용 기간</strong><br />
                  법령이 정하는 경우를 제외하고는 수집일로부터 1년 또는 동의 철회 시까지 보유 및 이용합니다.
                </p>
                <p className={styles.modalPrivacyItem}>
                  <strong>4. 동의 거부 권리</strong><br />
                  신청자는 동의를 거부할 권리가 있습니다. 단, 동의를 거부하는 경우 상담 서비스 이용이 제한됩니다.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default function FormPage() {
  const [clickSource, setClickSource] = useState<string>("");

  return (
    <Suspense fallback={null}>
      <ClickSourceHandler onSourceChange={setClickSource} />
      <FormContent clickSource={clickSource} />
    </Suspense>
  );
}
