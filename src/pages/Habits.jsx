import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { db, isMock } from '../firebase/config';
import { doc, setDoc, getDoc, collection, getDocs } from 'firebase/firestore';
import { ChevronLeft, Plus, Trash2, Check, Sparkles, Award } from 'lucide-react';

const DEFAULT_HABITS = [
  { id: 'hydration', label: 'شرب ماء كافٍ', emoji: '💧', desc: 'شرب 8 أكواب مياه لترطيب جسدكِ وإنعاشه' },
  { id: 'walking', label: 'مشي في الهواء الطلق', emoji: '🚶‍♀️', desc: 'المشي لمدة 10 دقائق لتصفية الذهن والتواصل مع الطبيعة' },
  { id: 'reading', label: 'قراءة ملهمة', emoji: '📖', desc: 'قراءة صفحات من كتاب أو نصوص دافئة ومريحة' },
  { id: 'connection', label: 'تواصل دافئ', emoji: '📞', desc: 'اتصال أو رسالة لطيفة لصديقة أو قريب لتعزيز الدفء' },
  { id: 'screen_free', label: 'وقت بدون شاشات', emoji: '📵', desc: 'ساعة كاملة من الانفصال الرقمي والتركيز الهادئ' }
];

const toDateKey = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const Habits = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  // Selected date key
  const [selectedDate, setSelectedDate] = useState(toDateKey(new Date()));
  const [customHabits, setCustomHabits] = useState([]);
  const [completed, setCompleted] = useState([]);
  const [newHabitText, setNewHabitText] = useState('');
  const [newHabitEmoji, setNewHabitEmoji] = useState('🌟');

  // UI States
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [history, setHistory] = useState({}); // { 'YYYY-MM-DD': { completedCount, totalCount } }

  // Get Cairo current time format
  const todayStr = toDateKey(new Date());

  // Generate last 7 days list
  const last7Days = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i)); // Show from 6 days ago to today
    return {
      dateStr: toDateKey(d),
      dayLabel: d.toLocaleDateString('ar-EG', { weekday: 'short' }),
      dateLabel: d.getDate()
    };
  });

  // Load habits data for selected date + past week history
  useEffect(() => {
    if (!currentUser) return;

    const loadHabitsData = async () => {
      setLoading(true);
      
      let dayData = null;
      const historyMap = {};

      if (isMock) {
        // 1. Load data for selected date
        const saved = localStorage.getItem(`days_habits_${currentUser.uid}_${selectedDate}`);
        if (saved) dayData = JSON.parse(saved);

        // 2. Load history for the last 7 days
        last7Days.forEach(day => {
          const daySaved = localStorage.getItem(`days_habits_${currentUser.uid}_${day.dateStr}`);
          if (daySaved) {
            const parsed = JSON.parse(daySaved);
            const total = DEFAULT_HABITS.length + (parsed.customHabits?.length || 0);
            historyMap[day.dateStr] = {
              completedCount: parsed.completed?.length || 0,
              totalCount: total
            };
          } else {
            historyMap[day.dateStr] = { completedCount: 0, totalCount: DEFAULT_HABITS.length };
          }
        });
      } else {
        try {
          // 1. Load data for selected date
          const docRef = doc(db, 'users', currentUser.uid, 'habits', selectedDate);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) dayData = docSnap.data();

          // 2. Load all habits documents for history
          const habitsRef = collection(db, 'users', currentUser.uid, 'habits');
          const snap = await getDocs(habitsRef);
          snap.forEach(doc => {
            const data = doc.data();
            const total = DEFAULT_HABITS.length + (data.customHabits?.length || 0);
            historyMap[doc.id] = {
              completedCount: data.completed?.length || 0,
              totalCount: total
            };
          });
        } catch (err) {
          console.error('Error loading habits data:', err);
        }
      }

      // Populate states
      if (dayData) {
        setCustomHabits(dayData.customHabits || []);
        setCompleted(dayData.completed || []);
      } else {
        setCustomHabits([]);
        setCompleted([]);
      }

      // Populate default history values for days without logs
      last7Days.forEach(day => {
        if (!historyMap[day.dateStr]) {
          historyMap[day.dateStr] = { completedCount: 0, totalCount: DEFAULT_HABITS.length };
        }
      });

      setHistory(historyMap);
      setLoading(false);
    };

    loadHabitsData();
  }, [currentUser, selectedDate]);

  // Auto-Save whenever habits state changes
  useEffect(() => {
    if (!currentUser || loading) return;

    const saveHabits = async () => {
      setSaving(true);
      const dataToSave = {
        customHabits,
        completed,
        updatedAt: new Date().toISOString()
      };

      try {
        if (isMock) {
          localStorage.setItem(`days_habits_${currentUser.uid}_${selectedDate}`, JSON.stringify(dataToSave));
        } else {
          const docRef = doc(db, 'users', currentUser.uid, 'habits', selectedDate);
          await setDoc(docRef, dataToSave, { merge: true });
        }

        // Update history dynamically
        setHistory(prev => ({
          ...prev,
          [selectedDate]: {
            completedCount: completed.length,
            totalCount: DEFAULT_HABITS.length + customHabits.length
          }
        }));
      } catch (err) {
        console.error('Error auto-saving habits:', err);
      } finally {
        setSaving(false);
      }
    };

    const timer = setTimeout(saveHabits, 800);
    return () => clearTimeout(timer);
  }, [customHabits, completed, currentUser, loading, selectedDate]);

  // Toggle habit check-in
  const handleToggleHabit = (id) => {
    if (completed.includes(id)) {
      setCompleted(completed.filter(item => item !== id));
    } else {
      setCompleted([...completed, id]);
    }
  };

  // Add custom habit
  const handleAddCustomHabit = (e) => {
    e.preventDefault();
    if (!newHabitText.trim()) return;

    const newHabit = {
      id: `custom_${Date.now()}`,
      label: newHabitText.trim(),
      emoji: newHabitEmoji,
      desc: 'عادة مخصصة تمت إضافتها من قبلكِ للعناية بروحكِ.'
    };

    setCustomHabits([...customHabits, newHabit]);
    setNewHabitText('');
  };

  // Delete custom habit
  const handleDeleteCustomHabit = (id) => {
    setCustomHabits(customHabits.filter(h => h.id !== id));
    setCompleted(completed.filter(item => item !== id)); // also clean from completed list
  };

  // Habit visual helper lists
  const allHabits = [...DEFAULT_HABITS, ...customHabits];
  const completedCount = completed.length;
  const totalCount = allHabits.length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  // Render blooming interactive Flower
  const FlowerIcon = ({ count, total, active }) => {
    const ratio = total > 0 ? count / total : 0;
    const numPetalsToFill = Math.min(5, Math.ceil(ratio * 5));

    // Petal colors: HSL tailored soft peach/rose
    const activePetalColor = 'var(--orange)';
    const inactivePetalColor = 'var(--border-ui)';

    return (
      <svg 
        width="44" 
        height="44" 
        viewBox="0 0 100 100" 
        style={{ 
          transform: active ? 'scale(1.1) rotate(15deg)' : 'scale(1)',
          transition: 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
          overflow: 'visible',
          cursor: 'pointer'
        }}
      >
        <style>{`
          .petal-path {
            transition: fill 0.3s ease, transform 0.3s ease;
            transform-origin: 50px 50px;
          }
          .flower-center {
            transition: fill 0.3s ease;
          }
        `}</style>
        {/* Center */}
        <circle 
          cx="50" 
          cy="50" 
          r="10" 
          fill={numPetalsToFill > 0 ? 'var(--brown-light)' : 'var(--text-muted)'} 
          className="flower-center" 
        />
        {/* 5 Petals */}
        {[
          { d: "M50,15 C42,15 38,28 50,38 C62,28 58,15 50,15 Z", angle: 0 },
          { d: "M50,15 C42,15 38,28 50,38 C62,28 58,15 50,15 Z", angle: 72 },
          { d: "M50,15 C42,15 38,28 50,38 C62,28 58,15 50,15 Z", angle: 144 },
          { d: "M50,15 C42,15 38,28 50,38 C62,28 58,15 50,15 Z", angle: 216 },
          { d: "M50,15 C42,15 38,28 50,38 C62,28 58,15 50,15 Z", angle: 288 }
        ].map((petal, i) => {
          const filled = i < numPetalsToFill;
          return (
            <path
              key={i}
              d={petal.d}
              transform={`rotate(${petal.angle} 50 50)`}
              fill={filled ? activePetalColor : inactivePetalColor}
              className="petal-path"
              style={{
                transform: `rotate(${petal.angle}deg) scale(${filled ? 1.05 : 0.85})`
              }}
            />
          );
        })}
      </svg>
    );
  };

  return (
    <div className="page-content" style={{ position: 'relative', zIndex: 1 }}>
      
      {/* Scoped CSS for Habits Page */}
      <style>{`
        .habits-bg-decor {
          position: fixed;
          inset: 0;
          pointer-events: none;
          z-index: 0;
          background: linear-gradient(135deg, rgba(232, 245, 233, 0.25) 0%, rgba(255, 243, 224, 0.2) 50%, rgba(224, 242, 241, 0.25) 100%);
          background-size: 300% 300%;
          animation: habitsGlow 15s ease infinite alternate;
        }
        @keyframes habitsGlow {
          0% { background-position: 0% 0%; }
          100% { background-position: 100% 100%; }
        }

        .habit-card-item {
          transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
          border: 1.5px solid var(--border-ui);
          cursor: pointer;
        }
        .habit-card-item:hover {
          transform: translateY(-2px);
          box-shadow: var(--shadow-sm);
          border-color: rgba(244, 162, 97, 0.4);
        }
        .habit-card-item.checked {
          border-color: var(--green);
          background: rgba(42, 157, 143, 0.04);
        }

        .history-day-btn {
          transition: all 0.3s ease;
          border: 1px solid var(--border-ui);
        }
        .history-day-btn.active {
          border-color: var(--orange);
          background: var(--orange-glow);
          box-shadow: 0 4px 10px var(--orange-glow);
        }
      `}</style>

      <div className="habits-bg-decor" aria-hidden="true" />

      {/* Top Nav */}
      <div className="flex items-center justify-between w-full animate-in">
        <button
          onClick={() => navigate('/dashboard')}
          className="btn-secondary"
          aria-label="العودة"
        >
          <ChevronLeft size={16} />
          <span>العودة</span>
        </button>

        <div className="flex items-center gap-sm text-sm text-muted">
          {saving ? (
            <>
              <span className="loader loader-sm" />
              <span>جاري الحفظ تلقائياً...</span>
            </>
          ) : (
            <span>تم حفظ التغييرات</span>
          )}
        </div>
      </div>

      {/* Header */}
      <header className="page-header animate-in animate-in-delay-1">
        <div className="flex justify-between items-center">
          <span className="badge badge-orange">
            <Sparkles size={14} />
            عاداتي اللطيفة 🌸
          </span>
        </div>

        <h1>خطوات صغيرة لسلامكِ الداخلي</h1>
        <p>عادات رقيقة غير ضاغطة لتغذية روحكِ وصحتكِ الجسدية والنفسية كل يوم.</p>
      </header>

      {/* 1. WEEKLY HORIZONTAL CALENDAR GRID */}
      <section className="card animate-in animate-in-delay-2">
        <h3 className="mb-md text-right font-black flex items-center justify-end gap-xs">
          <span>سجل الأيام السبعة 🗓️</span>
        </h3>

        <div className="flex justify-between items-center gap-sm flex-row-reverse" style={{ width: '100%' }}>
          {last7Days.map((day) => {
            const isSelected = selectedDate === day.dateStr;
            const log = history[day.dateStr] || { completedCount: 0, totalCount: DEFAULT_HABITS.length };
            
            return (
              <button
                key={day.dateStr}
                type="button"
                onClick={() => setSelectedDate(day.dateStr)}
                className={`history-day-btn flex flex-col items-center gap-xs p-xs rounded-lg flex-1 ${isSelected ? 'active' : ''}`}
                style={{ background: 'var(--bg-card)', minWidth: '42px', maxWidth: '64px' }}
                aria-label={`تاريخ ${day.dateStr}`}
              >
                <span className="text-[10px] text-muted font-bold">{day.dayLabel}</span>
                <span className="text-sm font-black">{day.dateLabel}</span>
                
                {/* Visual Flower Completion */}
                <div style={{ marginTop: '4px' }}>
                  <FlowerIcon 
                    count={log.completedCount} 
                    total={log.totalCount} 
                    active={isSelected} 
                  />
                </div>
                
                <span className="text-[9px] text-accent font-bold mt-xs">
                  {log.completedCount}/{log.totalCount}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* 2. PROGRESS HERO */}
      <section className="card animate-in animate-in-delay-3" style={{ background: 'var(--bg-card)', borderRight: '4px solid var(--orange)' }}>
        <div className="flex justify-between items-center w-full flex-wrap gap-md">
          <div className="text-right">
            <h2 className="text-xl font-black text-main">
              إنجاز اليوم: {completedCount} من {totalCount} عادات
            </h2>
            <p className="text-xs text-muted font-semibold mt-xs">
              {progressPercent === 100 
                ? 'يا لجمال حضوركِ! لقد أكملتِ كافة عاداتكِ لليوم 🌸✨' 
                : progressPercent >= 60 
                  ? 'خطوات رائعة وعناية فائقة بذاتكِ اليوم 🌟'
                  : progressPercent > 0 
                    ? 'كل خطوة صغيرة تصنع فرقاً كبيراً في توازنكِ الداخلي.'
                    : 'اختاري العادات التي تودين البدء بها اليوم بكل رفق.'}
            </p>
          </div>
          
          <div className="flex items-center gap-md">
            <div className="flex flex-col items-center">
              <span className="text-2xl font-black text-accent">{progressPercent}%</span>
              <span className="text-[10px] text-muted font-bold">نسبة الاكتمال</span>
            </div>
            
            <div 
              style={{ 
                width: '60px', 
                height: '60px', 
                borderRadius: '50%', 
                background: `conic-gradient(var(--orange) ${progressPercent}%, var(--border-ui) ${progressPercent}%)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: 'var(--shadow-sm)'
              }}
            >
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'var(--bg-card)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Award size={18} className="text-accent" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. HABITS CHECKLIST */}
      <section className="flex flex-col gap-md animate-in animate-in-delay-4" role="list" aria-label="قائمة عاداتك اليومية">
        {allHabits.map((habit) => {
          const isCompleted = completed.includes(habit.id);
          const isCustom = habit.id.toString().startsWith('custom_');

          return (
            <div
              key={habit.id}
              onClick={() => handleToggleHabit(habit.id)}
              className={`habit-card-item card p-md flex items-center justify-between flex-row-reverse text-right ${isCompleted ? 'checked' : ''}`}
              role="listitem"
            >
              {/* Left Side: Interaction indicator (Checkbox circle & delete if custom) */}
              <div className="flex items-center gap-md">
                {isCustom && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation(); // prevent card toggle
                      handleDeleteCustomHabit(habit.id);
                    }}
                    className="btn-ghost p-xs text-red hover:bg-red/10"
                    aria-label="حذف العادة"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
                
                <div 
                  className="flex items-center justify-center"
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    border: `2px solid ${isCompleted ? 'var(--green)' : 'var(--border-ui)'}`,
                    background: isCompleted ? 'var(--green)' : 'transparent',
                    color: isCompleted ? '#fff' : 'transparent',
                    transition: 'all 0.3s ease'
                  }}
                >
                  <Check size={18} strokeWidth={3} />
                </div>
              </div>

              {/* Center: Emoji, Label & Description */}
              <div className="flex gap-md items-center flex-row-reverse flex-1" style={{ paddingLeft: '16px' }}>
                <span className="text-2xl" style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.06))' }}>{habit.emoji}</span>
                <div className="flex flex-col gap-xs">
                  <h4 className="text-md font-black text-main">{habit.label}</h4>
                  <p className="text-xs text-muted leading-relaxed">{habit.desc}</p>
                </div>
              </div>

            </div>
          );
        })}
      </section>

      {/* 4. CARD: ADD CUSTOM HABIT */}
      <section className="card animate-in animate-in-delay-5">
        <h3 className="mb-md text-right font-black flex items-center justify-end gap-xs">
          <span>أضيفي عادتكِ الخاصة 🌟</span>
        </h3>

        <form onSubmit={handleAddCustomHabit} className="flex flex-col gap-md w-full">
          <div className="flex gap-sm w-full">
            <button
              type="submit"
              className="btn-primary"
              aria-label="إضافة العادة"
              style={{ width: '46px', height: '46px', padding: 0, borderRadius: 'var(--radius-md)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <Plus size={20} />
            </button>

            <input
              type="text"
              className="input"
              value={newHabitText}
              onChange={(e) => setNewHabitText(e.target.value)}
              placeholder="مثال: ممارسة تمرين اليوجا، كتابة تدوينة حرة..."
              aria-label="اسم العادة الجديدة"
            />
          </div>

          {/* Emoji selector row */}
          <div className="flex gap-xs items-center justify-end flex-wrap">
            {['🌟', '💧', '🧘‍♀️', '🍎', '🍵', '📚', '🎨', '🚶‍♀️', '🌱', '☀️', '❤️', '📵'].map((em) => (
              <button
                key={em}
                type="button"
                onClick={() => setNewHabitEmoji(em)}
                className="badge transition-all"
                style={{
                  fontSize: '1.2rem',
                  backgroundColor: newHabitEmoji === em ? 'var(--orange)' : 'var(--border-ui)',
                  padding: '6px 10px',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  border: 'none',
                  transform: newHabitEmoji === em ? 'scale(1.1)' : 'scale(1)'
                }}
              >
                {em}
              </button>
            ))}
            <span className="text-xs text-muted font-bold" style={{ marginRight: '8px' }}>أيقونة العادة:</span>
          </div>
        </form>
      </section>

    </div>
  );
};

export default Habits;
