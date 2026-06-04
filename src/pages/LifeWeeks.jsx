import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { db, isMock } from '../firebase/config';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { ChevronLeft, Hourglass, Calendar, User, Activity } from 'lucide-react';

const LifeWeeks = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [lifeData, setLifeData] = useState(null);
  const [hoveredWeek, setHoveredWeek] = useState(null);
  
  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [birthDateInput, setBirthDateInput] = useState('');
  const [expectedLifespanInput, setExpectedLifespanInput] = useState(69);

  useEffect(() => {
    if (!currentUser) return;

    const fetchLifeData = async () => {
      setLoading(true);
      if (isMock) {
        const saved = localStorage.getItem(`days_lifeData_${currentUser.uid}`);
        if (saved) {
          setLifeData(JSON.parse(saved));
        } else {
          setShowModal(true);
        }
      } else {
        try {
          const docRef = doc(db, 'users', currentUser.uid, 'lifeData', 'info');
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            setLifeData(docSnap.data());
          } else {
            setShowModal(true);
          }
        } catch (err) {
          console.error('Error fetching lifeData:', err);
          setShowModal(true);
        }
      }
      setLoading(false);
    };

    fetchLifeData();
  }, [currentUser]);

  const handleSaveLifeData = async (e) => {
    e.preventDefault();
    if (!birthDateInput) return;

    const data = {
      birthDate: birthDateInput,
      expectedLifespan: parseInt(expectedLifespanInput, 10) || 69,
      updatedAt: new Date().toISOString()
    };

    if (isMock) {
      localStorage.setItem(`days_lifeData_${currentUser.uid}`, JSON.stringify(data));
      setLifeData(data);
    } else {
      try {
        const docRef = doc(db, 'users', currentUser.uid, 'lifeData', 'info');
        await setDoc(docRef, data);
        setLifeData(data);
      } catch (err) {
        console.error('Error saving lifeData:', err);
      }
    }
    setShowModal(false);
  };

  if (loading) {
    return (
      <div className="page-loader">
        <span className="loader" />
        <p>جاري تحميل رحلتك...</p>
      </div>
    );
  }

  // Calculate life stats
  const {
    weeksLived,
    totalWeeks,
    weeksRemaining,
    percentLived,
    ageYears,
    ageMonths,
    ageDays,
    currentWeekOfYear,
    weeksArray
  } = useMemo(() => {
    let weeksLived = 0;
    let totalWeeks = 0;
    let weeksRemaining = 0;
    let percentLived = 0;
    let ageYears = 0;
    let ageMonths = 0;
    let ageDays = 0;
    let currentWeekOfYear = 0;
    let weeksArray = [];

    if (lifeData && lifeData.birthDate) {
      const birth = new Date(lifeData.birthDate);
      const now = new Date();
      const expectedLifespan = lifeData.expectedLifespan || 69;
      
      totalWeeks = expectedLifespan * 52;

      const msPerWeek = 1000 * 60 * 60 * 24 * 7;
      weeksLived = Math.floor((now - birth) / msPerWeek);
      weeksLived = Math.max(0, weeksLived);

      weeksRemaining = totalWeeks - weeksLived;
      percentLived = totalWeeks > 0 ? ((weeksLived / totalWeeks) * 100).toFixed(1) : 0;

      // Detailed age
      let diff = new Date(now - birth);
      ageYears = diff.getUTCFullYear() - 1970;
      ageMonths = diff.getUTCMonth();
      ageDays = diff.getUTCDate() - 1;

      // Current week of the year
      const startOfYear = new Date(now.getFullYear(), 0, 1);
      currentWeekOfYear = Math.ceil((((now - startOfYear) / 86400000) + startOfYear.getDay() + 1) / 7);

      // Build grid array
      for (let i = 0; i < totalWeeks; i++) {
        let status = 'future';
        if (i < weeksLived) status = 'past';
        else if (i === weeksLived) status = 'current';

        const yearIndex = Math.floor(i / 52) + 1;
        const weekIndex = (i % 52) + 1;

        // Classify life phases
        let phase = 'adult';
        if (yearIndex <= 6) phase = 'childhood';
        else if (yearIndex <= 18) phase = 'school';
        else if (yearIndex <= 22) phase = 'university';

        let phaseLabel = '';
        if (phase === 'childhood') phaseLabel = 'الطفولة المبكرة 👶';
        else if (phase === 'school') phaseLabel = 'الدراسة والمدرسة 🎒';
        else if (phase === 'university') phaseLabel = 'المرحلة الجامعية 🎓';
        else phaseLabel = 'مرحلة النضج والسعي 💼';

        const approxDate = new Date(birth.getTime() + i * msPerWeek);
        const dateStr = approxDate.toLocaleDateString('ar-EG', { year: 'numeric', month: 'short' });

        let title = '';
        if (status === 'past') {
          title = `الأسبوع ${weekIndex} من سنة ${yearIndex} — [${dateStr}] (${phaseLabel})`;
        } else if (status === 'current') {
          title = `أنتِ هنا الآن 🔥 (الأسبوع ${weekIndex} من سنة ${yearIndex}) — [${dateStr}]`;
        } else {
          title = `أسبوع مستقبلي (الأسبوع ${weekIndex} من سنة ${yearIndex}) — [${dateStr}]`;
        }

        weeksArray.push({ index: i, status, title, phase, phaseLabel, yearIndex, weekIndex, dateStr });
      }
    }
    return {
      weeksLived,
      totalWeeks,
      weeksRemaining,
      percentLived,
      ageYears,
      ageMonths,
      ageDays,
      currentWeekOfYear,
      weeksArray
    };
  }, [lifeData]);

  // HSL visual scale gradient representing years passed
  const getWeekStyle = (week) => {
    if (week.status !== 'past') return {};

    const maxYears = lifeData?.expectedLifespan || 69;
    const ratio = Math.min(1, Math.max(0, (week.yearIndex - 1) / maxYears));

    let h, s, l;
    if (ratio < 0.1) { // Childhood (0 - 10%)
      const t = ratio / 0.1;
      h = 355 + (15 - 355) * t;
      if (h < 0) h += 360;
      s = 85 - 15 * t;
      l = 86 - 6 * t;
    } else if (ratio < 0.28) { // School (10% - 28%)
      const t = (ratio - 0.1) / 0.18;
      h = 15 + (45 - 15) * t;
      s = 70 - 10 * t;
      l = 80 - 5 * t;
    } else if (ratio < 0.35) { // University (28% - 35%)
      const t = (ratio - 0.28) / 0.07;
      h = 45 + (165 - 45) * t;
      s = 60 - 20 * t;
      l = 75 + 2 * t;
    } else { // Maturity (35% - 100%)
      const t = (ratio - 0.35) / 0.65;
      h = 165 + (210 - 165) * t;
      s = 40 - 15 * t;
      l = 77 - 12 * t;
    }

    return {
      backgroundColor: `hsl(${Math.round(h)}, ${Math.round(s)}%, ${Math.round(l)}%)`,
      borderColor: `hsl(${Math.round(h)}, ${Math.round(s)}%, ${Math.round(l - 8)}%)`,
      borderWidth: '1px',
      borderStyle: 'solid'
    };
  };

  // Memoize rendering of the grid cells to optimize performance
  const gridContent = useMemo(() => {
    return (
      <div className="weeks-grid">
        {weeksArray.map((week) => (
          <div
            key={week.index}
            className={`week-box week-${week.status} week-box-interactive`}
            style={getWeekStyle(week)}
            onMouseEnter={() => setHoveredWeek(week)}
            onMouseLeave={() => setHoveredWeek(null)}
            onClick={() => setHoveredWeek(week)}
            title={week.title}
          />
        ))}
      </div>
    );
  }, [weeksArray, setHoveredWeek]);

  // Dynamic sentence
  let dynamicSentence = '';
  if (percentLived < 25) dynamicSentence = 'لسه الرحلة في أولها ✨';
  else if (percentLived < 50) dynamicSentence = 'في منتصف الطريق، كل أسبوع بيكتب قصة 📖';
  else if (percentLived < 75) dynamicSentence = 'أكتر من نص الرحلة عدى، كل يوم هدية 🌿';
  else dynamicSentence = 'الوقت أغلى ما عندك، عيش بوعي كامل 🌅';

  return (
    <div className="page-content-wide" style={{ minHeight: '100vh' }}>
      <div className="flex items-center justify-between w-full animate-in mb-md">
        <button onClick={() => navigate('/dashboard')} className="btn-secondary">
          <ChevronLeft size={16} />
          <span>العودة</span>
        </button>
      </div>

      {!showModal && lifeData && (
        <>
          <header className="page-header animate-in animate-in-delay-1 text-center" style={{ marginBottom: 'var(--space-2xl)' }}>
            <h1 style={{ color: 'var(--brown)', fontSize: '2.5rem', marginBottom: 'var(--space-sm)' }}>حياتك في أسابيع</h1>
            <p className="text-lg font-bold" style={{ color: 'var(--text-muted)' }}>
              عشتِ {weeksLived} أسبوع من أصل {totalWeeks} — أي {percentLived}% من رحلتك
            </p>
            
            <div className="flex gap-md justify-center items-center mt-md flex-wrap">
              <span className="badge badge-orange" style={{ fontSize: '0.95rem', padding: '6px 14px' }}>
                {dynamicSentence}
              </span>
              <button 
                onClick={() => {
                  setBirthDateInput(lifeData.birthDate || '');
                  setExpectedLifespanInput(lifeData.expectedLifespan || 69);
                  setShowModal(true);
                }}
                className="btn-secondary"
                style={{ padding: '6px 12px', fontSize: '0.82rem', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}
                aria-label="تعديل تاريخ الميلاد وتفاصيل العمر"
              >
                <span>تعديل البيانات ⚙️</span>
              </button>
            </div>
          </header>

          <div className="card-solid animate-in animate-in-delay-2 mb-2xl" style={{ overflowX: 'auto', padding: 'var(--space-xl)' }}>
            
            {/* Scoped CSS Styles for Interactive Life Phases grid */}
            <style>{`
              .week-box-interactive {
                cursor: pointer;
                transition: transform 0.15s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.15s;
              }
              .week-box-interactive:hover {
                transform: scale(2.2);
                z-index: 20;
                box-shadow: 0 2px 6px rgba(0,0,0,0.3);
              }
            `}</style>

            {/* Dynamic Info Overlay */}
            <div 
              className="mb-lg p-sm text-center flex items-center justify-center"
              style={{
                minHeight: '52px',
                background: 'var(--input-bg)',
                border: '1px solid var(--border-ui)',
                borderRadius: 'var(--radius-md)',
                boxSizing: 'border-box'
              }}
            >
              {hoveredWeek ? (
                <p className="text-sm font-bold text-main" style={{ margin: 0 }}>
                  {hoveredWeek.status === 'current' ? (
                    <span className="text-accent font-black">أنتِ هنا الآن 🔥 الأسبوع {hoveredWeek.weekIndex} من السنة {hoveredWeek.yearIndex} من حياتكِ</span>
                  ) : hoveredWeek.status === 'past' ? (
                    <span>أسبوع مضى: الأسبوع {hoveredWeek.weekIndex} من السنة {hoveredWeek.yearIndex} [{hoveredWeek.dateStr}] — مرحلة {hoveredWeek.phaseLabel}</span>
                  ) : (
                    <span className="text-muted">أسبوع مستقبلي: الأسبوع {hoveredWeek.weekIndex} من السنة {hoveredWeek.yearIndex} [{hoveredWeek.dateStr}]</span>
                  )}
                </p>
              ) : (
                <p className="text-sm text-muted font-bold" style={{ margin: 0 }}>
                  مرري مؤشر الفأرة فوق أي مربع لرؤية تفاصيل الأسبوع في رحلة حياتكِ 🗺️
                </p>
              )}
            </div>

            {/* Grid Container */}
            {gridContent}

            {/* Legend / Key Details */}
            <div className="flex flex-wrap justify-center gap-md mt-lg border-t border-ui pt-md" style={{ direction: 'rtl', fontSize: '0.78rem' }}>
              <div className="flex items-center gap-xs">
                <div className="w-3.5 h-3.5 rounded-sm" style={getWeekStyle({ status: 'past', yearIndex: 3 })} />
                <span className="font-bold text-muted">الطفولة 👶 (0-6 سنوات)</span>
              </div>
              <div className="flex items-center gap-xs">
                <div className="w-3.5 h-3.5 rounded-sm" style={getWeekStyle({ status: 'past', yearIndex: 12 })} />
                <span className="font-bold text-muted">المدرسة 🎒 (6-18 سنة)</span>
              </div>
              <div className="flex items-center gap-xs">
                <div className="w-3.5 h-3.5 rounded-sm" style={getWeekStyle({ status: 'past', yearIndex: 20 })} />
                <span className="font-bold text-muted">الجامعة 🎓 (18-22 سنة)</span>
              </div>
              <div className="flex items-center gap-xs">
                <div className="w-3.5 h-3.5 rounded-sm" style={getWeekStyle({ status: 'past', yearIndex: 35 })} />
                <span className="font-bold text-muted">النضج والسعي 💼 (22+ سنة)</span>
              </div>
              <div className="flex items-center gap-xs">
                <div className="w-3.5 h-3.5 rounded-sm week-current" style={{ animation: 'none', boxShadow: 'none' }} />
                <span className="font-bold text-muted">أنتِ هنا الآن 🔥</span>
              </div>
              <div className="flex items-center gap-xs">
                <div className="w-3.5 h-3.5 rounded-sm" style={{ backgroundColor: 'transparent', border: '1px solid var(--beige)' }} />
                <span className="font-bold text-muted">المستقبل القادم 🕊️</span>
              </div>
            </div>

          </div>

          <div className="page-grid animate-in animate-in-delay-3 mt-xl" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
            <div className="card flex items-center gap-md">
              <Hourglass size={32} className="text-accent" />
              <div>
                <p className="text-xs text-muted font-bold">الأسابيع اللي عشتيها</p>
                <h3 style={{ color: 'var(--brown)', fontSize: '1.4rem' }}>{weeksLived}</h3>
              </div>
            </div>
            <div className="card flex items-center gap-md">
              <Activity size={32} style={{ color: 'var(--green)' }} />
              <div>
                <p className="text-xs text-muted font-bold">الأسابيع المتبقية</p>
                <h3 style={{ color: 'var(--green)', fontSize: '1.4rem' }}>{weeksRemaining}</h3>
              </div>
            </div>
            <div className="card flex items-center gap-md">
              <User size={32} style={{ color: 'var(--brown-light)' }} />
              <div>
                <p className="text-xs text-muted font-bold">عمرك الآن</p>
                <h3 style={{ color: 'var(--text-main)', fontSize: '1.1rem' }}>{ageYears} سنة و {ageMonths} شهر و {ageDays} يوم</h3>
              </div>
            </div>
            <div className="card flex items-center gap-md">
              <Calendar size={32} style={{ color: 'var(--pink)' }} />
              <div>
                <p className="text-xs text-muted font-bold">الأسبوع الحالي من السنة</p>
                <h3 style={{ color: 'var(--pink)', fontSize: '1.4rem' }}>{currentWeekOfYear}</h3>
              </div>
            </div>
          </div>
        </>
      )}

      {/* MODAL INITIAL SETUP */}
      {showModal && (
        <div className="modal-backdrop">
          <div className="modal animate-scale">
            <h2 className="mb-md text-center" style={{ color: 'var(--brown)' }}>أهلاً بك في رحلة وعيك ⏳</h2>
            <p className="text-center text-muted mb-xl">
              لحساب مسار حياتك بدقة ورسم خريطتك الزمنية، نحتاج لبعض التفاصيل البسيطة.
            </p>

            <form onSubmit={handleSaveLifeData} className="flex flex-col gap-lg">
              <div className="flex flex-col gap-xs">
                <label className="font-bold">تاريخ ميلادك؟</label>
                <input 
                  type="date" 
                  className="input" 
                  required 
                  value={birthDateInput}
                  onChange={(e) => setBirthDateInput(e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-xs">
                <label className="font-bold">متوسط العمر المتوقع (بالسنوات)</label>
                <p className="text-xs text-muted">المتوسط العالمي هو 69 سنة تقريباً، يمكنك تغييره.</p>
                <input 
                  type="number" 
                  className="input" 
                  required 
                  min="1" 
                  max="120"
                  value={expectedLifespanInput}
                  onChange={(e) => setExpectedLifespanInput(e.target.value)}
                />
              </div>

              <div className="flex gap-md mt-sm">
                <button type="submit" className="btn-primary flex-1" style={{ padding: 'var(--space-md)' }}>
                  حفظ البيانات والبدء
                </button>
                {lifeData && (
                  <button type="button" onClick={() => setShowModal(false)} className="btn-secondary" style={{ padding: 'var(--space-md)' }}>
                    إلغاء
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default LifeWeeks;
