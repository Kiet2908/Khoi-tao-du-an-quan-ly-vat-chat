import { useState, useEffect, useRef } from 'react';
import { 
  Camera, X, Plus, Trash2, CheckCircle, AlertCircle, 
  MapPin, Loader2 
} from 'lucide-react';
import { supabase } from '../supabaseClient'; 
import './Moments.css'; // Import file CSS xanh lá

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
          const MAX_WIDTH = 1000;
          const scaleSize = MAX_WIDTH / img.width;
          canvas.width = MAX_WIDTH;
          canvas.height = img.height * scaleSize;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL('image/jpeg', 0.8));
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
      const { error } = await supabase.from('Moments').insert([{
        imageUrl: compressedBase64, 
        caption: `Kỷ niệm ngày ${new Date().toLocaleDateString('vi-VN')}`,
        date: new Date().toLocaleDateString('vi-VN'),
      }]);
      if (error) throw error;
      showToast("Đã lưu khoảnh khắc!");
      fetchMoments();
    } catch (err: any) {
      showToast("Lỗi tải ảnh", "error");
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
      showToast("Đã xóa kỷ niệm");
      fetchMoments();
    } catch (err) {
      showToast("Lỗi xóa", "error");
    } finally {
      setDeleteId(null);
    }
  };

  return (
    <div className="moments-container">
      {/* Toast thông báo */}
      {toast && (
        <div style={toastStyle(toast.type)}>
          {toast.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
          <span>{toast.msg}</span>
        </div>
      )}

      {/* Header tông Xanh lá */}
      <div className="header-moment">
        <Camera size={40} color="white" style={{ marginBottom: '15px' }} />
        <h2 className="header-title">KỈ NIỆM QUỐC PHÒNG & AN NINH</h2>
        <p className="header-sub">Lưu giữ {moments.length} khoảnh khắc hào hùng</p>
        
        <button onClick={() => fileInputRef.current?.click()} className="upload-btn" disabled={loading}>
          {loading ? <Loader2 className="animate-spin" size={18} /> : <Plus size={20} />}
          {loading ? "ĐANG TẢI..." : "THÊM KỶ NIỆM"}
        </button>
        <input type="file" ref={fileInputRef} style={{ display: 'none' }} accept="image/*" onChange={handleFileUpload} />
      </div>

      {/* Grid Album ảnh */}
      <div className="moments-grid">
        {moments.map((m) => (
          <div key={m.id} className="moment-card" onClick={() => setSelectedImage(m.imageUrl)}>
            <img src={m.imageUrl} alt="moment" className="img-style" />
            <p className="caption-text">{m.caption}</p>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px', color: '#64748b', fontSize: '11px' }}>
              <MapPin size={12} /> {m.date}
            </div>
            <button className="del-btn" onClick={(e) => { e.stopPropagation(); setDeleteId(m.id); }}>
              <Trash2 size={16} />
            </button>
          </div>
        ))}
      </div>

      {/* Phóng to ảnh */}
      {selectedImage && (
        <div className="lightbox" onClick={() => setSelectedImage(null)}>
          <button style={{ position: 'absolute', top: '20px', right: '20px', color: 'white', background: 'none', border: 'none', cursor: 'pointer' }}>
            <X size={40} />
          </button>
          <img src={selectedImage} alt="Zoom" className="lightbox-img" />
        </div>
      )}

      {/* Modal xác nhận xóa */}
      {deleteId && (
        <div className="lightbox">
          <div style={{ background: 'white', padding: '30px', borderRadius: '20px', textAlign: 'center', maxWidth: '350px' }}>
            <h3 style={{ color: '#14532d', margin: '0 0 20px 0', fontWeight: 900 }}>XÓA KỶ NIỆM NÀY?</h3>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setDeleteId(null)} style={{ flex: 1, padding: '12px', borderRadius: '10px', border: '1px solid #ddd', background: 'none', cursor:'pointer' }}>HỦY</button>
              <button onClick={confirmDelete} style={{ flex: 1, padding: '12px', borderRadius: '10px', background: '#dc2626', color: 'white', border: 'none', fontWeight: 'bold', cursor:'pointer' }}>XÓA</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const toastStyle = (type: string): any => ({
  position: 'fixed', bottom: '30px', left: '50%', transform: 'translateX(-50%)', zIndex: 10001,
  background: type === 'success' ? '#14532d' : '#dc2626', color: 'white', padding: '12px 25px',
  borderRadius: '50px', display: 'flex', alignItems: 'center', gap: '10px', border: '2px solid white', boxShadow: '0 10px 15px rgba(0,0,0,0.2)'
});