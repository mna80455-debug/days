import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { db, isMock } from '../firebase/config';
import { collection, getDocs } from 'firebase/firestore';
import { PieChart, ChevronLeft, Award, Sun, Moon } from 'lucide-react';

const Statistics = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  // Data states
  const [mornings, setMornings] = useState([]);
  const [evenings, setEvenings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timeFilter, setTimeFilter] = useState(7); // 7 or 30 days

  const generateMockStatsIfEmpty = (uid) => {
    const dates = [];
    for (let i = 0; i < 15; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      dates.push(dateStr);
    }

    const mockMornings = [
      { mood: 'هادئة', topTask: 'كتابة التقرير الأساسي', tasks: [] },
      { mood: 'ممتنة', topTask: 'الاجتماع الفني للمشروع', tasks: [] },
      { mood: 'متحمسة', topTask: 'بناء واجهات التطبيق', tasks: [] },
      { mood: 'مرهقة', topTask: 'مراجعة الملاحظات', tasks: [] },
      { mood: 'هادئة', topTask: 'تعديل التصميم العام', tasks: [] },
      { mood: 'ممتنة', topTask: 'إنهاء مهام الـ PWA', tasks: [] },
      { mood: 'متحمسة', topTask: 'إطلاق النسخة التجريبية', tasks: [] },
      { mood: 'هادئة', topTask: 'جلسة اليقظة الذهنية', tasks: [] },
      { mood: 'مرهقة', topTask: 'ترتيب مكتب العمل', tasks: [] },
      { mood: 'ممتنة', topTask: 'كوب شاي المساء', tasks: [] },
      { mood: 'هادئة', topTask: 'تنظيم جدول الأسبوع', tasks: [] },
      { mood: 'ممتنة', topTask: 'قراءة ملخصات اليوم', tasks: [] },
      { mood: 'متحمسة', topTask: 'تجربة الميزات الجديدة', tasks: [] },
      { mood: 'هادئة', topTask: 'ممارسة الرياضة الخفيفة', tasks: [] },
      { mood: 'مرهقة', topTask: 'تهيئة كود المشروع', tasks: [] }
    ];

    const mockEvenings = [
      { happyMoment: { text: 'مشيت ربع ساعة اليوم في الطبيعة', tags: ['هدوء', 'طبيعة'] } },
      { happyMoment: { text: 'أعددت فنجان قهوة لذيذ مع قراءة كتاب', tags: ['قهوة', 'امتنان', 'قراءة'] } },
      { happyMoment: { text: 'جلسة تأمل رائعة ونوم مبكر', tags: ['هدوء', 'تأمل'] } },
      { happyMoment: { text: 'مكالمة هاتفية دافئة مع صديقة قديمة', tags: ['امتنان', 'فرح'] } },
      { happyMoment: { text: 'نزهة خفيفة وقت الغروب', tags: ['طبيعة', 'هدوء'] } },
      { happyMoment: { text: 'إنهاء المهمة المعقدة في مشروعي اليوم', tags: ['إنجاز', 'فرح'] } },
      { happyMoment: { text: 'جلسة قراءة ملهمة', tags: ['قراءة', 'امتنان'] } },
      { happyMoment: { text: 'شاهدت غروب الشمس الرائع اليوم', tags: ['هدوء', 'طبيعة'] } },
      { happyMoment: { text: 'مساعدة زميلة عمل في كود معقد', tags: ['امتنان', 'إنجاز'] } },
      { happyMoment: { text: 'ضحك متواصل مع الأصدقاء', tags: ['فرح', 'امتنان'] } },
      { happyMoment: { text: 'جلسة استرخاء', tags: ['هدوء'] } },
      { happyMoment: { text: 'فنجان شاي لذيذ', tags: ['قهوة', 'هدوء'] } },
      { happyMoment: { text: 'كتابة وتدوين تأملي', tags: ['قراءة', 'امتنان'] } },
      { happyMoment: { text: 'تمرين تنفس هادئ', tags: ['تأمل', 'هدوء'] } },
      { happyMoment: { text: 'كتابة نوايا واعية', tags: ['إنجاز'] } }
    ];

    dates.forEach((date, index) => {
      const morningKey = `days_mornings_${uid}_${date}`;
      const eveningKey = `days_evenings_${uid}_${date}`;
      
      if (!localStorage.getItem(morningKey)) {
        localStorage.setItem(morningKey, JSON.stringify(mockMornings[index]));
      }
      if (!localStorage.getItem(eveningKey)) {
        localStorage.setItem(eveningKey, JSON.stringify(mockEvenings[index]));
      }
    });
  };

  useEffect(() => {
    if (!currentUser) return;

    const loadData = async () => {
      setLoading(true);
      const morningList = [];
      const eveningList = [];

      if (isMock) {
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key.startsWith(`days_mornings_${currentUser.uid}_`)) {
            const date = key.replace(`days_mornings_${currentUser.uid}_`, '');
            const val = JSON.parse(localStorage.getItem(key));
            morningList.push({ date, ...val });
          }
          if (key.startsWith(`days_evenings_${currentUser.uid}_`)) {
            const date = key.replace(`days_evenings_${currentUser.uid}_`, '');
            const val = JSON.parse(localStorage.getItem(key));
            eveningList.push({ date, ...val });
          }
        }
      } else {
        try {
          const mornSnap = await getDocs(collection(db, 'users', currentUser.uid, 'mornings'));
          mornSnap.forEach(doc => morningList.push({ date: doc.id, ...doc.data() }));

          const eveSnap = await getDocs(collection(db, 'users', currentUser.uid, 'evenings'));
          eveSnap.forEach(doc => eveningList.push({ date: doc.id, ...doc.data() }));
        } catch (err) {
          console.error('Error fetching statistics:', err);
        }
      }

      morningList.sort((a, b) => new Date(b.date) - new Date(a.date));
      eveningList.sort((a, b) => new Date(b.date) - new Date(a.date));

      setMornings(morningList);
      setEvenings(eveningList);
      setLoading(false);
    };

    loadData();
  }, [currentUser]);

  const totalDocumentedDays = new Set([
    ...mornings.map(m => m.date),
    ...evenings.map(e => e.date)
  ]).size;

  const getPast30DaysStreak = () => {
    const dates = [];
    for (let i = 0; i < 30; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      dates.push(d.toISOString().split('T')[0]);
    }
    const loggedCount = dates.filter(date => 
      mornings.some(m => m.date === date)
    ).length;
    return loggedCount;
  };

  const habitsCompletedCount = getPast30DaysStreak();

  const getTagsFrequencies = () => {
    const frequencies = {};
    evenings.forEach(e => {
      const tags = e.happyMoment?.tags || [];
      tags.forEach(tag => {
        frequencies[tag] = (frequencies[tag] || 0) + 1;
      });
    });

    return Object.keys(frequencies).map(tag => ({
      text: tag,
      count: frequencies[tag]
    })).sort((a, b) => b.count - a.count);
  };

  const tagsData = getTagsFrequencies();
  const maxTagCount = tagsData.length > 0 ? tagsData[0].count : 1;

  const getWeeklyMoodData = () => {
    const dataset = [];
    const dateLimit = new Date();
    dateLimit.setDate(dateLimit.getDate() - timeFilter);

    for (let i = 0; i < timeFilter; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const morningRecord = mornings.find(m => m.date === dateStr);
      
      dataset.push({
        date: dateStr,
        dayLabel: d.toLocaleDateString('ar-EG', { weekday: 'short' }),
        dateLabel: d.toLocaleDateString('ar-EG', { day: 'numeric', month: 'numeric' }),
        mood: morningRecord ? morningRecord.mood : null
      });
    }
    return dataset.reverse();
  };

  const moodChartDataset = getWeeklyMoodData();

  const getMoodColor = (moodName) => {
    if (moodName === 'متحمسة') return 'var(--orange)';
    if (moodName === 'هادئة') return 'var(--morning-sky)';
    if (moodName === 'ممتنة') return 'var(--pink)';
    if (moodName === 'مرهقة') return 'var(--evening-gray)';
    if (moodName === 'متعبة') return 'var(--evening-gray)';
    return 'transparent';
  };

  const moodRows = ['متحمسة', 'هادئة', 'ممتنة', 'مرهقة'];

  const getMoodScore = (mood) => {
    if (mood === 'متحمسة') return 4;
    if (mood === 'ممتنة') return 3;
    if (mood === 'هادئة') return 2;
    if (mood === 'محايدة') return 2;
    if (mood === 'قلقة') return 1.5;
    if (mood === 'مرهقة') return 1;
    if (mood === 'متعبة') return 1;
    return 0; // null/unrecorded
  };

  const getMoodBreakdown = () => {
    const counts = { 'متحمسة': 0, 'هادئة': 0, 'ممتنة': 0, 'مرهقة': 0 };
    let total = 0;
    mornings.forEach(m => {
      if (m.mood && counts[m.mood] !== undefined) {
        counts[m.mood]++;
        total++;
      }
    });
    return { counts, total };
  };

  const { counts: breakdownCounts, total: breakdownTotal } = getMoodBreakdown();

  const donutSegments = [];
  let accumulatedPercent = 0;
  
  const moodList = ['متحمسة', 'هادئة', 'ممتنة', 'مرهقة'];
  const colors = {
    'متحمسة': '#F4A261', // Orange
    'هادئة': '#8ECAE6', // Light Blue
    'ممتنة': '#E29578', // Pinkish Coral
    'مرهقة': '#8D99AE'  // Grayish blue
  };
  
  moodList.forEach(m => {
    const count = breakdownCounts[m] || 0;
    const percent = breakdownTotal > 0 ? (count / breakdownTotal) * 100 : 0;
    const strokeLength = (percent / 100) * 251.2;
    const strokeOffset = 251.2 - (accumulatedPercent / 100) * 251.2;
    
    donutSegments.push({
      mood: m,
      percent: Math.round(percent),
      count,
      strokeLength,
      strokeOffset,
      color: colors[m] || 'var(--text-muted)'
    });
    accumulatedPercent += percent;
  });

  // Calculate dominant mood and supportive advice
  const dominantMood = Object.keys(breakdownCounts).reduce((a, b) => 
    breakdownCounts[a] > breakdownCounts[b] ? a : b, 'هادئة'
  );

  const getSupportiveAdvice = (moodName) => {
    switch(moodName) {
      case 'متحمسة':
        return {
          title: 'طاقة إيجابية متوهجة! 🔥',
          text: 'يبدو أن الحماس يغمر أيامكِ مؤخراً. هذه طاقة رائعة لإطلاق الأفكار الجديدة، والبدء في مشاريعكِ المؤجلة، ومشاركة هذا النشاط اليومي مع من تحبين. واصلي هذا التدفق الجميل!',
          icon: '✨'
        };
      case 'ممتنة':
        return {
          title: 'قلبٌ يملأه السلام والرضا 🙏',
          text: 'الامتنان هو سر السعادة الحقيقية. تركيزكِ على تفاصيل الجمال الصغيرة في يومكِ يصنع طمأنينة عميقة. حافظي على تدوين لحظاتكِ السعيدة، فهي ملاذكِ الهادئ دائماً.',
          icon: '🌸'
        };
      case 'هادئة':
        return {
          title: 'حضورٌ واعي وسكينة تامة 😌',
          text: 'الهدوء الداخلي هو أثمن ما تملكينه في عالم متسارع. استمري في ممارسة حضوركِ الذهني وجلسات التأمل والتنفس اليومية؛ فهي درعكِ لتنظيم طاقتكِ وصنع توازنكِ النفسي.',
          icon: '🍃'
        };
      case 'مرهقة':
        return {
          title: 'رفقاً بنفسكِ يا صديقتي 😴',
          text: 'تشير الإحصائيات لشعوركِ بالإرهاق مؤخراً. هذا منبه لطيف لإبطاء الخطى وأخذ قسط كافٍ من الراحة. جربي الآن جلسة تنفس هادئة لـ 5 دقائق، ونوم مبكر الليلة لاستعادة طاقتكِ.',
          icon: '🕊️'
        };
      default:
        return {
          title: 'رحلة الحضور الذهني والوعي 🍃',
          text: 'استمري في تسجيل مشاعركِ وأهدافكِ اليومية لبناء لوحة تحليلاتكِ الخاصة ورؤية تدرج رحلة وعيكِ بوضوح تام.',
          icon: '✨'
        };
    }
  };

  const advice = getSupportiveAdvice(breakdownTotal > 0 ? dominantMood : 'default');

  // Create points for SVG curve
  const points = moodChartDataset.map((data, i) => {
    const score = getMoodScore(data.mood) || 2; // fallback to 2
    // Width = 380, Padding X = 20
    const x = 20 + (i * 340) / (moodChartDataset.length - 1 || 1);
    // Height = 140, plot from y = 15 to y = 125
    const y = 125 - ((score - 1) * 100) / 3;
    return { x, y, data };
  });

  let pathD = '';
  if (points.length > 0) {
    pathD = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const cpX1 = prev.x + (curr.x - prev.x) / 2;
      const cpY1 = prev.y;
      const cpX2 = prev.x + (curr.x - prev.x) / 2;
      const cpY2 = curr.y;
      pathD += ` C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${curr.x} ${curr.y}`;
    }
  }

  let areaD = '';
  if (points.length > 0) {
    areaD = `${pathD} L ${points[points.length - 1].x} 135 L ${points[0].x} 135 Z`;
  }

  if (loading) {
    return (
      <div className="page-loader">
        <span className="loader" />
        <p>تحميل الإحصائيات وتحليل البيانات...</p>
      </div>
    );
  }

  return (
    <div className="page-content">
      
      <div className="flex items-center justify-between w-full animate-in">
        <button 
          onClick={() => navigate('/dashboard')}
          className="btn-secondary"
        >
          <ChevronLeft size={16} />
          <span>العودة</span>
        </button>
        
        <div className="flex items-center gap-sm font-bold text-main">
          <PieChart size={20} className="text-accent" />
          <span>لوحة التحليلات</span>
        </div>
      </div>

      <header className="page-header animate-in animate-in-delay-1">
        <h1 className="text-right">رحلة الوعي الخاص بكِ</h1>
        <p className="text-right">نظرة دافئة على مشاعرك وإنجازاتك اليومية.</p>
      </header>

      <div className="page-grid animate-in animate-in-delay-2" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(310px, 1fr))' }}>
        
        {/* 1. Days Counter & Mood Breakdown */}
        <div className="flex flex-col gap-lg">
          {/* Days Counter Card */}
          <div className="card bg-main text-white" style={{ border: 'none', flex: 1 }}>
            <div className="flex items-center gap-sm opacity-80 mb-sm">
              <Award size={20} className="text-accent" />
              <span className="text-sm font-bold">إجمالي أيام الوعي</span>
            </div>

            <h3 className="text-2xl font-black mb-sm">
              عدد الأيام: <span className="text-3xl text-accent mx-xs">{totalDocumentedDays}</span> / 365
            </h3>

            <p className="text-sm opacity-90 leading-relaxed">
              لقد وثّقتِ رحلتكِ وتفاصيل حضوركِ في {totalDocumentedDays} يوماً هذا العام. استمري في هذا الالتزام الرائع لترتيب مساحتك الداخلية!
            </p>
          </div>

          {/* Mood Breakdown Donut Card */}
          <div className="card" style={{ flex: 1 }}>
            <h3 className="font-bold text-md mb-md">توزيع الحالة المزاجية السائدة</h3>
            
            <div className="flex items-center justify-between gap-md" style={{ direction: 'rtl' }}>
              {/* Donut Chart SVG */}
              <div style={{ position: 'relative', width: '100px', height: '100px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="100" height="100" viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)', overflow: 'visible' }}>
                  <circle cx="50" cy="50" r="40" fill="none" stroke="var(--border-ui)" strokeWidth="10" />
                  {donutSegments.map((seg, i) => (
                    seg.percent > 0 && (
                      <circle
                        key={i}
                        cx="50"
                        cy="50"
                        r="40"
                        fill="none"
                        stroke={seg.color}
                        strokeWidth="10"
                        strokeDasharray="251.2"
                        strokeDashoffset={seg.strokeOffset}
                        style={{ transition: 'stroke-dashoffset 0.5s ease' }}
                        title={`${seg.mood}: ${seg.percent}%`}
                      />
                    )
                  ))}
                </svg>
                <div style={{ position: 'absolute', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <span className="text-lg font-black text-main">{breakdownTotal}</span>
                  <span className="text-[0.65rem] text-muted font-bold">يوم</span>
                </div>
              </div>

              {/* Legend */}
              <div className="flex flex-col gap-xs flex-1" style={{ marginRight: '16px' }}>
                {donutSegments.map((seg, idx) => (
                  <div key={idx} className="flex justify-between items-center text-xs">
                    <div className="flex items-center gap-xs">
                      <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: seg.color }} />
                      <span className="font-bold text-muted">{seg.mood}</span>
                    </div>
                    <span className="font-black text-main">{seg.percent}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* 2. Mood Index Curve Chart */}
        <div className="card flex flex-col justify-between" style={{ minHeight: '320px' }}>
          <div>
            <div className="flex justify-between items-center mb-md">
              <div className="flex gap-xs">
                {[7, 30].map((days) => (
                  <button
                    key={days}
                    onClick={() => setTimeFilter(days)}
                    className={`px-sm py-1 rounded-md text-xs font-bold border transition-colors ${timeFilter === days ? 'bg-orange text-white border-orange' : 'bg-transparent text-muted border-ui'}`}
                    style={{ cursor: 'pointer' }}
                  >
                    آخر {days} أيام
                  </button>
                ))}
              </div>
              <h3 className="font-bold text-md">مؤشر المزاج اليومي</h3>
            </div>

            {/* SVG Line Chart */}
            <div style={{ width: '100%', overflowX: 'auto', position: 'relative' }}>
              <svg width="100%" height="150" viewBox="0 0 380 150" style={{ overflow: 'visible', display: 'block' }}>
                <defs>
                  <linearGradient id="moodAreaGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#F4A261" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#F4A261" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Grid guidelines */}
                {[1, 2, 3, 4].map(level => {
                  const y = 125 - ((level - 1) * 100) / 3;
                  const label = level === 4 ? '🔥' : level === 3 ? '🙏' : level === 2 ? '😌' : '😴';
                  return (
                    <g key={level} opacity="0.6">
                      <line x1="20" y1={y} x2="360" y2={y} stroke="var(--border-ui)" strokeWidth="1" strokeDasharray="4 4" />
                      <text x="10" y={y + 3} fontSize="9" textAnchor="middle">{label}</text>
                    </g>
                  );
                })}

                {/* SVG Area fill under path */}
                {areaD && <path d={areaD} fill="url(#moodAreaGradient)" />}

                {/* SVG Stroke line */}
                {pathD && <path d={pathD} fill="none" stroke="#F4A261" strokeWidth="2.5" strokeLinecap="round" />}

                {/* Points emojis */}
                {points.map((pt, i) => {
                  const MOOD_EMOJIS = {
                    'متحمسة': '🔥',
                    'هادئة': '😌',
                    'ممتنة': '🙏',
                    'مرهقة': '😴',
                    'قلقة': '😟',
                    'محايدة': '😐'
                  };
                  const emoji = pt.data.mood ? MOOD_EMOJIS[pt.data.mood] : null;
                  
                  if (emoji) {
                    return (
                      <g key={i}>
                        {/* Background bubble for legibility */}
                        <circle cx={pt.x} cy={pt.y} r="8.5" fill="#fff" stroke="#F4A261" strokeWidth="1" />
                        <text
                          x={pt.x}
                          y={pt.y}
                          fontSize="11"
                          textAnchor="middle"
                          dominantBaseline="central"
                          style={{ cursor: 'pointer' }}
                          title={`${pt.data.dateLabel}: ${pt.data.mood}`}
                        >
                          {emoji}
                        </text>
                      </g>
                    );
                  } else {
                    return (
                      <circle
                        key={i}
                        cx={pt.x}
                        cy={pt.y}
                        r="3.5"
                        fill="var(--border-ui)"
                        stroke="#fff"
                        strokeWidth="1"
                        title={`${pt.data.dateLabel}: غير مسجل`}
                      />
                    );
                  }
                })}
              </svg>
            </div>
          </div>

          {/* X Axis Labels */}
          <div className="flex justify-between text-[0.62rem] text-muted font-bold mt-sm" style={{ padding: '0 20px' }}>
            {moodChartDataset.map((data, i) => (
              <span key={i} title={data.date}>
                {timeFilter === 7 ? data.dayLabel : (i % 5 === 0 ? data.dateLabel.split('/')[0] : '')}
              </span>
            ))}
          </div>
        </div>

      </div>

      {/* Smart Supportive Advice Card - Hero Section */}
      {breakdownTotal > 0 && (
        <section className="card animate-in animate-in-delay-3" style={{ borderRight: '4px solid var(--orange)', background: 'var(--bg-card)', width: '100%', display: 'flex', gap: 'var(--space-lg)', alignItems: 'center', marginBottom: 'var(--space-lg)', textAlign: 'right' }}>
          <div style={{ fontSize: '2.5rem', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))', flexShrink: 0 }}>{advice.icon}</div>
          <div className="flex flex-col gap-xs text-right">
            <h4 className="text-lg font-bold text-main" style={{ margin: 0, color: 'var(--orange)' }}>{advice.title}</h4>
            <p className="text-sm text-muted" style={{ margin: 0, lineHeight: '1.6' }}>{advice.text}</p>
          </div>
        </section>
      )}

      <div className="page-grid animate-in animate-in-delay-3">
        
        {/* 3. Habits Summary */}
        <div className="card">
          <h3 className="font-bold text-lg mb-md">ملخص العادات اليومية</h3>
          
          <div className="bg-cream p-md rounded-md border border-ui mb-md">
            <span className="text-xs text-muted block mb-1 font-bold">عادتك الأساسية للصباح:</span>
            <strong className="text-md">تحديد وإنجاز الهدف الصباحي (التركيز)</strong>
          </div>

          <div className="flex flex-col gap-xs">
            <div className="flex justify-between text-sm font-bold mb-xs">
              <span className="text-muted">معدل التزام آخر 30 يوماً:</span>
              <span className="text-accent">{habitsCompletedCount} من 30 يوماً مكتملة</span>
            </div>

            <div className="progress-bar">
              <div 
                className="progress-fill"
                style={{ width: `${(habitsCompletedCount / 30) * 100}%` }} 
              />
            </div>
            
            <span className="text-xs text-muted italic mt-1">
              بناء العادات المستقرة يتطلب التكرار المستمر. حضورك اليومي هو الفوز الحقيقي.
            </span>
          </div>
        </div>

        {/* 4. Gratitude Cloud */}
        <div className="card">
          <div className="mb-md">
            <h3 className="font-bold text-lg">سحابة الامتنان 🌸</h3>
            <p className="text-xs text-muted">الأوسمة الأكثر استخداماً في تأملات المساء</p>
          </div>

          <div className="flex flex-wrap justify-center items-center gap-sm min-h-[140px] p-md bg-cream/40 rounded-lg border border-dashed border-ui">
            {tagsData.length > 0 ? (
              tagsData.map((tag, idx) => {
                const scale = maxTagCount > 1 ? (tag.count - 1) / (maxTagCount - 1) : 0;
                const fontSize = 0.8 + scale * 0.7;
                const isTopTag = idx === 0;

                return (
                  <span
                    key={tag.text}
                    className="transition-all duration-200 whitespace-nowrap"
                    style={{
                      fontSize: `${fontSize}rem`,
                      fontWeight: isTopTag ? 800 : tag.count > 1 ? 700 : 500,
                      color: isTopTag ? 'var(--orange)' : 'var(--text-main)',
                      opacity: isTopTag ? 1 : 0.7 + scale * 0.3,
                      padding: '4px 10px',
                      borderRadius: 'var(--radius-full)',
                      background: isTopTag ? 'var(--orange-glow)' : 'var(--border-ui)',
                      border: `1px solid ${isTopTag ? 'var(--orange)' : 'transparent'}`,
                      display: 'inline-block',
                      margin: '2px'
                    }}
                    title={`تم استخدامه ${tag.count} مرات`}
                  >
                    #{tag.text}
                  </span>
                );
              })
            ) : (
              <span className="text-sm text-muted italic text-center">
                اكتب تأملات المساء مع الأوسمة (#) ليتم بناء سحابتك هنا.
              </span>
            )}
          </div>
        </div>

      </div>

    </div>
  );
};

export default Statistics;
