import { useState, useEffect, useRef } from 'react';
import { 
  Camera, X, Plus, Trash2, CheckCircle, AlertCircle, 
  Star, MapPin, Loader2 
} from 'lucide-react';
import { supabase } from '../supabaseClient'; 

interface Moment {
  id: string | number;
  imageUrl: string;
  caption: string;
  date: string;
}

export default function Moments() {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [deleteId, setDeleteId] = useState<string | number | null>(null);
  const [loading, setLoading] = useState(false);
  const [moments, setMoments] = useState<Moment[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchMoments = async () => {
    try {
      const { data, error } = await supabase
        .from('Moments')
        .select('*')
        .order('id', { ascending: false });
      
      if (error) throw error;
      if (data) setMoments(data);
    } catch (err: any) {
      console.error("Lỗi lấy dữ liệu:", err.message);
    }
  };

  useEffect(() => { fetchMoments(); }, []);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 800; // Tăng lên một chút để ảnh nét hơn trên mobile
          const scaleSize = MAX_WIDTH / img.width;
          canvas.width = MAX_WIDTH;
          canvas.height = img.height * scaleSize;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
          const base64 = canvas.toDataURL('image/jpeg', 0.7);
          resolve(base64);
        };
      };
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    try {
      const compressedBase64 = await compressImage(file);
      const { error: dbError } = await supabase.from('Moments').insert([{
        imageUrl: compressedBase64, 
        caption: `Kỷ niệm ngày ${new Date().toLocaleDateString('vi-VN')}`,
        date: new Date().toLocaleDateString('vi-VN'),
      }]);
      if (dbError) throw dbError;
      showToast("Đã lưu kỷ niệm!");
      fetchMoments();
    } catch (err: any) {
      showToast("Lỗi hệ thống", "error");
    } finally {
      setLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    try {
      const { error } = await supabase.from('Moments').delete().eq('id', deleteId);
      if (error) throw error;
      showToast("Đã gỡ bỏ kỷ niệm");
      fetchMoments();
    } catch (err: any) {
      showToast("Lỗi xóa dữ liệu", "error");
    } finally {
      setDeleteId(null);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.militaryGridOverlay}></div>
      
      {toast && (
        <div className="toast-animate" style={styles.toast(toast.type)}>
          {toast.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
          <span>{toast.msg}</span>
        </div>
      )}

      {deleteId && (
        <div style={styles.modalOverlay}>
          <div className="modal-animate" style={styles.modalContent}>
            <div style={styles.trashIconContainer}><Trash2 size={24} color="#ef4444" /></div>
            <h3 style={styles.modalTitle}>TIÊU HỦY KỶ NIỆM?</h3>
            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              <button onClick={() => setDeleteId(null)} style={styles.btnCancel}>HỦY</button>
              <button onClick={confirmDelete} style={styles.btnConfirmDelete}>XÁC NHẬN</button>
            </div>
          </div>
        </div>
      )}

      {/* Header tối ưu cho Mobile */}
      <div className="header-moment" style={styles.headerSection}>
        <div className="star-decoration star-left"><Star size={30} fill="#fbbf24" stroke="none" /></div>
        <div className="star-decoration star-right"><Star size={30} fill="#fbbf24" stroke="none" /></div>

        <div style={{ position: 'relative', zIndex: 10, textAlign: 'center', width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginBottom: '5px' }}>
            <Camera size={28} color="white" />
            <h2 className="title-text" style={styles.headerTitle}>NHẬT KÝ CHIẾN SĨ</h2>
          </div>
          <p style={styles.headerSub}>Hệ thống lưu trữ <span style={{ color: '#fbbf24' }}>{moments.length}</span> khoảnh khắc</p>
          
          <button onClick={() => fileInputRef.current?.click()} style={styles.uploadBtn} disabled={loading}>
            {loading ? <Loader2 className="animate-spin" size={18} /> : <Plus size={18} />}
            {loading ? "ĐANG LƯU..." : "THÊM KỶ NIỆM"}
          </button>
        </div>
        <input type="file" ref={fileInputRef} style={{ display: 'none' }} accept="image/*" onChange={handleFileUpload} />
      </div>

      {/* Grid thay đổi số cột theo màn hình */}
      <div className="moments-grid">
        {moments.map((moment) => (
          <div key={moment.id} className="moment-card" onClick={() => setSelectedImage(moment.imageUrl)}>
            <div style={styles.polaroidFrame}>
                <div style={styles.imageContainer}>
                  <img src={moment.imageUrl} alt="Kỷ niệm" style={styles.imgStyle} />
                </div>
                <div style={styles.polaroidLabel}>
                    <p style={styles.captionText}>{moment.caption}</p>
                    <div style={styles.locationTag}><MapPin size={10} /> {moment.date}</div>
                </div>
            </div>
            <button className="del-btn" onClick={(e) => { e.stopPropagation(); setDeleteId(moment.id); }}><Trash2 size={16} /></button>
          </div>
        ))}
      </div>

      {selectedImage && (
        <div className="lightbox" onClick={() => setSelectedImage(null)}>
          <button className="close-btn"><X size={30} /></button>
          <img src={selectedImage} alt="Zoom" className="lightbox-img" />
        </div>
      )}

      {/* HỆ THỐNG CSS RESPONSIVE */}
      <style>{`
        .animate-spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        
        .moments-grid { 
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
          padding: 20px;
          max-width: 1200px;
          margin: 0 auto;
        }

        .moment-card { position: relative; cursor: pointer; transition: 0.3s; }
        .moment-card:hover { transform: translateY(-5px); }

        .del-btn { position: absolute; top: 10px; right: 10px; background: #ef4444; color: white; border: none; padding: 8px; border-radius: 50%; transition: 0.3s; z-index: 10; }
        
        .lightbox { position: fixed; inset: 0; background: rgba(0,0,0,0.95); z-index: 10000; display: flex; align-items: center; justifyContent: center; padding: 20px; }
        .lightbox-img { max-width: 100%; max-height: 90vh; border-radius: 8px; border: 4px solid white; }
        .close-btn { position: absolute; top: 20px; right: 20px; color: white; background: none; border: none; }

        @media (max-width: 1024px) {
          .moments-grid { grid-template-columns: repeat(2, 1fr); }
        }

        @media (max-width: 600px) {
          .moments-grid { grid-template-columns: 1fr; gap: 25px; }
          .title-text { font-size: 1.5rem !important; }
          .star-decoration { display: none; }
          .header-moment { padding: 40px 15px !important; }
        }

        .toast-animate { animation: slideUp 0.3s ease-out; }
        @keyframes slideUp { from { transform: translate(-50%, 100%); } to { transform: translate(-50%, 0); } }
      `}</style>
    </div>
  );
}

const styles: any = {
  container: { minHeight: '100vh', background: '#022c22', position: 'relative', paddingBottom: '50px' },
  militaryGridOverlay: { position: 'fixed', inset: 0, opacity: 0.03, pointerEvents: 'none', backgroundImage: `linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)`, backgroundSize: '30px 30px' },
  headerSection: { background: '#b91c1c', borderBottom: '6px solid #fbbf24', padding: '50px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative', marginBottom: '30px' },
  headerTitle: { fontSize: '2rem', margin: 0, color: 'white', fontWeight: '900', letterSpacing: '1px' },
  headerSub: { color: 'white', fontSize: '11px', fontWeight: 'bold', opacity: 0.8, marginTop: '5px' },
  uploadBtn: { marginTop: '20px', background: '#fbbf24', color: '#022c22', border: 'none', padding: '12px 25px', borderRadius: '50px', fontWeight: '900', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' },
  polaroidFrame: { background: 'white', padding: '10px 10px 25px 10px', boxShadow: '0 10px 20px rgba(0,0,0,0.3)' },
  imageContainer: { width: '100%', aspectRatio: '1/1', overflow: 'hidden', background: '#f1f5f9' },
  imgStyle: { width: '100%', height: '100%', objectFit: 'cover' },
  polaroidLabel: { marginTop: '10px', textAlign: 'center' },
  captionText: { margin: '0', fontSize: '14px', fontWeight: '800', color: '#1a2e21' },
  locationTag: { fontSize: '10px', color: '#666', marginTop: '3px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3px' },
  toast: (type: string) => ({ position: 'fixed', bottom: '30px', left: '50%', transform: 'translateX(-50%)', zIndex: 10001, background: type === 'success' ? '#059669' : '#dc2626', color: 'white', padding: '12px 25px', borderRadius: '50px', display: 'flex', alignItems: 'center', gap: '10px', border: '1px solid #fbbf24', whiteSpace: 'nowrap', fontSize: '13px' }),
  modalOverlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10005, padding: '20px' },
  modalContent: { background: '#fff', padding: '30px', borderRadius: '20px', textAlign: 'center', maxWidth: '350px', width: '100%' },
  trashIconContainer: { width: '50px', height: '50px', borderRadius: '50%', background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 15px' },
  modalTitle: { fontSize: '1.1rem', color: '#b91c1c', fontWeight: '900', margin: 0 },
  btnCancel: { flex: 1, padding: '12px', borderRadius: '10px', border: '1px solid #ddd', background: 'none', fontWeight: 'bold' },
  btnConfirmDelete: { flex: 1, padding: '12px', borderRadius: '10px', background: '#b91c1c', color: 'white', border: 'none', fontWeight: 'bold' }
};