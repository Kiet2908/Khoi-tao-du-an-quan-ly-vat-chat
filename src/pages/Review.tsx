import { useState, useEffect } from 'react';
import { 
  FileText, Video, Download, Search, Plus, Trash2, 
  Eye, CheckCircle, AlertCircle, X, Target, 
  GraduationCap, Presentation
} from 'lucide-react';
import { supabase } from '../supabaseClient'; 

// --- INTERFACE THEO DB ONTAP ---
interface OnTapMaterial {
  id: string | number;
  TenTaiLieu: string;
  TheLoai: 'PDF' | 'VIDEO' | 'POWERPOINT';
  TinhChat: 'Lý thuyết' | 'Thực hành' | 'Chính trị';
  Link: string;
  created_at?: string; 
}

export default function Review() {
  const userRole = localStorage.getItem('userRole'); 
  const isAuthorized = userRole === 'ADMIN' || userRole === 'TEACHER';

  const [materials, setMaterials] = useState<OnTapMaterial[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showUpload, setShowUpload] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | number | null>(null);

  const fetchMaterials = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('OnTap')
        .select('*')
        .order('id', { ascending: false });
      
      if (error) throw error;
      if (data) setMaterials(data);
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMaterials();
  }, []);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleFileUpload = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const ten = formData.get('title') as string;
    const loai = formData.get('type') as any;
    const tinhChat = formData.get('category') as any;
    const link = formData.get('link') as string;

    if (!ten || !link) return showToast("Vui lòng nhập đủ thông tin!", "error");

    setLoading(true);
    try {
      const { error } = await supabase
        .from('OnTap')
        .insert([{
          TenTaiLieu: ten,
          TheLoai: loai,
          TinhChat: tinhChat,
          Link: link
        }]);

      if (error) throw error;

      showToast("Đã nạp tài liệu!");
      setShowUpload(false);
      fetchMaterials();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const executeDelete = async () => {
    if (!deleteConfirmId) return;
    setLoading(true);
    try {
      const { error } = await supabase.from('OnTap').delete().eq('id', deleteConfirmId);
      if (error) throw error;
      showToast("Đã tiêu hủy học liệu!");
      setDeleteConfirmId(null);
      fetchMaterials();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const filteredMaterials = materials.filter(m =>
    m.TenTaiLieu.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div style={styles.container}>
      <div style={styles.gridOverlay}></div>
      
      {toast && (
        <div className="toast-in" style={styles.toast(toast.type)}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {toast.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
            <span>{toast.msg}</span>
          </div>
        </div>
      )}

      {deleteConfirmId && (
        <div style={styles.overlay}>
          <div className="modal-in" style={styles.modal}>
            <div style={styles.warningIcon}><Trash2 color="#ef4444" size={24} /></div>
            <h3 style={{color:'#ef4444', fontSize:'16px', margin:'0 0 10px 0'}}>XÁC NHẬN XÓA?</h3>
            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              <button onClick={() => setDeleteConfirmId(null)} style={styles.btnCancel}>HỦY</button>
              <button onClick={executeDelete} style={styles.btnConfirm}>XÓA</button>
            </div>
          </div>
        </div>
      )}

      <div style={styles.header} className="header-responsive">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={styles.iconBadge}><Target size={24} color="#fbbf24" /></div>
          <div>
            <h2 style={styles.headerTitle} className="title-text">THƯ VIỆN</h2>
            <p style={styles.headerSub}>HỌC LIỆU HUẤN LUYỆN</p>
          </div>
        </div>
        
        {isAuthorized && (
          <button onClick={() => setShowUpload(!showUpload)} style={styles.uploadBtn}>
            {showUpload ? <X size={18} /> : <Plus size={18} />}
          </button>
        )}
      </div>

      {showUpload && (
        <div style={styles.uploadForm} className="fade-in">
          <form onSubmit={handleFileUpload}>
            <div className="form-grid-responsive" style={styles.formGrid}>
              <div style={styles.inputGroup}>
                <label style={styles.label}>TÊN TÀI LIỆU</label>
                <input name="title" required style={styles.input} />
              </div>
              <div style={styles.inputGroup}>
                <label style={styles.label}>THỂ LOẠI</label>
                <select name="type" style={styles.selectInput}>
                  <option value="PDF">FILE PDF</option>
                  <option value="VIDEO">VIDEO</option>
                  <option value="POWERPOINT">PPT</option>
                </select>
              </div>
              <div style={styles.inputGroup}>
                <label style={styles.label}>TÍNH CHẤT</label>
                <select name="category" style={styles.selectInput}>
                  <option value="Lý thuyết">LÝ THUYẾT</option>
                  <option value="Thực hành">THỰC HÀNH</option>
                  <option value="Chính trị">CHÍNH TRỊ</option>
                </select>
              </div>
            </div>
            <div style={{marginTop: '15px'}}>
               <label style={styles.label}>LINK TÀI LIỆU</label>
               <input name="link" required style={styles.input} />
            </div>
            <button type="submit" style={{...styles.confirmBtn, width: '100%', marginTop: '20px'}} disabled={loading}>
              XÁC NHẬN LƯU
            </button>
          </form>
        </div>
      )}

      <div className="search-row" style={styles.searchSection}>
        <div style={styles.searchBar}>
          <Search size={18} color="#fbbf24" />
          <input placeholder="TÌM TÀI LIỆU..." style={styles.searchInput} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
        <div style={styles.statBox} className="hide-mobile">
          <GraduationCap size={20} color="#fbbf24" />
          <span style={{fontWeight: '900'}}>{materials.length} MỤC</span>
        </div>
      </div>

      <div className="materials-grid">
        {filteredMaterials.map((file) => (
          <div key={file.id} style={styles.card} className="doc-card">
            <div style={{ padding: '20px', position: 'relative' }}>
              {isAuthorized && (
                <button onClick={() => setDeleteConfirmId(file.id)} style={styles.trashBtn}>
                  <Trash2 size={14} />
                </button>
              )}
              <div style={styles.fileIcon(file.TheLoai)}>
                {file.TheLoai === 'VIDEO' ? <Video size={20} /> : file.TheLoai === 'POWERPOINT' ? <Presentation size={20} /> : <FileText size={20} />}
              </div>
              <div style={{ display: 'flex', gap: '5px', marginBottom: '10px' }}>
                <span style={styles.tag}>{file.TinhChat}</span>
              </div>
              <h4 style={styles.cardTitle}>{file.TenTaiLieu}</h4>
            </div>
            <div style={styles.cardActions}>
              <button style={styles.actionBtn} onClick={() => window.open(file.Link, '_blank')}>
                <Eye size={14} /> XEM
              </button>
              <a href={file.Link} target="_blank" rel="noreferrer" style={{ flex: 1, display: 'flex', textDecoration: 'none' }}>
                <button style={{ ...styles.actionBtn, borderLeft: '1px solid rgba(255,255,255,0.05)', width: '100%' }}>
                  <Download size={14} /> TẢI
                </button>
              </a>
            </div>
          </div>
        ))}
      </div>

      <style>{`
        .materials-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 20px;
          position: relative;
          z-index: 2;
        }
        .doc-card { transition: 0.3s; }
        .doc-card:hover { transform: translateY(-5px); border-color: #fbbf24 !important; }
        
        @media (max-width: 768px) {
          .materials-grid { grid-template-columns: 1fr !important; }
          .header-responsive { padding: 15px !important; }
          .title-text { font-size: 1.2rem !important; }
          .hide-mobile { display: none !important; }
          .search-row { flex-direction: column; }
          .form-grid-responsive { grid-template-columns: 1fr !important; }
          .toast-in { left: 15px !important; right: 15px !important; width: auto !important; transform: none !important; }
        }

        .toast-in { animation: slideUp 0.3s ease-out; }
        @keyframes slideUp { from { transform: translateY(100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
      `}</style>
    </div>
  );
}

const styles: any = {
  container: { padding: '20px', minHeight: '100vh', background: '#022c22', position: 'relative', overflowX: 'hidden' },
  gridOverlay: { position: 'fixed', inset: 0, opacity: 0.05, pointerEvents: 'none', backgroundImage: `linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)`, backgroundSize: '30px 30px' },
  header: { background: 'rgba(255,255,255,0.03)', padding: '20px', borderRadius: '15px', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px', position: 'relative', zIndex: 10 },
  headerTitle: { margin: 0, fontSize: '1.5rem', fontWeight: '900', color: '#fff' },
  headerSub: { margin: 0, fontSize: '9px', letterSpacing: '1px', color: '#fbbf24', fontWeight: '800' },
  iconBadge: { background: 'rgba(251,191,36,0.1)', padding: '8px', borderRadius: '10px' },
  uploadBtn: { width: '40px', height: '40px', background: '#fbbf24', color: '#022c22', border: 'none', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' },
  uploadForm: { background: 'rgba(0,0,0,0.2)', padding: '20px', borderRadius: '15px', marginBottom: '25px', border: '1px solid rgba(251,191,36,0.3)', position: 'relative', zIndex: 10 },
  formGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' },
  inputGroup: { display: 'flex', flexDirection: 'column', gap: '5px' },
  label: { fontSize: '9px', fontWeight: '800', color: '#fbbf24' },
  input: { width: '100%', padding: '12px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', outline: 'none', fontSize: '13px' },
  selectInput: { width: '100%', padding: '12px', borderRadius: '8px', background: '#0f172a', border: '1px solid rgba(251, 191, 36, 0.3)', color: '#fff', fontSize: '13px' },
  confirmBtn: { padding: '12px', background: '#fbbf24', color: '#022c22', border: 'none', borderRadius: '8px', fontWeight: '900', cursor: 'pointer' },
  searchSection: { display: 'flex', gap: '10px', marginBottom: '25px', position: 'relative', zIndex: 10 },
  searchBar: { flex: 1, display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(255,255,255,0.03)', padding: '12px 15px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' },
  searchInput: { background: 'transparent', border: 'none', outline: 'none', color: '#fff', fontSize: '13px', width: '100%' },
  statBox: { display: 'flex', alignItems: 'center', gap: '8px', padding: '0 15px', background: 'rgba(251,191,36,0.1)', borderRadius: '12px', border: '1px solid rgba(251,191,36,0.2)', color: '#fff' },
  card: { background: 'rgba(255,255,255,0.03)', borderRadius: '15px', border: '1px solid rgba(255,255,255,0.08)', overflow: 'hidden' },
  cardTitle: { margin: 0, fontSize: '15px', fontWeight: '800', color: '#fff', lineHeight: '1.4' },
  cardActions: { display: 'flex', borderTop: '1px solid rgba(255,255,255,0.05)', background: 'rgba(0,0,0,0.1)' },
  actionBtn: { flex: 1, padding: '12px', background: 'none', border: 'none', color: '#fbbf24', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px', fontSize: '11px' },
  trashBtn: { position: 'absolute', top: '15px', right: '15px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: 'none', padding: '8px', borderRadius: '8px', cursor: 'pointer' },
  tag: { fontSize: '9px', background: 'rgba(251, 191, 36, 0.1)', color: '#fbbf24', padding: '3px 10px', borderRadius: '5px', fontWeight: '900' },
  fileIcon: (type: string) => ({ 
    width: '40px', height: '40px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '15px', 
    background: type === 'VIDEO' ? 'rgba(74, 222, 128, 0.1)' : type === 'POWERPOINT' ? 'rgba(14, 165, 233, 0.1)' : 'rgba(239, 68, 68, 0.1)', 
    color: type === 'VIDEO' ? '#4ade80' : type === 'POWERPOINT' ? '#0ea5e9' : '#ef4444' 
  }),
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(5px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modal: { background: '#0f172a', padding: '30px', borderRadius: '20px', width: '90%', maxWidth: '300px', textAlign: 'center' },
  warningIcon: { width: '50px', height: '50px', background: 'rgba(239,68,68,0.1)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 15px' },
  btnConfirm: { flex: 1, padding: '10px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '900' },
  btnCancel: { flex: 1, padding: '10px', background: 'rgba(255,255,255,0.05)', color: '#94a3b8', border: 'none', borderRadius: '8px', fontWeight: '900' },
  toast: (type: string) => ({ position: 'fixed', bottom: '20px', right: '20px', zIndex: 2000, padding: '12px 20px', borderRadius: '10px', background: type === 'success' ? '#059669' : '#dc2626', color: '#fff', fontSize: '12px', fontWeight: '800' }),
};