import { useState, useRef, useEffect } from 'react';
import type { DragEvent, ChangeEvent } from 'react';
import { UploadCloud, Image as ImageIcon, Download, RefreshCw, Sparkles, Loader2, CheckCircle, History, Globe, ShieldCheck, Trash2, Share2 } from 'lucide-react';
import { processImage } from './utils/bgRemoval';
import { saveRecord, getAllRecords, cleanupOldRecords, deleteRecord } from './utils/db';

type HistoryItem = {
  id: string;
  originalUrl: string;
  resultUrl: string;
  timestamp: number;
};

const t = {
  tr: {
    title: "Sihirli Arka Plan Kaldırıcı",
    subtitle: "Herhangi bir görseli yükleyin ve tarayıcınızdaki yapay zeka arka planı hemen kaldırsın. Tamamen gizli ve cihazınızda çalışır.",
    uploadInvalid: "Lütfen geçerli bir resim dosyası seçin.",
    dragHere: "Resminizi buraya sürükleyip bırakın",
    orBrowse: "veya cihazınızdan seçmek için tıklayın",
    selectImg: "Resim Seç",
    supported: "JPG, PNG, WEBP destekler. İşlemler cihazınızda gerçekleşir.",
    ready: "Arka planı kaldırmaya hazır mısınız?",
    processingStart: "Yapay zeka modelleri hazırlanıyor...",
    processingLoad: "Yapay zeka modelleri yükleniyor",
    processingRemove: "Arka Plan Kaldırılıyor...",
    processingWait: "İşleniyor...",
    cancel: "İptal Et",
    removeBtn: "Arka Planı Kaldır",
    error: "Arka plan kaldırılırken bir hata oluştu. Lütfen konsolu kontrol edin.",
    errorCanvas: "Yüksek çözünürlüklü görüntü oluşturulamadı. Muhtemelen cihaz belleği yetersiz kaldı.",
    uploadNew: "Yeni Resim Yükle",
    saving: "Kaydediliyor...",
    saveBtn: "Resmi Kaydet",
    original: "Orijinal Görüntü",
    result: "İşlenmiş Sonuç",
    historyTitle: "Geçmiş İşlemler",
    historyNotice: "İşlem yaptığınız resimler cihazınızın hafızasında 30 dakika boyunca güvenle saklanır.",
    view: "Görüntüle",
    footer: "React ve @imgly/background-removal kullanılarak oluşturuldu • Tüm işlemler doğrudan bilgisayarınızda gerçekleşir.",
    scale1: "1x Normal",
    scale2: "2x HD",
    scale4: "4x Ultra",
    scale8: "8x Maksimum",
    shareBtn: "Paylaş / Kaydet",
    premiumTitle: "Destek Ol & HD İndir",
    premiumDesc: "Bize destek olun ve tüm görsellerinizi saniyeler içinde HD kalitesinde (8x'e kadar) indirin.",
    premiumFeatures: ["Süper Yüksek Çözünürlük (8x)", "Sınırsız İşlem", "Reklamsız Deneyim"],
    premiumUnlock: "Destek Ol ve HD'yi Aç",
    proLabel: "(PRO)",
  },
  en: {
    title: "Magic Background Remover",
    subtitle: "Upload any image and our on-device AI will automatically remove the background instantly. Completely private and amazingly fast.",
    uploadInvalid: "Please select a valid image file.",
    dragHere: "Drag & drop your image here",
    orBrowse: "or click to browse from your device",
    selectImg: "Select Image",
    supported: "Supports JPG, PNG, WEBP. Files are processed locally.",
    ready: "Ready to remove background?",
    processingStart: "Initializing background removal AI...",
    processingLoad: "Loading AI models",
    processingRemove: "Removing Background...",
    processingWait: "Processing...",
    cancel: "Cancel",
    removeBtn: "Remove Background",
    error: "An error occurred during background removal. Please check console for details.",
    errorCanvas: "Failed to generate high-resolution image. Your device memory might be insufficient.",
    uploadNew: "Upload New Image",
    saving: "Saving...",
    saveBtn: "Save Image",
    original: "Original Image",
    result: "Processed Result",
    historyTitle: "Session History",
    historyNotice: "Processed images are securely stored in your device's memory for 30 minutes.",
    view: "View",
    footer: "Built with React & @imgly/background-removal • Processing runs entirely on your device",
    scale1: "1x Normal",
    scale2: "2x HD",
    scale4: "4x Ultra",
    scale8: "8x Maximum",
    shareBtn: "Share / Save",
    premiumTitle: "Support & Download HD",
    premiumDesc: "Support our project and download all your images in stunning HD quality (up to 8x).",
    premiumFeatures: ["Super High Resolution (8x)", "Unlimited Processing", "Ad-Free Experience"],
    premiumUnlock: "Support & Unlock HD",
    proLabel: "(PRO)",
  }
};

// Robust AdSense Component for React
const AdSense = ({ slot, style }: { slot: string; style?: React.CSSProperties }) => {
  useEffect(() => {
    try {
      // @ts-ignore
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (e) {
      console.error("AdSense error:", e);
    }
  }, []);

  return (
    <div className="ad-wrapper" style={{ 
      width: '100%', 
      minHeight: '100px', 
      background: 'rgba(255,255,255,0.02)', 
      border: '1px dashed rgba(255,255,255,0.1)',
      borderRadius: '12px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'rgba(255,255,255,0.2)',
      fontSize: '0.8rem',
      overflow: 'hidden',
      margin: '1rem 0',
      ...style
    }}>
      <ins className="adsbygoogle"
           style={{ display: 'block' }}
           data-ad-client="ca-pub-5778756614099869"
           data-ad-slot={slot === 'HEADER_SLOT_ID' ? '8138072634' : '1814139187'}
           data-ad-format="auto"
           data-full-width-responsive="true"></ins>
    </div>
  );
};

// Configuration - Her çözünürlük için ayrı iyzico linklerinizi buraya ekleyin
const PREMIUM_LINKS: Record<number, string> = {
  2: "https://iyzi.link/2X_HLD_PLACEHOLDER", // 2x ($1)
  4: "https://iyzi.link/4X_HLD_PLACEHOLDER", // 4x ($1.5)
  8: "https://iyzi.link/8X_HLD_PLACEHOLDER"  // 8x ($2)
};

const PREMIUM_PRICES: Record<number, string> = {
  2: "$1",
  4: "$1.5",
  8: "$2"
};

export default function App() {
  const [lang, setLang] = useState<'tr' | 'en'>('tr');
  const dict = t[lang];

  const [history, setHistory] = useState<HistoryItem[]>([]);
  
  // Staged for processing
  const [stagedFile, setStagedFile] = useState<File | null>(null);
  const [stagedUrl, setStagedUrl] = useState<string | null>(null);
  
  // Currently active/viewed item
  const [activeItem, setActiveItem] = useState<HistoryItem | null>(null);
  
  // Processing state
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressMsg, setProgressMsg] = useState<string>('');
  const [isDragging, setIsDragging] = useState(false);
  
  // Settings
  const [downloadScale, setDownloadScale] = useState<number>(1);
  const [isDownloading, setIsDownloading] = useState(false);
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [usdToTry, setUsdToTry] = useState<number>(44.3); // Safe fallback
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load history from IndexedDB on mount
  useEffect(() => {
    const fetchRate = async () => {
      try {
        const res = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
        const data = await res.json();
        if (data && data.rates && data.rates.TRY) {
          setUsdToTry(data.rates.TRY);
        }
      } catch (err) {
        console.error("Exchange rate fetch failed:", err);
      }
    };
    fetchRate();
    
    // Dynamically update HTML lang attribute to prevent browser auto-translate conflicts
    document.documentElement.lang = lang;
  }, [lang]);

  useEffect(() => {
    const loadData = async () => {
      try {
        await cleanupOldRecords(30);
        const records = await getAllRecords();
        const items: HistoryItem[] = records.map(r => ({
          id: r.id,
          originalUrl: URL.createObjectURL(r.originalBlob),
          resultUrl: URL.createObjectURL(r.resultBlob),
          timestamp: r.timestamp
        }));
        setHistory(items);
      } catch (err) {
        console.error("History could not be loaded from DB:", err);
      }
    };
    loadData();
  }, []);

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const stageFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert(dict.uploadInvalid);
      return;
    }
    const url = URL.createObjectURL(file);
    setStagedFile(file);
    setStagedUrl(url);
    setActiveItem(null); 
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      stageFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      stageFile(e.target.files[0]);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const resetAll = () => {
    setStagedFile(null);
    setStagedUrl(null);
    setActiveItem(null);
    setIsProcessing(false);
    setProgressMsg('');
  };

  const startProcessing = async () => {
    if (!stagedFile || !stagedUrl) return;
    
    setIsProcessing(true);
    setProgressMsg(dict.processingStart);

    try {
      const resultBlob = await processImage(stagedFile, (key, current, total) => {
        const percent = Math.round((current / total) * 100);
        setProgressMsg(`${dict.processingLoad}: ${key} (%${percent})`);
      });

      const resultUrl = URL.createObjectURL(resultBlob);
      const newItemId = Math.random().toString(36).substring(2, 9);
      const timestamp = Date.now();

      // Save to IndexedDB
      await saveRecord({
        id: newItemId,
        originalBlob: stagedFile,
        resultBlob: resultBlob,
        timestamp: timestamp
      });

      const newItem: HistoryItem = {
        id: newItemId,
        originalUrl: stagedUrl,
        resultUrl: resultUrl,
        timestamp: timestamp
      };
      
      setHistory((prev) => [newItem, ...prev]);
      setActiveItem(newItem);
      
      setStagedFile(null);
      setStagedUrl(null);
      setProgressMsg('');
    } catch (error) {
      console.error(error);
      alert(dict.error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = async () => {
    if (!activeItem) return;
    setIsDownloading(true);
    const url = activeItem.resultUrl;
    const scale = downloadScale;

    try {
      if (scale > 1) {
        setShowPremiumModal(true);
        setIsDownloading(false);
        return;
      }

      if (scale === 1) {
        triggerDownload(url, 'transparent-1x.png');
        setIsDownloading(false);
        return;
      }

      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = url;
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
      });

      const canvas = document.createElement('canvas');
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        canvas.toBlob((blob) => {
          if (blob) {
            const scaledUrl = URL.createObjectURL(blob);
            triggerDownload(scaledUrl, `transparent-${scale}x.png`);
            setTimeout(() => URL.revokeObjectURL(scaledUrl), 5000);
          } else {
            alert(dict.errorCanvas);
          }
          setIsDownloading(false);
        }, 'image/png', 1.0);
      } else {
        throw new Error("Canvas context oluşturulamadı");
      }
    } catch (err) {
      console.error('Boyutlandırma hatası:', err);
      // Fallback
      triggerDownload(url, 'transparent-1x.png');
      setIsDownloading(false);
    }
  };

  const triggerDownload = (href: string, filename: string) => {
    const a = document.createElement('a');
    a.href = href;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleShare = async () => {
    if (!activeItem || !navigator.share) return;
    
    try {
      const response = await fetch(activeItem.resultUrl);
      const blob = await response.blob();
      const file = new File([blob], 'result.png', { type: 'image/png' });
      
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'Magic Background Remover',
          text: 'Arka planı silinmiş görselim!',
        });
      } else {
        triggerDownload(activeItem.resultUrl, 'result.png');
      }
    } catch (err) {
      console.error('Paylaşım hatası:', err);
    }
  };

  const toggleLang = () => {
    setLang(lang === 'tr' ? 'en' : 'tr');
  };

  const handleDelete = async (id: string) => {
    const confirmDelete = lang === 'tr' 
      ? window.confirm("Bu kaydı silmek istediğinizden emin misiniz?") 
      : window.confirm("Are you sure you want to delete this record?");
    
    if (confirmDelete) {
      await deleteRecord(id);
      setHistory(prev => prev.filter(item => item.id !== id));
      if (activeItem?.id === id) {
        setActiveItem(null); // If the deleted item was active, clear active item
      }
    }
  };

  return (
    <div key={lang} className="app-container" style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto', width: '100%', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      
      {/* Top Bar for Language & Free Badge */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        width: '100%', 
        padding: '1rem 0', 
        marginBottom: '1rem',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <div style={{ 
          background: 'linear-gradient(135deg, #10b981, #059669)', 
          color: 'white', 
          padding: '6px 14px', 
          borderRadius: '12px', 
          fontSize: '0.8rem', 
          fontWeight: 700, 
          letterSpacing: '0.05em', 
          boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
          whiteSpace: 'nowrap'
        }}>
          STANDART ÜCRETSİZ • STANDARD FREE
        </div>
        
        <button className="button-secondary" onClick={toggleLang} style={{ padding: '0.5rem 1rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Globe size={16} />
          {lang === 'tr' ? 'Switch to English' : 'Türkçe\'ye Geç'}
        </button>
      </div>

      <header style={{ textAlign: 'center', marginBottom: '2.5rem', paddingTop: '1rem' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '64px', height: '64px', borderRadius: '16px', background: 'rgba(99, 102, 241, 0.2)', marginBottom: '1.5rem' }}>
          <Sparkles color="#8b5cf6" size={32} />
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <h1 translate="no" style={{ fontSize: 'clamp(1.8rem, 5vw, 2.5rem)', fontWeight: 700, margin: 0, background: 'linear-gradient(to right, #a855f7, #6366f1)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', lineHeight: 1.2 }}>
            {t.tr.title}
          </h1>
          <h2 translate="no" style={{ fontSize: 'clamp(1.1rem, 3vw, 1.5rem)', fontWeight: 500, margin: 0, opacity: 0.8, color: '#94a3b8', lineHeight: 1.2, marginTop: '0.5rem' }}>
            {t.en.title}
          </h2>
        </div>

        <div style={{ maxWidth: '700px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <p translate="no" style={{ fontSize: '1.1rem', color: 'var(--text-muted)', margin: 0 }}>
            {t.tr.subtitle}
          </p>
          <p translate="no" style={{ fontSize: '1rem', color: 'var(--text-muted)', opacity: 0.7, margin: 0, fontStyle: 'italic' }}>
            {t.en.subtitle}
          </p>
        </div>
      </header>

      <AdSense slot="HEADER_SLOT_ID" style={{ marginBottom: '2rem' }} />

      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2rem' }}>
        
        {/* Step 1: Upload Dropzone */}
        {!stagedUrl && !activeItem && (
          <div 
            className="glass-panel"
            style={{
              width: '100%',
              maxWidth: '800px',
              padding: '4rem 2rem',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              border: isDragging ? '2px dashed var(--primary-color)' : '2px dashed rgba(255,255,255,0.2)',
              backgroundColor: isDragging ? 'rgba(99, 102, 241, 0.05)' : 'var(--card-bg)',
              transition: 'all 0.3s ease',
              cursor: 'pointer'
            }}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={triggerFileInput}
          >
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileChange} 
              accept="image/*" 
              style={{ display: 'none' }} 
            />
            
            <div style={{ background: 'rgba(255,255,255,0.05)', padding: '1.5rem', borderRadius: '50%', marginBottom: '1.5rem' }}>
              <UploadCloud size={48} color="var(--primary-color)" />
            </div>
            
            <h3 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>{dict.dragHere}</h3>
            <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>{dict.orBrowse}</p>
            
            <button className="button-primary" onClick={(e) => { e.stopPropagation(); triggerFileInput(); }}>
              <ImageIcon size={20} />
              {dict.selectImg}
            </button>
            
            <p style={{ marginTop: '2rem', fontSize: '0.85rem', color: 'rgba(255,255,255,0.4)' }}>
              {dict.supported}
            </p>
          </div>
        )}

        {/* 100% Free & Private Features Card */}
        <div className="glass-panel" style={{ width: '100%', maxWidth: '800px', padding: '1.5rem', display: 'flex', flexWrap: 'wrap', gap: '2rem', justifyContent: 'center', margin: '2rem auto', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#10b981' }}>
            <ShieldCheck size={24} />
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>%100 ÜCRETSİZ & GİZLİ</div>
              <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>100% FREE & PRIVATE</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#8b5cf6' }}>
            <Sparkles size={24} />
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>SINIRSIZ KULLANIM</div>
              <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>UNLIMITED USE</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#6366f1' }}>
            <div style={{ position: 'relative' }}>
              <Download size={24} />
              <span style={{ position: 'absolute', top: '-10px', right: '-15px', background: '#f59e0b', color: 'black', fontSize: '0.6rem', padding: '1px 4px', borderRadius: '4px', fontWeight: 800 }}>PRO</span>
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>HD İNDİRME</div>
              <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>HD DOWNLOAD</div>
            </div>
          </div>
        </div>

        {/* Step 2: Confirmation / Staged Preview */}
        {stagedUrl && !activeItem && (
          <div className="glass-panel" style={{ width: '100%', maxWidth: '800px', padding: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2rem' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 600 }}>{dict.ready}</h2>
            
            <div style={{ width: '100%', maxWidth: '600px', aspectRatio: '4/3', borderRadius: '12px', overflow: 'hidden', background: '#000', position: 'relative' }}>
              <img src={stagedUrl} alt="Staged for processing" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              
              {isProcessing && (
                <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(15, 23, 42, 0.8)', zIndex: 10 }}>
                  <Loader2 className="animate-spin" size={48} color="var(--primary-color)" style={{ marginBottom: '1rem' }} />
                  <p className="animate-pulse" style={{ fontWeight: 500 }}>{dict.processingRemove}</p>
                  {progressMsg && <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>{progressMsg}</p>}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '1rem', width: '100%', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button className="button-secondary" onClick={resetAll} disabled={isProcessing}>
                {dict.cancel}
              </button>
              <button className="button-primary button-sparkle" onClick={startProcessing} disabled={isProcessing}>
                <Sparkles size={20} />
                {isProcessing ? dict.processingWait : (
                  <>{dict.removeBtn} <span style={{ fontSize: '0.7rem', opacity: 0.8, marginLeft: '5px', background: 'rgba(255,255,255,0.2)', padding: '2px 6px', borderRadius: '4px' }}>%100 FREE</span></>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Result View */}
        {activeItem && !stagedUrl && (
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            
            <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
              <button className="button-secondary" onClick={resetAll} disabled={isDownloading}>
                <RefreshCw size={18} />
                {dict.uploadNew}
              </button>
              
              <div style={{ display: 'flex', alignItems: 'stretch' }}>
                <select 
                  className="resolution-select"
                  value={downloadScale}
                  onChange={(e) => setDownloadScale(Number(e.target.value))}
                  disabled={isDownloading}
                >
                  <option value={1}>{dict.scale1} (Ücretsiz)</option>
                  <option value={2}>{dict.scale2} ({formatPriceLabel(PREMIUM_PRICES[2])})</option>
                  <option value={4}>{dict.scale4} ({formatPriceLabel(PREMIUM_PRICES[4])})</option>
                  <option value={8}>{dict.scale8} ({formatPriceLabel(PREMIUM_PRICES[8])})</option>
                </select>
                <button className="button-primary download-btn" onClick={handleDownload} disabled={isDownloading}>
                  {isDownloading ? <Loader2 className="animate-spin" size={18} /> : <Download size={18} />}
                  {isDownloading ? dict.saving : (
                    downloadScale > 1 
                      ? <>{dict.premiumUnlock} ({formatPriceLabel(PREMIUM_PRICES[downloadScale])})</>
                      : <>{dict.saveBtn} (1x) <span style={{ fontSize: '0.7rem', opacity: 0.8, marginLeft: '5px', background: 'rgba(255,255,255,0.2)', padding: '2px 6px', borderRadius: '4px' }}>FREE</span></>
                  )}
                </button>
              </div>

              {typeof navigator.share === 'function' && (
                <button 
                  className="button-secondary" 
                  onClick={handleShare}
                  style={{ alignSelf: 'center', padding: '0.75rem 1.5rem', background: 'rgba(16, 185, 129, 0.1)', borderColor: 'rgba(16, 185, 129, 0.3)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                >
                  <Share2 size={18} /> {dict.shareBtn} (Galeriye Kaydet)
                </button>
              )}
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2rem', width: '100%', justifyContent: 'center' }}>
              <div className="glass-panel" style={{ flex: '1 1 400px', maxWidth: '500px', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.2rem' }}>
                  <ImageIcon size={20} color="var(--text-muted)" />
                  {dict.original}
                </h3>
                <div style={{ width: '100%', aspectRatio: '4/3', borderRadius: '12px', overflow: 'hidden', background: '#000' }}>
                  <img src={activeItem.originalUrl} alt="Original" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                </div>
              </div>

              <div className="glass-panel" style={{ flex: '1 1 400px', maxWidth: '500px', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', position: 'relative' }}>
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.2rem' }}>
                  <CheckCircle size={20} color="#10b981" />
                  {dict.result}
                </h3>
                
                <div className="transparent-bg" style={{ 
                  width: '100%', aspectRatio: '4/3', borderRadius: '12px', overflow: 'hidden', 
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  <img src={activeItem.resultUrl} alt="Result without background" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                </div>
              </div>
            </div>
          </div>
        )}

        <AdSense slot="BOTTOM_SLOT_ID" style={{ marginTop: '2rem' }} />

        {/* Step 4: Session History */}
        {history.length > 0 && (
          <div style={{ width: '100%', marginTop: '4rem', padding: '2rem 0', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.5rem' }}>
                <History size={24} color="var(--primary-color)"/>
                {dict.historyTitle}
              </h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', padding: '0.5rem 1rem', borderRadius: '20px', fontSize: '0.85rem' }}>
                <ShieldCheck size={16} />
                {dict.historyNotice}
              </div>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '1rem' }}>
              {history.map(item => (
                <div 
                  key={item.id} 
                  className={`glass-panel history-thumb ${activeItem?.id === item.id ? 'active' : ''}`}
                  onClick={() => { setActiveItem(item); setStagedUrl(null); }}
                  style={{ position: 'relative' }}
                >
                  <img src={item.resultUrl} alt="history item" />
                  <div className="history-overlay">{dict.view}</div>
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }}
                    className="history-delete-btn"
                    title={lang === 'tr' ? 'Sil' : 'Delete'}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Premium Modal */}
        {showPremiumModal && (
          <div style={{ 
            position: 'fixed', 
            inset: 0, 
            backgroundColor: 'rgba(0,0,0,0.85)', 
            backdropFilter: 'blur(8px)',
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            zIndex: 1000,
            padding: '1rem'
          }}>
            <div className="glass-panel" style={{ 
              maxWidth: '450px', 
              width: '100%', 
              padding: '2.5rem', 
              textAlign: 'center', 
              border: '1px solid rgba(245, 158, 11, 0.4)',
              boxShadow: '0 20px 40px rgba(0,0,0,0.4)'
            }}>
              <div style={{ 
                background: 'rgba(245, 158, 11, 0.15)', 
                width: '70px', 
                height: '70px', 
                borderRadius: '50%', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                margin: '0 auto 1.5rem' 
              }}>
                <Sparkles size={36} color="#f59e0b" />
              </div>
              
              <h2 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '1rem', background: 'linear-gradient(to right, #f59e0b, #fbbf24)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                {dict.premiumTitle}
              </h2>
              
              <p style={{ color: 'var(--text-muted)', marginBottom: '2rem', lineHeight: 1.5 }}>
                {dict.premiumDesc}
              </p>
              
              <div style={{ textAlign: 'left', background: 'rgba(255,255,255,0.03)', padding: '1.5rem', borderRadius: '12px', marginBottom: '2.5rem' }}>
                {dict.premiumFeatures.map((feat, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem', fontSize: '0.95rem' }}>
                    <CheckCircle size={18} color="#10b981" />
                    <span>{feat}</span>
                  </div>
                ))}
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <button 
                  className="button-primary" 
                  style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)', border: 'none', padding: '1rem', fontWeight: 700 }}
                  onClick={() => window.open(PREMIUM_LINKS[downloadScale], '_blank')}
                >
                  {dict.premiumUnlock} ({formatPriceLabel(PREMIUM_PRICES[downloadScale])})
                </button>
                <button 
                  className="button-secondary" 
                  onClick={() => setShowPremiumModal(false)}
                >
                  {dict.cancel}
                </button>
              </div>
            </div>
          </div>
        )}

      </main>

      <footer style={{ marginTop: 'auto', paddingTop: '4rem', paddingBottom: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
        {/* HilltopAds Banner Zone Placeholder */}
        <div id="hilltop-ad-zone-placeholder" style={{ marginBottom: '1rem', opacity: 0.5 }}></div>
        <p>{dict.footer}</p>
      </footer>
    </div>
  );
}
