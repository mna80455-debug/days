import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { db, isMock } from '../firebase/config';
import { collection, getDocs, doc, getDoc, setDoc } from 'firebase/firestore';
import { Sun, Moon, BookOpen, Calendar, Award, Play, Pause, RotateCcw, X, Heart, Flame, TrendingUp, Compass, Check, Sparkles, Volume2, VolumeX } from 'lucide-react';
import { CATEGORIES } from './Morning';

/* ── helpers ─────────────────────────────── */

const affirmations = [
  "أنا أستحق السلام والراحة اليوم وكل يوم.",
  "جهدي الصغير اليوم كافٍ تماماً، وأنا فخورة بسعيي.",
  "أنا أتقبل نفسي كما أنا الآن بكل رفق وحب.",
  "عقلي هادئ، وجسدي مسترخٍ، وروحي مطمئنة.",
  "أمتلك القوة لتجاوز أي عاصفة خارجية بسلام داخلي.",
  "كل نفس آخذه الآن يملأ جسدي بالهدوء والسكينة.",
  "أنا أسامح نفسي على أخطاء الماضي وأركز على جمال الحاضر.",
  "اليوم، أختار أن أكون لطيفة مع ذاتي وأتجنب الضغط الزائد.",
  "أنا محمية ومحاطة بالسلام والهدوء في مساحتي الخاصة.",
  "حياتي تمضي بمرونة، وأنا أثق بمسار رحلتي."
];

/** Return "YYYY-MM-DD" for a Date object */
const toDateKey = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

/** Count consecutive days backward from today in a Set of date-keys */
const calcStreak = (dateSet) => {
  let streak = 0;
  const d = new Date();
  
  // If today is not in the set, check if yesterday is in the set
  const todayKey = toDateKey(d);
  if (!dateSet.has(todayKey)) {
    // Start checking from yesterday
    d.setDate(d.getDate() - 1);
  }
  
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const key = toDateKey(d);
    if (dateSet.has(key)) {
      streak++;
      d.setDate(d.getDate() - 1);
    } else {
      break;
    }
  }
  return streak;
};

/* ── SVG progress ring constants ─────────── */
const RING_RADIUS = 68;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;
const TOTAL_SECONDS = 300; // 5 min

/* ── component ───────────────────────────── */

const Dashboard = () => {
  const { currentUser } = useAuth();
  const { theme } = useTheme();

  /* page stats */
  const [stats, setStats] = useState({
    totalReflections: 0,
    dominantMood: 'لا يوجد بعد',
    streak: 0,
  });
  const [loadingStats, setLoadingStats] = useState(true);
  const [closestEvent, setClosestEvent] = useState(null);
  const [habitsCount, setHabitsCount] = useState({ completed: 0, total: 5, percent: 0 });

  /* Vision Board and Affirmation states */
  const [visionImages, setVisionImages] = useState(Array(6).fill(''));
  const [showWallpaperModal, setShowWallpaperModal] = useState(false);
  const [uploadingSlot, setUploadingSlot] = useState(null);

  /* AI quote states */
  const [aiQuote, setAiQuote] = useState('');
  const [loadingQuote, setLoadingQuote] = useState(false);

  /* Audio synthesizer states and refs */
  const [soundMode, setSoundMode] = useState('none'); // 'none', 'drone', 'rain'
  const audioContextRef = useRef(null);
  const oscRef = useRef(null);
  const gainNodeRef = useRef(null);
  const rainBufferSourceRef = useRef(null);
  const rainGainNodeRef = useRef(null);

  /* liked quote state */
  const [isQuoteLiked, setIsQuoteLiked] = useState(false);

  /* today's reflection details */
  const [todayReflection, setTodayReflection] = useState({
    morning: null,
    evening: null,
    loading: true,
  });

  /* living clock */
  const [currentTime, setCurrentTime] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  /* load vision board images */
  useEffect(() => {
    if (!currentUser) return;

    const loadVisionBoard = async () => {
      let imagesList = Array(6).fill('');

      if (isMock) {
        const saved = localStorage.getItem(`days_vision_board_${currentUser.uid}`);
        if (saved) {
          imagesList = JSON.parse(saved);
        }
      } else {
        try {
          const docRef = doc(db, 'users', currentUser.uid, 'settings', 'vision_board');
          const docSnap = await getDoc(docRef);
          if (docSnap.exists() && docSnap.data().images) {
            imagesList = docSnap.data().images;
          }
        } catch (err) {
          console.error('Error loading vision board:', err);
        }
      }
      
      const padded = [...imagesList, ...Array(6).fill('')].slice(0, 6);
      setVisionImages(padded);
    };

    loadVisionBoard();
  }, [currentUser]);

  const handleUploadVisionImage = async (slotIndex, event) => {
    const file = event.target.files[0];
    if (!file || !currentUser) return;

    setUploadingSlot(slotIndex);

    const compressImage = (imgFile) => {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement('canvas');
            const MAX_WIDTH = 300;
            const MAX_HEIGHT = 300;
            let width = img.width;
            let height = img.height;

            if (width > height) {
              if (width > MAX_WIDTH) {
                height *= MAX_WIDTH / width;
                width = MAX_WIDTH;
              }
            } else {
              if (height > MAX_HEIGHT) {
                width *= MAX_HEIGHT / height;
                height = MAX_HEIGHT;
              }
            }

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL('image/jpeg', 0.85));
          };
          img.src = e.target.result;
        };
        reader.readAsDataURL(imgFile);
      });
    };

    try {
      let finalUrl = '';
      
      const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || localStorage.getItem(`days_cloudinary_cloud_name_${currentUser.uid}`);
      const preset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || localStorage.getItem(`days_cloudinary_upload_preset_${currentUser.uid}`);

      if (cloudName && preset) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', preset);

        const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
          method: 'POST',
          body: formData
        });
        const data = await response.json();
        finalUrl = data.secure_url;
      } else {
        finalUrl = await compressImage(file);
      }

      if (finalUrl) {
        const updated = [...visionImages];
        updated[slotIndex] = finalUrl;
        setVisionImages(updated);

        if (isMock) {
          localStorage.setItem(`days_vision_board_${currentUser.uid}`, JSON.stringify(updated));
        } else {
          const docRef = doc(db, 'users', currentUser.uid, 'settings', 'vision_board');
          await setDoc(docRef, { images: updated }, { merge: true });
        }
      }
    } catch (err) {
      console.error('Vision board image upload failed:', err);
      alert('فشل رفع الصورة للوحة الرؤية.');
    } finally {
      setUploadingSlot(null);
    }
  };

  const handleRemoveVisionImage = async (slotIndex) => {
    const updated = [...visionImages];
    updated[slotIndex] = '';
    setVisionImages(updated);

    try {
      if (isMock) {
        localStorage.setItem(`days_vision_board_${currentUser.uid}`, JSON.stringify(updated));
      } else {
        const docRef = doc(db, 'users', currentUser.uid, 'settings', 'vision_board');
        await setDoc(docRef, { images: updated }, { merge: true });
      }
    } catch (err) {
      console.error('Error removing vision image:', err);
    }
  };

  const handleCopyAffirmation = () => {
    navigator.clipboard.writeText(dailyAffirmation);
    alert('تم نسخ توكيد اليوم لروحكِ 🌸✨');
  };

  /* meditation timer */
  const [showTimer, setShowTimer] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(TOTAL_SECONDS);
  const [timerActive, setTimerActive] = useState(false);
  const [breathState, setBreathState] = useState('شهيق');

  /* year metrics */
  const now = useMemo(() => new Date(), []);
  const start = new Date(now.getFullYear(), 0, 0);
  const oneDay = 1000 * 60 * 60 * 24;
  const dayOfYear = Math.floor((now - start) / oneDay);
  const totalDaysInYear = now.getFullYear() % 4 === 0 ? 366 : 365;
  const daysRemaining = totalDaysInYear - dayOfYear;
  const percentOfYearPassed = Math.round((dayOfYear / totalDaysInYear) * 100);
  const dailyAffirmation = affirmations[dayOfYear % affirmations.length];

  /* daily quote */
  const dailyQuotes = [
    "كن حضوراً كاملاً في كل شيء تفعله، فاليقظة هي بوابة السلام.",
    "لا تقاس الأيام بكثرة مشاغلها، بل بعمق حضورك فيها.",
    "السعادة لا تأتي بعد الإنجاز، بل تولد من الامتنان لرحلة السعي.",
    "تنفس بعمق، ودع المخاوف تتبخر مع زفير اليوم.",
    "كل لحظة هي بداية جديدة، وكل بداية تحمل في طياتها سلاماً دافئاً.",
    "حافظي على هدوء داخلك، فالعاصفة الخارجية لا تؤثر في البيت الثابت.",
    "اقبلي يومك كما هو، وابحثي عن الجمال الصغير المخبأ بين تفاصيله.",
    "الحضور الذهني هو هدية تقدمينها لنفسك في كل دقيقة من يومك.",
    "تأملي برفق، وعيشي ببطء، وتذوقي تفاصيل حياتك بامتنان.",
    "كل يوم تعيشينه بوعي هو إضافة حقيقية لعمق حياتك.",
  ];
  const dailyQuote = dailyQuotes[dayOfYear % dailyQuotes.length];

  /* ── fetch stats ────────────────────────── */
  useEffect(() => {
    if (!currentUser) return;

    const calculateStats = async () => {
      setLoadingStats(true);
      let mornings = [];
      let eveningsCount = 0;

      if (isMock) {
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key.startsWith(`days_mornings_${currentUser.uid}_`)) {
            const data = JSON.parse(localStorage.getItem(key));
            const parts = key.split('_');
            const dateStr = parts[parts.length - 1]; // YYYY-MM-DD
            mornings.push({
              ...data,
              date: data.date || dateStr
            });
          }
          if (key.startsWith(`days_evenings_${currentUser.uid}_`)) {
            eveningsCount++;
          }
        }
      } else {
        try {
          const mornRef = collection(db, 'users', currentUser.uid, 'mornings');
          const mornSnap = await getDocs(mornRef);
          mornSnap.forEach((doc) => {
            const data = doc.data();
            mornings.push({
              ...data,
              date: data.date || doc.id
            });
          });

          const eveRef = collection(db, 'users', currentUser.uid, 'evenings');
          const eveSnap = await getDocs(eveRef);
          eveningsCount = eveSnap.size;
        } catch (err) {
          console.error('Firestore stats loading error:', err);
        }
      }

      /* dominant mood */
      const moodCounts = {};
      let dominant = 'لا يوجد بعد';
      let maxCount = 0;
      mornings.forEach((m) => {
        if (m.mood) {
          moodCounts[m.mood] = (moodCounts[m.mood] || 0) + 1;
          if (moodCounts[m.mood] > maxCount) {
            maxCount = moodCounts[m.mood];
            dominant = m.mood;
          }
        }
      });

      /* streak – actual consecutive days */
      const dateSet = new Set();
      mornings.forEach((m) => {
        // support both Firestore Timestamp and plain string dates
        if (typeof m.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(m.date)) {
          dateSet.add(m.date);
        } else if (m.date) {
          const d = m.date.toDate ? m.date.toDate() : new Date(m.date);
          dateSet.add(toDateKey(d));
        } else if (m.createdAt) {
          const d = m.createdAt.toDate ? m.createdAt.toDate() : new Date(m.createdAt);
          dateSet.add(toDateKey(d));
        }
      });
      const streak = calcStreak(dateSet);

      setStats({ totalReflections: eveningsCount, dominantMood: dominant, streak });
      setLoadingStats(false);
    };

    calculateStats();
  }, [currentUser]);

  /* fetch today's habits for summary widget */
  useEffect(() => {
    if (!currentUser) return;

    const fetchTodayHabits = async () => {
      const todayStr = toDateKey(new Date());
      let dayData = null;

      if (isMock) {
        const saved = localStorage.getItem(`days_habits_${currentUser.uid}_${todayStr}`);
        if (saved) dayData = JSON.parse(saved);
      } else {
        try {
          const docRef = doc(db, 'users', currentUser.uid, 'habits', todayStr);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) dayData = docSnap.data();
        } catch (err) {
          console.error('Error loading today habits for widget:', err);
        }
      }

      if (dayData) {
        const total = 5 + (dayData.customHabits?.length || 0);
        const completed = dayData.completed?.length || 0;
        const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
        setHabitsCount({ completed, total, percent });
      } else {
        setHabitsCount({ completed: 0, total: 5, percent: 0 });
      }
    };

    fetchTodayHabits();
  }, [currentUser]);

  const generateAIQuote = async (mood, topTask) => {
    setLoadingQuote(true);
    const userName = currentUser?.displayName || 'صديقتي';
    const cleanMood = mood || '🍃';
    const cleanTask = topTask || 'يومكِ الجميل';

    // Check if Groq or Gemini API keys exist
    const groqApiKey = import.meta.env.VITE_GROQ_API_KEY;
    const geminiApiKey = import.meta.env.VITE_GEMINI_API_KEY;
    const prompt = `أنت مرشد تأملي دافئ ومساعد نفسي لشركة "أيام". اكتب اقتباساً تأملياً دافئاً، ملهماً، وقصيراً جداً (سطر واحد فقط) باللغة العربية موجه لـ "${userName}". هي تشعر اليوم بـ "${cleanMood}" وهدفها لليوم هو "${cleanTask}". اجعل الاقتباس يعبر عن تفهم عميق لمزاجها الحالي ويدعمها برفق دون إعطاء نصائح مباشرة أو أوامر. لا تذكر كلمة "اقتباس" ولا تستخدم علامات اقتباس خارجية في النص.`;

    if (groqApiKey) {
      try {
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${groqApiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'llama-3.1-8b-instant',
            messages: [
              {
                role: 'user',
                content: prompt
              }
            ],
            temperature: 0.7,
            max_tokens: 120
          })
        });

        const data = await response.json();
        const text = data.choices?.[0]?.message?.content?.trim();
        if (text) {
          const cleanedText = text.replace(/^["'«“”]+|["'»“”]+$/g, '');
          setAiQuote(cleanedText);
          setLoadingQuote(false);
          return;
        }
      } catch (err) {
        console.error('Failed to generate Groq quote:', err);
      }
    } else if (geminiApiKey) {
      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
            }),
          }
        );

        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
        if (text) {
          const cleanedText = text.replace(/^["'«“”]+|["'»“”]+$/g, '');
          setAiQuote(cleanedText);
          setLoadingQuote(false);
          return;
        }
      } catch (err) {
        console.error('Failed to generate Gemini quote:', err);
      }
    }

    // Local Intelligent Template Generator (Fallback)
    const localTemplates = {
      'متحمسة': [
        `طاقة حماسكِ اليوم يا ${userName} جميلة جداً؛ استمتعي بكل لحظة وأنتِ تسعين نحو "${cleanTask}".`,
        `شغفكِ اليوم يا ${userName} كفيل بإضاءة دروبكِ؛ انطلقي بكل ثقة لإنجاز "${cleanTask}".`
      ],
      'هادئة': [
        `في هدوء روحكِ يا ${userName} تكمن قوة عظيمة؛ اقتربي من "${cleanTask}" بخطوات مطمئنة.`,
        `سلامكِ الداخلي يا ${userName} هو أثمن ما تملكين؛ دعي هدوءكِ يرافق خطواتكِ اليوم.`
      ],
      'ممتنة': [
        `الامتنان يفتح أبواب السلام يا ${userName}؛ عندما تبدأين "${cleanTask}"، دعي قلبكِ يبتسم للنعم الصغيرة.`,
        `ممتنة لحضوركِ يا ${userName}؛ خطوتكِ اليوم نحو "${cleanTask}" هي تعبير جميل عن تقديركِ لفرص الحياة.`
      ],
      'مرهقة': [
        `التعب يخبركِ أن جسدكِ يستحق الحب يا ${userName}؛ رفقاً بنفسكِ اليوم وأنتِ تسعين لـ "${cleanTask}".`,
        `الراحة ليست كسلاً يا ${userName}، بل هي وقود الاستمرار؛ خذي وقتاً لنفسكِ بجانب سعيِك لـ "${cleanTask}".`
      ],
      'قلقة': [
        `يا ${userName}، القلق غيمة ستعبر؛ تنفسي بعمق، وضعي تركيزكِ على خطوة واحدة مريحة نحو "${cleanTask}".`,
        `لا تحملي همّ الغد يا ${userName}، أنتِ بأمان الآن؛ خطوتكِ الصغيرة لـ "${cleanTask}" هي كل ما تحتاجينه.`
      ],
      'محايدة': [
        `في الأيام الهادئة والمحايدة يا ${userName} تكمن فرصة للشحن؛ خوضي غمار "${cleanTask}" بسلاسة ودون ضغوط.`,
        `يوم آخر هو فرصة جديدة للحضور الهادئ يا ${userName}؛ دعي خطواتكِ لـ "${cleanTask}" تنساب بمرونة.`
      ]
    };

    let selectedGroup = localTemplates['محايدة'];
    for (const key in localTemplates) {
      if (cleanMood.includes(key)) {
        selectedGroup = localTemplates[key];
        break;
      }
    }

    const randomQuote = selectedGroup[Math.floor(Math.random() * selectedGroup.length)];
    setAiQuote(randomQuote);
    setLoadingQuote(false);
  };

  /* ── fetch today's reflections ───────────── */
  useEffect(() => {
    if (!currentUser) return;

    const fetchTodayReflection = async () => {
      setTodayReflection((prev) => ({ ...prev, loading: true }));
      const todayStr = toDateKey(new Date());
      let morningDoc = null;
      let eveningDoc = null;

      if (isMock) {
        const mornSaved = localStorage.getItem(`days_mornings_${currentUser.uid}_${todayStr}`);
        if (mornSaved) morningDoc = JSON.parse(mornSaved);

        const eveSaved = localStorage.getItem(`days_evenings_${currentUser.uid}_${todayStr}`);
        if (eveSaved) eveningDoc = JSON.parse(eveSaved);
      } else {
        try {
          const mornRef = doc(db, 'users', currentUser.uid, 'mornings', todayStr);
          const mornSnap = await getDoc(mornRef);
          if (mornSnap.exists()) morningDoc = mornSnap.data();

          const eveRef = doc(db, 'users', currentUser.uid, 'evenings', todayStr);
          const eveSnap = await getDoc(eveRef);
          if (eveSnap.exists()) eveningDoc = eveSnap.data();
        } catch (err) {
          console.error('Error loading today reflections:', err);
        }
      }

      setTodayReflection({
        morning: morningDoc,
        evening: eveningDoc,
        loading: false,
      });

      if (morningDoc) {
        generateAIQuote(morningDoc.mood, morningDoc.topTask);
      } else {
        const userName = currentUser?.displayName || 'صديقتي';
        setAiQuote(`ابدأي صباحكِ وسجّلي نواياكِ ومزاجكِ اليوم يا ${userName} لكي أولد لكِ تأملاً واقتباساً مخصصاً يُحاكي شعوركِ ✨`);
      }
    };

    fetchTodayReflection();
  }, [currentUser]);

  /* fetch upcoming events for closest widget */
  useEffect(() => {
    if (!currentUser) return;

    const fetchDashboardEvents = async () => {
      let list = [];
      if (isMock) {
        const saved = localStorage.getItem(`days_events_${currentUser.uid}`);
        if (saved) {
          list = JSON.parse(saved);
        }
      } else {
        try {
          const eventsRef = collection(db, 'users', currentUser.uid, 'events');
          const snap = await getDocs(eventsRef);
          list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (err) {
          console.error('Error loading dashboard events:', err);
        }
      }

      const now = new Date();
      now.setHours(0, 0, 0, 0);

      const eventsWithDaysLeft = list.map(ev => {
        const evDate = new Date(ev.date);
        evDate.setHours(0, 0, 0, 0);

        let targetDate = new Date(evDate);
        if (ev.isYearly) {
          targetDate.setFullYear(now.getFullYear());
          if (targetDate < now) {
            targetDate.setFullYear(now.getFullYear() + 1);
          }
        }

        const diffTime = targetDate - now;
        const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        return {
          ...ev,
          targetDate,
          daysLeft
        };
      })
      .filter(ev => ev.daysLeft >= 0)
      .sort((a, b) => a.daysLeft - b.daysLeft);

      if (eventsWithDaysLeft.length > 0) {
        const first = eventsWithDaysLeft[0];
        const emojis = {
          birthday: '🎂',
          anniversary: '💍',
          exam: '📚',
          special: '🌟',
          general: '📌'
        };
        const formattedDate = new Intl.DateTimeFormat('ar-EG', { day: 'numeric', month: 'long', year: 'numeric' }).format(first.targetDate);
        setClosestEvent({
          name: first.name,
          emoji: emojis[first.type] || '📌',
          daysLeft: first.daysLeft,
          formattedDate
        });
      } else {
        setClosestEvent(null);
      }
    };

    fetchDashboardEvents();
  }, [currentUser]);

  /* ── meditation countdown ───────────────── */
  useEffect(() => {
    let interval = null;
    if (timerActive && timerSeconds > 0) {
      interval = setInterval(() => setTimerSeconds((p) => p - 1), 1000);
    } else if (timerSeconds === 0) {
      setTimerActive(false);
    }
    return () => clearInterval(interval);
  }, [timerActive, timerSeconds]);

  /* ── breathing cycle ────────────────────── */
  useEffect(() => {
    let breathInterval = null;
    if (timerActive) {
      breathInterval = setInterval(() => {
        setBreathState((prev) => {
          if (prev === 'شهيق') return 'حبس النفس';
          if (prev === 'حبس النفس') return 'زفير';
          return 'شهيق';
        });
      }, 4000);
    }
    return () => clearInterval(breathInterval);
  }, [timerActive]);

  /* ── Web Audio Synth Control Effect ─────── */
  useEffect(() => {
    const stopAudio = () => {
      try {
        if (oscRef.current) {
          oscRef.current.forEach(o => {
            try { o.stop(); } catch(e){}
          });
          oscRef.current = null;
        }
        if (gainNodeRef.current) {
          gainNodeRef.current.disconnect();
          gainNodeRef.current = null;
        }
        if (rainBufferSourceRef.current) {
          try { rainBufferSourceRef.current.stop(); } catch(e){}
          rainBufferSourceRef.current = null;
        }
        if (rainGainNodeRef.current) {
          rainGainNodeRef.current.disconnect();
          rainGainNodeRef.current = null;
        }
      } catch (e) {
        console.error('Error stopping audio:', e);
      }
    };

    if (!timerActive || soundMode === 'none' || !showTimer) {
      stopAudio();
      return;
    }

    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    const ctx = audioContextRef.current;
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    stopAudio(); // clear previous

    if (soundMode === 'drone') {
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc1.type = 'sine';
      osc1.frequency.value = 110; // Low A
      
      osc2.type = 'sine';
      osc2.frequency.value = 165; // E (harmonic fifth)
      
      gain.gain.setValueAtTime(0.04, ctx.currentTime);
      
      // LFO to create breathing swell effect
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      lfo.frequency.value = 0.25; // 4 seconds cycle
      lfoGain.gain.value = 0.02;
      
      lfo.connect(lfoGain);
      lfoGain.connect(gain.gain);
      
      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);
      
      osc1.start();
      osc2.start();
      lfo.start();
      
      oscRef.current = [osc1, osc2, lfo];
      gainNodeRef.current = gain;
    } else if (soundMode === 'rain') {
      const bufferSize = ctx.sampleRate * 2;
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }
      
      const whiteNoise = ctx.createBufferSource();
      whiteNoise.buffer = noiseBuffer;
      whiteNoise.loop = true;
      
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(450, ctx.currentTime);
      
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      lfo.frequency.value = 0.08;
      lfoGain.gain.value = 120;
      
      lfo.connect(lfoGain);
      lfoGain.connect(filter.frequency);
      
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      
      whiteNoise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      
      whiteNoise.start();
      lfo.start();
      
      rainBufferSourceRef.current = whiteNoise;
      rainGainNodeRef.current = gain;
      oscRef.current = [lfo];
    }

    return () => {
      stopAudio();
    };
  }, [timerActive, soundMode, showTimer]);

  /* ── quote favoriting effect and helper ──── */
  useEffect(() => {
    if (!currentUser || !aiQuote) return;
    const favorites = JSON.parse(localStorage.getItem(`days_favorite_quotes_${currentUser.uid}`) || '[]');
    setIsQuoteLiked(favorites.includes(aiQuote));
  }, [currentUser, aiQuote]);

  const handleToggleLikeQuote = () => {
    if (!currentUser || !aiQuote) return;
    const key = `days_favorite_quotes_${currentUser.uid}`;
    let favorites = JSON.parse(localStorage.getItem(key) || '[]');
    if (favorites.includes(aiQuote)) {
      favorites = favorites.filter(q => q !== aiQuote);
      setIsQuoteLiked(false);
    } else {
      favorites.push(aiQuote);
      setIsQuoteLiked(true);
    }
    localStorage.setItem(key, JSON.stringify(favorites));
  };

  const handleStartTimer = () => {
    setTimerSeconds(TOTAL_SECONDS);
    setTimerActive(true);
    setShowTimer(true);
    setBreathState('شهيق');
  };
  const togglePlay = () => setTimerActive(!timerActive);
  const resetTimer = () => {
    setTimerSeconds(TOTAL_SECONDS);
    setTimerActive(false);
    setBreathState('شهيق');
  };
  const formatTime = (sec) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  /* SVG ring offset */
  const ringOffset = RING_CIRCUMFERENCE * (1 - timerSeconds / TOTAL_SECONDS);

  /* breathing helper text */
  const breathHint =
    breathState === 'شهيق'
      ? 'تنشقي السلام والهدوء...'
      : breathState === 'زفير'
        ? 'أخرجي كل التعب والضيق...'
        : 'اثبتي برفق...';

  /* time greeting */
  const currentHour = currentTime.getHours();
  let timeGreeting = '';
  if (currentHour >= 5 && currentHour < 8) timeGreeting = 'الفجر هادئ، اليوم لسه في إيدك ✨';
  else if (currentHour >= 8 && currentHour < 12) timeGreeting = 'الصبح بيمشي، استخدمه كويس ☀️';
  else if (currentHour >= 12 && currentHour < 15) timeGreeting = 'النهار في منتصفه، إيه اللي عملتيه؟ 🌤';
  else if (currentHour >= 15 && currentHour < 18) timeGreeting = 'العصر جه، اليوم بيتقلص 🍂';
  else if (currentHour >= 18 && currentHour < 21) timeGreeting = 'الغروب قرب، راجعي يومك 🌅';
  else timeGreeting = 'الليل جه، إيه اللي تاخديه معاكِ من النهارده؟ 🌙';

  const timeString = new Intl.DateTimeFormat('ar-EG', { hour: 'numeric', minute: 'numeric', hour12: true }).format(currentTime);
  const dateString = new Intl.DateTimeFormat('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }).format(currentTime);

  const isMorningActive = currentHour >= 5 && currentHour < 11;
  const isMiddayActive = currentHour >= 11 && currentHour < 17;
  const isEveningActive = currentHour >= 17 || currentHour < 5;

  const MOOD_EMOJIS = {
    'متحمسة': '🔥',
    'هادئة': '😌',
    'ممتنة': '🙏',
    'مرهقة': '😴',
    'قلقة': '😟',
    'محايدة': '😐'
  };

  /* ═══════════════════ RENDER ═══════════════════ */
  return (
    <div className="page-content-wide">

      {/* ─── 1. PAGE HEADER ─── */}
      <section className="page-header animate-in">
        <h1>أهلاً بكِ في مساحتك الهادئة، {currentUser?.displayName || 'يا صديقتي'} ✨</h1>
        
        <div className="card my-md p-md" style={{ textAlign: 'center', background: 'rgba(255, 255, 255, 0.4)' }}>
          <h2 style={{ fontSize: '2.5rem', color: 'var(--brown)', marginBottom: 'var(--space-xs)' }}>{timeString}</h2>
          <p className="text-md font-bold text-muted mb-sm">{dateString}</p>
          <p className="font-bold" style={{ color: 'var(--orange)', fontSize: '1.1rem' }}>{timeGreeting}</p>
        </div>

        <p>لترى كيف مضت رحلتك اليوم.</p>
      </section>

      {/* Daily Affirmation Banner */}
      <div className="card my-md p-md text-center animate-in animate-in-delay-1" style={{ border: '1px dashed var(--orange)', background: 'linear-gradient(135deg, rgba(244, 162, 97, 0.08) 0%, rgba(226, 149, 120, 0.08) 100%)' }}>
        <span className="text-xs text-muted font-bold flex items-center gap-xs justify-center mb-xs">
          <Sparkles size={14} className="text-accent" />
          توكيد اليوم لسكينتكِ 🌸
        </span>
        <p className="text-lg font-black text-main my-sm">"{dailyAffirmation}"</p>
        <div className="flex justify-center gap-sm mt-sm">
          <button onClick={handleCopyAffirmation} className="btn-secondary text-xs" style={{ padding: '4px 10px', width: 'auto', border: '1px solid var(--border-ui)' }}>
            نسخ التوكيد 🔗
          </button>
          <button onClick={() => setShowWallpaperModal(true)} className="btn-primary text-xs" style={{ padding: '4px 10px', width: 'auto' }}>
            عرض كخلفية للجوال 📱
          </button>
        </div>
      </div>

      {/* ─── 2. DAILY JOURNEY TIMELINE (خط الزمن لليوم) ─── */}
      <div className="card animate-in animate-in-delay-1" style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 'var(--space-xl)', padding: 'var(--space-2xl)', background: 'var(--bg-card)' }}>
        <style>{`
          .daily-timeline::before {
            background: linear-gradient(180deg, var(--orange) 0%, var(--green) 50%, var(--border-ui) 100%) !important;
            width: 3px !important;
            box-shadow: 0 0 6px var(--orange-glow);
          }
          .timeline-step {
            transition: transform 0.2s ease;
          }
          .timeline-step:hover {
            transform: translateX(-4px);
          }
          .timeline-badge {
            box-shadow: 0 2px 6px rgba(0,0,0,0.06);
            transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) !important;
          }
          .timeline-step.active .timeline-badge {
            background: linear-gradient(135deg, var(--orange) 0%, var(--orange-hover) 100%) !important;
            border-color: var(--orange) !important;
            box-shadow: 0 0 12px var(--orange-glow) !important;
          }
          .timeline-step.completed .timeline-badge {
            background: linear-gradient(135deg, var(--green) 0%, #1d7065 100%) !important;
            border-color: var(--green) !important;
            box-shadow: 0 0 10px rgba(42, 157, 143, 0.35) !important;
          }
          .vision-board-grid {
            display: grid;
            grid-template-columns: repeat(6, 1fr);
            gap: var(--space-md);
            margin-top: var(--space-md);
          }
          @media (max-width: 768px) {
            .vision-board-grid {
              grid-template-columns: repeat(3, 1fr);
            }
          }
          @media (max-width: 480px) {
            .vision-board-grid {
              grid-template-columns: repeat(2, 1fr);
            }
          }
          .vision-slot:hover {
            transform: translateY(-2.5px);
            border-color: var(--orange) !important;
            box-shadow: var(--shadow-md);
          }
        `}</style>
        
        <h3 className="flex items-center gap-sm" style={{ borderBottom: '1px solid var(--border-ui)', paddingBottom: 'var(--space-md)' }}>
          <Compass size={20} className="text-accent" />
          <span>رحلتك اليومية 🗺️</span>
        </h3>

        {todayReflection.loading ? (
          <div className="flex justify-center" style={{ padding: 'var(--space-xl) 0' }}>
            <span className="loader" />
          </div>
        ) : (
          <div className="daily-timeline">
            
            {/* STAGE 1: MORNING */}
            <div className={`timeline-step ${isMorningActive ? 'active' : ''} ${todayReflection.morning ? 'completed' : ''}`}>
              <div className="timeline-badge">
                {todayReflection.morning ? <Check size={12} strokeWidth={3} /> : <span>١</span>}
              </div>
              <div className="timeline-content">
                <div className="flex justify-between items-center w-full">
                  <div>
                    <h4>الصباح ونوايا اليوم 🌅</h4>
                    <p className="text-sm">تحديد النوايا والمزاج لتوجه خطواتك بكل حضور.</p>
                  </div>
                  {todayReflection.morning ? (
                    <div className="flex items-center gap-sm">
                      <span className="badge badge-green">تم التوثيق ✓</span>
                      <Link to="/morning" className="btn-ghost text-xs font-bold" style={{ color: 'var(--orange)' }}>
                        تعديل
                      </Link>
                    </div>
                  ) : (
                    <Link to="/morning" className="btn-primary" style={{ padding: '6px 14px', fontSize: '0.85rem', borderRadius: 'var(--radius-md)' }}>
                      ابدأ صباحك ☀️
                    </Link>
                  )}
                </div>
                {todayReflection.morning && (
                  <div className="timeline-summary mt-sm p-sm rounded-md" style={{ background: 'var(--input-bg)', border: '1px solid var(--border-ui)' }}>
                    <p className="text-xs text-muted">
                      المزاج الغالب: <strong>{todayReflection.morning.mood} {MOOD_EMOJIS[todayReflection.morning.mood] || ''}</strong>
                    </p>
                    {todayReflection.morning.topTask && (
                      <p className="text-xs text-muted mt-xs">
                        الهدف الرئيسي: <strong>{todayReflection.morning.topTask}</strong>
                      </p>
                    )}
                    {todayReflection.morning.tasks && todayReflection.morning.tasks.length > 0 && (
                      <div className="mt-sm pt-sm border-t border-dashed border-ui flex flex-col gap-xs">
                        <p className="text-[0.68rem] text-muted font-bold mb-0.5">نوايا ومهام اليوم:</p>
                        <div className="flex flex-wrap gap-xs">
                          {todayReflection.morning.tasks.map(t => {
                            const cat = CATEGORIES.find(c => c.id === t.category) || { icon: '📌', color: 'var(--orange)', label: 'أخرى' };
                            return (
                              <span 
                                key={t.id}
                                className="text-[0.65rem] px-xs py-0.5 rounded font-bold flex items-center gap-xs"
                                style={{
                                  backgroundColor: cat.color + '12',
                                  color: cat.color,
                                  border: `1px solid ${cat.color}25`,
                                  textDecoration: t.completed ? 'line-through' : 'none',
                                  opacity: t.completed ? 0.6 : 1
                                }}
                              >
                                <span>{cat.icon} {t.text}</span>
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* STAGE 2: MIDDAY MEDITATION */}
            <div className={`timeline-step ${isMiddayActive ? 'active' : ''}`}>
              <div className="timeline-badge">
                <span>٢</span>
              </div>
              <div className="timeline-content">
                <div className="flex justify-between items-center w-full">
                  <div>
                    <h4>جلسة التأمل والوقوف الواعي 🧘‍♀️</h4>
                    <p className="text-sm">تخصيص 5 دقائق في منتصف اليوم للتنفس الهادئ.</p>
                  </div>
                  <button onClick={handleStartTimer} className="btn-secondary" style={{ padding: '6px 14px', fontSize: '0.85rem', borderRadius: 'var(--radius-md)' }}>
                    ابدأ الجلسة 🧘‍♀️
                  </button>
                </div>
              </div>
            </div>

            {/* STAGE 3: EVENING */}
            <div className={`timeline-step ${isEveningActive ? 'active' : ''} ${todayReflection.evening ? 'completed' : ''}`}>
              <div className="timeline-badge">
                {todayReflection.evening ? <Check size={12} strokeWidth={3} /> : <span>٣</span>}
              </div>
              <div className="timeline-content">
                <div className="flex justify-between items-center w-full">
                  <div>
                    <h4>مراجعة المساء والامتنان 🌙</h4>
                    <p className="text-sm">تأمل ما أنجزته وتسجيل اللحظات السعيدة لليوم.</p>
                  </div>
                  {todayReflection.evening ? (
                    <div className="flex items-center gap-sm">
                      <span className="badge badge-green">تم التوثيق ✓</span>
                      <Link to="/evening" className="btn-ghost text-xs font-bold" style={{ color: 'var(--orange)' }}>
                        تعديل
                      </Link>
                    </div>
                  ) : (
                    <Link to="/evening" className="btn-primary" style={{ padding: '6px 14px', fontSize: '0.85rem', borderRadius: 'var(--radius-md)' }}>
                      راجع مساءك 🌙
                    </Link>
                  )}
                </div>
                {todayReflection.evening && (
                  <div className="timeline-summary mt-sm p-sm rounded-md" style={{ background: 'var(--input-bg)', border: '1px solid var(--border-ui)' }}>
                    {todayReflection.evening.happyMoment?.text && (
                      <p className="text-xs text-muted">
                        اللحظة السعيدة: <strong>{todayReflection.evening.happyMoment.text}</strong>
                      </p>
                    )}
                    {todayReflection.evening.tomorrowGoal && (
                      <p className="text-xs text-muted mt-xs">
                        الهدف الرئيسي للغد: <strong>{todayReflection.evening.tomorrowGoal}</strong>
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>

          </div>
        )}
      </div>

      {/* ─── 3. YEAR COUNTER & QUOTE ─── */}
      <div className="page-grid animate-in animate-in-delay-2">

        {/* Year Counter */}
        <div className="card" role="region" aria-label="العداد السنوي">
          <div className="flex flex-col gap-lg">
            <span className="badge badge-orange">
              <Calendar size={14} />
              العداد السنوي
            </span>

            <h2>
              اليوم رقم{' '}
              <span className="text-accent font-black" style={{ fontSize: '1.8rem' }}>
                {dayOfYear}
              </span>{' '}
              من السنة
            </h2>

            <p className="text-sm font-bold">
              مرّ: {dayOfYear} يوم &nbsp;|&nbsp; متبقي: {daysRemaining} يوم
            </p>

            <div className="flex flex-col gap-sm">
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${percentOfYearPassed}%` }} />
              </div>
              <span className="text-xs text-muted font-bold" style={{ alignSelf: 'flex-end' }}>
                مضى {percentOfYearPassed}% من العام الحالي
              </span>
            </div>
          </div>
        </div>

        {/* Daily Quote */}
        <div className="card-quote font-bold" role="region" aria-label="تأمل اليوم" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '160px' }}>
          <div className="flex justify-between items-center w-full mb-xs">
            <span className="text-xs text-muted font-bold flex items-center gap-xs">
              <Sparkles size={14} className="text-accent" />
              تأمل ذكي مخصص لكِ
            </span>
          </div>

          {loadingQuote ? (
            <div className="flex justify-center items-center flex-1">
              <span className="loader loader-sm" />
            </div>
          ) : (
            <p className="text-md font-bold" style={{ fontStyle: 'italic', lineHeight: '1.8', maxWidth: '340px', margin: '0 auto', position: 'relative', zIndex: 1 }}>
              "{aiQuote}"
            </p>
          )}

          <div className="flex justify-between items-center w-full mt-md pt-sm" style={{ borderTop: '1px solid var(--border-ui)', zIndex: 2 }}>
            <span className="text-xs text-muted font-bold">
              — الوعي اليومي
            </span>
            <button
              type="button"
              onClick={handleToggleLikeQuote}
              disabled={loadingQuote || !todayReflection.morning}
              className="btn-ghost p-xs"
              style={{ color: isQuoteLiked ? 'var(--red)' : 'var(--text-muted)', cursor: 'pointer', border: 'none', background: 'none', display: 'flex', alignItems: 'center' }}
              aria-label="أعجبني الاقتباس"
            >
              <Heart size={16} fill={isQuoteLiked ? 'var(--red)' : 'none'} style={{ color: isQuoteLiked ? 'var(--red)' : 'var(--text-muted)' }} />
            </button>
          </div>
        </div>
      </div>

      {/* ─── 4. JOURNEY SUMMARY & MEDITATION ─── */}
      <div className="page-grid animate-in animate-in-delay-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>

        {/* Journey Summary */}
        <div className="card" role="region" aria-label="ملخص رحلتك">
          <div className="flex flex-col gap-lg">
            <h3 style={{ borderBottom: '1px solid var(--border-ui)', paddingBottom: 'var(--space-md)' }}>
              ملخص رحلتك 📖
            </h3>

            {loadingStats ? (
              <div className="flex justify-center" style={{ padding: 'var(--space-xl) 0' }}>
                <span className="loader" />
              </div>
            ) : (
              <div className="flex flex-col gap-lg">
                {/* Dominant mood */}
                <div className="flex justify-between items-center">
                  <span className="text-muted font-bold text-sm">المزاج الغالب:</span>
                  <span className="badge badge-orange" style={{ fontSize: '0.9rem' }}>
                    {stats.dominantMood}
                  </span>
                </div>

                {/* Total reflections */}
                <div className="flex justify-between items-center">
                  <span className="text-muted font-bold text-sm">التأملات المسجلة:</span>
                  <span className="text-accent font-bold text-lg">
                    <BookOpen size={16} style={{ display: 'inline', verticalAlign: 'middle', marginLeft: 'var(--space-xs)' }} />
                    {stats.totalReflections} تأملاً
                  </span>
                </div>

                {/* Streak */}
                <div className="flex flex-col gap-xs pb-sm border-b border-ui border-dashed text-right">
                  <div className="flex justify-between items-center">
                    <span className="text-muted font-bold text-sm">أيام متتالية:</span>
                    <span className="font-bold text-lg" style={{ color: stats.streak > 0 ? 'var(--green)' : 'var(--text-main)' }}>
                      <Flame size={16} style={{ display: 'inline', verticalAlign: 'middle', marginLeft: 'var(--space-xs)' }} />
                      {stats.streak} {stats.streak === 1 ? 'يوم' : 'أيام'} 🔥
                    </span>
                  </div>
                  <p className="text-[11px] text-muted text-right font-medium leading-relaxed" style={{ margin: 0 }}>
                    {stats.streak === 0 ? (
                      '🌿 لا بأس بالبدء من جديد! كل يوم هو فرصة جديدة لتواجدك الواعي. حضوركِ اليوم هو المهم.'
                    ) : !todayReflection.morning ? (
                      '🔥 شعلتكِ مستمرة! سجّلي نوايا الصباح اليوم لتحافظي على حضوركِ المتتالي.'
                    ) : (
                      `✨ رائع! أنتِ مستمرة في الحضور لليوم الـ ${stats.streak} على التوالي. فخورون بكِ!`
                    )}
                  </p>
                </div>

                {/* Habits Summary */}
                <div className="flex flex-col gap-xs text-right mt-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-muted font-bold text-sm">عادات اليوم 🌸:</span>
                    <Link to="/habits" className="font-bold text-sm hover:underline" style={{ color: 'var(--orange)', textDecoration: 'none' }}>
                      {habitsCount.completed} من {habitsCount.total} مكتملة ✨
                    </Link>
                  </div>
                  <div className="progress-bar mt-xs" style={{ height: '6px' }}>
                    <div className="progress-fill" style={{ width: `${habitsCount.percent}%`, backgroundColor: 'var(--orange)' }} />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Meditation Card */}
        <div className="card" role="region" aria-label="جلسة تأمل مقترحة">
          <div className="flex flex-col gap-lg">
            <div className="flex gap-lg items-center">
              <div className="flex flex-col gap-xs">
                <span className="badge badge-orange">
                  <Heart size={14} />
                  جلسة تأمل مقترحة
                </span>
                <h4>هدوء المساء: 5 دقائق من التنفس</h4>
              </div>
            </div>

            <p className="text-sm">
              خصصي 5 دقائق فقط من يومك للاسترخاء، والتركيز على شهيق وزفير متزن لترتيب الفوضى الداخلية.
            </p>

            <button
              onClick={handleStartTimer}
              className="btn-primary"
              aria-label="ابدأي جلسة التأمل"
            >
              <Play size={16} />
              <span>ابدأي الآن</span>
            </button>
          </div>
        </div>

        {/* Nearest Event Card */}
        <Link 
          to="/calendar" 
          className="card hover:scale-[1.01] transition-transform duration-300 flex flex-col gap-lg" 
          style={{ textDecoration: 'none', color: 'inherit', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}
          role="region"
          aria-label="أقرب مناسبة قادمة"
        >
          <div className="flex flex-col gap-md">
            <span className="badge badge-orange" style={{ alignSelf: 'flex-start' }}>
              <Calendar size={14} />
              أقرب مناسبة 🗓️
            </span>
            
            {closestEvent ? (
              <div className="flex flex-col gap-sm text-right mt-sm">
                <h4 className="text-xl font-bold flex items-center gap-xs justify-end" style={{ margin: 0 }}>
                  <span>{closestEvent.emoji}</span>
                  <span>{closestEvent.name}</span>
                </h4>
                <p className="text-md font-bold text-muted mt-xs" style={{ margin: 0 }}>
                  {closestEvent.daysLeft === 0 ? (
                    <span className="text-accent font-black">🎉 اليوم!</span>
                  ) : closestEvent.daysLeft === 1 ? (
                    <span className="text-accent font-black">⏰ غداً!</span>
                  ) : (
                    <span>متبقي <strong className="text-accent font-black text-xl">{closestEvent.daysLeft}</strong> يوم</span>
                  )}
                </p>
                <p className="text-xs text-muted font-semibold" style={{ margin: 0 }}>{closestEvent.formattedDate}</p>
              </div>
            ) : (
              <p className="text-sm text-muted text-center mt-md italic">
                لا توجد مناسبات قادمة — أضفي الآن 🗓️
              </p>
            )}
          </div>
          
          <span className="btn-secondary text-xs py-1.5 px-sm w-full mt-md text-center">
            عرض التقويم 🗓️
          </span>
        </Link>
      </div>

      {/* ─── Vision Board (لوحة الرؤية والتركيز) ─── */}
      <section className="card animate-in animate-in-delay-4" style={{ width: '100%', padding: 'var(--space-2xl)', background: 'var(--bg-card)' }}>
        <h3 className="flex items-center gap-sm" style={{ borderBottom: '1px solid var(--border-ui)', paddingBottom: 'var(--space-md)', marginBottom: 'var(--space-lg)' }}>
          <Sparkles size={20} className="text-accent" />
          <span>لوحة الرؤية والتركيز 🖼️✨</span>
        </h3>
        <p className="text-sm text-muted mb-md">أضيفي صوراً تُمثّل أحلامكِ وأهدافكِ لتذكّرها والتركيز عليها يومياً.</p>

        <div className="vision-board-grid">
          {visionImages.map((imgUrl, index) => (
            <div 
              key={index} 
              className="vision-slot"
              style={{
                position: 'relative',
                aspectRatio: '1',
                borderRadius: 'var(--radius-lg)',
                overflow: 'hidden',
                border: '2px dashed var(--border-ui)',
                background: 'var(--input-bg)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.3s ease',
                cursor: imgUrl ? 'default' : 'pointer'
              }}
            >
              {imgUrl ? (
                <>
                  <img 
                    src={imgUrl} 
                    alt={`حلم ${index + 1}`} 
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                  <button 
                    onClick={() => handleRemoveVisionImage(index)}
                    className="remove-btn"
                    aria-label="مسح الصورة"
                    style={{
                      position: 'absolute',
                      top: '8px',
                      right: '8px',
                      background: 'rgba(230, 57, 70, 0.9)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '50%',
                      width: '26px',
                      height: '26px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '14px',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                      transition: 'opacity 0.2s',
                      zIndex: 10
                    }}
                  >
                    <X size={14} />
                  </button>
                </>
              ) : (
                <label style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', gap: 'var(--space-xs)', padding: 'var(--space-sm)' }}>
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={(e) => handleUploadVisionImage(index, e)}
                    style={{ display: 'none' }}
                    disabled={uploadingSlot !== null}
                  />
                  {uploadingSlot === index ? (
                    <span className="loader loader-sm" />
                  ) : (
                    <>
                      <span style={{ fontSize: '1.6rem' }}>📸</span>
                      <span className="text-[11px] font-bold text-muted">أضيفي حلمكِ</span>
                    </>
                  )}
                </label>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ─── 5. STATS ROW ─── */}
      <div className="page-grid animate-in animate-in-delay-4" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <div className="card-solid text-center">
          <Award size={28} color="var(--orange)" style={{ margin: '0 auto var(--space-sm)' }} />
          <h3 className="text-accent" style={{ fontSize: '1.6rem' }}>{loadingStats ? '…' : stats.streak}</h3>
          <p className="text-sm text-muted font-bold">أيام متتالية</p>
        </div>
        <div className="card-solid text-center">
          <TrendingUp size={28} color="var(--green)" style={{ margin: '0 auto var(--space-sm)' }} />
          <h3 style={{ fontSize: '1.6rem', color: 'var(--green)' }}>{loadingStats ? '…' : stats.totalReflections}</h3>
          <p className="text-sm text-muted font-bold">تأمل مسجّل</p>
        </div>
        <div className="card-solid text-center">
          <Calendar size={28} color="var(--brown-light)" style={{ margin: '0 auto var(--space-sm)' }} />
          <h3 style={{ fontSize: '1.6rem' }}>{dayOfYear}</h3>
          <p className="text-sm text-muted font-bold">يوم من العام</p>
        </div>
      </div>

      {/* ═══════════════ MEDITATION TIMER MODAL ═══════════════ */}
      {showTimer && (
        <div
          className="modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label="جلسة تأمل"
        >
          <div className="modal animate-scale" style={{ textAlign: 'center' }}>
            {/* Close */}
            <button
              className="btn-icon"
              onClick={() => { setShowTimer(false); setTimerActive(false); }}
              aria-label="إغلاق جلسة التأمل"
              style={{ alignSelf: 'flex-start' }}
            >
              <X size={20} />
            </button>

            {/* SVG ring wrapper with pulsing breathing wave */}
            <div style={{ position: 'relative', width: '180px', height: '180px', margin: 'var(--space-lg) auto', zIndex: 1 }}>
              {timerActive && (
                <div 
                  style={{
                    position: 'absolute',
                    inset: '0px',
                    borderRadius: '50%',
                    border: '4px solid var(--orange-glow)',
                    zIndex: 0,
                    animation: 'meditationBreatheWave 4s ease-in-out infinite',
                    pointerEvents: 'none'
                  }}
                />
              )}
              
              <style>{`
                @keyframes meditationBreatheWave {
                  0%, 100% { transform: scale(0.95); opacity: 0.2; box-shadow: 0 0 0 0 var(--orange-glow); }
                  50% { transform: scale(1.1); opacity: 0.8; box-shadow: 0 0 20px 10px var(--orange-glow); }
                }
              `}</style>

              <svg
                width="180"
                height="180"
                viewBox="0 0 180 180"
                style={{ display: 'block', position: 'relative', zIndex: 2 }}
                aria-hidden="true"
              >
                {/* background track */}
                <circle
                  cx="90"
                  cy="90"
                  r={RING_RADIUS}
                  fill="none"
                  stroke="var(--border-ui)"
                  strokeWidth="6"
                />
                {/* animated fill */}
                <circle
                  cx="90"
                  cy="90"
                  r={RING_RADIUS}
                  fill="none"
                  stroke="var(--orange)"
                  strokeWidth="6"
                  strokeLinecap="round"
                  strokeDasharray={RING_CIRCUMFERENCE}
                  strokeDashoffset={ringOffset}
                  transform="rotate(-90 90 90)"
                  style={{ transition: 'stroke-dashoffset 1s linear' }}
                />
                {/* timer text */}
                <text
                  x="90"
                  y="90"
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill="var(--text-main)"
                  fontFamily="var(--font-arabic)"
                  fontWeight="900"
                  fontSize="2rem"
                >
                  {formatTime(timerSeconds)}
                </text>
              </svg>
            </div>

            {/* Breathing guidance */}
            <div className="flex flex-col items-center gap-sm" style={{ minHeight: '60px' }}>
              {timerSeconds > 0 ? (
                <>
                  <span
                    className="font-black text-accent"
                    style={{
                      fontSize: '1.5rem',
                      animation: timerActive ? 'breathe 4s ease-in-out infinite' : 'none',
                    }}
                  >
                    {breathState}
                  </span>
                  <span className="text-sm text-muted">{breathHint}</span>
                </>
              ) : (
                <span className="font-black" style={{ fontSize: '1.3rem', color: 'var(--green)' }}>
                  أحسنتِ! تم إتمام الجلسة 🌸
                </span>
              )}
            </div>

            {/* Sound Selection Controls */}
            {timerSeconds > 0 && (
              <div className="flex flex-col gap-xs justify-center items-center mt-md p-xs rounded-md bg-cream/40 border border-ui" style={{ maxWidth: '280px', margin: '16px auto 0 auto' }}>
                <span className="text-xs text-muted font-bold flex items-center gap-xs">
                  <Volume2 size={13} style={{ color: 'var(--orange)' }} />
                  صوت الخلفية الهادئ:
                </span>
                <div className="flex gap-sm mt-xs">
                  {[
                    { id: 'none', label: 'صامت', icon: <VolumeX size={12} /> },
                    { id: 'drone', label: 'نبض عميق 🧘‍♀️', icon: <Sparkles size={12} /> },
                    { id: 'rain', label: 'مطر خفيف 🌧️', icon: <Volume2 size={12} /> }
                  ].map(sound => (
                    <button
                      key={sound.id}
                      type="button"
                      onClick={() => setSoundMode(sound.id)}
                      className="badge transition-all text-xs flex items-center gap-xs"
                      style={{
                        backgroundColor: soundMode === sound.id ? 'var(--orange)' : 'transparent',
                        color: soundMode === sound.id ? '#fff' : 'var(--text-main)',
                        border: `1px solid ${soundMode === sound.id ? 'var(--orange)' : 'var(--border-ui)'}`,
                        padding: '4px 8px',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontWeight: soundMode === sound.id ? '700' : 'normal'
                      }}
                    >
                      {sound.icon}
                      <span>{sound.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Controls */}
            {timerSeconds > 0 && (
              <div className="flex justify-center gap-md mt-lg" style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                <button
                  className="btn-primary flex items-center justify-center gap-xs px-md py-sm"
                  onClick={togglePlay}
                  aria-label={timerActive ? 'إيقاف مؤقت' : 'تشغيل'}
                  style={{ borderRadius: 'var(--radius-md)', height: '42px', fontSize: '0.9rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  {timerActive ? (
                    <>
                      <Pause size={16} />
                      <span>إيقاف مؤقت (Off)</span>
                    </>
                  ) : (
                    <>
                      <Play size={16} />
                      <span>بدء التنفس (On)</span>
                    </>
                  )}
                </button>
                <button
                  className="btn-secondary flex items-center justify-center gap-xs px-md py-sm"
                  onClick={resetTimer}
                  aria-label="إعادة ضبط المؤقت"
                  style={{ borderRadius: 'var(--radius-md)', height: '42px', fontSize: '0.9rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <RotateCcw size={16} />
                  <span>إعادة ضبط</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
      {/* ═══════════════ WALLPAPER AFFIRMATION MODAL ═══════════════ */}
      {showWallpaperModal && (
        <div
          className="modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label="توكيدكِ كخلفية شاشة"
        >
          <div className="modal animate-scale" style={{ textAlign: 'center', maxWidth: '400px', padding: 'var(--space-xl)' }}>
            {/* Close */}
            <div className="flex justify-between items-center mb-md">
              <h3 className="font-bold text-md" style={{ margin: 0 }}>خلفية توكيد اليوم 📱✨</h3>
              <button
                className="btn-icon"
                onClick={() => setShowWallpaperModal(false)}
                aria-label="إغلاق المعاينة"
              >
                <X size={20} />
              </button>
            </div>

            <p className="text-xs text-muted mb-md">يمكنكِ أخذ لقطة شاشة (Screenshot) لحفظ هذه اللوحة اللطيفة كخلفية لهاتفكِ وتذكّر توكيدكِ دوماً.</p>

            {/* Smartphone Frame Preview */}
            <div 
              id="wallpaper-preview-frame"
              style={{
                width: '240px',
                height: '420px',
                margin: '0 auto var(--space-lg) auto',
                borderRadius: '32px',
                border: '8px solid var(--brown)',
                boxShadow: 'var(--shadow-lg)',
                position: 'relative',
                overflow: 'hidden',
                background: 'linear-gradient(180deg, #F4A261 0%, #D8A7B1 100%)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                padding: 'var(--space-2xl) var(--space-lg) var(--space-2xl) var(--space-lg)',
                color: 'white',
                textAlign: 'center',
                boxSizing: 'border-box'
              }}
            >
              {/* Phone Notch/Status Bar info */}
              <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', fontSize: '0.65rem', fontWeight: 'bold', opacity: 0.8 }}>
                <span>٠٩:٤١</span>
                <div style={{ width: '40px', height: '14px', borderRadius: '7px', background: 'var(--brown)', margin: '-16px auto 0 auto', position: 'absolute', left: 'calc(50% - 20px)' }} />
                <span style={{ display: 'flex', gap: '2px' }}>📶 🔋</span>
              </div>

              {/* Center content */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: 'var(--space-md)' }}>
                <span style={{ fontSize: '2.5rem' }}>🌸</span>
                <p 
                  style={{ 
                    fontFamily: 'var(--font-arabic)', 
                    fontSize: '1.2rem', 
                    fontWeight: '900', 
                    lineHeight: '1.8',
                    textShadow: '0 2px 4px rgba(0,0,0,0.2)',
                    margin: 0,
                    padding: '0 var(--space-sm)'
                  }}
                >
                  "{dailyAffirmation}"
                </p>
                <div style={{ width: '30px', height: '2px', background: 'white', opacity: 0.6, margin: 'var(--space-sm) 0' }} />
                <span style={{ fontSize: '0.7rem', fontWeight: 'bold', letterSpacing: '2px', opacity: 0.9 }}>تطبيق أيام</span>
              </div>

              {/* Bottom decorative hint */}
              <div style={{ fontSize: '0.6rem', opacity: 0.7 }}>
                تنفسي بعمق • أنتِ بأمان
              </div>
            </div>

            {/* Customization Options */}
            <div className="flex flex-col gap-xs mt-md">
              <span className="text-xs text-muted font-bold">تغيير لون الخلفية:</span>
              <div className="flex gap-sm justify-center mt-xs">
                {[
                  { name: 'غروب دافئ', grad: 'linear-gradient(180deg, #F4A261 0%, #D8A7B1 100%)' },
                  { name: 'صباح هادئ', grad: 'linear-gradient(180deg, #A8DADC 0%, #FEE8A8 100%)' },
                  { name: 'ليلكي حالم', grad: 'linear-gradient(180deg, #6D597A 0%, #B5A2C4 100%)' },
                  { name: 'عشب رطب', grad: 'linear-gradient(180deg, #2a9d8f 0%, #E8DDD0 100%)' }
                ].map((bgOption, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      const frame = document.getElementById('wallpaper-preview-frame');
                      if (frame) frame.style.background = bgOption.grad;
                    }}
                    className="badge text-xs"
                    style={{
                      padding: '4px 8px',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      border: '1px solid var(--border-ui)',
                      background: 'var(--bg-card-solid)',
                      color: 'var(--text-main)'
                    }}
                  >
                    {bgOption.name}
                  </button>
                ))}
              </div>
            </div>

            <button 
              onClick={handleCopyAffirmation}
              className="btn-primary w-full mt-lg"
              style={{ padding: '10px' }}
            >
              نسخ نص التوكيد 📋
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
