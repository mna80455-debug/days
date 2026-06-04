import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ChevronLeft, MoonStar, Volume2, VolumeX, Clock, Key, Sparkles, Check } from 'lucide-react';

const Sleep = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  /* Bedtime Worry Box states */
  const [worryInput, setWorryInput] = useState('');
  const [isLocked, setIsLocked] = useState(false);
  const [lockAnimation, setLockAnimation] = useState(false);

  /* Sound Synthesizer states */
  const [activeSound, setActiveSound] = useState('none'); // 'none', 'waves', 'wind', 'fire'
  const [sleepTimer, setSleepTimer] = useState('none'); // 'none', '15', '30', '45', '60'
  const [timerRemaining, setTimerRemaining] = useState(0);

  // Audio Context and Synths references
  const audioCtxRef = useRef(null);
  const soundNodesRef = useRef([]); // holds oscs, filters, sources to stop later
  const timerIntervalRef = useRef(null);

  /* Synthesizer Functions using Web Audio API */
  const stopAllSounds = () => {
    soundNodesRef.current.forEach(node => {
      try {
        node.stop();
      } catch (e) {}
      try {
        node.disconnect();
      } catch (e) {}
    });
    soundNodesRef.current = [];
  };

  const playSynthesizedSound = (soundType) => {
    stopAllSounds();

    if (soundType === 'none') {
      return;
    }

    try {
      // 1. Create Audio Context
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      // 2. Play Ocean Waves
      if (soundType === 'waves') {
        // Create white noise buffer
        const bufferSize = ctx.sampleRate * 4; // 4 seconds buffer
        const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          output[i] = Math.random() * 2 - 1;
        }

        const whiteNoise = ctx.createBufferSource();
        whiteNoise.buffer = noiseBuffer;
        whiteNoise.loop = true;

        // Filter waves to sound low & soothing
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(350, ctx.currentTime);

        // LFO (Low Frequency Oscillator) to modulate volume (wave swell)
        const lfo = ctx.createOscillator();
        lfo.frequency.value = 0.08; // 12 seconds cycle (inhale/exhale wave)

        const lfoGain = ctx.createGain();
        lfoGain.gain.value = 0.07; // scale oscillation

        // Swell gain
        const mainGain = ctx.createGain();
        mainGain.gain.setValueAtTime(0.08, ctx.currentTime);

        // Connections
        lfo.connect(lfoGain);
        lfoGain.connect(mainGain.gain);

        whiteNoise.connect(filter);
        filter.connect(mainGain);
        mainGain.connect(ctx.destination);

        whiteNoise.start();
        lfo.start();

        soundNodesRef.current = [whiteNoise, lfo, filter, lfoGain, mainGain];
      }

      // 3. Play Forest Wind / Rustle
      else if (soundType === 'wind') {
        const bufferSize = ctx.sampleRate * 3;
        const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          output[i] = Math.random() * 2 - 1;
        }

        const whiteNoise = ctx.createBufferSource();
        whiteNoise.buffer = noiseBuffer;
        whiteNoise.loop = true;

        // Bandpass filter to sound like rustling leaves
        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(800, ctx.currentTime);
        filter.Q.setValueAtTime(1.5, ctx.currentTime);

        // LFO to swing filter frequency (gusts of wind)
        const lfo = ctx.createOscillator();
        lfo.frequency.value = 0.15; // 6 seconds swing

        const lfoGain = ctx.createGain();
        lfoGain.gain.value = 400; // swing between 400Hz and 1200Hz

        const mainGain = ctx.createGain();
        mainGain.gain.setValueAtTime(0.06, ctx.currentTime);

        lfo.connect(lfoGain);
        lfoGain.connect(filter.frequency);

        whiteNoise.connect(filter);
        filter.connect(mainGain);
        mainGain.connect(ctx.destination);

        whiteNoise.start();
        lfo.start();

        soundNodesRef.current = [whiteNoise, lfo, filter, lfoGain, mainGain];
      }

      // 4. Play Crackling Fire
      else if (soundType === 'fire') {
        // Create custom fire buffer (rumble + crackles)
        const bufferSize = ctx.sampleRate * 2;
        const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          // Low frequency fireplace rumble
          const baseNoise = Math.random() * 2 - 1;
          
          // Random crackle pops
          let crackle = 0;
          if (Math.random() < 0.0004) {
            crackle = (Math.random() * 2 - 1) * 0.95; // sharp spike
          }
          
          output[i] = baseNoise * 0.3 + crackle;
        }

        const fireSource = ctx.createBufferSource();
        fireSource.buffer = noiseBuffer;
        fireSource.loop = true;

        // Lowpass filter for warm heat rumble
        const lpFilter = ctx.createBiquadFilter();
        lpFilter.type = 'lowpass';
        lpFilter.frequency.setValueAtTime(250, ctx.currentTime);

        // Highpass filter for crackles
        const hpFilter = ctx.createBiquadFilter();
        hpFilter.type = 'highpass';
        hpFilter.frequency.setValueAtTime(1500, ctx.currentTime);

        const lpGain = ctx.createGain();
        lpGain.gain.setValueAtTime(0.07, ctx.currentTime);

        const hpGain = ctx.createGain();
        hpGain.gain.setValueAtTime(0.05, ctx.currentTime);

        const mainGain = ctx.createGain();
        mainGain.gain.setValueAtTime(1.0, ctx.currentTime);

        // Route low frequency rumble
        fireSource.connect(lpFilter);
        lpFilter.connect(lpGain);
        lpGain.connect(mainGain);

        // Route high frequency crackles
        fireSource.connect(hpFilter);
        hpFilter.connect(hpGain);
        hpGain.connect(mainGain);

        mainGain.connect(ctx.destination);
        fireSource.start();

        soundNodesRef.current = [fireSource, lpFilter, hpFilter, lpGain, hpGain, mainGain];
      }

    } catch (err) {
      console.error('Web Audio Synth failed to start:', err);
    }
  };

  // Sync state and run synthesizer
  const handleSelectSound = (sound) => {
    setActiveSound(sound);
    playSynthesizedSound(sound);
  };

  // Clean up sounds on unmount
  useEffect(() => {
    return () => {
      stopAllSounds();
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, []);

  // Sleep Timer countdown effect
  useEffect(() => {
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);

    if (sleepTimer === 'none') {
      setTimerRemaining(0);
      return;
    }

    const minutes = parseInt(sleepTimer);
    setTimerRemaining(minutes * 60);

    timerIntervalRef.current = setInterval(() => {
      setTimerRemaining(prev => {
        if (prev <= 1) {
          clearInterval(timerIntervalRef.current);
          setActiveSound('none');
          setSleepTimer('none');
          stopAllSounds();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [sleepTimer]);

  const formatTimerRemaining = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  /* Bedtime Worry Box handler */
  const handleLockWorryBox = () => {
    if (!worryInput.trim()) return;

    setLockAnimation(true);
    // Simulate chest locking animation timing
    setTimeout(() => {
      setIsLocked(true);
      setLockAnimation(false);
    }, 1500);
  };

  const handleUnlockWorryBox = () => {
    setIsLocked(false);
    setWorryInput('');
  };

  return (
    <div className="page-content" style={{ position: 'relative', zIndex: 1 }}>
      
      {/* Scoped CSS for Sleep Page */}
      <style>{`
        .sleep-bg-decor {
          position: fixed;
          inset: 0;
          pointer-events: none;
          z-index: 0;
          background: linear-gradient(135deg, #0d1b2a 0%, #1b263b 50%, #0c1220 100%);
          background-size: 300% 300%;
          animation: sleepNightGlow 15s ease infinite alternate;
        }
        @keyframes sleepNightGlow {
          0% { background-position: 0% 0%; }
          100% { background-position: 100% 100%; }
        }

        /* Twinkling mini stars */
        .sleep-star {
          position: absolute;
          width: 2px;
          height: 2px;
          background: #fff;
          border-radius: 50%;
          opacity: 0.4;
          animation: sleepTwinkle 4s infinite alternate;
        }
        @keyframes sleepTwinkle {
          0% { opacity: 0.2; transform: scale(0.8); }
          100% { opacity: 0.9; transform: scale(1.3); }
        }

        /* Worry chest container */
        .chest-container {
          position: relative;
          background: #18233c;
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 16px;
          padding: var(--space-xl);
          transition: all 0.5s ease;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
        }
        .chest-container.locked {
          background: #0e1627;
          border-color: var(--orange);
          box-shadow: 0 0 15px var(--orange-glow);
        }

        .chest-lock-btn {
          animation: ${lockAnimation ? 'chestVibrate 0.2s infinite' : 'none'};
        }
        @keyframes chestVibrate {
          0%, 100% { transform: translate(0, 0) rotate(0deg); }
          25% { transform: translate(-2px, 1px) rotate(-1deg); }
          75% { transform: translate(2px, -1px) rotate(1deg); }
        }
      `}</style>

      {/* Decorative Night backgrounds */}
      <div className="sleep-bg-decor" aria-hidden="true" />
      <div className="sleep-star" style={{ top: '10%', left: '15%', animationDelay: '0s' }} />
      <div className="sleep-star" style={{ top: '25%', left: '80%', animationDelay: '1.5s' }} />
      <div className="sleep-star" style={{ top: '75%', left: '20%', animationDelay: '0.5s' }} />
      <div className="sleep-star" style={{ top: '60%', left: '70%', animationDelay: '2.2s' }} />
      <div className="sleep-star" style={{ top: '45%', left: '40%', animationDelay: '1.2s' }} />

      {/* Top Nav */}
      <div className="flex items-center justify-between w-full animate-in">
        <button
          onClick={() => navigate('/dashboard')}
          className="btn-secondary"
          aria-label="العودة"
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
        >
          <ChevronLeft size={16} />
          <span>العودة</span>
        </button>

        <span className="text-xs font-bold flex items-center gap-xs" style={{ color: 'rgba(255,255,255,0.7)' }}>
          <MoonStar size={14} style={{ color: 'var(--orange)' }} />
          هدوء الليل والسكينة
        </span>
      </div>

      {/* Header */}
      <header className="page-header animate-in animate-in-delay-1" style={{ color: '#fff' }}>
        <div className="flex justify-between items-center">
          <span className="badge badge-orange" style={{ background: 'var(--orange-hover)' }}>
            <MoonStar size={14} />
            النوم الهادئ 💤
          </span>
        </div>

        <h1 style={{ color: '#fff' }}>طقوس النوم والاسترخاء</h1>
        <p style={{ color: 'rgba(255,255,255,0.7)' }}>أفرغي ذهنكِ من قلق الغد، واستمعي إلى أصوات الطبيعة الهادئة لتستمتعي بنوم عميق وصحي.</p>
      </header>

      {/* 1. BEDTIME WORRY BOX (صندوق الهموم المغلق) */}
      <section className={`chest-container animate-in animate-in-delay-2 ${isLocked ? 'locked' : ''}`}>
        <h3 className="flex items-center gap-sm mb-sm text-right" style={{ color: 'var(--orange)', alignSelf: 'flex-end', flexDirection: 'row-reverse' }}>
          <span>صندوق الهموم الليلي 📦🔐</span>
        </h3>
        
        <p className="text-xs leading-relaxed text-right mb-md" style={{ color: 'rgba(255,255,255,0.7)', width: '100%' }}>
          اكتبي كل فكرة، مهمة، أو سيناريو يقلقكِ بخصوص الغد. ضعيها في هذا الصندوق وأغلقيه بقفل أمان، لكي يطمئن عقلكِ أن الأفكار محفوظة هنا بأمان، وسنقوم بحلها معاً في الصباح.
        </p>

        {!isLocked ? (
          <div className="w-full flex flex-col gap-md">
            <textarea
              className="worry-textarea"
              rows={4}
              value={worryInput}
              onChange={(e) => setWorryInput(e.target.value)}
              placeholder="مثال: قلقة بشأن اجتماع الغد، لا أعرف ما سأطبخه، المهام متراكمة..."
              disabled={lockAnimation}
              style={{ background: 'rgba(255,255,255,0.03)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' }}
            />
            
            <button
              type="button"
              onClick={handleLockWorryBox}
              disabled={!worryInput.trim() || lockAnimation}
              className="btn-primary chest-lock-btn"
              style={{ alignSelf: 'flex-start', width: 'auto', display: 'flex', gap: '8px', alignItems: 'center' }}
            >
              <Key size={16} />
              <span>{lockAnimation ? 'جاري إغلاق الصندوق...' : 'أغلقي الصندوق ونمي بسلام 🔐'}</span>
            </button>
          </div>
        ) : (
          <div className="text-center p-md flex flex-col items-center gap-md animate-scale">
            <div 
              style={{ 
                width: '64px', 
                height: '64px', 
                borderRadius: '50%', 
                background: 'rgba(244, 162, 97, 0.15)', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                border: '1.5px solid var(--orange)'
              }}
            >
              <Key size={28} style={{ color: 'var(--orange)' }} />
            </div>
            
            <h4 className="text-lg font-black text-white" style={{ color: '#fff' }}>الصندوق مغلق بقفل الأمان 🔒</h4>
            <p className="text-xs" style={{ color: 'var(--green)', fontWeight: 'bold' }}>
              تم حفظ همومكِ بأمان خارج سريركِ. عقلكِ حر الآن ليرتاح وينام. طاب نومكِ 🌸💤
            </p>

            <button
              onClick={handleUnlockWorryBox}
              className="btn-secondary text-xs"
              style={{ width: 'auto', background: 'transparent', color: 'rgba(255,255,255,0.5)', borderColor: 'rgba(255,255,255,0.1)' }}
            >
              فتح ومراجعة الصندوق في الصباح 🔓
            </button>
          </div>
        )}
      </section>

      {/* 2. SOUND PLAYER & TIMER (أصوات النوم الطبيعية والمؤقت) */}
      <section className="chest-container animate-in animate-in-delay-3" style={{ marginTop: '24px' }}>
        <h3 className="flex items-center gap-sm mb-sm text-right" style={{ color: 'var(--orange)', alignSelf: 'flex-end', flexDirection: 'row-reverse' }}>
          <span>أصوات النوم الطبيعية 🎵🌊</span>
        </h3>
        
        <p className="text-xs leading-relaxed text-right mb-md" style={{ color: 'rgba(255,255,255,0.7)', width: '100%' }}>
          شغلي أصوات الطبيعة المستمرة المصممة خصيصاً لمساعدتكِ على طرد التشتت السمعي والنوم بعمق:
        </p>

        {/* Ambient Tracks Selector */}
        <div className="flex flex-col gap-sm w-full">
          {[
            { id: 'none', label: 'صامت', sub: 'إيقاف تشغيل الصوت', icon: <VolumeX size={18} /> },
            { id: 'waves', label: 'أمواج البحر الهادئة 🌊', sub: 'تأثير تموج صوتي مهدئ وعميق', icon: <Volume2 size={18} /> },
            { id: 'wind', label: 'حفيف أشجار الغابة 🌲', sub: 'رياح لطيفة تزيل الفوضى الذهنية', icon: <Volume2 size={18} /> },
            { id: 'fire', label: 'موقد نار دافئ 🔥', sub: 'صوت فرقعة الحطب والحرارة', icon: <Volume2 size={18} /> }
          ].map(track => (
            <button
              key={track.id}
              onClick={() => handleSelectSound(track.id)}
              className="flex justify-between items-center flex-row-reverse p-md rounded-lg"
              style={{
                background: activeSound === track.id ? 'var(--orange)' : 'rgba(255,255,255,0.03)',
                border: `1.5px solid ${activeSound === track.id ? 'var(--orange)' : 'rgba(255,255,255,0.06)'}`,
                color: '#fff',
                cursor: 'pointer',
                textAlign: 'right',
                transition: 'all 0.3s ease'
              }}
            >
              <div className="flex items-center gap-sm flex-row-reverse">
                <span className="font-bold text-sm">{track.label}</span>
                {activeSound === track.id && <span className="badge badge-green" style={{ background: '#fff', color: 'var(--green)', fontSize: '0.65rem' }}>يعمل الآن</span>}
              </div>
              <div className="flex items-center gap-xs">
                <span className="text-xs" style={{ color: activeSound === track.id ? '#fff' : 'rgba(255,255,255,0.4)' }}>{track.sub}</span>
                {track.icon}
              </div>
            </button>
          ))}
        </div>

        {/* Sleep Timer Selector */}
        <div className="flex flex-col gap-xs justify-center items-center mt-lg p-md rounded-md bg-white/5 border border-white/10 w-full">
          <span className="text-xs font-bold flex items-center gap-xs text-white" style={{ color: '#fff' }}>
            <Clock size={14} style={{ color: 'var(--orange)' }} />
            مؤقت النوم (Sleep Timer):
          </span>
          
          <div className="flex gap-sm mt-sm flex-wrap justify-center">
            {[
              { id: 'none', label: 'بدون مؤقت' },
              { id: '15', label: '15 دقيقة' },
              { id: '30', label: '30 دقيقة' },
              { id: '45', label: '45 دقيقة' },
              { id: '60', label: '60 دقيقة' }
            ].map(timerOpt => (
              <button
                key={timerOpt.id}
                type="button"
                onClick={() => setSleepTimer(timerOpt.id)}
                className="badge transition-all text-xs"
                style={{
                  backgroundColor: sleepTimer === timerOpt.id ? 'var(--orange)' : 'transparent',
                  color: '#fff',
                  border: `1px solid ${sleepTimer === timerOpt.id ? 'var(--orange)' : 'rgba(255,255,255,0.2)'}`,
                  padding: '6px 12px',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  fontWeight: sleepTimer === timerOpt.id ? '700' : 'normal'
                }}
              >
                <span>{timerOpt.label}</span>
              </button>
            ))}
          </div>

          {sleepTimer !== 'none' && timerRemaining > 0 && (
            <span className="text-[11px] font-bold text-accent mt-sm animate-pulse">
              سيتم إيقاف الأصوات تلقائياً بعد: {formatTimerRemaining(timerRemaining)}
            </span>
          )}
        </div>
      </section>

    </div>
  );
};

export default Sleep;
