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

      showToast("Đã nạp tài liệu vào kho huấn luyện!");
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
      const { error } = await supabase
        .from('OnTap')
        .delete()
        .eq('id', deleteConfirmId);

      if (error) throw error;

      showToast("Đã tiêu hủy học liệu!", "success");
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
      <div style={styles.scanLine}></div>

      {toast && (
        <div className="toast-in" style={styles.toast(toast.type)}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {toast.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
            <span style={{ fontWeight: '800' }}>{toast.msg.toUpperCase()}</span>
          </div>
        </div>
      )}

      {deleteConfirmId && (
        <div style={styles.overlay}>
          <div className="modal-in" style={styles.modal}>
            <div style={styles.warningIcon}><Trash2 color="#ef4444" size={24} /></div>
            <h3 style={styles.modalTitle}>XÁC NHẬN TIÊU HỦY?</h3>
            <p style={styles.modalText}>Dữ liệu sẽ bị xóa khỏi máy chủ huấn luyện.</p>
            <div style={{ display: 'flex', gap: '12px', marginTop: '25px' }}>
              <button onClick={() => setDeleteConfirmId(null)} style={styles.btnCancel}>HỦY LỆNH</button>
              <button onClick={executeDelete} style={styles.btnConfirm} disabled={loading}>
                {loading ? '...' : 'XÁC NHẬN'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={styles.header}>
        <div style={{ position: 'relative', zIndex: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '8px' }}>
            <div style={styles.iconBadge}><Target size={28} color="#fbbf24" /></div>
            <div>
              <h2 style={styles.headerTitle}>THƯ VIỆN HUẤN LUYỆN</h2>
              <p style={styles.headerSub}>Nơi Lưu Giữ Tài Liệu</p>
            </div>
          </div>
        </div>
        
        {isAuthorized && (
          <button onClick={() => setShowUpload(!showUpload)} style={styles.uploadBtn}>
            {showUpload ? <X size={18} /> : <><Plus size={18} /> THÊM TÀI LIỆU</>}
          </button>
        )}
      </div>

      {showUpload && (
        <div style={styles.uploadForm} className="fade-in">
          <form onSubmit={handleFileUpload}>
            <div style={styles.formGrid}>
              <div style={styles.inputGroup}>
                <label style={styles.label}>TÊN TÀI LIỆU</label>
                <input name="title" placeholder="Ví dụ: Kỹ thuật bắn súng..." required style={styles.input} />
              </div>
              <div style={styles.inputGroup}>
                <label style={styles.label}>THỂ LOẠI</label>
                <select name="type" style={styles.selectInput}>
                  <option value="PDF" style={styles.optionItem}>FILE PDF</option>
                  <option value="VIDEO" style={styles.optionItem}>VIDEO BÀI GIẢNG</option>
                  <option value="POWERPOINT" style={styles.optionItem}>BÀI GIẢNG POWERPOINT</option>
                </select>
              </div>
              <div style={styles.inputGroup}>
                <label style={styles.label}>TÍNH CHẤT</label>
                <select name="category" style={styles.selectInput}>
                  <option value="Lý thuyết" style={styles.optionItem}>LÝ THUYẾT</option>
                  <option value="Thực hành" style={styles.optionItem}>THỰC HÀNH</option>
                  <option value="Chính trị" style={styles.optionItem}>CHÍNH TRỊ</option>
                </select>
              </div>
            </div>
            <div style={{marginTop: '20px'}}>
               <label style={styles.label}>ĐƯỜNG DẪN TÀI LIỆU (URL)</label>
               <input name="link" placeholder="Dán link PDF/Drive/Youtube vào đây..." required style={styles.input} />
            </div>
            <div style={{display: 'flex', justifyContent: 'flex-end', marginTop: '25px'}}>
               <button type="submit" style={styles.confirmBtn} disabled={loading}>
                 {loading ? 'ĐANG XỬ LÝ...' : 'Xác Nhận Tải Tài Liệu'}
               </button>
            </div>
          </form>
        </div>
      )}

      <div style={styles.searchSection}>
        <div style={styles.searchBar}>
          <Search size={20} color="#fbbf24" />
          <input placeholder="TÌM KIẾM THEO TÊN TÀI LIỆU..." style={styles.searchInput} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
        <div style={styles.statBox}>
          <GraduationCap size={24} color="#fbbf24" />
          <div>
            <div style={styles.statLabel}>DATABASE</div>
            <div style={styles.statValue}>{materials.length} HỌC LIỆU</div>
          </div>
        </div>
      </div>

      <div style={styles.grid}>
        {filteredMaterials.map((file) => (
          <div key={file.id} style={styles.card} className="doc-card">
            <div style={{ padding: '25px', position: 'relative' }}>
              {isAuthorized && (
                <button onClick={() => setDeleteConfirmId(file.id)} style={styles.trashBtn}>
                  <Trash2 size={16} />
                </button>
              )}
              <div style={styles.fileIcon(file.TheLoai)}>
                {file.TheLoai === 'VIDEO' ? <Video size={24} /> : file.TheLoai === 'POWERPOINT' ? <Presentation size={24} /> : <FileText size={24} />}
              </div>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '15px' }}>
                <span style={styles.tag}>{file.TinhChat}</span>
                <span style={{ ...styles.tag, background: 'rgba(255,255,255,0.1)', color: '#fff' }}>{file.TheLoai}</span>
              </div>
              <h4 style={styles.cardTitle}>{file.TenTaiLieu}</h4>
            </div>
            <div style={styles.cardActions}>
              <button style={styles.actionBtn} onClick={() => window.open(file.Link, '_blank')}>
                <Eye size={16} /> XEM BÀI HỌC
              </button>
              <a href={file.Link} target="_blank" rel="noreferrer" style={{ flex: 1, display: 'flex' }}>
                <button style={{ ...styles.actionBtn, borderLeft: '1px solid rgba(255,255,255,0.05)' }}>
                  <Download size={16} /> TẢI VỀ
                </button>
              </a>
            </div>
          </div>
        ))}
      </div>

      <style>{`
        .doc-card:hover { transform: translateY(-8px); border-color: #fbbf24 !important; box-shadow: 0 20px 40px rgba(0,0,0,0.4); }
        .toast-in { animation: slideIn 0.4s ease-out; }
        .modal-in { animation: zoomIn 0.3s ease-out; }
        @keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }
        @keyframes zoomIn { from { transform: scale(0.9); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        @keyframes scanline { from { top: -100px; } to { top: 100vh; } }
        
        /* Fix màu nền của option khi hover/select trên một số trình duyệt */
        select option {
          background-color: #0f172a;
          color: white;
        }
      `}</style>
    </div>
  );
}

// --- TACTICAL UI STYLES ---
const styles: any = {
  container: { padding: '40px 20px', minHeight: '100vh', background: '#022c22', position: 'relative', overflow: 'hidden' },
  gridOverlay: {
    position: 'absolute', inset: 0, opacity: 0.1, pointerEvents: 'none',
    backgroundImage: `linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)`,
    backgroundSize: '40px 40px'
  },
  scanLine: {
    position: 'absolute', width: '100%', height: '2px', background: 'rgba(251, 191, 36, 0.2)',
    left: 0, animation: 'scanline 6s linear infinite', boxShadow: '0 0 15px #fbbf24', pointerEvents: 'none'
  },
  header: { 
    background: 'rgba(255,255,255,0.03)', backdropFilter: 'blur(10px)',
    padding: '30px', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.1)',
    display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px'
  },
  headerTitle: { margin: 0, fontSize: '1.8rem', fontWeight: '900', color: '#fff', letterSpacing: '-1px' },
  headerSub: { margin: 0, fontSize: '10px', letterSpacing: '2px', color: '#fbbf24', fontWeight: '800' },
  uploadBtn: { padding: '12px 24px', background: '#fbbf24', color: '#022c22', border: 'none', borderRadius: '12px', fontWeight: '900', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' },
  uploadForm: { background: 'rgba(0,0,0,0.3)', padding: '30px', borderRadius: '24px', marginBottom: '35px', border: '1px solid rgba(251,191,36,0.3)' },
  formGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' },
  inputGroup: { display: 'flex', flexDirection: 'column', gap: '8px' },
  label: { fontSize: '10px', fontWeight: '800', color: '#fbbf24', marginLeft: '5px' },
  input: { width: '100%', padding: '14px', borderRadius: '12px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', outline: 'none', fontWeight: '700' },
  
  // SELECT STYLE MỚI ĐÃ FIX MÀU TRẮNG
  selectInput: { 
    width: '100%', padding: '14px', borderRadius: '12px', 
    background: '#0f172a', // Xanh đen rêu
    border: '1px solid rgba(251, 191, 36, 0.3)', 
    color: '#fff', outline: 'none', fontWeight: '700',
    cursor: 'pointer', appearance: 'none' // Tùy biến icon mũi tên nếu cần
  },
  optionItem: { background: '#0f172a', color: '#fff', padding: '10px' },

  confirmBtn: { padding: '14px 28px', background: '#fbbf24', color: '#022c22', border: 'none', borderRadius: '12px', fontWeight: '900', cursor: 'pointer' },
  searchSection: { display: 'flex', gap: '20px', marginBottom: '40px' },
  searchBar: { flex: 1, display: 'flex', alignItems: 'center', gap: '15px', background: 'rgba(255,255,255,0.03)', padding: '15px 25px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.1)' },
  searchInput: { background: 'transparent', border: 'none', outline: 'none', color: '#fff', fontSize: '14px', width: '100%', fontWeight: '700' },
  statBox: { display: 'flex', alignItems: 'center', gap: '15px', padding: '15px 25px', background: 'rgba(251,191,36,0.1)', borderRadius: '20px', border: '1px solid rgba(251,191,36,0.2)' },
  statLabel: { fontSize: '10px', color: '#fbbf24', fontWeight: '800' },
  statValue: { fontSize: '18px', fontWeight: '900', color: '#fff' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '30px' },
  card: { background: 'rgba(255,255,255,0.03)', borderRadius: '28px', border: '1px solid rgba(255,255,255,0.08)', overflow: 'hidden', transition: '0.4s ease' },
  cardTitle: { margin: '0 0 10px 0', fontSize: '17px', fontWeight: '800', color: '#fff' },
  cardActions: { display: 'flex', borderTop: '1px solid rgba(255,255,255,0.05)', background: 'rgba(0,0,0,0.2)' },
  actionBtn: { flex: 1, padding: '18px', background: 'none', border: 'none', color: '#fbbf24', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '12px' },
  trashBtn: { position: 'absolute', top: '20px', right: '20px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: 'none', padding: '10px', borderRadius: '12px', cursor: 'pointer' },
  tag: { fontSize: '10px', background: 'rgba(251, 191, 36, 0.1)', color: '#fbbf24', padding: '4px 12px', borderRadius: '20px', fontWeight: '900' },
  fileIcon: (type: string) => ({ 
    width: '50px', height: '50px', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px', 
    background: type === 'VIDEO' ? 'rgba(74, 222, 128, 0.1)' : type === 'POWERPOINT' ? 'rgba(14, 165, 233, 0.1)' : 'rgba(239, 68, 68, 0.1)', 
    color: type === 'VIDEO' ? '#4ade80' : type === 'POWERPOINT' ? '#0ea5e9' : '#ef4444' 
  }),
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 20000 },
  modal: { background: '#0f172a', padding: '40px', borderRadius: '32px', width: '400px', border: '1px solid rgba(239, 68, 68, 0.3)', textAlign: 'center' },
  warningIcon: { width: '60px', height: '60px', background: 'rgba(239,68,68,0.1)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' },
  modalTitle: { color: '#ef4444', fontWeight: '900', margin: '0 0 10px 0' },
  modalText: { color: '#94a3b8', fontSize: '14px', marginBottom: '20px' },
  btnConfirm: { flex: 1, padding: '14px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: '900', cursor: 'pointer' },
  btnCancel: { flex: 1, padding: '14px', background: 'rgba(255,255,255,0.05)', color: '#94a3b8', border: 'none', borderRadius: '12px', fontWeight: '900', cursor: 'pointer' },
  toast: (type: string) => ({ position: 'fixed', top: '30px', right: '30px', zIndex: 20000, padding: '18px 30px', borderRadius: '20px', background: type === 'success' ? '#059669' : '#dc2626', color: '#fff', fontWeight: '800' }),
};