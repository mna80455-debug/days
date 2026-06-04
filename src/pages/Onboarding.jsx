import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sun, Moon, Sparkles, Download, ChevronLeft, ChevronRight } from 'lucide-react';

/* ── Scoped Styles for Onboarding Cards ── */
const onboardingStyles = `
  .onboarding-wrapper {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 100dvh;
    width: 100%;
    background: var(--cream);
    position: relative;
    overflow: hidden;
    padding: var(--space-lg);
  }

  .onboarding-bg-decor {
    position: absolute;
    inset: 0;
    pointer-events: none;
    z-index: 0;
  }

  .onboarding-blob {
    position: absolute;
    border-radius: 50%;
    filter: blur(80px);
    opacity: 0.6;
    animation: floatBlob 10s ease-in-out infinite alternate;
  }

  .onboarding-blob-1 {
    top: -10%;
    left: -10%;
    width: 300px;
    height: 300px;
    background: var(--pink-light);
  }

  .onboarding-blob-2 {
    bottom: -10%;
    right: -10%;
    width: 350px;
    height: 350px;
    background: var(--orange-glow);
    animation-delay: -5s;
  }

  @keyframes floatBlob {
    0% { transform: translate(0, 0) scale(1); }
    100% { transform: translate(30px, 50px) scale(1.1); }
  }

  .onboarding-card-container {
    position: relative;
    z-index: 10;
    width: 100%;
    max-width: 420px;
    perspective: 1000px;
  }

  .onboarding-card {
    background: var(--bg-card);
    border: 1px solid var(--border-ui);
    border-radius: 24px;
    box-shadow: 0 20px 40px rgba(92, 75, 67, 0.08);
    padding: var(--space-3xl) var(--space-xl);
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    transition: transform 0.5s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.5s ease-out;
  }

  .onboarding-card.entering {
    animation: slideInRight 0.5s cubic-bezier(0.4, 0, 0.2, 1) forwards;
  }

  @keyframes slideInRight {
    from {
      opacity: 0;
      transform: translateX(30px) scale(0.95);
    }
    to {
      opacity: 1;
      transform: translateX(0) scale(1);
    }
  }

  .onboarding-icon-wrapper {
    width: 100px;
    height: 100px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: var(--space-2xl);
    box-shadow: 0 10px 25px rgba(0,0,0,0.05);
    position: relative;
    animation: float 4s ease-in-out infinite;
  }

  .onboarding-icon-wrapper::after {
    content: '';
    position: absolute;
    inset: -10px;
    border-radius: 50%;
    border: 2px dashed rgba(0,0,0,0.1);
    animation: spin 20s linear infinite;
  }

  .onboarding-title {
    font-size: 1.8rem;
    font-weight: 900;
    color: var(--brown);
    margin-bottom: var(--space-md);
    line-height: 1.3;
  }

  .onboarding-desc {
    font-size: 1rem;
    color: var(--text-muted);
    line-height: 1.6;
    margin-bottom: var(--space-2xl);
    padding: 0 var(--space-sm);
  }

  .onboarding-dots {
    display: flex;
    gap: 8px;
    margin-bottom: var(--space-2xl);
  }

  .onboarding-dot {
    height: 6px;
    border-radius: 3px;
    background: var(--text-muted);
    opacity: 0.3;
    transition: all 0.3s ease;
  }

  .onboarding-dot.active {
    opacity: 1;
    background: var(--orange);
    width: 24px;
  }

  .onboarding-dot.inactive {
    width: 6px;
  }

  .onboarding-actions {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    gap: var(--space-md);
  }

  .btn-skip {
    color: var(--text-muted);
    font-weight: 600;
    padding: var(--space-sm) var(--space-md);
    background: transparent;
    border: none;
    border-radius: var(--radius-full);
    transition: background 0.2s;
  }

  .btn-skip:hover {
    background: var(--beige);
    color: var(--brown);
  }

  .btn-next {
    display: flex;
    align-items: center;
    gap: var(--space-xs);
    background: var(--orange);
    color: white;
    font-weight: 700;
    padding: var(--space-sm) var(--space-xl);
    border-radius: var(--radius-full);
    border: none;
    box-shadow: 0 4px 12px rgba(244, 162, 97, 0.3);
    transition: transform 0.2s, box-shadow 0.2s;
  }

  .btn-next:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 16px rgba(244, 162, 97, 0.4);
  }

  .btn-install {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-sm);
    background: var(--brown);
    color: white;
    font-weight: 700;
    padding: var(--space-md);
    border-radius: var(--radius-full);
    border: none;
    margin-bottom: var(--space-md);
    box-shadow: 0 8px 20px rgba(92, 75, 67, 0.2);
    transition: transform 0.2s;
    font-size: 1.1rem;
  }

  .btn-install:hover {
    transform: scale(1.02);
  }
`;

const Onboarding = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const handleFinish = () => {
    localStorage.setItem('days_has_seen_onboarding', 'true');
    navigate('/login');
  };

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') setIsInstallable(false);
      setDeferredPrompt(null);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setAnimating(true);
      setTimeout(() => {
        setCurrentStep(prev => prev - 1);
        setAnimating(false);
      }, 50);
    }
  };

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setAnimating(true);
      setTimeout(() => {
        setCurrentStep(prev => prev + 1);
        setAnimating(false);
      }, 50); // slight delay to re-trigger CSS animation
    } else {
      handleFinish();
    }
  };

  const steps = [
    {
      title: 'مرحباً بك في أيام ✨',
      description: 'مساحتك الخاصة للوعي والحضور والتأمل. مكان هادئ لتسجيل رحلتك اليومية بعيداً عن صخب العالم.',
      icon: <Sparkles size={40} color="var(--orange)" />,
      bgColor: 'var(--beige)',
    },
    {
      title: 'صباح مشرق ☀️',
      description: 'ابدأ يومك بنوايا واضحة وتحديد أولوياتك. سجل حالتك المزاجية وانطلق نحو أهدافك بتركيز وصفاء.',
      icon: <Sun size={40} color="var(--orange)" />,
      bgColor: 'var(--morning-white)',
    },
    {
      title: 'مساء هادئ 🌙',
      description: 'في نهاية اليوم، تأمل رحلتك، سجل ما أنجزته واحتفظ بلحظات الامتنان لتختم يومك بسلام.',
      icon: <Moon size={40} color="var(--evening-purple)" />,
      bgColor: 'var(--evening-card)',
    },
    {
      title: 'جاهز للانطلاق؟ 🚀',
      description: 'قم بتثبيت التطبيق على هاتفك لتجربة أسرع وأفضل، واحتفظ بمساحتك الهادئة دائماً معك.',
      icon: <Download size={40} color="white" />,
      bgColor: 'var(--brown)',
    }
  ];

  const current = steps[currentStep];

  return (
    <>
      <style>{onboardingStyles}</style>
      <div className="onboarding-wrapper">
        {/* Soft Background Blobs */}
        <div className="onboarding-bg-decor">
          <div className="onboarding-blob onboarding-blob-1" />
          <div className="onboarding-blob onboarding-blob-2" />
        </div>

        <div className="onboarding-card-container">
          <div className={`onboarding-card ${!animating ? 'entering' : ''}`}>
            
            {/* Animated Icon */}
            <div 
              className="onboarding-icon-wrapper"
              style={{ background: current.bgColor }}
            >
              {current.icon}
            </div>

            {/* Text */}
            <h1 className="onboarding-title">{current.title}</h1>
            <p className="onboarding-desc">{current.description}</p>

            {/* PWA Install Button (Only on Last Step) */}
            {currentStep === steps.length - 1 && isInstallable && (
              <button className="btn-install" onClick={handleInstallClick}>
                <Download size={20} />
                تثبيت التطبيق الآن
              </button>
            )}

            {/* Progress Dots */}
            <div className="onboarding-dots">
              {steps.map((_, idx) => (
                <div 
                  key={idx} 
                  className={`onboarding-dot ${idx === currentStep ? 'active' : 'inactive'}`} 
                />
              ))}
            </div>

            {/* Actions */}
            <div className="onboarding-actions">
              {currentStep > 0 ? (
                <button 
                  type="button" 
                  className="btn-skip" 
                  onClick={prevStep}
                  style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  <ChevronRight size={18} />
                  <span>السابق</span>
                </button>
              ) : (
                <button 
                  type="button" 
                  className="btn-skip" 
                  onClick={handleFinish}
                >
                  تخطي
                </button>
              )}
              
              <button className="btn-next" onClick={nextStep}>
                {currentStep === steps.length - 1 ? 'ابدأ الآن' : 'التالي'}
                <ChevronLeft size={18} />
              </button>
            </div>

          </div>
        </div>
      </div>
    </>
  );
};

export default Onboarding;
