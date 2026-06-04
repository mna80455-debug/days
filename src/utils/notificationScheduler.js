import { db, isMock } from '../firebase/config';
import { doc, getDoc, collection, getDocs } from 'firebase/firestore';

// Helper to convert date to YYYY-MM-DD
const toDateKey = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

export const checkAndTriggerNotifications = async (currentUser) => {
  if (!currentUser) return;

  const now = new Date();
  const currentHourMin = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const todayStr = toDateKey(now);

  // 1. Get Notification & WhatsApp Settings
  let morningEnabled = true;
  let morningTime = '07:00';
  let eveningEnabled = true;
  let eveningTime = '21:00';

  let whatsappEnabled = false;
  let whatsappPhone = '';
  let whatsappApiKey = '';
  let whatsappMorningEnabled = false;
  let whatsappMorningTime = '08:00';
  let whatsappEveningEnabled = false;
  let whatsappEveningTime = '22:00';

  const settingsKey = `days_notification_settings_${currentUser.uid}`;
  const localSettings = localStorage.getItem(settingsKey);
  if (localSettings) {
    const parsed = JSON.parse(localSettings);
    morningEnabled = parsed.morningEnabled ?? true;
    morningTime = parsed.morningTime || '07:00';
    eveningEnabled = parsed.eveningEnabled ?? true;
    eveningTime = parsed.eveningTime || '21:00';

    whatsappEnabled = parsed.whatsappEnabled ?? false;
    whatsappPhone = parsed.whatsappPhone || '';
    whatsappApiKey = parsed.whatsappApiKey || '';
    whatsappMorningEnabled = parsed.whatsappMorningEnabled ?? false;
    whatsappMorningTime = parsed.whatsappMorningTime || '08:00';
    whatsappEveningEnabled = parsed.whatsappEveningEnabled ?? false;
    whatsappEveningTime = parsed.whatsappEveningTime || '22:00';
  } else {
    try {
      const docRef = doc(db, 'users', currentUser.uid, 'notificationSettings', 'current');
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        morningEnabled = data.morningEnabled ?? true;
        morningTime = data.morningTime || '07:00';
        eveningEnabled = data.eveningEnabled ?? true;
        eveningTime = data.eveningTime || '21:00';

        whatsappEnabled = data.whatsappEnabled ?? false;
        whatsappPhone = data.whatsappPhone || '';
        whatsappApiKey = data.whatsappApiKey || '';
        whatsappMorningEnabled = data.whatsappMorningEnabled ?? false;
        whatsappMorningTime = data.whatsappMorningTime || '08:00';
        whatsappEveningEnabled = data.whatsappEveningEnabled ?? false;
        whatsappEveningTime = data.whatsappEveningTime || '22:00';
      }
    } catch (e) {
      console.error('Error fetching notification settings in scheduler:', e);
    }
  }

  // Track triggered notifications for today to avoid duplicate alerts
  const triggeredKey = `days_triggered_alerts_${currentUser.uid}_${todayStr}`;
  let triggeredAlerts = JSON.parse(localStorage.getItem(triggeredKey) || '{}');

  // Helper to trigger SW browser push notification
  const triggerAlert = async (id, title, body, url) => {
    if (triggeredAlerts[id]) return; // already sent today
    if (!('Notification' in window) || Notification.permission !== 'granted') return;

    try {
      const reg = await navigator.serviceWorker.ready;
      reg.showNotification(title, {
        body,
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        dir: 'rtl',
        data: { url }
      });
      triggeredAlerts[id] = true;
      localStorage.setItem(triggeredKey, JSON.stringify(triggeredAlerts));
      console.log(`Alert triggered: ${id}`);
    } catch (e) {
      console.error('Error showing SW notification:', e);
    }
  };

  // Helper to trigger WhatsApp message via CallMeBot
  const triggerWhatsAppAlert = async (id, message, phone, apiKey) => {
    if (triggeredAlerts[id]) return; // already sent today
    
    const encodedText = encodeURIComponent(message);
    const url = `https://api.callmebot.com/whatsapp.php?phone=${phone}&text=${encodedText}&apikey=${apiKey}`;
    
    try {
      await fetch(url, { mode: 'no-cors' });
      console.log(`WhatsApp Alert sent: ${id}`);
      triggeredAlerts[id] = true;
      localStorage.setItem(triggeredKey, JSON.stringify(triggeredAlerts));
    } catch (err) {
      console.error(`Failed to send WhatsApp alert for ${id}:`, err);
    }
  };

  // 2. Check Morning Browser Reminder
  if (morningEnabled && currentHourMin === morningTime) {
    // Check if they haven't written morning notes today
    let hasMorning = false;
    const mornKey = `days_mornings_${currentUser.uid}_${todayStr}`;
    const mornSaved = localStorage.getItem(mornKey);
    if (mornSaved) {
      const parsed = JSON.parse(mornSaved);
      if (parsed.mood || parsed.topTask) hasMorning = true;
    } else {
      try {
        const docRef = doc(db, 'users', currentUser.uid, 'mornings', todayStr);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists() && (docSnap.data().mood || docSnap.data().topTask)) hasMorning = true;
      } catch (e) {}
    }

    if (!hasMorning) {
      triggerAlert('morning_reminder', 'شروق جديد 🌅', 'صباح الخير! حان وقت كتابة نواياك وجدول يومك لتبدأ بوعي كامل.', '/morning');
    }
  }

  // 3. Check Evening Browser Reminder
  if (eveningEnabled && currentHourMin === eveningTime) {
    // Check if they haven't written evening notes today
    let hasEvening = false;
    const eveKey = `days_evenings_${currentUser.uid}_${todayStr}`;
    const eveSaved = localStorage.getItem(eveKey);
    if (eveSaved) {
      const parsed = JSON.parse(eveSaved);
      if (parsed.happyMoment?.text) hasEvening = true;
    } else {
      try {
        const docRef = doc(db, 'users', currentUser.uid, 'evenings', todayStr);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists() && docSnap.data().happyMoment?.text) hasEvening = true;
      } catch (e) {}
    }

    if (!hasEvening) {
      triggerAlert('evening_reminder', 'هدوء المساء 🌙', 'مساء الخير! خذ لحظة هادئة لتأمل يومك وتوثيق امتنانك ونجاحات اليوم.', '/evening');
    }
  }

  // 4. Check WhatsApp Morning Reminder
  if (whatsappEnabled && whatsappMorningEnabled && whatsappPhone && whatsappApiKey && currentHourMin === whatsappMorningTime) {
    let hasMorning = false;
    const mornKey = `days_mornings_${currentUser.uid}_${todayStr}`;
    const mornSaved = localStorage.getItem(mornKey);
    if (mornSaved) {
      const parsed = JSON.parse(mornSaved);
      if (parsed.mood || parsed.topTask) hasMorning = true;
    } else {
      try {
        const docRef = doc(db, 'users', currentUser.uid, 'mornings', todayStr);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists() && (docSnap.data().mood || docSnap.data().topTask)) hasMorning = true;
      } catch (e) {}
    }

    if (!hasMorning) {
      const msg = "صباح الخير ☀️ حان وقت كتابة نواياك اليومية وتنظيم مهامك في تطبيق أيام 🌿\n\nتصفحي الواجهة الصباحية من هنا:\nhttps://days-app-ar.vercel.app/morning";
      triggerWhatsAppAlert('whatsapp_morning_reminder', msg, whatsappPhone, whatsappApiKey);
    }
  }

  // 5. Check WhatsApp Evening Reminder
  if (whatsappEnabled && whatsappEveningEnabled && whatsappPhone && whatsappApiKey && currentHourMin === whatsappEveningTime) {
    let hasEvening = false;
    const eveKey = `days_evenings_${currentUser.uid}_${todayStr}`;
    const eveSaved = localStorage.getItem(eveKey);
    if (eveSaved) {
      const parsed = JSON.parse(eveSaved);
      if (parsed.happyMoment?.text) hasEvening = true;
    } else {
      try {
        const docRef = doc(db, 'users', currentUser.uid, 'evenings', todayStr);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists() && docSnap.data().happyMoment?.text) hasEvening = true;
      } catch (e) {}
    }

    if (!hasEvening) {
      const msg = "مساء الخير والهدوء 🌙 حان وقت مراجعة يومك وتوثيق لحظة الامتنان السعيدة في تطبيق أيام 🌿\n\nقومي بالمراجعة المسائية من هنا:\nhttps://days-app-ar.vercel.app/evening";
      triggerWhatsAppAlert('whatsapp_evening_reminder', msg, whatsappPhone, whatsappApiKey);
    }
  }

  // 6. Fetch today's schedule for Wake-up & Focus reminders
  let plannedData = null;
  const planMornKey = `days_mornings_${currentUser.uid}_${todayStr}`;
  const planMornSaved = localStorage.getItem(planMornKey);
  if (planMornSaved) {
    const parsed = JSON.parse(planMornSaved);
    plannedData = parsed.planned;
  } else {
    try {
      const docRef = doc(db, 'users', currentUser.uid, 'mornings', todayStr);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) plannedData = docSnap.data().planned;
    } catch (e) {}
  }

  if (plannedData) {
    // A. Wake-up time reminder
    if (plannedData.wakeUpTime && currentHourMin === plannedData.wakeUpTime) {
      triggerAlert('wakeup_alert', 'صباح الخير ☀️', 'حان وقت الاستيقاظ المقترح اليوم. نتمنى لك يوماً يفيض بالوعي والسلام.', '/dashboard');
    }

    // B. Focus start time reminder
    if (plannedData.focusStart && currentHourMin === plannedData.focusStart) {
      triggerAlert('focus_start_alert', 'وقت التركيز بدأ 🧘‍♀️', `جلسة تركيزك المقترحة تبدأ الآن. هدفك اليوم: ${plannedData.goal || 'يوم واعي'}. هل أنت مستعدة؟`, '/dashboard');
    }

    // C. Focus end time reminder
    if (plannedData.focusEnd && currentHourMin === plannedData.focusEnd) {
      triggerAlert('focus_end_alert', 'انتهت جلسة التركيز 🌟', 'انتهى وقت جلسة التركيز المقترح. خذ قسطاً من الراحة، وهل أنهيتِ مهامك بنجاح؟', '/dashboard');
    }
  }

  // 7. Event reminders check daily at 9:00 AM
  if (currentHourMin === '09:00') {
    let eventsList = [];
    if (isMock) {
      const saved = localStorage.getItem(`days_events_${currentUser.uid}`);
      if (saved) eventsList = JSON.parse(saved);
    } else {
      try {
        const eventsRef = collection(db, 'users', currentUser.uid, 'events');
        const snap = await getDocs(eventsRef);
        eventsList = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      } catch (err) {
        console.error('Error fetching events in scheduler:', err);
      }
    }

    eventsList.forEach(ev => {
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

      // Supported intervals: 0 (today), 1 (tomorrow), 7 (in a week)
      const reminderDaysArray = ev.reminderDays || [0];
      if (reminderDaysArray.includes(daysLeft)) {
        let alertId = '';
        let title = '';
        let body = '';

        if (daysLeft === 0) {
          alertId = `event_today_${ev.id}_${todayStr}`;
          title = 'مناسبة سعيدة اليوم 🎉';
          body = `🎉 النهارده ${ev.name}! نتمنى لكم يوماً يملؤه الحب والبهجة.`;
        } else if (daysLeft === 1) {
          alertId = `event_tomorrow_${ev.id}_${todayStr}`;
          title = 'تذكير بمناسبة غداً ⏰';
          body = `⏰ بكره ${ev.name}، استعدي!`;
        } else if (daysLeft === 7) {
          alertId = `event_week_${ev.id}_${todayStr}`;
          title = 'مناسبة بعد أسبوع 📅';
          body = `📅 بعد أسبوع ${ev.name}، تذكير لطيف للاستعداد.`;
        }

        if (alertId) {
          // Send Browser Notification
          triggerAlert(alertId, title, body, '/calendar');
          
          // Send WhatsApp if enabled
          if (whatsappEnabled && whatsappPhone && whatsappApiKey) {
            triggerWhatsAppAlert(`wa_${alertId}`, `${title}\n\n${body}`, whatsappPhone, whatsappApiKey);
          }
        }
      }
    });
  }
};
