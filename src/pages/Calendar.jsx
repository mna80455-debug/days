import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { db, isMock } from '../firebase/config';
import { collection, getDocs, addDoc, deleteDoc, doc } from 'firebase/firestore';
import { ChevronLeft, ChevronRight, Plus, Trash2, Calendar as CalendarIcon, X, Sparkles } from 'lucide-react';

const EVENT_TYPES = [
  { value: 'birthday', label: '🎂 عيد ميلاد' },
  { value: 'anniversary', label: '💍 ذكرى سنوية' },
  { value: 'exam', label: '📚 امتحان/موعد مهم' },
  { value: 'special', label: '🌟 حدث خاص' },
  { value: 'general', label: '📌 تذكير عام' }
];

const WEEKDAYS = ['أحد', 'إثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت'];
const MONTHS = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
];

const Calendar = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  // Calendar dates states
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [selectedDateStr, setSelectedDateStr] = useState('');
  const [eventName, setEventName] = useState('');
  const [eventType, setEventType] = useState('general');
  const [isYearly, setIsYearly] = useState(false);
  const [reminderDays, setReminderDays] = useState([0]); // 0 = day of, 1 = day before, 7 = week before
  const [eventNote, setEventNote] = useState('');
  const [saving, setSaving] = useState(false);

  // Fetch events
  useEffect(() => {
    if (!currentUser) return;
    fetchEvents();
  }, [currentUser]);

  const fetchEvents = async () => {
    setLoading(true);
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
        console.error('Error fetching Firestore events:', err);
      }
    }
    setEvents(list);
    setLoading(false);
  };

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const handleDayClick = (day) => {
    const year = currentDate.getFullYear();
    const month = String(currentDate.getMonth() + 1).padStart(2, '0');
    const dStr = `${year}-${month}-${String(day).padStart(2, '0')}`;
    setSelectedDateStr(dStr);
    setEventName('');
    setEventType('general');
    setIsYearly(false);
    setReminderDays([0]);
    setEventNote('');
    setShowModal(true);
  };

  const handleToggleReminder = (val) => {
    if (reminderDays.includes(val)) {
      setReminderDays(reminderDays.filter(d => d !== val));
    } else {
      setReminderDays([...reminderDays, val]);
    }
  };

  const handleSaveEvent = async (e) => {
    e.preventDefault();
    if (!eventName.trim() || !selectedDateStr) return;
    setSaving(true);

    const newEvent = {
      name: eventName.trim(),
      type: eventType,
      date: selectedDateStr,
      isYearly,
      reminderDays,
      note: eventNote.trim(),
      createdAt: new Date().toISOString()
    };

    try {
      if (isMock) {
        const eventId = Date.now().toString();
        const updated = [{ id: eventId, ...newEvent }, ...events];
        localStorage.setItem(`days_events_${currentUser.uid}`, JSON.stringify(updated));
        setEvents(updated);
      } else {
        const eventsRef = collection(db, 'users', currentUser.uid, 'events');
        const docRef = await addDoc(eventsRef, newEvent);
        setEvents([{ id: docRef.id, ...newEvent }, ...events]);
      }
      setShowModal(false);
    } catch (err) {
      console.error('Error saving event:', err);
      alert('حدث خطأ أثناء حفظ المناسبة.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteEvent = async (id) => {
    if (!window.confirm('هل أنتِ متأكدة من حذف هذه المناسبة؟')) return;
    
    try {
      if (isMock) {
        const updated = events.filter(ev => ev.id !== id);
        localStorage.setItem(`days_events_${currentUser.uid}`, JSON.stringify(updated));
        setEvents(updated);
      } else {
        const docRef = doc(db, 'users', currentUser.uid, 'events', id);
        await deleteDoc(docRef);
        setEvents(events.filter(ev => ev.id !== id));
      }
    } catch (err) {
      console.error('Error deleting event:', err);
      alert('حدث خطأ أثناء حذف المناسبة.');
    }
  };

  // Grid Calculation helpers
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayIndex = new Date(year, month, 1).getDay(); // Sunday=0

  const getEventsForDay = (day) => {
    const monthStr = String(month + 1).padStart(2, '0');
    const dStr = `${year}-${monthStr}-${String(day).padStart(2, '0')}`;
    
    return events.filter(ev => {
      if (ev.isYearly) {
        // match month and day only
        const evParts = ev.date.split('-');
        return evParts[1] === monthStr && Number(evParts[2]) === day;
      }
      return ev.date === dStr;
    });
  };

  // List of upcoming events with countdown
  const getUpcomingEvents = () => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    return events.map(ev => {
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
    .filter(ev => ev.daysLeft >= 0) // only active/future
    .sort((a, b) => a.daysLeft - b.daysLeft); // closest first
  };

  const upcomingList = getUpcomingEvents();

  const getEventEmoji = (type) => {
    const item = EVENT_TYPES.find(t => t.value === type);
    return item ? item.label.split(' ')[0] : '📌';
  };

  const getEventLabel = (type) => {
    const item = EVENT_TYPES.find(t => t.value === type);
    return item ? item.label.split(' ').slice(1).join(' ') : 'تذكير عام';
  };

  return (
    <div className="page-content-wide">
      
      {/* Scoped styles for Calendar Grid */}
      <style>{`
        .calendar-grid-header {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          text-align: center;
          font-weight: 700;
          color: var(--text-muted);
          border-bottom: 1px solid var(--border-ui);
          padding-bottom: var(--space-xs);
          margin-bottom: var(--space-xs);
        }
        .calendar-days-container {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: var(--space-xs);
        }
        .calendar-day-cell {
          aspect-ratio: 1.1;
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          justify-content: space-between;
          padding: var(--space-xs);
          border-radius: var(--radius-sm);
          font-weight: 600;
          font-size: 0.88rem;
          transition: transform 0.2s, background-color 0.2s;
          cursor: pointer;
          border: 1px solid var(--border-ui);
        }
        .day-empty {
          background: transparent !important;
          border-color: transparent !important;
          cursor: default;
        }
        .day-regular {
          background: var(--cream);
          color: var(--text-main);
        }
        .day-regular:hover {
          transform: scale(1.04);
          border-color: var(--orange);
        }
        .day-has-events {
          background: var(--orange) !important;
          color: #fff !important;
          border-color: var(--orange-hover) !important;
          box-shadow: 0 2px 6px var(--orange-glow);
        }
        .day-has-events:hover {
          transform: scale(1.04);
          background: var(--orange-hover) !important;
        }
        .event-indicator-dots {
          display: flex;
          gap: 2px;
          justify-content: center;
          width: 100%;
        }
        .dot {
          width: 4px;
          height: 4px;
          border-radius: 50%;
          background: #fff;
        }
        .pulse-upcoming {
          animation: pulseHighlight 2s infinite;
        }
        @keyframes pulseHighlight {
          0% { box-shadow: 0 0 0 0 rgba(244, 162, 97, 0.4); }
          70% { box-shadow: 0 0 0 8px rgba(244, 162, 97, 0); }
          100% { box-shadow: 0 0 0 0 rgba(244, 162, 97, 0); }
        }
      `}</style>

      {/* Header bar */}
      <div className="flex items-center justify-between w-full animate-in">
        <button 
          onClick={() => navigate('/dashboard')}
          className="btn-secondary"
        >
          <ChevronLeft size={16} />
          <span>العودة</span>
        </button>
        
        <div className="flex items-center gap-sm font-bold text-main">
          <CalendarIcon size={20} className="text-accent" />
          <span>تقويم المناسبات</span>
        </div>
      </div>

      <header className="page-header animate-in animate-in-delay-1">
        <h1 className="text-right">تقويمي الخاص 🗓️</h1>
        <p className="text-right">سجّلي مناسباتك المهمة ولا تنسي أي لحظة.</p>
      </header>

      {/* Calendar monthly card */}
      <div className="card animate-in animate-in-delay-2 flex flex-col gap-md">
        
        {/* Month Navigation */}
        <div className="flex justify-between items-center w-full pb-xs border-b border-ui">
          <button onClick={handlePrevMonth} className="btn-icon" aria-label="الشهر السابق">
            <ChevronRight size={18} />
          </button>
          
          <h2 className="text-lg font-black text-main">
            {MONTHS[month]} {year}
          </h2>
          
          <button onClick={handleNextMonth} className="btn-icon" aria-label="الشهر التالي">
            <ChevronLeft size={18} />
          </button>
        </div>

        {loading ? (
          <div className="page-loader">
            <span className="loader" />
            <p>تحميل التقويم...</p>
          </div>
        ) : (
          <div className="w-full mt-sm">
            {/* Weekday headers */}
            <div className="calendar-grid-header">
              {WEEKDAYS.map(w => (
                <div key={w} style={{ fontSize: '0.8rem' }}>{w}</div>
              ))}
            </div>

            {/* Calendar grid cells */}
            <div className="calendar-days-container">
              {/* Empty cells before month starts */}
              {Array.from({ length: firstDayIndex }).map((_, idx) => (
                <div key={`empty-${idx}`} className="calendar-day-cell day-empty" />
              ))}

              {/* Month days */}
              {Array.from({ length: daysInMonth }).map((_, idx) => {
                const day = idx + 1;
                const dayEvents = getEventsForDay(day);
                const hasEvents = dayEvents.length > 0;

                return (
                  <div
                    key={`day-${day}`}
                    onClick={() => handleDayClick(day)}
                    className={`calendar-day-cell ${hasEvents ? 'day-has-events' : 'day-regular'}`}
                  >
                    <span>{day}</span>
                    {hasEvents && (
                      <div className="event-indicator-dots">
                        {dayEvents.slice(0, 3).map((_, eIdx) => (
                          <div key={eIdx} className="dot" />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Upcoming events list */}
      <section className="flex flex-col gap-md animate-in animate-in-delay-3">
        <h3 className="font-bold text-lg text-main text-right">المناسبات القادمة 🗓️</h3>
        
        {upcomingList.length > 0 ? (
          <div className="grid gap-md" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
            {upcomingList.map((ev, index) => {
              const isUrgent = ev.daysLeft < 3;
              const emoji = getEventEmoji(ev.type);
              const label = getEventLabel(ev.type);
              
              let listCardClass = 'card flex justify-between items-center transition-all duration-300';
              if (isUrgent) listCardClass += ' border-orange-400 border pulse-upcoming bg-orange/5';

              return (
                <article key={ev.id} className={listCardClass} style={{ padding: 'var(--space-md) var(--space-lg)', animationDelay: `${0.05 * index}s` }}>
                  {/* Left delete button */}
                  <button
                    onClick={() => handleDeleteEvent(ev.id)}
                    className="text-muted hover:text-red transition-colors"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center' }}
                    aria-label="حذف المناسبة"
                  >
                    <Trash2 size={16} />
                  </button>

                  {/* Right description */}
                  <div className="flex items-center gap-sm flex-row-reverse text-right">
                    <span className="text-2xl" role="img" aria-label={label}>{emoji}</span>
                    <div>
                      <h4 className="font-bold text-md text-main" style={{ margin: 0 }}>{ev.name}</h4>
                      <div className="flex gap-xs items-center justify-end mt-xs flex-wrap">
                        <span className="text-[10px] text-muted">{ev.isYearly ? 'تكرار سنوي' : 'مرة واحدة'}</span>
                        <span className="text-xs text-muted font-bold">|</span>
                        
                        {ev.daysLeft === 0 ? (
                          <span className="text-xs font-black text-orange-500">🎉 اليوم!</span>
                        ) : ev.daysLeft === 1 ? (
                          <span className="text-xs font-black text-orange-500">⏰ غداً!</span>
                        ) : (
                          <span className="text-xs text-muted font-bold">متبقي <strong className="text-accent">{ev.daysLeft}</strong> يوم</span>
                        )}
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="card text-center text-muted p-xl">
            لا توجد مناسبات قادمة مسجلة. اضغطي على أي يوم في التقويم لإضافة مناسبتكِ الأولى!
          </div>
        )}
      </section>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-md">
          <div className="card w-full max-w-md max-h-[90vh] overflow-y-auto animate-in" style={{ transform: 'none' }}>
            
            <div className="flex justify-between items-center border-b border-ui pb-sm mb-md">
              <button onClick={() => setShowModal(false)} className="btn-ghost p-1">
                <X size={20} />
              </button>
              <h3 className="text-lg font-bold">إضافة مناسبة جديدة 🗓️</h3>
            </div>

            <form onSubmit={handleSaveEvent} className="flex flex-col gap-md">
              
              {/* Event Name */}
              <div className="flex flex-col gap-xs text-right">
                <label className="text-sm font-bold">اسم المناسبة</label>
                <input 
                  type="text" 
                  className="input"
                  value={eventName}
                  onChange={e => setEventName(e.target.value)}
                  placeholder="عيد ميلاد فرح، امتحان هندسة..."
                  required
                />
              </div>

              {/* Event Type */}
              <div className="flex flex-col gap-xs text-right">
                <label className="text-sm font-bold">نوع المناسبة</label>
                <select 
                  className="input py-2"
                  value={eventType}
                  onChange={e => setEventType(e.target.value)}
                  style={{ direction: 'rtl', paddingRight: '12px' }}
                >
                  {EVENT_TYPES.map(opt => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Yearly toggle */}
              <div className="flex justify-between items-center bg-cream/50 p-sm rounded-md mt-xs">
                <div 
                  className="flex items-center gap-xs cursor-pointer" 
                  onClick={() => setIsYearly(!isYearly)}
                >
                  <div className={`w-8 h-5 rounded-full relative transition-colors ${isYearly ? 'bg-orange' : 'bg-ui'}`}>
                    <div className={`w-4 h-4 bg-white rounded-full absolute top-0.5 transition-all ${isYearly ? 'right-[14px]' : 'right-[2px]'}`} />
                  </div>
                </div>
                <span className="text-xs text-main font-bold">تتكرر سنوياً؟</span>
              </div>

              {/* Reminders checklists */}
              <div className="flex flex-col gap-xs text-right">
                <span className="text-sm font-bold">إعدادات التذكير</span>
                <div className="flex flex-col gap-xs mt-xs">
                  {[
                    { val: 0, label: 'يوم المناسبة نفسه' },
                    { val: 1, label: 'قبل المناسبة بيوم' },
                    { val: 7, label: 'قبل المناسبة بأسبوع' }
                  ].map(opt => {
                    const isChecked = reminderDays.includes(opt.val);
                    return (
                      <button
                        key={opt.val}
                        type="button"
                        onClick={() => handleToggleReminder(opt.val)}
                        className={`flex items-center justify-between p-sm rounded-md text-xs font-bold border transition-colors ${isChecked ? 'border-orange bg-orange/5 text-orange' : 'border-ui bg-transparent text-main'}`}
                      >
                        <span className={`w-4 h-4 rounded-full flex items-center justify-center border ${isChecked ? 'border-orange bg-orange text-white' : 'border-ui'}`}>
                          {isChecked && '✓'}
                        </span>
                        <span>{opt.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Note */}
              <div className="flex flex-col gap-xs text-right">
                <label className="text-sm font-bold">ملاحظة اختيارية</label>
                <textarea 
                  rows={3}
                  className="textarea"
                  value={eventNote}
                  onChange={e => setEventNote(e.target.value)}
                  placeholder="أفكار للهدايا، تفاصيل مكان الموعد..."
                />
              </div>

              {/* Form Buttons */}
              <div className="flex gap-md border-t border-ui pt-md mt-sm">
                <button type="submit" disabled={saving} className="btn-primary flex-2 justify-center py-sm text-md" style={{ background: 'var(--orange)', border: 'none' }}>
                  {saving ? <span className="loader loader-sm" /> : 'حفظ المناسبة 💾'}
                </button>
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1 justify-center py-sm text-md">
                  إلغاء
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default Calendar;
