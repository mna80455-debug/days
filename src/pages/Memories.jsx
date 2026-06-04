import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { db, isMock, app } from '../firebase/config';
import { collection, getDocs, addDoc, query, orderBy, doc, setDoc, deleteDoc, getDoc } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Image, ChevronLeft, Search, Plus, X, Smile, Edit, Trash2, Heart } from 'lucide-react';

const compressImage = (base64Str) => {
  return new Promise((resolve) => {
    const img = new window.Image();
    img.src = base64Str;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const MAX_WIDTH = 1200;
      const MAX_HEIGHT = 1200;
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > MAX_WIDTH) {
          height = Math.round((height * MAX_WIDTH) / width);
          width = MAX_WIDTH;
        }
      } else {
        if (height > MAX_HEIGHT) {
          width = Math.round((width * MAX_HEIGHT) / height);
          height = MAX_HEIGHT;
        }
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', 0.7)); // compress to 70% quality JPEG
    };
    img.onerror = () => {
      resolve(base64Str);
    };
  });
};

const Memories = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const storage = !isMock && app ? getStorage(app) : null;
  if (storage) {
    storage.maxUploadRetryTime = 8000; // 8 seconds timeout
    storage.maxOperationRetryTime = 8000; // 8 seconds timeout
  }

  // Tab State
  const [activeTab, setActiveTab] = useState('memories'); // 'memories' or 'quotes'
  const [favoriteQuotes, setFavoriteQuotes] = useState([]);

  // Data states
  const [memories, setMemories] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  // UI states
  const [pageLoading, setPageLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState('');
  const [editingMemory, setEditingMemory] = useState(null);
  const [selectedFilterTag, setSelectedFilterTag] = useState(null);

  // Form states
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [type, setType] = useState('text'); // text, quote, featured
  const [formImages, setFormImages] = useState([]); // Array of { id, type: 'url'|'file', url?, file?, preview }
  const [errorMessage, setErrorMessage] = useState('');
  const [cloudinarySettings, setCloudinarySettings] = useState(null);
  const [selectedTags, setSelectedTags] = useState([]);
  const [newTagText, setNewTagText] = useState('');
  const [mood, setMood] = useState('🍃');
  const [isFeatured, setIsFeatured] = useState(false);

  const defaultTags = ['هدوء', 'امتنان', 'إنجاز', 'فرح', 'طبيعة', 'قراءة', 'قهوة', 'تأمل'];
  const emojisList = ['🍃', '✨', '🌅', '❤️', '😊', '☕', '🌟', '🕊️'];

  // Fetch memories on mount
  useEffect(() => {
    if (!currentUser) return;
    fetchMemories();
    fetchCloudinarySettings();
  }, [currentUser]);

  const fetchCloudinarySettings = async () => {
    // Start with env fallbacks
    let cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || '';
    let uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || '';

    if (isMock) {
      const saved = localStorage.getItem(`days_notification_settings_${currentUser.uid}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        cloudName = parsed.cloudinaryCloudName || cloudName;
        uploadPreset = parsed.cloudinaryUploadPreset || uploadPreset;
      }
    } else {
      try {
        const docRef = doc(db, 'users', currentUser.uid, 'notificationSettings', 'current');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          cloudName = data.cloudinaryCloudName || cloudName;
          uploadPreset = data.cloudinaryUploadPreset || uploadPreset;
        }
      } catch (err) {
        console.error('Error fetching Cloudinary settings:', err);
      }
    }

    setCloudinarySettings({ cloudName, uploadPreset });
  };

  const fetchMemories = async () => {
    setPageLoading(true);
    
    const defaultMemories = [];

    if (isMock) {
      const saved = localStorage.getItem(`days_memories_${currentUser.uid}`);
      if (saved) {
        setMemories(JSON.parse(saved));
      } else {
        localStorage.setItem(`days_memories_${currentUser.uid}`, JSON.stringify(defaultMemories));
        setMemories(defaultMemories);
      }
    } else {
      try {
        const memRef = collection(db, 'users', currentUser.uid, 'memories');
        const q = query(memRef, orderBy('date', 'desc'));
        const snap = await getDocs(q);
        const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        if (list.length === 0) {
          // Pre-populate Firestore if empty
          for (const m of defaultMemories) {
            const { id, ...rest } = m;
            await addDoc(memRef, rest);
          }
          const snap2 = await getDocs(q);
          setMemories(snap2.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        } else {
          setMemories(list);
        }
      } catch (err) {
        console.error('Error fetching Firestore memories:', err);
      }
    }
    setPageLoading(false);
  };

  // Load favorite quotes
  useEffect(() => {
    if (!currentUser) return;
    const loadFavoriteQuotes = () => {
      const saved = localStorage.getItem(`days_favorite_quotes_${currentUser.uid}`);
      if (saved) {
        setFavoriteQuotes(JSON.parse(saved));
      } else {
        setFavoriteQuotes([]);
      }
    };
    loadFavoriteQuotes();
  }, [currentUser, activeTab]);

  const handleRemoveQuote = (quoteToRemove) => {
    if (!currentUser) return;
    if (!window.confirm('هل تودين إزالة هذا الاقتباس من المفضلات؟')) return;
    const key = `days_favorite_quotes_${currentUser.uid}`;
    const saved = localStorage.getItem(key);
    if (saved) {
      const parsed = JSON.parse(saved);
      const filtered = parsed.filter(q => q !== quoteToRemove);
      localStorage.setItem(key, JSON.stringify(filtered));
      setFavoriteQuotes(filtered);
    }
  };

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const compressed = await compressImage(reader.result);
        const newId = `file-${Date.now()}-${Math.random()}`;
        setFormImages(prev => [...prev, {
          id: newId,
          type: 'file',
          file: file,
          preview: compressed
        }]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleRemoveSelectedImage = (idToRemove) => {
    setFormImages(prev => prev.filter(img => img.id !== idToRemove));
  };

  const handleToggleTag = (tag) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter(t => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const handleAddNewTag = (e) => {
    e.preventDefault();
    if (!newTagText.trim()) return;
    const tag = newTagText.trim();
    if (!selectedTags.includes(tag)) {
      setSelectedTags([...selectedTags, tag]);
    }
    setNewTagText('');
  };

  const handleOpenAddModal = () => {
    setEditingMemory(null);
    setTitle('');
    setText('');
    setType('text');
    setFormImages([]);
    setSelectedTags([]);
    setNewTagText('');
    setMood('🍃');
    setIsFeatured(false);
    setErrorMessage('');
    setShowModal(true);
  };

  const handleEditClick = (mem) => {
    setEditingMemory(mem);
    setTitle(mem.title || '');
    setText(mem.text || '');
    setType(mem.type || 'text');
    // Map existing URLs to our formImages structure
    const existing = (mem.images || []).map((url, i) => ({
      id: `url-${i}-${Date.now()}`,
      type: 'url',
      url: url,
      preview: url
    }));
    setFormImages(existing);
    setSelectedTags(mem.tags || []);
    setNewTagText('');
    setMood(mem.mood || '🍃');
    setIsFeatured(mem.isFeatured || false);
    setErrorMessage('');
    setShowModal(true);
  };

  const handleDeleteClick = async (id) => {
    if (!window.confirm('هل أنت متأكد من حذف هذه الذكرى؟')) return;

    if (isMock) {
      const updatedList = memories.filter(m => m.id !== id);
      localStorage.setItem(`days_memories_${currentUser.uid}`, JSON.stringify(updatedList));
      setMemories(updatedList);
    } else {
      try {
        const docRef = doc(db, 'users', currentUser.uid, 'memories', id);
        await deleteDoc(docRef);
        setMemories(memories.filter(m => m.id !== id));
      } catch (err) {
        console.error('Firestore delete memory error:', err);
      }
    }
  };

  const formatArabicDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const options = { day: 'numeric', month: 'long', year: 'numeric' };
    return d.toLocaleDateString('ar-EG', options);
  };

  const dataURLtoBlob = (dataurl) => {
    const arr = dataurl.split(',');
    const mime = arr[0].match(/:(.*?);/)[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
  };

  const compressFileIfNeeded = async (file) => {
    // If file is smaller than 5MB, return it as is
    if (file.size <= 5 * 1024 * 1024) {
      return file;
    }
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const compressedBase64 = await compressImage(reader.result);
        const blob = dataURLtoBlob(compressedBase64);
        const compressedFile = new File([blob], file.name, { type: blob.type });
        resolve(compressedFile);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleSaveMemory = async (e) => {
    e.preventDefault();
    if (!currentUser) {
      setErrorMessage('خطأ: يجب تسجيل الدخول أولاً لحفظ الذكريات!');
      return;
    }
    setSaving(true);
    setErrorMessage('');
    setSaveStatus('جاري حفظ الذكرى...');

    try {
      const memoryId = Date.now().toString();
      const dateToday = new Date().toISOString().split('T')[0];
      let imageUrls = [];

      // Resolve all image URLs
      if (formImages.length > 0) {
        if (isMock) {
          // In mock mode, simply keep existing urls or base64 previews
          imageUrls = formImages.map(img => img.preview);
        } else {
          // Cloudinary unsigned upload configuration
          const cloudName = cloudinarySettings?.cloudName;
          const uploadPreset = cloudinarySettings?.uploadPreset;

          if (!cloudName || !uploadPreset) {
            throw new Error('CLOUDINARY_MISSING_SETTINGS');
          }

          setSaveStatus('جاري رفع الصور لـ Cloudinary...');

          const uploadPromises = formImages.map(async (imgObj) => {
            if (imgObj.type === 'url') {
              return imgObj.url;
            } else {
              const file = imgObj.file;
              // Compress if file is > 5MB
              const finalFile = await compressFileIfNeeded(file);

              // Cloudinary unsigned upload endpoint
              const formData = new FormData();
              formData.append('file', finalFile);
              formData.append('upload_preset', uploadPreset);

              const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
                method: 'POST',
                body: formData
              });

              const data = await response.json();
              if (response.ok) {
                return data.secure_url;
              } else {
                throw new Error(data.error?.message || 'فشل رفع الصورة إلى Cloudinary');
              }
            }
          });

          imageUrls = await Promise.all(uploadPromises);
        }
      }

      const newMemory = {
        title: type === 'quote' ? '' : title,
        text,
        type,
        images: imageUrls,
        tags: selectedTags,
        mood,
        date: editingMemory ? editingMemory.date : dateToday,
        isFeatured: type === 'featured' || isFeatured
      };

      if (editingMemory) {
        if (isMock) {
          const updatedList = memories.map(m => m.id === editingMemory.id ? { id: editingMemory.id, ...newMemory } : m);
          localStorage.setItem(`days_memories_${currentUser.uid}`, JSON.stringify(updatedList));
          setMemories(updatedList);
        } else {
          const docRef = doc(db, 'users', currentUser.uid, 'memories', editingMemory.id);
          await setDoc(docRef, newMemory, { merge: true });
          setMemories(memories.map(m => m.id === editingMemory.id ? { id: editingMemory.id, ...newMemory } : m));
        }
      } else {
        if (isMock) {
          const updatedList = [{ id: memoryId, ...newMemory }, ...memories];
          localStorage.setItem(`days_memories_${currentUser.uid}`, JSON.stringify(updatedList));
          setMemories(updatedList);
        } else {
          if (!db) {
            throw new Error('خدمة Firestore Database غير مهيأة بعد.');
          }
          const memRef = collection(db, 'users', currentUser.uid, 'memories');
          const docRef = await addDoc(memRef, newMemory);
          setMemories([{ id: docRef.id, ...newMemory }, ...memories]);
        }
      }

      setTitle('');
      setText('');
      setType('text');
      setFormImages([]);
      setSelectedTags([]);
      setMood('🍃');
      setIsFeatured(false);
      setEditingMemory(null);
      setShowModal(false);
    } catch (err) {
      console.error('Error saving memory:', err);
      let friendlyError = '';
      if (err.message === 'CLOUDINARY_MISSING_SETTINGS') {
        friendlyError = 'يرجى الانتقال إلى صفحة الإعدادات ⚙️ وتفعيل حساب Cloudinary وإدخال الـ Cloud Name والـ Upload Preset للتمكن من رفع الصور.';
      } else if (err.code === 'storage/unauthorized') {
        friendlyError = 'خطأ في صلاحيات الرفع: يرجى التأكد من قواعد حماية Firebase Storage وتأكيد هويتك.';
      } else if (err.code === 'storage/quota-exceeded') {
        friendlyError = 'خطأ: تم تجاوز سعة التخزين المجانية المتاحة على خادم Firebase.';
      } else if (err.code === 'storage/retry-limit-exceeded' || err.message?.includes('retry') || err.message?.includes('timeout') || err.message?.includes('time out') || err.message?.includes('limit exceeded') || err.message?.includes('fetch') || err.message?.includes('Failed to fetch')) {
        friendlyError = 'فشل الرفع: يرجى التأكد من صحة إعدادات Cloudinary (اسم السحابة وقالب الرفع) في صفحة الإعدادات، واتصالك بالإنترنت.';
      } else if (err.name === 'QuotaExceededError' || err.message?.includes('quota') || err.code === 'NS_ERROR_DOM_QUOTA_REACHED') {
        friendlyError = 'عذراً، مساحة التخزين المحلية للمتصفح ممتلئة بالكامل. يرجى حذف بعض الذكريات القديمة أو تفعيل قاعدة بيانات Firebase الحقيقية.';
      } else {
        friendlyError = 'حدث خطأ أثناء حفظ الذكرى: ' + (err.message || err);
      }
      setErrorMessage(friendlyError);
    } finally {
      setSaving(false);
      setSaveStatus('');
    }
  };

  const allUsedTags = Array.from(
    new Set(memories.flatMap(m => m.tags || []))
  );

  const filteredMemories = memories.filter(mem => {
    const queryLower = searchQuery.toLowerCase();
    const matchesSearch = (
      mem.title?.toLowerCase().includes(queryLower) ||
      mem.text?.toLowerCase().includes(queryLower) ||
      mem.tags?.some(tag => tag.toLowerCase().includes(queryLower))
    );
    const matchesTag = selectedFilterTag 
      ? mem.tags?.includes(selectedFilterTag) 
      : true;
    return matchesSearch && matchesTag;
  });

  return (
    <div className="page-content-wide">
      
      <style>{`
        .polaroid-card {
          background: #ffffff !important;
          border: 1px solid var(--border-ui) !important;
          padding: 16px 16px 28px 16px !important;
          box-shadow: 0 4px 10px rgba(0,0,0,0.05) !important;
          border-radius: 4px !important;
          transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        .polaroid-card:hover {
          transform: translateY(-4px) rotate(1deg) !important;
          box-shadow: 0 10px 20px rgba(92, 75, 67, 0.12) !important;
          border-color: var(--orange) !important;
        }
        .polaroid-image-container {
          aspect-ratio: 1.15;
          overflow: hidden;
          background: #faf8f5;
          border: 1px solid rgba(0,0,0,0.04);
          margin-bottom: 12px;
          border-radius: 2px;
        }
      `}</style>
      
      <div className="flex items-center justify-between w-full animate-in">
        <button 
          onClick={() => navigate('/dashboard')}
          className="btn-secondary"
        >
          <ChevronLeft size={16} />
          <span>العودة</span>
        </button>
        
        <div className="flex items-center gap-sm font-bold text-main">
          <Image size={20} className="text-accent" />
          <span>سجل ذكريات الأيام</span>
        </div>
      </div>

      <header className="page-header animate-in animate-in-delay-1">
        <h1 className="text-right">ذكرياتي الجميلة 📖</h1>
        <p className="text-right">مساحة هادئة لتدوين لحظاتك السعيدة والاحتفاظ بروح كل يوم.</p>

        {/* Tab Selection buttons */}
        <div className="flex gap-md border-b border-ui pb-xs mb-lg mt-md animate-in" style={{ width: '100%' }}>
          <button
            onClick={() => setActiveTab('memories')}
            className="pb-xs text-md font-black transition-all cursor-pointer"
            style={{
              background: 'none',
              border: 'none',
              color: activeTab === 'memories' ? 'var(--orange)' : 'var(--text-muted)',
              borderBottom: activeTab === 'memories' ? '3px solid var(--orange)' : '3px solid transparent',
              paddingBottom: '6px'
            }}
          >
            ذكرياتي المكتوبة 📝
          </button>
          <button
            onClick={() => setActiveTab('quotes')}
            className="pb-xs text-md font-black transition-all cursor-pointer"
            style={{
              background: 'none',
              border: 'none',
              color: activeTab === 'quotes' ? 'var(--orange)' : 'var(--text-muted)',
              borderBottom: activeTab === 'quotes' ? '3px solid var(--orange)' : '3px solid transparent',
              paddingBottom: '6px'
            }}
          >
            اقتباسات ألهمتني ❤️
          </button>
        </div>

        {activeTab === 'memories' && (
          <div className="flex flex-col gap-sm mt-md w-full">
            <div className="card w-full max-w-md mx-auto md:mx-0 flex items-center gap-sm p-sm animate-in" style={{ padding: '0.5rem 1rem' }}>
              <Search size={18} className="text-muted" />
              <input 
                type="text"
                className="input border-none bg-transparent flex-1"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ابحث في ذكرياتك..."
                style={{ padding: 0 }}
              />
            </div>
            
            {allUsedTags.length > 0 && (
              <div className="flex flex-wrap gap-xs mt-xs justify-start animate-in animate-in-delay-1" style={{ width: '100%' }}>
                <button
                  type="button"
                  onClick={() => setSelectedFilterTag(null)}
                  className={`tag ${selectedFilterTag === null ? 'active' : ''}`}
                  style={{ cursor: 'pointer' }}
                >
                  الكل
                </button>
                {allUsedTags.map(tag => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => setSelectedFilterTag(selectedFilterTag === tag ? null : tag)}
                    className={`tag ${selectedFilterTag === tag ? 'active' : ''}`}
                    style={{ cursor: 'pointer' }}
                  >
                    #{tag}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </header>

      {pageLoading ? (
        <div className="page-loader">
          <span className="loader" />
          <p>تحميل سجلات الذكريات...</p>
        </div>
      ) : activeTab === 'quotes' ? (
        favoriteQuotes.length > 0 ? (
          <div className="grid gap-lg animate-in animate-in-delay-2" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(310px, 1fr))', alignItems: 'start' }}>
            {favoriteQuotes.map((quote, idx) => (
              <article 
                key={idx} 
                className="card relative overflow-hidden bg-pink-50 border-pink-100 text-center py-xl transition-all duration-300 hover:shadow-lg"
                style={{ minHeight: '140px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', animationDelay: `${0.05 * idx}s` }}
              >
                <div className="flex justify-end items-center mb-xs">
                  <button
                    onClick={() => handleRemoveQuote(quote)}
                    className="text-muted hover:text-red transition-colors"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', display: 'flex' }}
                    aria-label="إزالة من المفضلات"
                  >
                    <Heart size={16} fill="var(--red)" style={{ color: 'var(--red)' }} />
                  </button>
                </div>
                <div className="flex flex-col items-center relative z-0 flex-1 justify-center">
                  <span className="text-5xl font-black text-accent opacity-25 leading-none -mb-3 self-start">“</span>
                  <p className="text-md font-bold italic leading-relaxed px-md text-main">
                    {quote}
                  </p>
                  <span className="text-5xl font-black text-accent opacity-25 leading-none -mt-3 self-end">”</span>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="card text-center text-muted p-xl">
            لا توجد اقتباسات مفضلة محفوظة بعد. اضغطي على أيقونة القلب ❤️ بجانب الاقتباسات اليومية لحفظها هنا!
          </div>
        )
      ) : filteredMemories.length > 0 ? (
        <div className="grid gap-lg animate-in animate-in-delay-2" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(310px, 1fr))', alignItems: 'start' }}>
          {filteredMemories.map((mem, index) => {
            const isQuote = mem.type === 'quote';
            const isFeaturedCard = mem.type === 'featured' || mem.isFeatured;
            const hasImages = mem.images && mem.images.length > 0;

            let cardClass = 'card relative overflow-hidden transition-all duration-300 hover:shadow-lg';
            if (isQuote) cardClass += ' bg-pink-50 border-pink-100 text-center py-xl';
            else {
              cardClass = 'polaroid-card relative overflow-hidden';
              if (isFeaturedCard) cardClass += ' border-orange-400 border-2';
            }

            return (
              <article key={mem.id} className={cardClass} style={{ animationDelay: `${0.1 * (index + 2)}s` }}>
                
                <div 
                  className="absolute top-4 left-4 bg-white/80 backdrop-blur-sm shadow-sm flex items-center justify-center rounded-full text-xl z-10"
                  style={{ width: '32px', height: '32px' }}
                  title={`الحالة النفسية: ${mem.mood}`}
                >
                  {mem.mood}
                </div>

                {isFeaturedCard && !isQuote && (
                  <span className="badge badge-orange absolute top-4 right-4 z-10">
                    ذكرى مميزة ⭐
                  </span>
                )}

                <div className="flex justify-between items-center mb-sm">
                  <span className="text-xs text-muted font-bold">
                    {formatArabicDate(mem.date)}
                  </span>
                  <div className="flex gap-sm z-20">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleEditClick(mem); }}
                      className="text-muted hover:text-orange transition-colors"
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center' }}
                      aria-label="تعديل الذكرى"
                    >
                      <Edit size={15} />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDeleteClick(mem.id); }}
                      className="text-muted hover:text-red transition-colors"
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center' }}
                      aria-label="حذف الذكرى"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>

                {hasImages && (
                  <div 
                    className="polaroid-image-container grid gap-xs overflow-hidden"
                    style={{ 
                      gridTemplateColumns: mem.images.length > 1 ? '1fr 1fr' : '1fr',
                      height: '200px'
                    }}
                  >
                    {mem.images.slice(0, 4).map((img, i) => (
                      <img 
                        key={i} 
                        src={img} 
                        alt="مرفق الذكرى" 
                        className="w-full object-cover"
                        style={{ 
                          height: '100%',
                          borderRadius: '2px'
                        }} 
                      />
                    ))}
                  </div>
                )}

                {!isQuote && mem.title && (
                  <h4 className="text-xl font-bold mb-sm">
                    {mem.title}
                  </h4>
                )}

                {isQuote ? (
                  <div className="flex flex-col items-center relative z-0">
                    <span className="text-6xl font-black text-accent opacity-20 leading-none -mb-4 self-start">“</span>
                    <p className="text-xl font-bold italic leading-relaxed px-md">
                      {mem.text}
                    </p>
                    <span className="text-6xl font-black text-accent opacity-20 leading-none -mt-4 self-end">”</span>
                  </div>
                ) : (
                  <p className="text-md leading-relaxed whitespace-pre-wrap mb-md">
                    {mem.text}
                  </p>
                )}

                {mem.tags && mem.tags.length > 0 && (
                  <div className="flex flex-wrap gap-xs mt-auto pt-sm border-t border-dashed border-ui">
                    {mem.tags.map((tag, i) => (
                      <span key={i} className="tag active text-xs px-sm py-1">
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      ) : (
        <div className="card text-center text-muted p-xl">
          لا توجد أي ذكريات تطابق بحثك حالياً. اضغطي على زر (+) بالأسفل لإضافة أولى ذكرياتك.
        </div>
      )}

      {/* FAB */}
      {activeTab === 'memories' && (
        <button
          onClick={handleOpenAddModal}
          className="fixed bottom-8 left-8 w-14 h-14 bg-orange text-white rounded-full flex items-center justify-center shadow-lg hover:shadow-xl hover:scale-105 transition-all z-40"
          aria-label="إضافة ذكرى جديدة"
        >
          <Plus size={28} />
        </button>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-md">
          <div className="card w-full max-w-lg max-h-[90vh] overflow-y-auto animate-in" style={{ transform: 'none' }}>
            
            <div className="flex justify-between items-center border-b border-ui pb-sm mb-md">
              <button onClick={() => setShowModal(false)} className="btn-ghost p-1">
                <X size={20} />
              </button>
              <h3 className="text-lg font-bold">
                {editingMemory ? 'تعديل الذكرى 📝' : 'تدوين ذكرى جديدة ✍️'}
              </h3>
            </div>

            <form onSubmit={handleSaveMemory} className="flex flex-col gap-md">
              
              <div className="flex flex-col gap-xs">
                <span className="text-sm font-bold">شكل البطاقة</span>
                <div className="flex gap-sm">
                  {[
                    { value: 'text', label: 'نص عادي' },
                    { value: 'quote', label: 'اقتباس' },
                    { value: 'featured', label: 'ذكرى مميزة' }
                  ].map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setType(opt.value)}
                      className={`flex-1 py-sm rounded-md font-bold text-sm border-2 transition-colors ${type === opt.value ? 'border-orange text-orange bg-orange/10' : 'border-ui text-main'}`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {type !== 'quote' && (
                <div className="flex flex-col gap-xs">
                  <label className="text-sm font-bold">عنوان الذكرى</label>
                  <input 
                    type="text" 
                    className="input"
                    value={title} 
                    onChange={e => setTitle(e.target.value)} 
                    placeholder="رحلة الشروق، فنجان قهوة مميز..."
                    required
                  />
                </div>
              )}

              <div className="flex flex-col gap-xs">
                <label className="text-sm font-bold">
                  {type === 'quote' ? 'نص الاقتباس' : 'اكتبي اللحظة...'}
                </label>
                <textarea 
                  rows={4}
                  className="textarea"
                  value={text} 
                  onChange={e => setText(e.target.value)} 
                  placeholder={type === 'quote' ? 'اكتبي حكمة أو اقتباساً للمنتصف...' : 'تفاصيل الشعور، ماذا حدث اليوم، الكلمات التي بقيت...'}
                  required
                />
              </div>

              {type !== 'quote' && (
                <div className="flex flex-col gap-xs">
                  <label className="text-sm font-bold flex items-center gap-xs">
                    <Image size={16} /> أرفق صوراً للذكرى
                  </label>
                  <input 
                    type="file" 
                    className="input p-xs text-sm"
                    multiple
                    accept="image/*"
                    onChange={handleImageChange}
                  />
                  {formImages.length > 0 && (
                    <div className="flex gap-sm flex-wrap mt-sm p-xs bg-cream/30 rounded border border-dashed border-ui" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '10px' }}>
                      {formImages.map((img) => (
                        <div key={img.id} style={{ position: 'relative', width: '56px', height: '56px' }}>
                          <img src={img.preview} alt="معاينة" className="w-full h-full rounded-md object-cover border border-ui" style={{ width: '56px', height: '56px', borderRadius: '6px', objectFit: 'cover' }} />
                          <button
                            type="button"
                            onClick={() => handleRemoveSelectedImage(img.id)}
                            style={{
                              position: 'absolute',
                              top: '-6px',
                              left: '-6px',
                              background: 'var(--red)',
                              color: '#fff',
                              border: 'none',
                              borderRadius: '50%',
                              width: '18px',
                              height: '18px',
                              fontSize: '11px',
                              fontWeight: 'bold',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              lineHeight: '1',
                              boxShadow: '0 2px 4px rgba(0,0,0,0.15)'
                            }}
                            aria-label="إزالة الصورة"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="flex flex-col gap-xs">
                <span className="text-sm font-bold flex items-center gap-xs">
                  <Smile size={16} /> مزاج الذكرى
                </span>
                <div className="flex gap-sm flex-wrap">
                  {emojisList.map(item => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setMood(item)}
                      className={`text-xl p-xs rounded-full border-2 transition-colors ${mood === item ? 'border-orange bg-orange/10' : 'border-transparent'}`}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-xs">
                <span className="text-sm font-bold">الأوسمة (#Tags)</span>
                
                <div className="flex gap-sm">
                  <button type="button" onClick={handleAddNewTag} className="btn-primary py-1 px-3 text-sm">
                    أضف
                  </button>
                  <input 
                    type="text"
                    className="input flex-1 py-1 px-sm text-sm"
                    value={newTagText}
                    onChange={e => setNewTagText(e.target.value)}
                    placeholder="وسم مخصص..."
                  />
                </div>

                <div className="flex gap-xs flex-wrap mt-xs">
                  {defaultTags.map(tag => {
                    const isSelected = selectedTags.includes(tag);
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => handleToggleTag(tag)}
                        className={`tag ${isSelected ? 'active' : ''}`}
                      >
                        #{tag}
                      </button>
                    );
                  })}
                </div>
              </div>

              {errorMessage && (
                <div 
                  className="bg-red-50 text-red text-sm p-sm rounded border border-red-200 text-right font-bold animate-in flex items-center justify-between"
                  style={{
                    background: 'rgba(230, 57, 70, 0.08)',
                    border: '1px solid rgba(230, 57, 70, 0.2)',
                    color: 'var(--red)',
                    padding: '10px 15px',
                    borderRadius: '8px',
                    marginBottom: '10px',
                    fontSize: '0.9rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '10px',
                    width: '100%'
                  }}
                  role="alert"
                >
                  <span>{errorMessage}</span>
                  <button
                    type="button"
                    onClick={() => setErrorMessage('')}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--red)',
                      cursor: 'pointer',
                      opacity: 0.6,
                      display: 'flex',
                      alignItems: 'center',
                      padding: '2px'
                    }}
                    aria-label="إغلاق رسالة الخطأ"
                  >
                    <X size={16} />
                  </button>
                </div>
              )}

              <div className="flex gap-md border-t border-ui pt-md mt-sm">
                <button type="submit" disabled={saving} className="btn-primary flex-2 justify-center py-sm text-md flex items-center gap-sm">
                  {saving ? (
                    <>
                      <span className="loader loader-sm" />
                      <span>{saveStatus || 'جاري الحفظ...'}</span>
                    </>
                  ) : editingMemory ? (
                    'تحديث الذكرى 💾'
                  ) : (
                    'حفظ الذكرى 💾'
                  )}
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

export default Memories;
