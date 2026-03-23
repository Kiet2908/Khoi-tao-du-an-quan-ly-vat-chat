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

  // --- 1. LẤY DỮ LIỆU TỪ DATABASE ---
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

  // --- HÀM NÉN ẢNH THÀNH CHUỖI (BASE64) ĐỂ LƯU THẲNG VÀO DATABASE ---
  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 500; // Co nhỏ kích thước ảnh
          const scaleSize = MAX_WIDTH / img.width;
          canvas.width = MAX_WIDTH;
          canvas.height = img.height * scaleSize;
          
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
          
          // Nén chất lượng xuống 0.6 để chuỗi Base64 không quá dài
          const base64 = canvas.toDataURL('image/jpeg', 0.6);
          resolve(base64);
        };
      };
    });
  };

  // --- 2. TẢI ẢNH LÊN (LƯU TRỰC TIẾP VÀO TABLE) ---
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    try {
      // BƯỚC A: Biến ảnh thành chuỗi mã hóa
      const compressedBase64 = await compressImage(file);

      // BƯỚC B: Lưu thẳng chuỗi đó vào cột imageUrl của bảng Moments
      const { error: dbError } = await supabase.from('Moments').insert([{
        imageUrl: compressedBase64, 
        caption: `Kỷ niệm ngày ${new Date().toLocaleDateString('vi-VN')}`,
        date: new Date().toLocaleDateString('vi-VN'),
      }]);

      if (dbError) throw dbError;

      showToast("Đã lưu kỷ niệm vào Database!");
      fetchMoments();
    } catch (err: any) {
      showToast("Lỗi: Hãy chắc chắn bảng Moments đã mở quyền INSERT", "error");
      console.error(err);
    } finally {
      setLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // --- 3. XÓA DỮ LIỆU ---
  const confirmDelete = async () => {
    if (!deleteId) return;
    try {
      const { error } = await supabase.from('Moments').delete().eq('id', deleteId);
      if (error) throw error;
      showToast("Đã gỡ bỏ kỷ niệm");
      fetchMoments();
    } catch (err: any) {
      showToast("Lỗi: " + err.message, "error");
    } finally {
      setDeleteId(null);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.militaryGridOverlay}></div>
      
      {toast && (
        <div className="toast-animate" style={styles.toast(toast.type)}>
          {toast.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
          <span style={{ fontWeight: '800' }}>{toast.msg.toUpperCase()}</span>
        </div>
      )}

      {deleteId && (
        <div style={styles.modalOverlay}>
          <div className="modal-animate" style={styles.modalContent}>
            <div style={styles.trashIconContainer}><Trash2 size={30} color="#ef4444" /></div>
            <h3 style={styles.modalTitle}>TIÊU HỦY KỶ NIỆM?</h3>
            <p style={{ color: '#64748b', fontSize: '13px', marginBottom: '25px' }}>Dữ liệu sẽ bị xóa sạch khỏi Database.</p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={() => setDeleteId(null)} style={styles.btnCancel}>HỦY</button>
              <button onClick={confirmDelete} style={styles.btnConfirmDelete}>XÁC NHẬN</button>
            </div>
          </div>
        </div>
      )}

      <div style={styles.headerSection}>
        <div style={styles.starLeft}><Star size={40} fill="#fbbf24" stroke="none" /></div>
        <div style={styles.starRight}><Star size={40} fill="#fbbf24" stroke="none" /></div>

        <div style={{ position: 'relative', zIndex: 10, textAlign: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '15px', marginBottom: '10px' }}>
            <div style={styles.glassIcon}><Camera size={32} color="white" /></div>
            <h2 style={styles.headerTitle}>NHẬT KÝ CHIẾN SĨ</h2>
          </div>
          <p style={styles.headerSub}>
             ĐANG TRUY XUẤT <span style={{ color: '#fbbf24', fontSize: '20px' }}>{moments.length}</span> KỶ NIỆM TỪ DATABASE
          </p>
        </div>

        <button className="upload-btn" onClick={() => fileInputRef.current?.click()} style={styles.uploadBtn} disabled={loading}>
          {loading ? <Loader2 className="animate-spin" size={20} /> : <Plus size={20} />}
          {loading ? "ĐANG NÉN & LƯU..." : "THÊM KỶ NIỆM"}
        </button>
        <input type="file" ref={fileInputRef} style={{ display: 'none' }} accept="image/*" onChange={handleFileUpload} />
      </div>

      <div className="moments-grid">
        {moments.map((moment) => (
          <div key={moment.id} className="moment-item" onClick={() => setSelectedImage(moment.imageUrl)}>
            <div style={styles.polaroidFrame}>
                <img src={moment.imageUrl} alt="Kỷ niệm" style={{ width: '100%', height: 'auto', display: 'block' }} />
                <div style={styles.polaroidLabel}>
                    <p style={styles.captionText}>{moment.caption}</p>
                    <div style={styles.locationTag}><MapPin size={12} /> QUÂN KHU | {moment.date}</div>
                </div>
            </div>
            <button className="del-btn" onClick={(e) => { e.stopPropagation(); setDeleteId(moment.id); }}><Trash2 size={16} /></button>
          </div>
        ))}
      </div>

      {selectedImage && (
        <div className="lightbox" onClick={() => setSelectedImage(null)}>
          <button className="close-btn"><X size={35} /></button>
          <img src={selectedImage} alt="Zoom" className="lightbox-img" />
        </div>
      )}

      <style>{`
        .animate-spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .moments-grid { column-count: 3; column-gap: 25px; padding: 0 20px 40px; }
        .moment-item { break-inside: avoid; margin-bottom: 30px; position: relative; cursor: pointer; transition: 0.3s; }
        .moment-item:hover { transform: scale(1.03); z-index: 50; }
        .del-btn { position: absolute; top: 10px; right: 10px; background: #ef4444; color: white; border: none; padding: 8px; border-radius: 50%; opacity: 0; transition: 0.3s; }
        .moment-item:hover .del-btn { opacity: 1; }
        .lightbox { position: fixed; inset: 0; background: rgba(0, 0, 0, 0.9); z-index: 10000; display: flex; align-items: center; justifyContent: center; backdrop-filter: blur(10px); }
        .lightbox-img { max-width: 90%; max-height: 85vh; border: 5px solid white; box-shadow: 0 0 50px rgba(0,0,0,0.5); }
        .close-btn { position: absolute; top: 30px; right: 30px; color: white; background: none; border: none; cursor: pointer; }
        .toast-animate { animation: slideIn 0.4s ease-out; }
        @keyframes slideIn { from { transform: translateX(120%); } to { transform: translateX(0); } }
      `}</style>
    </div>
  );
}

const styles: any = {
  container: { padding: '40px 0', minHeight: '100vh', background: '#022c22', position: 'relative', overflowX: 'hidden' },
  militaryGridOverlay: { position: 'fixed', inset: 0, opacity: 0.05, pointerEvents: 'none', backgroundImage: `linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)`, backgroundSize: '40px 40px' },
  headerSection: { background: '#b91c1c', borderBottom: '8px solid #fbbf24', padding: '60px 20px', borderRadius: '0 0 40px 40px', marginBottom: '50px', display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative', overflow: 'hidden' },
  starLeft: { position: 'absolute', left: '40px', top: '50%', transform: 'translateY(-50%)', opacity: 0.2 },
  starRight: { position: 'absolute', right: '40px', top: '50%', transform: 'translateY(-50%)', opacity: 0.2 },
  headerTitle: { fontSize: '2.5rem', margin: 0, color: 'white', fontWeight: '900', letterSpacing: '2px' },
  headerSub: { color: 'white', fontSize: '12px', fontWeight: '700', letterSpacing: '1px', opacity: 0.9, marginTop: '8px' },
  uploadBtn: { marginTop: '25px', background: '#fbbf24', color: '#022c22', border: 'none', padding: '14px 30px', borderRadius: '50px', fontWeight: '900', display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', zIndex: 100 },
  polaroidFrame: { background: 'white', padding: '12px 12px 35px 12px', boxShadow: '5px 15px 30px rgba(0,0,0,0.3)', border: '1px solid #ddd' },
  polaroidLabel: { marginTop: '12px', textAlign: 'center' },
  captionText: { margin: '0', fontFamily: 'monospace', fontSize: '15px', fontWeight: '800', color: '#1a2e21' },
  locationTag: { fontSize: '10px', color: '#666', marginTop: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' },
  glassIcon: { padding: '10px', background: 'rgba(255, 255, 255, 0.2)', borderRadius: '50%', border: '2px solid white' },
  toast: (type: string) => ({ position: 'fixed', bottom: '30px', left: '50%', transform: 'translateX(-50%)', zIndex: 10001, background: type === 'success' ? '#059669' : '#dc2626', color: 'white', padding: '15px 30px', borderRadius: '50px', display: 'flex', alignItems: 'center', gap: '12px', border: '2px solid #fbbf24' }),
  modalOverlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10005 },
  modalContent: { background: '#f1f5f9', padding: '40px', borderRadius: '30px', textAlign: 'center', maxWidth: '380px', width: '90%', border: '5px solid #b91c1c' },
  trashIconContainer: { width: '65px', height: '65px', borderRadius: '50%', background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px', border: '2px solid #ef4444' },
  modalTitle: { margin: '0 0 10px 0', fontSize: '1.3rem', color: '#b91c1c', fontWeight: '900' },
  btnCancel: { flex: 1, padding: '14px', border: '2px solid #64748b', borderRadius: '12px', cursor: 'pointer', background: 'white', fontWeight: '800', color: '#64748b' },
  btnConfirmDelete: { flex: 1, padding: '14px', background: '#b91c1c', color: 'white', border: 'none', borderRadius: '12px', cursor: 'pointer', fontWeight: '900' }
};