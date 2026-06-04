import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { db, isMock } from '../firebase/config';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { ChevronLeft, CloudSun, Plus, Trash2, Check, Sun, Heart } from 'lucide-react';

const MOODS = [
  { label: 'متحمسة', emoji: '🔥' },
  { label: 'هادئة', emoji: '😌' },
  { label: 'ممتنة', emoji: '🙏' },
  { label: 'مرهقة', emoji: '😴' },
  { label: 'قلقة', emoji: '😟' },
  { label: 'محايدة', emoji: '😐' },
];

export const CATEGORIES = [
  { id: 'work', label: 'عمل / دراسة', icon: '💻', color: '#3A86FF' },
  { id: 'spiritual', label: 'روحي / تأمل', icon: '🧘‍♀️', color: '#8338EC' },
  { id: 'health', label: 'صحة / رياضة', icon: '🍎', color: '#38B000' },
  { id: 'personal', label: 'عائلي / شخصي', icon: '🏡', color: '#FF006E' },
];

const Morning = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  // Page states
  const [mood, setMood] = useState('');
  const [topTask, setTopTask] = useState('');
  const [tasks, setTasks] = useState([]);
  const [newTaskText, setNewTaskText] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('work');
  const [isQuoteLiked, setIsQuoteLiked] = useState(false);

  // UI states
  const [pageLoading, setPageLoading] = useState(true);
  const [autoSaving, setAutoSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const [weather, setWeather] = useState({ temp: null, loading: true });
  const [removingTaskId, setRemovingTaskId] = useState(null);

  // 10 Arabic Quotes about mornings, hope, and beginnings
  const morningQuotes = [
    "ابدأ اليوم بأمل جديد، فكل شروق يحمل معه فرصة جديدة لتبدأ من جديد.",
    "الصباح لا يتغير، ولكنك أنت من يستطيع تغيير يومك بحضورك الواعي.",
    "في كل صباح نولد من جديد، وما نفعله اليوم هو ما يهم حقاً.",
    "كن لطيفاً مع نفسك في البدايات، فالأشجار العظيمة بدأت ببذرة صغيرة.",
    "كل يوم هو بداية جديدة، خذ نفساً عميقاً وابدأ بكل ثقة ورجاء.",
    "شروق الشمس هو تذكير بأن الظلام سينقشع دائماً، وأن هناك فرصة للبداية.",
    "دع نواياك الصباحية تكون بوصلتك لتوجيه خطواتك اليوم بكل سلام.",
    "الجمال يكمن في التفاصيل البسيطة للصباح؛ كوب قهوة، تنفس عميق، حضور هادئ.",
    "عش يومك هذا وكأنه رحلة فريدة، وثق بأن كل خطوة واعية تصنع فرقاً.",
    "اليقظة الصباحية ليست ترفاً، بل هي ترتيب لبيتك الداخلي قبل أن تقابل العالم."
  ];

  // Persistent quote of the day (based on day of the month)
  const quoteIndex = new Date().getDate() % morningQuotes.length;
  const dailyQuote = morningQuotes[quoteIndex];

  // Format today's date in YYYY-MM-DD
  const getTodayDateString = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const todayStr = getTodayDateString();

  // Fetch Cairo Weather Temperature (Open-Meteo free API)
  useEffect(() => {
    fetch('https://api.open-meteo.com/v1/forecast?latitude=30.0444&longitude=31.2357&current=temperature_2m')
      .then((res) => res.json())
      .then((data) => {
        if (data && data.current) {
          setWeather({ temp: Math.round(data.current.temperature_2m), loading: false });
        } else {
          setWeather({ temp: null, loading: false });
        }
      })
      .catch((err) => {
        console.error('Weather fetch error:', err);
        setWeather({ temp: null, loading: false });
      });
  }, []);

  // Load existing data for today
  useEffect(() => {
    if (!currentUser) return;

    const loadTodayData = async () => {
      setPageLoading(true);
      if (isMock) {
        const saved = localStorage.getItem(`days_mornings_${currentUser.uid}_${todayStr}`);
        if (saved) {
          const parsed = JSON.parse(saved);
          setMood(parsed.mood || '');
          setTopTask(parsed.topTask || '');
          setTasks(parsed.tasks || []);
        }
      } else {
        try {
          const docRef = doc(db, 'users', currentUser.uid, 'mornings', todayStr);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const data = docSnap.data();
            setMood(data.mood || '');
            setTopTask(data.topTask || '');
            setTasks(data.tasks || []);
          }
        } catch (err) {
          console.error('Firestore load error:', err);
        }
      }
      setPageLoading(false);
    };

    loadTodayData();
  }, [currentUser, todayStr]);

  // Load quote liked status
  useEffect(() => {
    if (!currentUser) return;
    const favorites = JSON.parse(localStorage.getItem(`days_favorite_quotes_${currentUser.uid}`) || '[]');
    setIsQuoteLiked(favorites.includes(dailyQuote));
  }, [currentUser, dailyQuote]);

  const handleToggleLikeQuote = () => {
    if (!currentUser) return;
    const key = `days_favorite_quotes_${currentUser.uid}`;
    let favorites = JSON.parse(localStorage.getItem(key) || '[]');
    if (favorites.includes(dailyQuote)) {
      favorites = favorites.filter(q => q !== dailyQuote);
      setIsQuoteLiked(false);
    } else {
      favorites.push(dailyQuote);
      setIsQuoteLiked(true);
    }
    localStorage.setItem(key, JSON.stringify(favorites));
  };

  // Debounced Auto-Save loop
  useEffect(() => {
    if (!currentUser || pageLoading) return;

    const saveData = async () => {
      setAutoSaving(true);
      const dataToSave = {
        mood,
        topTask,
        tasks,
        date: todayStr,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      try {
        if (isMock) {
          localStorage.setItem(`days_mornings_${currentUser.uid}_${todayStr}`, JSON.stringify(dataToSave));
          setLastSaved(new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
        } else {
          const docRef = doc(db, 'users', currentUser.uid, 'mornings', todayStr);
          await setDoc(docRef, dataToSave, { merge: true });
          setLastSaved(new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
        }
      } catch (err) {
        console.error('Firestore save error:', err);
      } finally {
        setAutoSaving(false);
      }
    };

    const timer = setTimeout(() => {
      saveData();
    }, 1000);

    return () => clearTimeout(timer);
  }, [mood, topTask, tasks, currentUser, pageLoading, todayStr]);

  // Task list helpers
  const handleAddTask = (e) => {
    e.preventDefault();
    if (!newTaskText.trim()) return;

    const newTask = {
      id: Date.now().toString(),
      text: newTaskText.trim(),
      completed: false,
      category: selectedCategory
    };

    setTasks([...tasks, newTask]);
    setNewTaskText('');
  };

  const handleToggleTask = (id) => {
    setTasks(
      tasks.map((task) =>
        task.id === id ? { ...task, completed: !task.completed } : task
      )
    );
  };

  const handleDeleteTask = (id) => {
    setRemovingTaskId(id);
    setTimeout(() => {
      setTasks(tasks.filter((task) => task.id !== id));
      setRemovingTaskId(null);
    }, 300);
  };

  // Submit and redirect
  const handleFinalSubmit = (e) => {
    e.preventDefault();
    navigate('/dashboard');
  };

  // Loading state
  if (pageLoading) {
    return (
      <div className="page-loader">
        <span className="loader" />
        <p>تحميل تفاصيل الصباح...</p>
      </div>
    );
  }

  return (
    <div className="page-content" style={{ position: 'relative', zIndex: 1 }}>
      
      {/* Scoped CSS for Sunrise animations and bounce interactions */}
      <style>{`
        .morning-bg-decor {
          position: fixed;
          inset: 0;
          pointer-events: none;
          z-index: 0;
          background: linear-gradient(135deg, rgba(254, 232, 168, 0.2) 0%, rgba(216, 167, 177, 0.12) 50%, rgba(168, 218, 220, 0.18) 100%);
          background-size: 300% 300%;
          animation: morningSunriseGlow 12s ease infinite alternate;
        }
        @keyframes morningSunriseGlow {
          0% { background-position: 0% 0%; }
          50% { background-position: 100% 100%; }
          100% { background-position: 0% 0%; }
        }
        
        .card {
          background: rgba(255, 255, 255, 0.45) !important;
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.5) !important;
          box-shadow: 0 8px 32px rgba(92, 75, 67, 0.05) !important;
        }
        
        .input {
          background: rgba(255, 255, 255, 0.5) !important;
          backdrop-filter: blur(6px);
          -webkit-backdrop-filter: blur(6px);
          border: 1px solid rgba(255, 255, 255, 0.6) !important;
          transition: all 0.3s ease !important;
        }
        .input:focus {
          background: rgba(255, 255, 255, 0.8) !important;
          border-color: var(--orange) !important;
          box-shadow: 0 0 12px var(--orange-glow) !important;
        }
        
        .mood-btn {
          width: 86px;
          height: 86px;
          border-radius: 50% !important;
          display: flex !important;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 0 !important;
          min-width: 86px !important;
          background: rgba(255, 255, 255, 0.25) !important;
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          border: 1px solid rgba(255, 255, 255, 0.45) !important;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.03);
          transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), background 0.3s, border-color 0.3s, box-shadow 0.3s !important;
        }
        .mood-btn:hover {
          background: rgba(255, 255, 255, 0.5) !important;
          border-color: var(--orange) !important;
          box-shadow: 0 6px 18px rgba(244, 162, 97, 0.2) !important;
          transform: translateY(-5px) scale(1.08) !important;
        }
        .mood-btn:active {
          transform: scale(0.95) !important;
        }
        .mood-btn.active {
          background: rgba(244, 162, 97, 0.15) !important;
          border-color: var(--orange) !important;
          color: var(--orange) !important;
          box-shadow: 0 8px 24px var(--orange-glow), inset 0 0 12px rgba(244, 162, 97, 0.15) !important;
          animation: moodActiveBounce 0.45s cubic-bezier(0.34, 1.56, 0.64, 1) both;
        }
        @keyframes moodActiveBounce {
          0% { transform: scale(1); }
          50% { transform: scale(1.2) translateY(-6px); }
          100% { transform: scale(1.05) translateY(0); }
        }
        
        .morning-glow-circle {
          position: fixed;
          width: 320px;
          height: 320px;
          background: radial-gradient(circle, rgba(254, 232, 168, 0.35) 0%, rgba(254, 232, 168, 0) 70%);
          border-radius: 50%;
          top: -60px;
          right: -60px;
          pointer-events: none;
          z-index: 0;
          animation: sunrisePulse 8s ease-in-out infinite alternate;
        }
        @keyframes sunrisePulse {
          0% { transform: scale(1); opacity: 0.7; }
          100% { transform: scale(1.15) translate(-15px, 15px); opacity: 1; }
        }
      `}</style>

      {/* Decorative backgrounds */}
      <div className="morning-bg-decor" aria-hidden="true" />
      <div className="morning-glow-circle" aria-hidden="true" />

      {/* Top bar: back button + autosave status */}
      <div className="flex items-center justify-between w-full animate-in">
        <button
          onClick={() => navigate('/dashboard')}
          className="btn-secondary"
          aria-label="العودة إلى لوحة التحكم"
        >
          <ChevronLeft size={16} />
          <span>العودة</span>
        </button>

        <div className="flex items-center gap-sm text-sm text-muted">
          {autoSaving ? (
            <>
              <span className="loader loader-sm" />
              <span>جاري الحفظ تلقائياً...</span>
            </>
          ) : lastSaved ? (
            <span>تم الحفظ تلقائياً {lastSaved}</span>
          ) : (
            <span>جاهز للحفظ</span>
          )}
        </div>
      </div>

      {/* 1. HEADER */}
      <header className="page-header animate-in animate-in-delay-1">
        <div className="flex justify-between items-center">
          <span className="badge badge-orange">
            <Sun size={14} />
            شروق جديد 🌄
          </span>

          {/* Weather */}
          <div className="flex items-center gap-sm text-sm">
            <CloudSun size={18} className="text-accent" />
            {weather.loading ? (
              <span className="text-muted">جاري قياس الحرارة...</span>
            ) : weather.temp !== null ? (
              <span>القاهرة الآن: {weather.temp}°م</span>
            ) : (
              <span>القاهرة: مشمس</span>
            )}
          </div>
        </div>

        <h1>صباح الخير... هتعملي إيه النهاردة؟</h1>
        {(() => {
          const now = new Date();
          const start = new Date(now.getFullYear(), 0, 0);
          const dayOfYear = Math.floor((now - start) / (1000 * 60 * 60 * 24));
          const totalDays = now.getFullYear() % 4 === 0 ? 366 : 365;
          const daysLeft = totalDays - dayOfYear;
          return (
            <>
              <p style={{ textAlign: 'center', color: 'var(--brown)', fontSize: '1.4rem', fontWeight: 900, margin: 'var(--space-md) 0 0 0' }}>
                {new Intl.DateTimeFormat('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }).format(now)}
              </p>
              <p style={{ textAlign: 'center', color: 'rgba(139, 90, 43, 0.7)', fontSize: '0.9rem', fontWeight: 'bold', marginBottom: 'var(--space-md)' }}>
                باقي {daysLeft} يوم على نهاية السنة
              </p>
            </>
          );
        })()}
        <p>لحظة هدوء قبل بداية اليوم. اختاري أولوياتك بكل رفق.</p>
      </header>

      {/* 2. CARD: حالة الجو الداخلي — Mood Selector */}
      <section className="card animate-in animate-in-delay-2" role="group" aria-label="اختاري حالتك المزاجية">
        <h3 className="flex items-center gap-sm mb-md">
          حالة الجو الداخلي
        </h3>

        <div className="mood-selector">
          {MOODS.map((m) => (
            <button
              key={m.label}
              type="button"
              onClick={() => setMood(m.label)}
              className={`mood-btn${mood === m.label ? ' active' : ''}`}
              aria-label={`اختيار المزاج: ${m.label}`}
              aria-pressed={mood === m.label}
            >
              <span className="mood-emoji">{m.emoji}</span>
              <span>{m.label}</span>
            </button>
          ))}
        </div>
      </section>

      {/* 3. CARD: أهم مهمة واحدة */}
      <section className="card animate-in animate-in-delay-3">
        <h3 className="mb-md">أهم مهمة واحدة ⭐</h3>

        <input
          type="text"
          className="input"
          value={topTask}
          onChange={(e) => setTopTask(e.target.value)}
          placeholder="اكتبي هنا ما يهمك حقاً..."
          aria-label="أهم مهمة لليوم"
        />

        <p className="text-sm text-muted mt-sm">
          هذا هو تركيزك الأساسي لليوم.
        </p>
      </section>

      {/* 4. CARD: نوايا ومهام إضافية */}
      <section className="card animate-in animate-in-delay-4">
        <h3 className="mb-md">نوايا ومهام إضافية</h3>

        {/* Add task form */}
        <form onSubmit={handleAddTask} className="flex flex-col gap-sm w-full">
          <div className="flex gap-md w-full">
            <button
              type="submit"
              className="btn-primary"
              aria-label="إضافة مهمة جديدة"
              style={{ width: '44px', height: '44px', padding: 0, borderRadius: 'var(--radius-md)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <Plus size={20} />
            </button>

            <input
              type="text"
              className="input"
              value={newTaskText}
              onChange={(e) => setNewTaskText(e.target.value)}
              placeholder="أضيفي نية أو مهمة إضافية للجرعة اليومية..."
              aria-label="نص المهمة الجديدة"
            />
          </div>

          {/* Category Selector Buttons */}
          <div className="flex gap-xs items-center mt-xs flex-wrap">
            <span className="text-xs text-muted font-bold" style={{ marginLeft: '6px' }}>التصنيف:</span>
            {CATEGORIES.map(cat => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className="badge transition-all text-xs"
                style={{
                  backgroundColor: selectedCategory === cat.id ? cat.color : 'transparent',
                  color: selectedCategory === cat.id ? '#fff' : 'var(--text-main)',
                  border: `1px solid ${selectedCategory === cat.id ? cat.color : 'var(--border-ui)'}`,
                  padding: '4px 10px',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  fontWeight: selectedCategory === cat.id ? '700' : 'normal'
                }}
              >
                <span>{cat.icon} {cat.label.split(' / ')[0]}</span>
              </button>
            ))}
          </div>
        </form>

        {/* Task list */}
        <div className="flex flex-col gap-md mt-md" role="list" aria-label="قائمة المهام">
          {tasks.length > 0 ? (
            tasks.map((task) => {
              const taskCat = CATEGORIES.find(c => c.id === task.category) || CATEGORIES[0];
              return (
                <div
                  key={task.id}
                  className="flex items-center justify-between"
                  role="listitem"
                  style={{
                    padding: 'var(--space-md)',
                    borderRadius: 'var(--radius-md)',
                    border: `1px dashed ${task.completed ? 'var(--border-ui)' : taskCat.color + '60'}`,
                    background: 'var(--input-bg)',
                    transition: 'opacity 0.3s ease, transform 0.3s ease',
                    opacity: removingTaskId === task.id ? 0 : 1,
                    transform: removingTaskId === task.id ? 'translateX(20px)' : 'translateX(0)',
                  }}
                >
                  {/* Checkbox + label */}
                  <label className="checkbox-custom" style={{ flex: 1 }}>
                    <input
                      type="checkbox"
                      checked={task.completed}
                      onChange={() => handleToggleTask(task.id)}
                      aria-label={`تبديل حالة المهمة: ${task.text}`}
                    />
                    <span 
                      className="checkbox-mark" 
                      style={{ 
                        borderColor: task.completed ? taskCat.color : 'var(--border-ui-hover)',
                        backgroundColor: task.completed ? taskCat.color : 'transparent',
                        boxShadow: task.completed ? `0 0 10px ${taskCat.color}70` : 'none',
                        transition: 'all 0.25s ease'
                      }}
                    >
                      <Check size={14} strokeWidth={3} />
                    </span>
                    <span className={`checkbox-label${task.completed ? ' checked' : ''}`} style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span>{task.text}</span>
                      <span 
                        className="text-[0.65rem] px-xs py-0.5 rounded font-bold"
                        style={{
                          backgroundColor: taskCat.color + '15',
                          color: taskCat.color,
                          border: `1px solid ${taskCat.color}25`
                        }}
                      >
                        {taskCat.icon} {taskCat.label.split(' / ')[0]}
                      </span>
                    </span>
                  </label>

                {/* Delete button */}
                <button
                  type="button"
                  onClick={() => handleDeleteTask(task.id)}
                  className="btn-ghost"
                  aria-label={`حذف المهمة: ${task.text}`}
                  style={{ color: 'var(--red)' }}
                >
                  <Trash2 size={16} />
                </button>
              </div>
              );
            })
          ) : (
            <p className="text-sm text-muted text-center" style={{ padding: 'var(--space-lg) 0', fontStyle: 'italic' }}>
              لا توجد نوايا إضافية مضافة بعد. اكتبيهم في الأعلى واضغطي (+).
            </p>
          )}
        </div>
      </section>

      {/* 5. CARD: حكمة الصباح */}
      <section className="card-quote animate-in animate-in-delay-5" aria-label="حكمة الصباح">
        <div className="flex gap-lg items-center">
          <img
            src="/morning_coffee.png"
            alt="قهوة الصباح والهدوء"
            style={{
              width: '90px',
              height: '90px',
              borderRadius: 'var(--radius-md)',
              objectFit: 'cover',
              boxShadow: 'var(--shadow-sm)',
              flexShrink: 0
            }}
          />

          <div className="flex flex-col gap-sm" style={{ flex: 1 }}>
            <div className="flex justify-between items-center w-full">
              <span className="text-sm text-muted font-bold">— حكمة الصباح</span>
              <button
                type="button"
                onClick={handleToggleLikeQuote}
                className="btn-ghost p-xs"
                style={{ color: isQuoteLiked ? 'var(--red)' : 'var(--text-muted)', cursor: 'pointer', border: 'none', background: 'none', display: 'flex', alignItems: 'center' }}
                aria-label="أعجبني الاقتباس"
              >
                <Heart size={18} fill={isQuoteLiked ? 'var(--red)' : 'none'} style={{ color: isQuoteLiked ? 'var(--red)' : 'var(--text-muted)' }} />
              </button>
            </div>
            <p className="text-lg" style={{ lineHeight: '1.7', fontStyle: 'italic' }}>
              "{dailyQuote}"
            </p>
          </div>
        </div>
      </section>

      {/* 6. BUTTON: ابدأي يومك */}
      <button
        onClick={handleFinalSubmit}
        className="btn-primary w-full animate-in animate-in-delay-5"
        aria-label="ابدأي يومك والانتقال للوحة التحكم"
        style={{ padding: 'var(--space-lg) var(--space-xl)', fontSize: '1.15rem' }}
      >
        <span>▶ ابدأي يومك</span>
      </button>

    </div>
  );
};

export default Morning;
