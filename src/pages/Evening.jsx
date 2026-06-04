import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { db, isMock } from '../firebase/config';
import { doc, setDoc, getDoc, collection, addDoc } from 'firebase/firestore';
import { Moon, ChevronLeft, Check, Plus, Trash2, Heart, Calendar, Clock, Tag, X, Sparkles } from 'lucide-react';

const REFLECTION_PROMPTS = [
  "ما هو الدرس الأكبر الذي تعلمتيه اليوم؟",
  "اذكري شخصاً واحداً أثر في يومك إيجاباً وكيف؟",
  "ما الذي كان بإمكانك فعله بشكل أفضل اليوم لتكوني أكثر سلاماً؟",
  "اكتبي عن تفصيل صغير جداً لاحظتيه اليوم وجعلكِ تبتسمين.",
  "إذا كان بإمكانك إرسال رسالة لنفسك في الصباح، ماذا ستقولين لها؟",
  "ما هو الحمل أو العبء الذي تريدين تركه وراءك الليلة قبل النوم؟",
  "ما الذي جعلكِ فخورة بنفسكِ اليوم بشكل خاص؟"
];

const Evening = () => {
  const { currentUser } = useAuth();
  const { setManualTheme, resetToAutomatic } = useTheme();
  const navigate = useNavigate();

  // Page states
  const [tasks, setTasks] = useState([]);
  const [newTaskText, setNewTaskText] = useState('');
  const [happyText, setHappyText] = useState('');
  const [selectedTags, setSelectedTags] = useState([]);
  const [tomorrowGoal, setTomorrowGoal] = useState('');
  const [wakeUpTime, setWakeUpTime] = useState('06:30');
  const [focusStart, setFocusStart] = useState('09:00');
  const [focusEnd, setFocusEnd] = useState('11:00');
  const [customTagText, setCustomTagText] = useState('');
  const [currentPrompt, setCurrentPrompt] = useState('');

  // UI states
  const [pageLoading, setPageLoading] = useState(true);
  const [autoSaving, setAutoSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const [showSuccess, setShowSuccess] = useState(false);

  const tagsList = ['هدوء', 'امتنان', 'إنجاز', 'فرح'];

  // Format today's date in YYYY-MM-DD
  const getTodayDateString = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Format tomorrow's date in YYYY-MM-DD
  const getTomorrowDateString = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const todayStr = getTodayDateString();
  const tomorrowStr = getTomorrowDateString();

  // Let ThemeContext handle the evening theme
  useEffect(() => {
    setManualTheme('evening');
    return () => {
      resetToAutomatic();
    };
  }, []);

  // Fetch morning tasks and load previous evening session on mount
  useEffect(() => {
    if (!currentUser) return;

    const loadSessionData = async () => {
      setPageLoading(true);

      let morningTasks = [];
      let eveningData = null;
      let tomorrowData = null;

      // 1. Load today's morning tasks first
      if (isMock) {
        const morningSaved = localStorage.getItem(`days_mornings_${currentUser.uid}_${todayStr}`);
        if (morningSaved) {
          const parsed = JSON.parse(morningSaved);
          morningTasks = parsed.tasks || [];
        }
      } else {
        try {
          const morningRef = doc(db, 'users', currentUser.uid, 'mornings', todayStr);
          const morningSnap = await getDoc(morningRef);
          if (morningSnap.exists()) {
            morningTasks = morningSnap.data().tasks || [];
          }
        } catch (err) {
          console.error('Error loading morning tasks:', err);
        }
      }

      // 2. Load today's evening reflection if already started/saved
      if (isMock) {
        const eveningSaved = localStorage.getItem(`days_evenings_${currentUser.uid}_${todayStr}`);
        if (eveningSaved) {
          eveningData = JSON.parse(eveningSaved);
        }
      } else {
        try {
          const eveningRef = doc(db, 'users', currentUser.uid, 'evenings', todayStr);
          const eveningSnap = await getDoc(eveningRef);
          if (eveningSnap.exists()) {
            eveningData = eveningSnap.data();
          }
        } catch (err) {
          console.error('Error loading evening data:', err);
        }
      }

      // 3. Load tomorrow's plan if already started/saved
      if (isMock) {
        const tomorrowSaved = localStorage.getItem(`days_mornings_${currentUser.uid}_${tomorrowStr}`);
        if (tomorrowSaved) {
          tomorrowData = JSON.parse(tomorrowSaved);
        }
      } else {
        try {
          const tomorrowRef = doc(db, 'users', currentUser.uid, 'mornings', tomorrowStr);
          const tomorrowSnap = await getDoc(tomorrowRef);
          if (tomorrowSnap.exists()) {
            tomorrowData = tomorrowSnap.data();
          }
        } catch (err) {
          console.error('Error loading tomorrow plan:', err);
        }
      }

      // 4. Merge morning tasks and evening achievements
      if (eveningData && eveningData.achievements && eveningData.achievements.length > 0) {
        setTasks(eveningData.achievements);
      } else {
        setTasks(morningTasks);
      }

      // 5. Populate other fields
      if (eveningData) {
        setHappyText(eveningData.happyMoment?.text || '');
        setSelectedTags(eveningData.happyMoment?.tags || []);
      }
      if (tomorrowData && tomorrowData.planned) {
        setTomorrowGoal(tomorrowData.planned.goal || '');
        setWakeUpTime(tomorrowData.planned.wakeUpTime || '06:30');
        setFocusStart(tomorrowData.planned.focusStart || '09:00');
        setFocusEnd(tomorrowData.planned.focusEnd || '11:00');
      }

      setPageLoading(false);
    };

    loadSessionData();
  }, [currentUser, todayStr, tomorrowStr]);

  // Debounced Auto-Save loop
  useEffect(() => {
    if (!currentUser || pageLoading) return;

    const saveData = async () => {
      setAutoSaving(true);

      const eveningData = {
        achievements: tasks,
        happyMoment: {
          text: happyText,
          tags: selectedTags
        },
        date: todayStr,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const tomorrowData = {
        planned: {
          goal: tomorrowGoal,
          wakeUpTime,
          focusStart,
          focusEnd
        },
        date: tomorrowStr,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      try {
        if (isMock) {
          // Save today's evening file
          localStorage.setItem(`days_evenings_${currentUser.uid}_${todayStr}`, JSON.stringify(eveningData));

          // Save tomorrow's morning file (preserving other keys if exist)
          const existStr = localStorage.getItem(`days_mornings_${currentUser.uid}_${tomorrowStr}`);
          const exist = existStr ? JSON.parse(existStr) : {};
          localStorage.setItem(`days_mornings_${currentUser.uid}_${tomorrowStr}`, JSON.stringify({
            ...exist,
            ...tomorrowData
          }));

          setLastSaved(new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
        } else {
          const eveningRef = doc(db, 'users', currentUser.uid, 'evenings', todayStr);
          await setDoc(eveningRef, eveningData, { merge: true });

          const tomorrowRef = doc(db, 'users', currentUser.uid, 'mornings', tomorrowStr);
          await setDoc(tomorrowRef, tomorrowData, { merge: true });

          setLastSaved(new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
        }
      } catch (err) {
        console.error('Error auto-saving evening/tomorrow plans:', err);
      } finally {
        setAutoSaving(false);
      }
    };

    const timer = setTimeout(() => {
      saveData();
    }, 1000); // 1-second debounce

    return () => clearTimeout(timer);
  }, [tasks, happyText, selectedTags, tomorrowGoal, wakeUpTime, focusStart, focusEnd, currentUser, pageLoading, todayStr, tomorrowStr]);

  // Tasks checklist modifiers
  const handleAddTask = (e) => {
    e.preventDefault();
    if (!newTaskText.trim()) return;

    const newTask = {
      id: Date.now().toString(),
      text: newTaskText.trim(),
      completed: false
    };

    setTasks([...tasks, newTask]);
    setNewTaskText('');
  };

  const handleToggleTask = (id) => {
    setTasks(
      tasks.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t))
    );
  };

  const handleDeleteTask = (id) => {
    setTasks(tasks.filter((t) => t.id !== id));
  };

  // Happy tags toggle handler
  const handleToggleTag = (tag) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter((t) => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  // Custom tag handler
  const handleAddCustomTag = (e) => {
    e.preventDefault();
    const trimmed = customTagText.trim();
    if (!trimmed) return;
    if (!selectedTags.includes(trimmed)) {
      setSelectedTags([...selectedTags, trimmed]);
    }
    setCustomTagText('');
  };

  const handleRemoveTag = (tag) => {
    setSelectedTags(selectedTags.filter((t) => t !== tag));
  };

  const handleGeneratePrompt = () => {
    const randomIndex = Math.floor(Math.random() * REFLECTION_PROMPTS.length);
    setCurrentPrompt(REFLECTION_PROMPTS[randomIndex]);
  };

  const handleUsePrompt = () => {
    if (!currentPrompt) return;
    setHappyText(prev => {
      const separator = prev ? '\n\n' : '';
      return `${prev}${separator}*سؤال التأمل: ${currentPrompt}*\n`;
    });
    setCurrentPrompt('');
  };

  // Submit and Redirect
  const handleFinalSubmit = async (e) => {
    e.preventDefault();

    try {
      if (happyText.trim()) {
        const memoryId = Date.now().toString();
        const newMemory = {
          title: 'مراجعة مساء الأيام',
          text: happyText.trim(),
          type: 'text',
          images: [],
          tags: selectedTags,
          mood: '✨',
          date: todayStr,
          isFeatured: false
        };

        if (isMock) {
          let memoriesList = [];
          const savedMemories = localStorage.getItem(`days_memories_${currentUser.uid}`);
          if (savedMemories) {
            memoriesList = JSON.parse(savedMemories);
          }
          // Avoid duplicate memories for the same day
          const filtered = memoriesList.filter(m => !(m.title === 'مراجعة مساء الأيام' && m.date === todayStr));
          localStorage.setItem(`days_memories_${currentUser.uid}`, JSON.stringify([{ id: memoryId, ...newMemory }, ...filtered]));
        } else {
          if (!db) {
            throw new Error('خدمة Firestore Database غير مهيأة بعد.');
          }
          const memRef = collection(db, 'users', currentUser.uid, 'memories');
          await addDoc(memRef, newMemory);
        }
      }

      setShowSuccess(true);
      setTimeout(() => {
        navigate('/dashboard');
      }, 3000);
    } catch (err) {
      console.error('Error auto-saving memory from evening:', err);
      if (err.name === 'QuotaExceededError' || err.message.includes('quota') || err.code === 'NS_ERROR_DOM_QUOTA_REACHED') {
        alert('عذراً، مساحة التخزين المحلية للمتصفح ممتلئة بالكامل بالصور القديمة غير المضغوطة. يرجى حذف بعض الذكريات القديمة أو تفعيل قاعدة بيانات Firebase الحقيقية.');
      } else {
        alert('حدث خطأ أثناء حفظ مراجعة المساء: ' + (err.message || err));
      }
    }
  };

  // Completed tasks count
  const completedCount = tasks.filter((t) => t.completed).length;
  const totalCount = tasks.length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  if (pageLoading) {
    return (
      <div className="page-loader">
        <span className="loader" />
        <p>تحميل تفاصيل المساء...</p>
      </div>
    );
  }

  return (
    <div className="page-content" style={{ position: 'relative', zIndex: 1 }}>
      
      {/* Scoped CSS for Twinkling Starry Night Background */}
      <style>{`
        .evening-bg-decor {
          position: fixed;
          inset: 0;
          pointer-events: none;
          z-index: 0;
          background: linear-gradient(135deg, #1B2836 0%, #243447 50%, #172230 100%);
          background-size: 300% 300%;
          animation: eveningNightGlow 14s ease infinite alternate;
        }
        @keyframes eveningNightGlow {
          0% { background-position: 0% 0%; }
          100% { background-position: 100% 100%; }
        }
        
        .card-dark {
          background: rgba(27, 40, 54, 0.65) !important;
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.12) !important;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2) !important;
        }
        
        .textarea {
          background: rgba(255, 255, 255, 0.05) !important;
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          border: 1px solid rgba(255, 255, 255, 0.15) !important;
          color: #ffffff !important;
          transition: all 0.3s ease !important;
        }
        .textarea:focus {
          background: rgba(255, 255, 255, 0.08) !important;
          border-color: var(--orange) !important;
          box-shadow: 0 0 12px var(--orange-glow) !important;
        }
        
        .input {
          background: rgba(255, 255, 255, 0.05) !important;
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          border: 1px solid rgba(255, 255, 255, 0.15) !important;
          color: #ffffff !important;
          transition: all 0.3s ease !important;
        }
        .input:focus {
          background: rgba(255, 255, 255, 0.08) !important;
          border-color: var(--orange) !important;
          box-shadow: 0 0 12px var(--orange-glow) !important;
        }
        
        .tag {
          background: rgba(255, 255, 255, 0.06) !important;
          backdrop-filter: blur(4px);
          -webkit-backdrop-filter: blur(4px);
          border: 1px solid rgba(255, 255, 255, 0.12) !important;
          color: rgba(255, 255, 255, 0.7) !important;
          transition: all 0.25s ease !important;
        }
        .tag:hover {
          background: rgba(255, 255, 255, 0.12) !important;
          border-color: var(--orange) !important;
          color: #ffffff !important;
        }
        .tag.active {
          background: rgba(244, 162, 97, 0.2) !important;
          border-color: var(--orange) !important;
          color: var(--orange) !important;
          box-shadow: 0 0 10px var(--orange-glow) !important;
        }

        .evening-star {
          position: fixed;
          width: 2px;
          height: 2px;
          background: #FFFFFF;
          border-radius: 50%;
          pointer-events: none;
          z-index: 0;
          opacity: 0.3;
          animation: twinkleStar 3s ease-in-out infinite alternate;
        }
        @keyframes twinkleStar {
          0% { opacity: 0.2; transform: scale(0.8); }
          100% { opacity: 1; transform: scale(1.4); box-shadow: 0 0 6px rgba(255, 255, 255, 0.8); }
        }
        
        .star--1 { top: 15%; left: 20%; animation-delay: 0s; }
        .star--2 { top: 38%; left: 78%; animation-delay: 0.5s; }
        .star--3 { top: 72%; left: 14%; animation-delay: 1.2s; }
        .star--4 { top: 22%; left: 88%; animation-delay: 1.8s; }
        .star--5 { top: 58%; left: 62%; animation-delay: 2.2s; }
        .star--6 { top: 88%; left: 45%; animation-delay: 0.7s; }
        .star--7 { top: 8%; left: 54%; animation-delay: 1.4s; }
        .star--8 { top: 48%; left: 28%; animation-delay: 2.5s; }
      `}</style>

      {/* Starry Night Elements */}
      <div className="evening-bg-decor" aria-hidden="true" />
      <div className="evening-star star--1" aria-hidden="true" />
      <div className="evening-star star--2" aria-hidden="true" />
      <div className="evening-star star--3" aria-hidden="true" />
      <div className="evening-star star--4" aria-hidden="true" />
      <div className="evening-star star--5" aria-hidden="true" />
      <div className="evening-star star--6" aria-hidden="true" />
      <div className="evening-star star--7" aria-hidden="true" />
      <div className="evening-star star--8" aria-hidden="true" />

      {/* Page Navigation & Save state indicator */}
      <div className="flex items-center justify-between w-full animate-in">
        <button
          onClick={() => navigate('/dashboard')}
          className="btn-secondary"
          aria-label="العودة إلى لوحة التحكم"
        >
          <ChevronLeft size={16} />
          <span>العودة</span>
        </button>

        {/* Autosave badge */}
        <div className="badge" role="status" aria-live="polite">
          {autoSaving ? (
            <>
              <span className="loader loader-sm" />
              <span>جاري الحفظ...</span>
            </>
          ) : lastSaved ? (
            <span>تم الحفظ {lastSaved}</span>
          ) : (
            <span>جاهز للحفظ</span>
          )}
        </div>
      </div>

      {/* 1. HEADER */}
      <header className="page-header animate-in animate-in-delay-1">
        <div className="flex items-center gap-md">
          <Moon size={28} style={{ color: 'var(--orange)' }} />
          <h1 style={{ color: 'var(--text-accent)' }}>
            إيه اللي حصل النهارده؟
          </h1>
        </div>
        <p>
          يوم هادئ في انتظار مراجعتك الشخصية.
        </p>
      </header>

      {/* 2. CARD: إنجازات اليوم */}
      <section className="card-dark animate-in animate-in-delay-2" role="region" aria-label="إنجازات اليوم">
        <div className="flex items-center justify-between gap-md mb-md">
          <h3 className="flex items-center gap-sm" style={{ color: 'var(--text-accent)' }}>
            ✅ إنجازات اليوم
          </h3>
          {totalCount > 0 && (
            <span className="badge badge-orange">
              {completedCount}/{totalCount}
            </span>
          )}
        </div>

        {/* Progress bar */}
        {totalCount > 0 && (
          <div className="progress-bar mb-md">
            <div className="progress-fill" style={{ width: `${progressPercent}%` }} />
          </div>
        )}

        {/* Task list container */}
        <div className="flex flex-col gap-md">
          {tasks.length > 0 ? (
            tasks.map((task) => (
              <div
                key={task.id}
                className="flex items-center justify-between"
                style={{
                  padding: 'var(--space-md) var(--space-lg)',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--input-bg)',
                  border: '1px solid var(--border-ui)'
                }}
              >
                <label className="checkbox-custom" style={{ flex: 1, padding: 0 }}>
                  <input
                    type="checkbox"
                    checked={task.completed}
                    onChange={() => handleToggleTask(task.id)}
                    aria-label={`تبديل حالة: ${task.text}`}
                  />
                  <span 
                    className="checkbox-mark"
                    style={{
                      borderColor: task.completed ? 'var(--orange)' : 'var(--border-ui-hover)',
                      backgroundColor: task.completed ? 'var(--orange)' : 'transparent',
                      boxShadow: task.completed ? '0 0 10px var(--orange-glow)' : 'none',
                      transition: 'all 0.25s ease'
                    }}
                  >
                    <Check size={14} strokeWidth={3} />
                  </span>
                  <span className={`checkbox-label ${task.completed ? 'checked' : ''}`}>
                    {task.text}
                  </span>
                </label>

                <button
                  type="button"
                  className="btn-ghost"
                  onClick={() => handleDeleteTask(task.id)}
                  aria-label={`حذف المهمة: ${task.text}`}
                  style={{ color: 'var(--red)' }}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))
          ) : (
            <p className="text-center text-muted" style={{ padding: 'var(--space-lg) 0', fontStyle: 'italic' }}>
              لا توجد مهام مسجلة اليوم. أضف واحدة جديدة بالأسفل.
            </p>
          )}
        </div>

        {/* Inline Add Task Form */}
        <form onSubmit={handleAddTask} className="flex gap-sm mt-md w-full">
          <button
            type="submit"
            className="btn-primary"
            aria-label="إضافة مهمة جديدة"
            style={{ flexShrink: 0, width: '44px', height: '44px', padding: 0, borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <Plus size={20} />
          </button>

          <input
            type="text"
            className="input"
            value={newTaskText}
            onChange={(e) => setNewTaskText(e.target.value)}
            placeholder="أضف مهمة جديدة للإنجازات..."
            aria-label="نص المهمة الجديدة"
          />
        </form>
      </section>

      {/* 3. CARD: لحظة سعيدة */}
      <section className="card-dark animate-in animate-in-delay-3" role="region" aria-label="لحظة سعيدة">
        <h3 className="flex items-center gap-sm mb-md" style={{ color: 'var(--text-accent)' }}>
          <Heart size={20} style={{ color: 'var(--orange)' }} />
          لحظة سعيدة ✨
        </h3>

        <div className="flex justify-between items-center mb-sm w-full">
          <label className="font-bold" style={{ color: 'var(--text-main)', margin: 0 }}>
            ما الذي جعلك تبتسم اليوم؟
          </label>
          <button
            type="button"
            onClick={handleGeneratePrompt}
            className="btn-ghost flex items-center gap-xs text-xs font-bold"
            style={{ color: 'var(--orange)', cursor: 'pointer', border: 'none', background: 'none', display: 'flex', padding: 0 }}
          >
            <Sparkles size={13} style={{ color: 'var(--orange)' }} />
            <span>سؤال ملهم 💭</span>
          </button>
        </div>

        {currentPrompt && (
          <div 
            className="card p-sm mb-sm flex justify-between items-center animate-in"
            style={{
              background: 'rgba(244, 162, 97, 0.08)',
              border: '1px dashed var(--orange)',
              borderRadius: 'var(--radius-md)',
              display: 'flex',
              alignItems: 'center',
              width: '100%',
              boxSizing: 'border-box',
              marginBottom: '12px'
            }}
          >
            <p className="text-sm font-bold text-main" style={{ flex: 1, margin: 0, paddingLeft: '8px', textAlign: 'right' }}>
              {currentPrompt}
            </p>
            <div className="flex gap-sm" style={{ flexShrink: 0, display: 'flex', gap: '6px' }}>
              <button
                type="button"
                onClick={handleUsePrompt}
                className="btn-primary"
                style={{ padding: '4px 10px', fontSize: '0.75rem', borderRadius: '4px' }}
              >
                استخدام
              </button>
              <button
                type="button"
                onClick={() => setCurrentPrompt('')}
                className="btn-secondary"
                style={{ padding: '4px 10px', fontSize: '0.75rem', borderRadius: '4px' }}
              >
                تخطي
              </button>
            </div>
          </div>
        )}

        <textarea
          className="textarea"
          rows={4}
          value={happyText}
          onChange={(e) => setHappyText(e.target.value)}
          placeholder="تفاصيل دافئة، كلمة طيبة، كوب شاي، إنجاز بسيط..."
          aria-label="وصف اللحظة السعيدة"
          style={{ resize: 'none' }}
        />

        {/* Tags selector */}
        <div className="flex flex-col gap-sm mt-md">
          <span className="text-sm text-muted flex items-center gap-xs">
            <Tag size={14} />
            أوسمة اللحظة:
          </span>

          <div className="flex flex-wrap gap-sm">
            {tagsList.map((tag) => {
              const isSelected = selectedTags.includes(tag);
              return (
                <button
                  key={tag}
                  type="button"
                  className={`tag ${isSelected ? 'active' : ''}`}
                  onClick={() => handleToggleTag(tag)}
                  aria-label={`${isSelected ? 'إزالة' : 'إضافة'} وسم: ${tag}`}
                  aria-pressed={isSelected}
                >
                  # {tag}
                </button>
              );
            })}
          </div>

          {/* Custom tag input */}
          <form onSubmit={handleAddCustomTag} className="flex gap-sm mt-sm">
            <input
              type="text"
              className="input"
              value={customTagText}
              onChange={(e) => setCustomTagText(e.target.value)}
              placeholder="أضف وسمك الخاص..."
              aria-label="إضافة وسم مخصص"
              style={{ flex: 1 }}
            />
            <button
              type="submit"
              className="btn-ghost"
              aria-label="إضافة الوسم"
              style={{ color: 'var(--orange)' }}
            >
              <Plus size={18} />
              أضف
            </button>
          </form>

          {/* Show custom selected tags (those not in the tagsList) */}
          {selectedTags.filter((t) => !tagsList.includes(t)).length > 0 && (
            <div className="flex flex-wrap gap-sm mt-sm">
              {selectedTags
                .filter((t) => !tagsList.includes(t))
                .map((tag) => (
                  <span
                    key={tag}
                    className="tag active flex items-center gap-xs"
                  >
                    # {tag}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                      aria-label={`إزالة وسم: ${tag}`}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', display: 'flex', padding: 0 }}
                    >
                      <X size={14} />
                    </button>
                  </span>
                ))}
            </div>
          )}
        </div>
      </section>

      {/* 4. CARD: التخطيط للغد */}
      <section className="card-dark animate-in animate-in-delay-4" role="region" aria-label="التخطيط للغد">
        <h3 className="flex items-center gap-sm mb-md" style={{ color: 'var(--text-accent)' }}>
          <Calendar size={20} style={{ color: 'var(--orange)' }} />
          التخطيط للغد 🗓
        </h3>

        {/* Goal for tomorrow */}
        <div className="flex flex-col gap-sm mb-md">
          <label className="font-bold" style={{ color: 'var(--text-main)' }}>
            الهدف الرئيسي ليوم غد
          </label>
          <input
            type="text"
            className="input"
            value={tomorrowGoal}
            onChange={(e) => setTomorrowGoal(e.target.value)}
            placeholder="اكتب هدفك هنا..."
            aria-label="الهدف الرئيسي لليوم التالي"
          />
        </div>

        {/* Pickers: Wakeup & Focus Session */}
        <div className="flex flex-wrap gap-xl">

          {/* Wake up time */}
          <div className="flex flex-col gap-sm" style={{ flex: 1, minWidth: '140px' }}>
            <label className="text-sm text-muted flex items-center gap-xs">
              <Clock size={14} style={{ color: 'var(--orange)' }} />
              وقت الاستيقاظ المقترح
            </label>
            <input
              type="time"
              className="input"
              value={wakeUpTime}
              onChange={(e) => setWakeUpTime(e.target.value)}
              aria-label="وقت الاستيقاظ"
            />
          </div>

          {/* Focus session (range inputs) */}
          <div className="flex flex-col gap-sm" style={{ flex: 2, minWidth: '260px' }}>
            <label className="text-sm text-muted flex items-center gap-xs">
              <Clock size={14} style={{ color: 'var(--orange)' }} />
              وقت جلسة التركيز
            </label>

            <div className="flex items-center gap-md">
              <input
                type="time"
                className="input"
                value={focusStart}
                onChange={(e) => setFocusStart(e.target.value)}
                aria-label="بداية جلسة التركيز"
                style={{ flex: 1 }}
              />
              <span className="text-sm text-muted">إلى</span>
              <input
                type="time"
                className="input"
                value={focusEnd}
                onChange={(e) => setFocusEnd(e.target.value)}
                aria-label="نهاية جلسة التركيز"
                style={{ flex: 1 }}
              />
            </div>
          </div>

        </div>
      </section>

      {/* 5. SUBMIT BUTTON / SUCCESS MSG */}
      {showSuccess ? (
        <div className="card text-center animate-in animate-in-delay-5" style={{ borderColor: 'var(--green)', background: 'rgba(40, 167, 69, 0.1)', borderStyle: 'solid', borderWidth: '1px' }}>
          <h3 style={{ color: 'var(--green)' }}>
            وثّقتِ يوم {Math.floor((new Date() - new Date(new Date().getFullYear(), 0, 0)) / (1000 * 60 * 60 * 24))} من رحلتك 🌿
          </h3>
          <p className="text-sm font-bold mt-sm" style={{ color: 'var(--green)' }}>
            كل يوم بتوثقيه هو هدية لنفسك في المستقبل.
          </p>
        </div>
      ) : (
        <button
          onClick={handleFinalSubmit}
          className="btn-primary w-full animate-in animate-in-delay-5"
          aria-label="حفظ المذكرة المسائية والعودة"
          style={{ padding: 'var(--space-lg) var(--space-xl)', fontSize: '1.1rem' }}
        >
          <Moon size={20} />
          <span>حفظ المذكرة المسائية</span>
        </button>
      )}

    </div>
  );
};

export default Evening;
