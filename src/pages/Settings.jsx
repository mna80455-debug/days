import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { db, isMock } from '../firebase/config';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { Sliders, ChevronLeft, Play, ShieldAlert, Sun, Moon } from 'lucide-react';
import { requestNotificationPermission } from '../firebase/notifications';

const Settings = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  // Settings states
  const [morningEnabled, setMorningEnabled] = useState(true);
  const [morningTime, setMorningTime] = useState('07:00');
  const [eveningEnabled, setEveningEnabled] = useState(true);
  const [eveningTime, setEveningTime] = useState('21:00');

  // WhatsApp Settings states
  const [whatsappEnabled, setWhatsappEnabled] = useState(false);
  const [whatsappPhone, setWhatsappPhone] = useState('');
  const [whatsappApiKey, setWhatsappApiKey] = useState('');
  const [whatsappMorningEnabled, setWhatsappMorningEnabled] = useState(false);
  const [whatsappMorningTime, setWhatsappMorningTime] = useState('08:00');
  const [whatsappEveningEnabled, setWhatsappEveningEnabled] = useState(false);
  const [whatsappEveningTime, setWhatsappEveningTime] = useState('22:00');
  
  // Cloudinary Settings states
  const [cloudinaryCloudName, setCloudinaryCloudName] = useState('');
  const [cloudinaryUploadPreset, setCloudinaryUploadPreset] = useState('');

  // UI states
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testSent, setTestSent] = useState(false);
  const [testingWhatsapp, setTestingWhatsapp] = useState(false);
  const [permissionState, setPermissionState] = useState('default');

  useEffect(() => {
    if (!currentUser) return;
    
    if ('Notification' in window) {
      setPermissionState(Notification.permission);
    }

    const loadSettings = async () => {
      setLoading(true);
      if (isMock) {
        const saved = localStorage.getItem(`days_notification_settings_${currentUser.uid}`);
        if (saved) {
          const parsed = JSON.parse(saved);
          setMorningEnabled(parsed.morningEnabled ?? true);
          setMorningTime(parsed.morningTime || '07:00');
          setEveningEnabled(parsed.eveningEnabled ?? true);
          setEveningTime(parsed.eveningTime || '21:00');
          
          setWhatsappEnabled(parsed.whatsappEnabled ?? false);
          setWhatsappPhone(parsed.whatsappPhone || '');
          setWhatsappApiKey(parsed.whatsappApiKey || '');
          setWhatsappMorningEnabled(parsed.whatsappMorningEnabled ?? false);
          setWhatsappMorningTime(parsed.whatsappMorningTime || '08:00');
          setWhatsappEveningEnabled(parsed.whatsappEveningEnabled ?? false);
          setWhatsappEveningTime(parsed.whatsappEveningTime || '22:00');
          setCloudinaryCloudName(parsed.cloudinaryCloudName || '');
          setCloudinaryUploadPreset(parsed.cloudinaryUploadPreset || '');
        }
      } else {
        try {
          const docRef = doc(db, 'users', currentUser.uid, 'notificationSettings', 'current');
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const data = docSnap.data();
            setMorningEnabled(data.morningEnabled ?? true);
            setMorningTime(data.morningTime || '07:00');
            setEveningEnabled(data.eveningEnabled ?? true);
            setEveningTime(data.eveningTime || '21:00');
            
            setWhatsappEnabled(data.whatsappEnabled ?? false);
            setWhatsappPhone(data.whatsappPhone || '');
            setWhatsappApiKey(data.whatsappApiKey || '');
            setWhatsappMorningEnabled(data.whatsappMorningEnabled ?? false);
            setWhatsappMorningTime(data.whatsappMorningTime || '08:00');
            setWhatsappEveningEnabled(data.whatsappEveningEnabled ?? false);
            setWhatsappEveningTime(data.whatsappEveningTime || '22:00');
            setCloudinaryCloudName(data.cloudinaryCloudName || '');
            setCloudinaryUploadPreset(data.cloudinaryUploadPreset || '');
          }
        } catch (err) {
          console.error('Error loading notification settings:', err);
        }
      }
      setLoading(false);
    };

    loadSettings();
  }, [currentUser]);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);

    const settingsData = {
      morningEnabled,
      morningTime,
      eveningEnabled,
      eveningTime,
      whatsappEnabled,
      whatsappPhone,
      whatsappApiKey,
      whatsappMorningEnabled,
      whatsappMorningTime,
      whatsappEveningEnabled,
      whatsappEveningTime,
      cloudinaryCloudName,
      cloudinaryUploadPreset,
      updatedAt: new Date().toISOString()
    };

    if (isMock) {
      localStorage.setItem(`days_notification_settings_${currentUser.uid}`, JSON.stringify(settingsData));
      setSaving(false);
      alert('تم حفظ الإعدادات بنجاح!');
    } else {
      try {
        const docRef = doc(db, 'users', currentUser.uid, 'notificationSettings', 'current');
        await setDoc(docRef, settingsData, { merge: true });
        setSaving(false);
        alert('تم حفظ الإعدادات بنجاح!');
      } catch (err) {
        console.error('Error saving settings to Firestore:', err);
        setSaving(false);
      }
    }
  };

  const handleTriggerTest = async () => {
    setTestSent(true);
    setTimeout(() => setTestSent(false), 3000);

    if (isMock) {
      if ('Notification' in window && Notification.permission === 'granted') {
        const reg = await navigator.serviceWorker.ready;
        setTimeout(() => {
          reg.showNotification('أيام ☀️ (تجربة محاكاة)', {
            body: 'صباح الخير — النهارده يوم مميز، هتعملي إيه؟',
            icon: '/icon-192.png',
            badge: '/icon-192.png',
            dir: 'rtl',
            data: { url: '/morning' }
          });
        }, 1500);
      } else {
        alert('يرجى تفعيل صلاحية الإشعارات أولاً بالضغط على زر تفعيل الإشعارات.');
      }
    } else {
      try {
        const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID || 'days-app';
        
        const funcUrl = isLocalhost 
          ? `http://127.0.0.1:5001/${projectId}/us-central1/triggerTestNotification?type=morning`
          : `https://triggertestnotification-32f96816-7e28-4770-92cc-45b88acf1eaa.a.run.app?type=morning`;
        
        await fetch(funcUrl, { mode: 'no-cors' });
        alert(isLocalhost ? 'تم إرسال طلب تجريبي لمُحاكي الخادم المحلي!' : 'تم طلب إرسال إشعار تجريبي من السيرفر!');
      } catch (err) {
        console.error('Trigger test notification failed:', err);
        if ('Notification' in window && Notification.permission === 'granted') {
          const reg = await navigator.serviceWorker.ready;
          reg.showNotification('أيام ☀️ (تجربة خادم - محلي)', {
            body: 'صباح الخير — النهارده يوم مميز، هتعملي إيه؟',
            icon: '/icon-192.png',
            data: { url: '/morning' }
          });
        }
      }
    }
  };

  const handleTriggerTestWhatsApp = async () => {
    if (!whatsappPhone || !whatsappApiKey) {
      alert('يرجى كتابة رقم الهاتف ومفتاح الـ API للبدء بالاختبار.');
      return;
    }
    setTestingWhatsapp(true);
    
    const message = "تجربة تذكير تطبيق أيام 🌿\n\nلقد تم إعداد تذكيرات واتساب بنجاح! ستصلك التذكيرات الصامتة في أوقاتك المحددة.";
    const encodedText = encodeURIComponent(message);
    const url = `https://api.callmebot.com/whatsapp.php?phone=${whatsappPhone}&text=${encodedText}&apikey=${whatsappApiKey}`;
    
    try {
      await fetch(url, { mode: 'no-cors' });
      alert('تم إرسال طلب تذكير واتساب التجريبي! يرجى التحقق من هاتفك خلال لحظات.');
    } catch (err) {
      console.error('Error triggering test WhatsApp notification:', err);
      window.open(url, '_blank');
      alert('تم فتح رابط تذكير واتساب التجريبي في نافذة جديدة لإرسال التذكير.');
    } finally {
      setTestingWhatsapp(false);
    }
  };

  const handleRequestPermission = async () => {
    const sub = await requestNotificationPermission(currentUser.uid);
    if ('Notification' in window) {
      setPermissionState(Notification.permission);
    }
    if (sub) {
      alert('تم تفعيل الإشعارات بنجاح!');
    }
  };

  if (loading) {
    return (
      <div className="page-loader">
        <span className="loader" />
        <p>تحميل الإعدادات...</p>
      </div>
    );
  }

  return (
    <div className="page-content" style={{ maxWidth: '600px' }}>
      
      <div className="flex items-center justify-between w-full animate-in">
        <button 
          onClick={() => navigate('/dashboard')}
          className="btn-secondary"
        >
          <ChevronLeft size={16} />
          <span>العودة</span>
        </button>
        
        <div className="flex items-center gap-sm font-bold text-main">
          <Sliders size={20} className="text-accent" />
          <span>إعدادات التطبيق</span>
        </div>
      </div>

      <header className="page-header animate-in animate-in-delay-1 text-right">
        <h1>إعدادات التنبيهات 🔔</h1>
        <p>تحكمي في أوقات التنبيهات الصباحية والمسائية لتلقي المراجعات اليومية.</p>
      </header>

      {permissionState !== 'granted' && (
        <div className="card bg-yellow-50 border-yellow-400 flex flex-col gap-sm animate-in animate-in-delay-2">
          <h4 className="text-yellow-700 font-bold text-md flex items-center gap-xs">
            <ShieldAlert size={18} />
            صلاحيات الإشعارات غير مفعلة
          </h4>
          <p className="text-sm text-muted">
            لم تسمحي بإرسال الإشعارات على هذا المتصفح بعد. اضغطي على الزر أدناه لتفعيلها واستقبل تنبيهات الصباح والمساء الحقيقية.
          </p>
          <button 
            onClick={handleRequestPermission}
            className="btn-primary self-start py-1 px-3 text-sm mt-xs"
          >
            تفعيل الإشعارات الآن
          </button>
        </div>
      )}

      <form onSubmit={handleSave} className="card flex flex-col gap-lg animate-in animate-in-delay-3">
        
        {/* Morning Settings */}
        <div className="flex flex-col gap-md border-b border-ui pb-md">
          <div className="flex justify-between items-start">
            <div 
              className="flex items-center gap-xs cursor-pointer mt-xs" 
              onClick={() => setMorningEnabled(!morningEnabled)}
            >
              <div className={`w-10 h-6 rounded-full relative transition-colors ${morningEnabled ? 'bg-orange' : 'bg-ui'}`}>
                <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-all ${morningEnabled ? 'right-[18px]' : 'right-[2px]'}`} />
              </div>
            </div>
            
            <div className="flex flex-col gap-xs text-right" style={{ maxWidth: '80%' }}>
              <h3 className="font-bold text-lg flex items-center gap-xs text-main justify-end">
                <Sun size={18} className="text-accent" />
                تنبيهات الصباح 🌅
              </h3>
              <p className="text-xs text-muted" style={{ margin: 0 }}>
                تنبيه يومي لطيف لتذكيرك بكتابة نوايا اليوم والمزاج لتبدأي خطواتك بحضور واعي.
              </p>
            </div>
          </div>

          {morningEnabled && (
            <div className="flex justify-between items-center bg-cream p-sm rounded-md">
              <span className="text-sm text-muted">وقت التنبيه الصباحي:</span>
              <input 
                type="time" 
                className="input py-1 px-2 text-sm w-auto"
                value={morningTime} 
                onChange={e => setMorningTime(e.target.value)} 
              />
            </div>
          )}
        </div>

        {/* Evening Settings */}
        <div className="flex flex-col gap-md border-b border-ui pb-md">
          <div className="flex justify-between items-start">
            <div 
              className="flex items-center gap-xs cursor-pointer mt-xs" 
              onClick={() => setEveningEnabled(!eveningEnabled)}
            >
              <div className={`w-10 h-6 rounded-full relative transition-colors ${eveningEnabled ? 'bg-orange' : 'bg-ui'}`}>
                <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-all ${eveningEnabled ? 'right-[18px]' : 'right-[2px]'}`} />
              </div>
            </div>
            
            <div className="flex flex-col gap-xs text-right" style={{ maxWidth: '80%' }}>
              <h3 className="font-bold text-lg flex items-center gap-xs text-main justify-end">
                <Moon size={18} className="text-accent" />
                تنبيهات المساء 🌙
              </h3>
              <p className="text-xs text-muted" style={{ margin: 0 }}>
                تنبيه مسائي هادئ لمراجعة ما أنجزتِ وتوثيق لحظة الامتنان السعيدة للتأمل الذاتي.
              </p>
            </div>
          </div>

          {eveningEnabled && (
            <div className="flex justify-between items-center bg-cream p-sm rounded-md">
              <span className="text-sm text-muted">وقت التنبيه المسائي:</span>
              <input 
                type="time" 
                className="input py-1 px-2 text-sm w-auto"
                value={eveningTime} 
                onChange={e => setEveningTime(e.target.value)} 
              />
            </div>
          )}
        </div>

        {/* WhatsApp Reminders Settings */}
        <div className="flex flex-col gap-md border-b border-ui pb-md">
          <div className="flex justify-between items-start">
            <div 
              className="flex items-center gap-xs cursor-pointer mt-xs" 
              onClick={() => setWhatsappEnabled(!whatsappEnabled)}
            >
              <div className={`w-10 h-6 rounded-full relative transition-colors ${whatsappEnabled ? 'bg-orange' : 'bg-ui'}`}>
                <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-all ${whatsappEnabled ? 'right-[18px]' : 'right-[2px]'}`} />
              </div>
            </div>
            
            <div className="flex flex-col gap-xs text-right" style={{ maxWidth: '80%' }}>
              <h3 className="font-bold text-lg flex items-center gap-xs text-main justify-end">
                <span>تذكيرات وتساب التلقائية (مجاناً) 💬</span>
              </h3>
              <p className="text-xs text-muted" style={{ margin: 0 }}>
                استلم تذكيراتك الصباحية والمسائية مباشرة على حساب واتساب الخاص بك آلياً.
              </p>
            </div>
          </div>

          {whatsappEnabled && (
            <div className="flex flex-col gap-md bg-cream/40 p-md rounded-md mt-sm border border-ui">
              {/* How to activate instruction */}
              <div className="text-xs text-muted leading-relaxed border-b border-dashed border-ui pb-sm mb-sm text-right">
                <span className="font-bold text-main block mb-xs">💡 طريقة الحصول على مفتاح الـ Apikey مجاناً في دقيقة:</span>
                1. أضيفي الرقم <a href="https://wa.me/34621073617" target="_blank" rel="noopener noreferrer" className="font-bold text-accent">+34 621 07 36 17</a> لجهات اتصالك باسم <b>CallMeBot</b>.
                <br />
                2. أرسلي له رسالة بالواتساب تحتوي على: <code className="bg-ui/40 px-xs py-0.5 rounded text-main font-bold">I allow callmebot to send me messages</code>
                <br />
                3. سيرد البوت فوراً بالـ <b>Apikey</b> الخاص بكِ.
                <br />
                4. اكتبيه بالأسفل مع رقم هاتفكِ بالصيغة الدولية.
              </div>

              {/* Phone number */}
              <div className="flex flex-col gap-xs text-right">
                <label className="text-xs font-bold">رقم هاتفكِ على واتساب (بالصيغة الدولية مع رمز الدولة، مثلاً +201012345678):</label>
                <input 
                  type="text"
                  className="input py-1.5 px-sm text-sm"
                  value={whatsappPhone}
                  onChange={e => setWhatsappPhone(e.target.value)}
                  placeholder="+201000000000"
                />
              </div>

              {/* API Key */}
              <div className="flex flex-col gap-xs text-right mt-xs">
                <label className="text-xs font-bold">مفتاح الـ API المستلم (Apikey):</label>
                <input 
                  type="text"
                  className="input py-1.5 px-sm text-sm"
                  value={whatsappApiKey}
                  onChange={e => setWhatsappApiKey(e.target.value)}
                  placeholder="مثال: 123456"
                />
              </div>

              {/* Test Button */}
              <button
                type="button"
                onClick={handleTriggerTestWhatsApp}
                disabled={testingWhatsapp}
                className="btn-secondary py-1 px-3 text-xs self-start mt-xs"
                style={{ fontSize: '0.78rem' }}
              >
                {testingWhatsapp ? 'جاري الإرسال...' : 'ارسل رسالة تجريبية 🧪'}
              </button>

              <div className="dropdown-divider my-sm" />

              {/* Morning WhatsApp Toggle */}
              <div className="flex justify-between items-center bg-cream/60 p-sm rounded-md">
                <div 
                  className="flex items-center gap-xs cursor-pointer" 
                  onClick={() => setWhatsappMorningEnabled(!whatsappMorningEnabled)}
                >
                  <div className={`w-8 h-5 rounded-full relative transition-colors ${whatsappMorningEnabled ? 'bg-orange' : 'bg-ui'}`}>
                    <div className={`w-4 h-4 bg-white rounded-full absolute top-0.5 transition-all ${whatsappMorningEnabled ? 'right-[14px]' : 'right-[2px]'}`} />
                  </div>
                </div>
                <div className="flex items-center gap-xs">
                  <span className="text-xs text-main font-bold">تفعيل تذكير الصباح عبر واتساب 🌅</span>
                </div>
              </div>

              {whatsappMorningEnabled && (
                <div className="flex justify-between items-center bg-cream/60 p-sm rounded-md">
                  <span className="text-xs text-muted">وقت التنبيه الصباحي عبر واتساب:</span>
                  <input 
                    type="time" 
                    className="input py-0.5 px-2 text-xs w-auto"
                    value={whatsappMorningTime} 
                    onChange={e => setWhatsappMorningTime(e.target.value)} 
                  />
                </div>
              )}

              {/* Evening WhatsApp Toggle */}
              <div className="flex justify-between items-center bg-cream/60 p-sm rounded-md mt-xs">
                <div 
                  className="flex items-center gap-xs cursor-pointer" 
                  onClick={() => setWhatsappEveningEnabled(!whatsappEveningEnabled)}
                >
                  <div className={`w-8 h-5 rounded-full relative transition-colors ${whatsappEveningEnabled ? 'bg-orange' : 'bg-ui'}`}>
                    <div className={`w-4 h-4 bg-white rounded-full absolute top-0.5 transition-all ${whatsappEveningEnabled ? 'right-[14px]' : 'right-[2px]'}`} />
                  </div>
                </div>
                <div className="flex items-center gap-xs">
                  <span className="text-xs text-main font-bold">تفعيل تذكير المساء عبر واتساب 🌙</span>
                </div>
              </div>

              {whatsappEveningEnabled && (
                <div className="flex justify-between items-center bg-cream/60 p-sm rounded-md">
                  <span className="text-xs text-muted">وقت التنبيه المسائي عبر واتساب:</span>
                  <input 
                    type="time" 
                    className="input py-0.5 px-2 text-xs w-auto"
                    value={whatsappEveningTime} 
                    onChange={e => setWhatsappEveningTime(e.target.value)} 
                  />
                </div>
              )}

            </div>
          )}
        </div>

        {/* Cloudinary Settings */}
        <div className="flex flex-col gap-md border-b border-ui pb-md text-right">
          <div className="flex flex-col gap-xs text-right">
            <h3 className="font-bold text-lg flex items-center gap-xs text-main justify-end" style={{ margin: 0 }}>
              إعدادات رفع الصور (Cloudinary) 📸
            </h3>
            <p className="text-xs text-muted" style={{ margin: 0 }}>
              اربطي حساب Cloudinary المجاني لرفع صور الذكريات مباشرة وتفادي ترقية خطة فايربيز المدفوعة.
            </p>
          </div>

          <div className="flex flex-col gap-md bg-cream/40 p-md rounded-md mt-sm border border-ui">
            <div className="text-xs text-muted leading-relaxed border-b border-dashed border-ui pb-sm mb-sm text-right">
              <span className="font-bold text-main block mb-xs text-right">💡 طريقة الحصول على الإعدادات مجاناً في دقيقة:</span>
              1. سجّلي حساباً مجانياً على <a href="https://cloudinary.com/" target="_blank" rel="noopener noreferrer" className="font-bold text-accent">Cloudinary</a>.
              <br />
              2. من لوحة التحكم (Dashboard)، انسخي قيمة الـ <b>Cloud Name</b> واكتبيها أدناه.
              <br />
              3. اذهبي إلى الإعدادات (Settings) في Cloudinary ⚙️ ثم <b>Upload</b> ثم مرري للأسفل حتى تجدي قسم <b>Upload presets</b>.
              <br />
              4. اضغطي على <b>Add upload preset</b>، واجعلي الـ Signing Mode هو <b>Unsigned</b> (غير موقّع) ليتيح الرفع من المتصفح، ثم احفظي وانسخي اسم الـ preset واكتبيه بالأسفل.
            </div>

            {/* Cloud Name */}
            <div className="flex flex-col gap-xs text-right">
              <label className="text-xs font-bold">Cloud Name (اسم السحابة):</label>
              <input 
                type="text"
                className="input py-1.5 px-sm text-sm"
                value={cloudinaryCloudName}
                onChange={e => setCloudinaryCloudName(e.target.value)}
                placeholder="مثال: dywexqp1a"
              />
            </div>

            {/* Upload Preset */}
            <div className="flex flex-col gap-xs text-right mt-xs">
              <label className="text-xs font-bold">Unsigned Upload Preset (قالب الرفع غير الموقّع):</label>
              <input 
                type="text"
                className="input py-1.5 px-sm text-sm"
                value={cloudinaryUploadPreset}
                onChange={e => setCloudinaryUploadPreset(e.target.value)}
                placeholder="مثال: my_unsigned_preset"
              />
            </div>
          </div>
        </div>

        <div className="flex gap-md pt-sm">
          <button type="submit" disabled={saving} className="btn-primary flex-2 justify-center text-md">
            {saving ? <span className="loader loader-sm" /> : 'حفظ الإعدادات 💾'}
          </button>
          
          <button
            type="button"
            onClick={handleTriggerTest}
            disabled={testSent}
            className="btn-secondary flex-1 justify-center flex gap-xs"
          >
            <Play size={16} />
            <span>{testSent ? 'تم الإرسال!' : 'اختبر'}</span>
          </button>
        </div>

      </form>

      {/* Theme Info Brackets Card */}
      <div className="card bg-ui/20 flex flex-col gap-sm animate-in animate-in-delay-4 text-right mt-md">
        <h4 className="font-bold text-md text-main flex items-center gap-xs justify-end">
          <span>توقيتات ثيمات التطبيق التلقائية 🎨</span>
        </h4>
        <p className="text-xs text-muted">
          يتغير مظهر التطبيق وألوانه تلقائياً ليتناسب مع وقتك الحالي، كالتالي:
        </p>
        <div className="flex flex-col gap-xs text-xs font-semibold mt-xs">
          <div className="flex justify-between items-center bg-cream/40 p-xs rounded">
            <span>من 5:00 صباحاً حتى 11:00 صباحاً</span>
            <span>الصباح 🌅</span>
          </div>
          <div className="flex justify-between items-center bg-cream/40 p-xs rounded">
            <span>من 11:00 صباحاً حتى 5:00 مساءً</span>
            <span>الظهيرة ☀️</span>
          </div>
          <div className="flex justify-between items-center bg-cream/40 p-xs rounded">
            <span>من 5:00 مساءً حتى 5:00 صباحاً</span>
            <span>المساء 🌙</span>
          </div>
        </div>
        <p className="text-[11px] text-muted italic">
          * يمكنك دائماً تجربة ومحاكاة أي وقت من الأوقات عبر النقر على رمز الإعدادات ⚙️ في القائمة العلوية واختيار التوقيت يدوياً.
        </p>
      </div>

    </div>
  );
};

export default Settings;
