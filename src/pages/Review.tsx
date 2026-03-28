import { useState, useEffect} from 'react';
import { 
  FileText, Video, Download, Search, Plus, Trash2, 
  Eye, CheckCircle, AlertCircle, X, Target, 
  GraduationCap, Presentation, Loader2
} from 'lucide-react';
import { supabase } from '../supabaseClient'; 
import './Review.css';

interface OnTapMaterial {
  id: string | number;
  TenTaiLieu: string;
  TheLoai: 'PDF' | 'VIDEO' | 'POWERPOINT';
  TinhChat: 'Lý thuyết' | 'Thực hành' | 'Chính trị';
  Link: string;
}

export default function Review() {
  const userRole = localStorage.getItem('userRole'); 
  const isAuthorized = userRole === 'ADMIN' || userRole === 'TEACHER';

  const [materials, setMaterials] = useState<OnTapMaterial[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showUpload, setShowUpload] = useState(false);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [deleteId, setDeleteId] = useState<string | number | null>(null);

  const fetchMaterials = async () => {
    try {
      const { data, error } = await supabase.from('OnTap').select('*').order('id', { ascending: false });
      if (error) throw error;
      if (data) setMaterials(data);
    } catch (err: any) { console.error(err); }
  };

  useEffect(() => { fetchMaterials(); }, []);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleFileUpload = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setLoading(true);
    try {
      const { error } = await supabase.from('OnTap').insert([{
        TenTaiLieu: formData.get('title'),
        TheLoai: formData.get('type'),
        TinhChat: formData.get('category'),
        Link: formData.get('link')
      }]);
      if (error) throw error;
      showToast("Đã lưu học liệu!");
      setShowUpload(false);
      fetchMaterials();
    } catch (err: any) { showToast(err.message, 'error'); }
    finally { setLoading(false); }
  };

  const executeDelete = async () => {
    if (!deleteId) return;
    try {
      const { error } = await supabase.from('OnTap').delete().eq('id', deleteId);
      if (error) throw error;
      showToast("Đã tiêu hủy học liệu!");
      setDeleteId(null);
      fetchMaterials();
    } catch (err: any) { showToast(err.message, 'error'); }
  };

  const filteredMaterials = materials.filter(m =>
    m.TenTaiLieu.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="review-container">
      {toast && (
        <div style={toastStyle(toast.type)}>
          {toast.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
          <span>{toast.msg}</span>
        </div>
      )}

      {/* Header Xanh Lá */}
      <div className="header-library">
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <Target size={32} color="white" />
          <div>
            <h2 className="header-title-text">THƯ VIỆN HỌC LIỆU</h2>
            <p className="header-sub-text">HUẤN LUYỆN QUÂN SỰ</p>
          </div>
        </div>
        {isAuthorized && (
          <button onClick={() => setShowUpload(!showUpload)} style={addBtnStyle}>
            {showUpload ? <X size={20} /> : <Plus size={20} />}
          </button>
        )}
      </div>

      {/* Form Upload trắng sạch */}
      {showUpload && (
        <div className="upload-form-container">
          <form onSubmit={handleFileUpload}>
             <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
                <input name="title" placeholder="Tên tài liệu..." required style={inputStyle} />
                <select name="type" style={inputStyle}>
                  <option value="PDF">FILE PDF</option>
                  <option value="VIDEO">VIDEO</option>
                  <option value="POWERPOINT">POWERPOINT</option>
                </select>
                <select name="category" style={inputStyle}>
                  <option value="Lý thuyết">LÝ THUYẾT</option>
                  <option value="Thực hành">THỰC HÀNH</option>
                  <option value="Chính trị">CHÍNH TRỊ</option>
                </select>
             </div>
             <input name="link" placeholder="Link tài liệu (Google Drive/YouTube)..." required style={{ ...inputStyle, marginTop: '15px' }} />
             <button type="submit" style={saveBtnStyle} disabled={loading}>
               {loading ? <Loader2 className="animate-spin" /> : "LƯU HỌC LIỆU"}
             </button>
          </form>
        </div>
      )}

      {/* Tìm kiếm */}
      <div className="search-section">
        <div className="search-bar-wrapper">
          <Search size={20} color="#16a34a" />
          <input placeholder="Tìm tên tài liệu..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
        <div style={statBoxStyle}>
          <GraduationCap size={20} /> <b>{materials.length} MỤC</b>
        </div>
      </div>

      {/* Grid danh sách học liệu */}
      <div className="materials-grid">
        {filteredMaterials.map((file) => (
          <div key={file.id} className="doc-card">
            {isAuthorized && (
              <button onClick={() => setDeleteId(file.id)} style={trashBtnStyle}><Trash2 size={14}/></button>
            )}
            <div className="card-body">
              <div style={iconBoxStyle(file.TheLoai)}>
                {file.TheLoai === 'VIDEO' ? <Video /> : file.TheLoai === 'POWERPOINT' ? <Presentation /> : <FileText />}
              </div>
              <span className="tag-badge">{file.TinhChat}</span>
              <h4 style={{ margin: 0, fontSize: '15px', color: '#0f172a', fontWeight: 800 }}>{file.TenTaiLieu}</h4>
            </div>
            <div className="card-footer">
              <button className="btn-action" onClick={() => window.open(file.Link, '_blank')}><Eye size={14}/> XEM</button>
              <button className="btn-action" style={{ borderLeft: '1px solid #f1f5f9' }} onClick={() => window.open(file.Link, '_blank')}><Download size={14}/> TẢI</button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal Xóa */}
      {deleteId && (
        <div className="modal-overlay-custom">
          <div className="modal-box">
             <Trash2 size={40} color="#dc2626" style={{ marginBottom: '15px' }} />
             <h3 style={{ margin: 0, color: '#dc2626' }}>XÓA HỌC LIỆU?</h3>
             <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                <button onClick={() => setDeleteId(null)} style={cancelBtnStyle}>HỦY</button>
                <button onClick={executeDelete} style={deleteBtnStyle}>XÓA</button>
             </div>
          </div>
        </div>
      )}

      <style>{`
        .animate-spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .modal-overlay-custom { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justifyContent: center; z-index: 1000; }
        .modal-box { background: white; padding: 30px; borderRadius: 20px; textAlign: center; maxWidth: 350px; width: 90%; }
      `}</style>
    </div>
  );
}

// --- STYLES CỐ ĐỊNH ---
const inputStyle = { width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #e2e8f0', outline: 'none', background: '#f8fafc' };
const saveBtnStyle = { width: '100%', padding: '12px', background: '#14532d', color: 'white', border: 'none', borderRadius: '10px', fontWeight: 900, marginTop: '20px', cursor: 'pointer' };
const addBtnStyle = { width: '45px', height: '45px', borderRadius: '12px', background: 'white', color: '#14532d', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' };
const statBoxStyle = { display: 'flex', alignItems: 'center', gap: '8px', padding: '0 20px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '12px', color: '#166534' };
const iconBoxStyle = (type: string) => ({ width: '45px', height: '45px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '15px', background: type === 'VIDEO' ? '#f0fdf4' : type === 'POWERPOINT' ? '#eff6ff' : '#fef2f2', color: type === 'VIDEO' ? '#16a34a' : type === 'POWERPOINT' ? '#2563eb' : '#dc2626' });
const trashBtnStyle = { position: 'absolute' as const, top: '15px', right: '15px', background: '#fef2f2', color: '#dc2626', border: 'none', padding: '6px', borderRadius: '8px', cursor: 'pointer' };
const cancelBtnStyle = { flex: 1, padding: '12px', borderRadius: '10px', background: '#f1f5f9', border: 'none', fontWeight: 700, cursor: 'pointer' };
const deleteBtnStyle = { flex: 1, padding: '12px', borderRadius: '10px', background: '#dc2626', color: 'white', border: 'none', fontWeight: 700, cursor: 'pointer' };
const toastStyle = (type: string): any => ({ position: 'fixed', bottom: '20px', right: '20px', zIndex: 2000, padding: '15px 25px', borderRadius: '12px', background: type === 'success' ? '#14532d' : '#dc2626', color: 'white', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '10px', boxShadow: '0 10px 15px rgba(0,0,0,0.2)' });