import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ChevronLeft, HeartHandshake, Eye, Hand, Volume2, ShieldAlert, Sparkles, Smile } from 'lucide-react';

const SOOTHING_CARDS = [
  "تنفس بعمق، أنت بأمان في هذه اللحظة، والضيق الذي تشعر به سيمر ويعبر كما عبر غيره.",
  "ليس عليك التفكير في كل شيء الآن. ركّز فقط على النفس الحالي، دقيقة واحدة في كل مرة.",
  "قلبك قوي بما يكفي لتجاوز هذه الغيمة المزعجة. خذ وقتك بالكامل، لا أحد يستعجلك.",
  "الأفكار هي مجرد سحب عابرة في سماء وعيك، أنت السماء الثابتة ولست الغيوم المتحركة.",
  "رفقاً بنفسك. ما تشعر به الآن هو مجرد إشارة لجسدك كي يبطئ ويرتاح.",
  "أنت أكبر من مخاوفك. دع هذا القلق يتدفق خارج جسدك مع كل زفير يخرج منك الآن."
];

const Refuge = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('first_aid'); // 'first_aid', 'worry_fade', 'cards'

  /* Grounding 5-4-3-2-1 states */
  const [groundingStep, setGroundingStep] = useState(0); // 0 = start, 1 to 5 steps, 6 = finish
  const groundingStepsData = [
    { title: "👀 حدد 5 أشياء تراها حولك الآن", desc: "انظر حول الغرفة أو المكان، وركز بصرك على خمسة أشياء مختلفة (مثلاً: كوب، شجرة، قلم، نافذة، مقعد)." },
    { title: "✋ حدد 4 أشياء تلمسها الآن", desc: "اشعر بملمس أربعة أشياء قريبة منك (مثلاً: ملمس ملابسك، ملمس السطح الخشبي، برودة هاتفك، نعومة السجادة)." },
    { title: "👂 حدد 3 أصوات تسمعها الآن", desc: "أنصت بتركيز للأصوات الخارجية من حولك (مثلاً: صوت مكيف الهواء، زقزقة طيور بالخارج، حركة السيارات البعيدة)." },
    { title: "👃 حدد شيئين تشم رائحتهما الآن", desc: "حاول ملاحظة الروائح المحيطة بك (مثلاً: رائحة القهوة، عطر الملابس، أو رائحة الهواء الخارجي)." },
    { title: "👅 حدد شيئاً واحداً يمكنك تذوقه الآن", desc: "ركز على الطعم في فمك أو خذ رشفة ماء، واشعر بنكهتها بوعي تام." }
  ];

  /* 4-7-8 Breathing states */
  const [breathPhase, setBreathPhase] = useState('idle'); // 'idle', 'inhale' (4s), 'hold' (7s), 'exhale' (8s)
  const [breathTimer, setBreathTimer] = useState(0);
  const breathIntervalRef = useRef(null);

  /* Worry Fade states */
  const [worryText, setWorryText] = useState('');
  const [isFading, setIsFading] = useState(false);
  const [fadedCompleted, setFadedCompleted] = useState(false);

  /* Affirmation Cards states */
  const [cardIndex, setCardIndex] = useState(0);

  /* Breathing sound references */
  const breathCtxRef = useRef(null);
  const breathOscRef = useRef(null);
  const breathGainRef = useRef(null);

  const stopBreathAudio = () => {
    try {
      if (breathOscRef.current) {
        breathOscRef.current.stop();
        breathOscRef.current = null;
      }
      if (breathGainRef.current) {
        breathGainRef.current.disconnect();
        breathGainRef.current = null;
      }
    } catch (e) {
      console.error("Failed to stop breath audio:", e);
    }
  };

  const startBreathAudio = () => {
    stopBreathAudio();
    try {
      const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtxClass) return;
      const ctx = new AudioCtxClass();
      breathCtxRef.current = ctx;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(110, ctx.currentTime);

      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      lfo.frequency.value = 0.25; 
      lfoGain.gain.value = 0.01;

      lfo.connect(lfoGain);
      lfoGain.connect(gain.gain);

      gain.gain.setValueAtTime(0.01, ctx.currentTime);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      lfo.start();

      breathOscRef.current = osc;
      breathGainRef.current = gain;
    } catch (e) {
      console.error("Failed to start breath audio:", e);
    }
  };

  /* Cleanup on unmount */
  useEffect(() => {
    return () => {
      stopBreathAudio();
    };
  }, []);

  /* Modulate breathing audio volume based on phase */
  useEffect(() => {
    if (breathPhase === 'idle') {
      stopBreathAudio();
      return;
    }

    if (!breathGainRef.current) {
      startBreathAudio();
    }

    const ctx = breathCtxRef.current;
    const gainNode = breathGainRef.current;
    if (!ctx || !gainNode) return;

    if (breathPhase === 'inhale') {
      gainNode.gain.cancelScheduledValues(ctx.currentTime);
      gainNode.gain.setValueAtTime(gainNode.gain.value, ctx.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.06, ctx.currentTime + 3.8);
    } else if (breathPhase === 'hold') {
      gainNode.gain.cancelScheduledValues(ctx.currentTime);
      gainNode.gain.setValueAtTime(gainNode.gain.value, ctx.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.04, ctx.currentTime + 1.0);
    } else if (breathPhase === 'exhale') {
      gainNode.gain.cancelScheduledValues(ctx.currentTime);
      gainNode.gain.setValueAtTime(gainNode.gain.value, ctx.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.005, ctx.currentTime + 7.8);
    }
  }, [breathPhase]);

  /* Web Audio Synthesizer for Worry Fade sound effect */
  const playReleaseSound = () => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'sine';
      // Gentle ascending scale to represent floating away
      osc.frequency.setValueAtTime(220, ctx.currentTime); // Low A
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 3); // High A
      
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 3);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start();
      osc.stop(ctx.currentTime + 3);
    } catch (e) {
      console.error("Audio Context initialization failed:", e);
    }
  };

  /* 4-7-8 Breathing Cycle effect */
  useEffect(() => {
    if (breathPhase === 'idle') {
      if (breathIntervalRef.current) clearInterval(breathIntervalRef.current);
      setBreathTimer(0);
      return;
    }

    let limit = 4;
    if (breathPhase === 'hold') limit = 7;
    if (breathPhase === 'exhale') limit = 8;

    setBreathTimer(limit);

    breathIntervalRef.current = setInterval(() => {
      setBreathTimer((prev) => {
        if (prev <= 1) {
          // Transition to next phase
          setBreathPhase((current) => {
            if (current === 'inhale') return 'hold';
            if (current === 'hold') return 'exhale';
            return 'inhale'; // Loop back to inhale
          });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (breathIntervalRef.current) clearInterval(breathIntervalRef.current);
    };
  }, [breathPhase]);

  const handleStartBreathing = () => {
    setBreathPhase('inhale');
  };

  const handleStopBreathing = () => {
    setBreathPhase('idle');
  };

  /* Worry Fade release handler */
  const handleReleaseWorries = () => {
    if (!worryText.trim()) return;
    setIsFading(true);
    playReleaseSound();

    setTimeout(() => {
      setIsFading(false);
      setWorryText('');
      setFadedCompleted(true);
    }, 3500);
  };

  return (
    <div className="page-content" style={{ position: 'relative', zIndex: 1 }}>
      
      {/* Scoped CSS styling for Refuge Page */}
      <style>{`
        .refuge-bg-decor {
          position: fixed;
          inset: 0;
          pointer-events: none;
          z-index: 0;
          background: linear-gradient(135deg, rgba(224, 242, 241, 0.25) 0%, rgba(243, 229, 245, 0.2) 50%, rgba(255, 235, 238, 0.2) 100%);
          background-size: 300% 300%;
          animation: refugeGlow 14s ease infinite alternate;
        }
        @keyframes refugeGlow {
          0% { background-position: 0% 0%; }
          100% { background-position: 100% 100%; }
        }

        .tab-btn {
          padding: 8px 16px;
          border-radius: 12px;
          border: 1px solid var(--border-ui);
          background: transparent;
          color: var(--text-main);
          font-weight: 700;
          font-size: 0.88rem;
          transition: all 0.3s ease;
          cursor: pointer;
        }
        .tab-btn.active {
          background: var(--orange);
          color: #fff;
          border-color: var(--orange);
          box-shadow: 0 4px 12px var(--orange-glow);
        }

        /* 4-7-8 breathing circle */
        .breath-ring {
          position: relative;
          width: 160px;
          height: 160px;
          border-radius: 50%;
          border: 3px solid var(--border-ui);
          display: flex;
          alignItems: center;
          justifyContent: center;
          margin: 24px auto;
          transition: all 1s ease-in-out;
        }
        .breath-ring.inhale {
          transform: scale(1.25);
          border-color: var(--orange);
          box-shadow: 0 0 25px var(--orange-glow);
        }
        .breath-ring.hold {
          transform: scale(1.25);
          border-color: var(--green);
          box-shadow: 0 0 25px rgba(42, 157, 143, 0.35);
        }
        .breath-ring.exhale {
          transform: scale(0.95);
          border-color: var(--brown-light);
        }

        /* Worry fade animation */
        .worry-textarea {
          width: 100%;
          font-size: 1.1rem;
          line-height: 1.8;
          border: 1px solid var(--border-ui);
          border-radius: 12px;
          padding: 16px;
          background: var(--input-bg);
          color: var(--text-main);
          resize: none;
          transition: all 3.5s cubic-bezier(0.25, 0.8, 0.25, 1);
        }
        .worry-textarea.fading {
          opacity: 0;
          transform: scale(0.85) translateY(-40px);
          filter: blur(8px);
          pointer-events: none;
        }
      `}</style>

      <div className="refuge-bg-decor" aria-hidden="true" />

      {/* Top bar */}
      <div className="flex items-center justify-between w-full animate-in">
        <button
          onClick={() => navigate('/dashboard')}
          className="btn-secondary"
          aria-label="العودة"
        >
          <ChevronLeft size={16} />
          <span>العودة</span>
        </button>

        <span className="text-xs text-muted font-bold flex items-center gap-xs">
          <Sparkles size={14} className="text-accent" />
          مساحة للأمان التام
        </span>
      </div>

      {/* Header */}
      <header className="page-header animate-in animate-in-delay-1">
        <div className="flex justify-between items-center">
          <span className="badge badge-orange">
            <HeartHandshake size={14} />
            الملاذ الهادئ 🩹
          </span>
        </div>

        <h1>الملجأ السريع لتنظيم مشاعرك</h1>
        <p>إذا كنت تشعر بالتوتر، الضغط، أو القلق الشديد، خذ نفساً وجرب أحد التمارين المهدئة بالأسفل.</p>
      </header>

      {/* Tabs Menu */}
      <div className="flex justify-center gap-sm mb-lg animate-in animate-in-delay-2 flex-row-reverse" style={{ width: '100%' }}>
        <button 
          onClick={() => { setActiveTab('first_aid'); setFadedCompleted(false); }} 
          className={`tab-btn ${activeTab === 'first_aid' ? 'active' : ''}`}
        >
          🩹 إسعافات سريعة
        </button>
        <button 
          onClick={() => { setActiveTab('worry_fade'); setFadedCompleted(false); }} 
          className={`tab-btn ${activeTab === 'worry_fade' ? 'active' : ''}`}
        >
          🌪️ تفريغ الهموم والتلاشي
        </button>
        <button 
          onClick={() => { setActiveTab('cards'); setFadedCompleted(false); }} 
          className={`tab-btn ${activeTab === 'cards' ? 'active' : ''}`}
        >
          🌸 بطاقات طمأنينة
        </button>
      </div>

      {/* ─── TAB 1: FIRST AID (Grounding & Breathing) ─── */}
      {activeTab === 'first_aid' && (
        <div className="flex flex-col gap-lg w-full">
          
          {/* Grounding 5-4-3-2-1 */}
          <div className="card animate-in">
            <h3 className="mb-md text-right font-black">1. تمرين الحواس الخمس (Grounding 5-4-3-2-1) 👀</h3>
            <p className="text-sm text-muted mb-md">تمرين نفساني لربط وعيك باللحظة الحالية والتخفيف من تشتت القلق.</p>

            {groundingStep === 0 ? (
              <div className="text-center p-md">
                <p className="text-md font-bold mb-md">هل أنت مستعد لإعادة تركيز انتباهك وتهدئة وعيك؟</p>
                <button 
                  onClick={() => setGroundingStep(1)} 
                  className="btn-primary"
                  style={{ width: 'auto', margin: '0 auto' }}
                >
                  ابدأ التمرين 🧘
                </button>
              </div>
            ) : groundingStep <= 5 ? (
              <div className="bg-cream/40 p-md rounded-lg border border-ui text-right flex flex-col gap-md">
                <span className="badge badge-orange" style={{ alignSelf: 'flex-end' }}>الخطوة {groundingStep} من 5</span>
                <h4 className="text-lg font-black text-main">{groundingStepsData[groundingStep - 1].title}</h4>
                <p className="text-sm text-muted leading-relaxed">{groundingStepsData[groundingStep - 1].desc}</p>
                
                <div className="flex justify-between items-center mt-md">
                  <button 
                    onClick={() => setGroundingStep(prev => prev - 1)} 
                    className="btn-secondary text-xs"
                    style={{ padding: '6px 14px' }}
                  >
                    السابق
                  </button>
                  <button 
                    onClick={() => setGroundingStep(prev => prev + 1)} 
                    className="btn-primary text-xs"
                    style={{ padding: '6px 14px', width: 'auto' }}
                  >
                    {groundingStep === 5 ? 'إنهاء التمرين ✓' : 'التالي ➔'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center p-md flex flex-col items-center gap-sm">
                <span className="text-4xl">🌸</span>
                <h4 className="text-lg font-black text-main">أحسنتِ صنعاً!</h4>
                <p className="text-sm text-muted">لقد قمتِ بإرساء وعيكِ في اللحظة الحالية. اشعري بقدميكِ على الأرض وتنفسي بهدوء.</p>
                <button 
                  onClick={() => setGroundingStep(0)} 
                  className="btn-secondary text-xs mt-sm"
                  style={{ width: 'auto' }}
                >
                  إعادة التمرين
                </button>
              </div>
            )}
          </div>

          {/* 4-7-8 Breathing */}
          <div className="card animate-in">
            <h3 className="mb-md text-right font-black">2. تنفّس الـ 4-7-8 لتهدئة نبضات القلب 🧘‍♀️</h3>
            <p className="text-sm text-muted mb-md">نمط تنفس يساعد على تفعيل الجهاز الباراسمبثاوي لتخفيض التوتر بشكل سريع.</p>

            <div className="text-center">
              
              <div className={`breath-ring ${breathPhase}`}>
                <div className="flex flex-col items-center gap-xs">
                  {breathPhase === 'idle' ? (
                    <span className="font-black text-lg text-muted">جاهز</span>
                  ) : (
                    <>
                      <span className="text-2xl font-black text-accent">
                        {breathPhase === 'inhale' ? 'شهيق' : breathPhase === 'hold' ? 'كتم النفس' : 'زفير'}
                      </span>
                      <span className="text-xl font-bold text-muted">{breathTimer} ثوانٍ</span>
                    </>
                  )}
                </div>
              </div>

              {/* Instructions dynamic text */}
              <p className="text-sm font-bold min-h-[40px] text-muted max-w-[280px] mx-auto mt-sm">
                {breathPhase === 'inhale' && "تنشقي الهواء بعمق ولطف من أنفكِ لمدة 4 ثوانٍ..."}
                {breathPhase === 'hold' && "احبسي الهواء في صدركِ واستشعري السلام لمدة 7 ثوانٍ..."}
                {breathPhase === 'exhale' && "أخرجي كل الهواء من فمكِ مع زفير مريح وبطء لمدة 8 ثوانٍ..."}
                {breathPhase === 'idle' && "اضغطي على الزر بالأسفل لبدء حلقة التنفس المهدئة."}
              </p>

              <div className="flex justify-center gap-md mt-lg" style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                {breathPhase === 'idle' ? (
                  <button 
                    onClick={handleStartBreathing} 
                    className="btn-primary px-lg"
                    style={{ width: 'auto' }}
                  >
                    ابدأ التنفس (4-7-8)
                  </button>
                ) : (
                  <button 
                    onClick={handleStopBreathing} 
                    className="btn-secondary px-lg"
                    style={{ width: 'auto', borderColor: 'var(--red)', color: 'var(--red)' }}
                  >
                    إيقاف المؤقت
                  </button>
                )}
              </div>
            </div>
          </div>

        </div>
      )}

      {/* ─── TAB 2: WORRY FADE (تفريغ الهموم) ─── */}
      {activeTab === 'worry_fade' && (
        <div className="card animate-in flex flex-col gap-lg text-right">
          <div>
            <h3 className="font-black text-lg mb-sm">تفريغ الأفكار وتلاشيها 🌪️✨</h3>
            <p className="text-sm text-muted">
              اكتبي هنا كل الأفكار الثقيلة، المخاوف، أو الهموم التي تزعج عقلكِ الآن. لا تقلقي، هذه الكلمات لن تُحفظ في أي مكان، وهي مساحتكِ للتفريغ الكامل فقط.
            </p>
          </div>

          {!fadedCompleted ? (
            <div className="flex flex-col gap-md">
              <textarea
                className={`worry-textarea ${isFading ? 'fading' : ''}`}
                rows={6}
                value={worryText}
                onChange={(e) => setWorryText(e.target.value)}
                placeholder="اكتبي هنا ما يقلقكِ... (كل التفاصيل، دون قيود أو تفكير)"
                disabled={isFading}
              />
              
              <button
                type="button"
                onClick={handleReleaseWorries}
                disabled={!worryText.trim() || isFading}
                className="btn-primary"
                style={{ alignSelf: 'flex-start', width: 'auto', padding: '10px 24px' }}
              >
                {isFading ? 'جاري تحرير الهموم والتلاشي...' : 'حرري الهموم ودعيها تتلاشى ✨'}
              </button>
            </div>
          ) : (
            <div className="text-center p-lg bg-green/5 border border-dashed border-green rounded-lg flex flex-col items-center gap-sm">
              <span className="text-4xl">🍃</span>
              <h4 className="text-lg font-black text-main">تلاشت همومكِ كالغبار في مهب الريح!</h4>
              <p className="text-sm text-muted leading-relaxed">
                لقد فرغتِ عقلكِ بنجاح ودعوتِ القلق للرحيل. خذي نفساً عميقاً، واشعري بالخفة في صدركِ الآن.
              </p>
              <button 
                onClick={() => setFadedCompleted(false)} 
                className="btn-secondary text-xs mt-md"
                style={{ width: 'auto' }}
              >
                تفريغ هموم أخرى
              </button>
            </div>
          )}
        </div>
      )}

      {/* ─── TAB 3: SOOTHING CARDS (بطاقات الطمأنينة) ─── */}
      {activeTab === 'cards' && (
        <div className="card animate-in text-center flex flex-col justify-between" style={{ minHeight: '260px' }}>
          <div className="flex justify-between items-center w-full mb-md">
            <span className="text-xs text-muted font-bold flex items-center gap-xs">
              <Sparkles size={14} className="text-accent" />
              كلمة طيبة لروحكِ
            </span>
          </div>

          <div className="p-md flex-1 flex items-center justify-center">
            <p className="text-lg font-bold" style={{ fontStyle: 'italic', lineHeight: '1.8', maxWidth: '340px', margin: '0 auto' }}>
              "{SOOTHING_CARDS[cardIndex]}"
            </p>
          </div>

          <div className="flex justify-between items-center w-full mt-lg pt-sm" style={{ borderTop: '1px solid var(--border-ui)' }}>
            <button 
              onClick={() => setCardIndex(prev => (prev > 0 ? prev - 1 : SOOTHING_CARDS.length - 1))}
              className="btn-ghost text-xs"
              style={{ color: 'var(--orange)' }}
            >
              السابق
            </button>
            <span className="text-xs text-muted">
              {cardIndex + 1} من {SOOTHING_CARDS.length}
            </span>
            <button 
              onClick={() => setCardIndex(prev => (prev < SOOTHING_CARDS.length - 1 ? prev + 1 : 0))}
              className="btn-ghost text-xs"
              style={{ color: 'var(--orange)' }}
            >
              التالي
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

export default Refuge;
