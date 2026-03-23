import { useState, useEffect, useRef, useMemo } from 'react';
import { 
  UserPlus, Trash2, Eye, EyeOff,  
  CheckCircle, AlertCircle, Key, X, Fingerprint, FileUp, 
  Search, Briefcase, GraduationCap, Loader2 
} from 'lucide-react';
import { supabase } from '../supabaseClient'; 

interface UserAccount {
  id: string;
  fullName: string;
  code: string; 
  username: string;
  password: string;
  role: 'TEACHER' | 'STUDENT';
}

export default function UserManagement() {
  const [activeTab, setActiveTab] = useState<'TEACHER' | 'STUDENT'>('TEACHER');
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showPasswordId, setShowPasswordId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message: String(message), type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchUsers = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('User').select('*').order('id', { ascending: false });
    if (error) {
      showToast("Lỗi API: " + error.message, "error");
    } else {
      const mappedUsers = data.map((u: any) => ({
        id: u.id.toString(),
        fullName: u['Ho Ten'],
        code: u.MaSo,
        username: u.UserName,
        password: u.PassWord,
        role: u.VaiTro
      }));
      setUsers(mappedUsers);
    }
    setLoading(false);
  };

  useEffect(() => { fetchUsers(); }, []);

  const filteredUsers = useMemo(() => {
    return users.filter(u => 
      u.role === activeTab && 
      (u.fullName.toLowerCase().includes(searchTerm.toLowerCase()) || u.code.includes(searchTerm))
    );
  }, [users, activeTab, searchTerm]);

  const teacherCount = users.filter(u => u.role === 'TEACHER').length;
  const studentCount = users.filter(u => u.role === 'STUDENT').length;

  const handleAddUser = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const newUserRow = {
      "Ho Ten": String(formData.get('fullName')),
      "MaSo": String(formData.get('code')),
      "UserName": String(formData.get('username')),
      "PassWord": String(formData.get('password')),
      "VaiTro": formData.get('role')
    };
    const { error } = await supabase.from('User').insert([newUserRow]);
    if (error) showToast("Lỗi: " + error.message, "error");
    else { showToast(`Đã cấp ID cho: ${newUserRow['Ho Ten']}`); fetchUsers(); setShowForm(false); }
  };

  const confirmDelete = async () => {
    const { error } = await supabase.from('User').delete().eq('id', deleteConfirm);
    if (error) showToast("Lỗi: " + error.message, "error");
    else { setUsers(users.filter(u => u.id !== deleteConfirm)); setDeleteConfirm(null); showToast("Đã tiêu hủy dữ liệu", "success"); }
  };

  return (
    <div style={styles.container}>
      <div style={styles.militaryOverlay}></div>
      <div style={styles.scanLine}></div>

      {toast && (
        <div className="toast-animate" style={styles.toast(toast.type)}>
          {toast.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
          <span style={{ fontWeight: 'bold' }}>{toast.message.toUpperCase()}</span>
        </div>
      )}

      {deleteConfirm && (
        <div style={styles.modalOverlay}>
          <div className="modal-animate" style={styles.modalContent}>
            <AlertCircle size={40} color="#ef4444" style={{ marginBottom: '15px' }} />
            <h3 style={{ margin: '0 0 10px 0', color: '#fff', fontSize: '18px' }}>XÁC NHẬN TIÊU HỦY?</h3>
            <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
              <button onClick={() => setDeleteConfirm(null)} style={styles.btnCancel}>HỦY</button>
              <button onClick={confirmDelete} style={styles.btnConfirmDelete}>XÁC NHẬN</button>
            </div>
          </div>
        </div>
      )}

      <div style={styles.headerGradient} className="header-responsive">
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <div style={styles.glassIcon} className="hide-mobile"><Fingerprint size={32} color="white" /></div>
            <div>
              <h2 style={styles.headerTitle} className="title-text">QUẢN TRỊ DANH TÁNH</h2>
              <p style={{ margin: 0, opacity: 0.7, fontSize: '10px', letterSpacing: '1px', color: '#fff' }}>QUÂN KHU DIGITAL ID</p>
            </div>
          </div>
        </div>
        
        <div style={{ display: 'flex', gap: '8px', zIndex: 1 }}>
          <button onClick={() => fileInputRef.current?.click()} style={styles.btnWhite} className="icon-only-btn"><FileUp size={18} /><span className="hide-mobile">NHẬP EXCEL</span></button>
          <button onClick={() => setShowForm(!showForm)} style={styles.btnLight} className="icon-only-btn">{showForm ? <X size={18} /> : <UserPlus size={18} />}</button>
          <input type="file" ref={fileInputRef} style={{ display: 'none' }} />
        </div>
      </div>

      <div style={styles.statGrid} className="stat-responsive">
        <div style={styles.statBox}>
          <div style={{ ...styles.statCircle, background: 'rgba(251, 191, 36, 0.1)', color: '#fbbf24' }}><Briefcase size={22}/></div>
          <div>
            <div style={styles.statLabel}>GIẢNG VIÊN</div>
            <div style={styles.statValue}>{teacherCount} TÀI KHOẢN</div>
          </div>
        </div>
        <div style={styles.statBox}>
          <div style={{ ...styles.statCircle, background: 'rgba(74, 222, 128, 0.1)', color: '#4ade80' }}><GraduationCap size={22}/></div>
          <div>
            <div style={styles.statLabel}>SINH VIÊN</div>
            <div style={styles.statValue}>{studentCount} TÀI KHOẢN</div>
          </div>
        </div>
      </div>

      {showForm && (
        <div style={styles.formWrapper} className="fade-in">
          <form onSubmit={handleAddUser} style={styles.formGrid} className="form-grid-responsive">
            <div className="input-field"><label style={styles.label}>HỌ TÊN</label><input name="fullName" required style={styles.input} /></div>
            <div className="input-field"><label style={styles.label}>MÃ ĐỊNH DANH</label><input name="code" required style={styles.input} /></div>
            <div className="input-field"><label style={styles.label}>USERNAME</label><input name="username" required style={styles.input} /></div>
            <div className="input-field"><label style={styles.label}>MẬT KHẨU</label><input name="password" required style={styles.input} /></div>
            <div className="input-field">
              <label style={styles.label}>VAI TRÒ</label>
              <select name="role" style={styles.select}>
                <option value="TEACHER">GIẢNG VIÊN</option>
                <option value="STUDENT">SINH VIÊN</option>
              </select>
            </div>
            <button type="submit" style={styles.submitBtn}>XÁC NHẬN LƯU</button>
          </form>
        </div>
      )}

      <div style={styles.tabContainer} className="tab-responsive">
        <div className="tabs-scroll" style={{display:'flex', gap:'10px'}}>
            <button onClick={() => setActiveTab('TEACHER')} style={activeTab === 'TEACHER' ? styles.tabActive : styles.tabInactive}>GIẢNG VIÊN</button>
            <button onClick={() => setActiveTab('STUDENT')} style={activeTab === 'STUDENT' ? styles.tabActive : styles.tabInactive}>SINH VIÊN</button>
        </div>
        
        <div style={styles.searchBar} className="search-full">
          <Search size={18} color="#94a3b8" />
          <input placeholder="Tìm kiếm danh tính..." style={styles.searchInput} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
      </div>

      <div style={styles.tableWrapper}>
        {/* Desktop Table View */}
        <div className="desktop-view">
          <table style={styles.table}>
            <thead>
              <tr style={styles.thRow}>
                <th style={styles.th}>THÀNH VIÊN</th>
                <th style={styles.th}>MÃ SỐ</th>
                <th style={styles.th}>USER</th>
                <th style={styles.th}>MẬT KHẨU</th>
                <th style={styles.th}>THAO TÁC</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} style={{ textAlign: 'center', padding: '40px' }}><Loader2 className="animate-spin" /></td></tr>
              ) : filteredUsers.map((user) => (
                <tr key={user.id} style={styles.tr}>
                  <td style={styles.td}><b style={{ color: '#fff' }}>{user.fullName}</b></td>
                  <td style={styles.td}><span style={styles.codeBadge}>{user.code}</span></td>
                  <td style={styles.td}><span style={styles.usernameBadge}>@{user.username}</span></td>
                  <td style={styles.td}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                       {showPasswordId === user.id ? user.password : '••••••'}
                       <button onClick={() => setShowPasswordId(showPasswordId === user.id ? null : user.id)} style={styles.iconBtn}>
                         {showPasswordId === user.id ? <EyeOff size={14} /> : <Eye size={14} />}
                       </button>
                    </div>
                  </td>
                  <td style={styles.td}>
                    <div style={{ display: 'flex', gap: '15px' }}>
                      <Key size={18} style={{ color: '#fbbf24', cursor: 'pointer' }} />
                      <Trash2 size={18} onClick={() => setDeleteConfirm(user.id)} style={{ color: '#ef4444', cursor: 'pointer' }} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile ID Card View */}
        <div className="mobile-view" style={{ display: 'none', flexDirection: 'column', gap: '12px', padding: '15px' }}>
          {filteredUsers.map((user) => (
            <div key={user.id} style={styles.mobileCard}>
              <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start'}}>
                <div>
                  <div style={{fontWeight:'900', color:'#fff', fontSize:'15px'}}>{user.fullName}</div>
                  <div style={{fontSize:'11px', color:'#fbbf24', marginTop:'4px'}}>Mã số: {user.code}</div>
                </div>
                <div style={{display:'flex', gap:'12px'}}>
                    <button onClick={() => setShowPasswordId(showPasswordId === user.id ? null : user.id)} style={styles.iconBtn}>
                      {showPasswordId === user.id ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                    <Trash2 size={18} color="#ef4444" onClick={() => setDeleteConfirm(user.id)} />
                </div>
              </div>
              <div style={{marginTop:'12px', paddingTop:'10px', borderTop:'1px solid rgba(255,255,255,0.05)', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                <span style={styles.usernameBadge}>@{user.username}</span>
                <span style={{fontSize:'12px', color: showPasswordId === user.id ? '#4ade80' : '#64748b'}}>
                  {showPasswordId === user.id ? user.password : '••••••'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        .animate-spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        
        @media (max-width: 768px) {
          .desktop-view { display: none !important; }
          .mobile-view { display: flex !important; }
          .header-responsive { padding: 15px !important; }
          .title-text { font-size: 1.2rem !important; }
          .hide-mobile { display: none !important; }
          .stat-responsive { grid-template-columns: 1fr !important; }
          .tab-responsive { flex-direction: column; align-items: stretch !important; }
          .search-full { width: 100% !important; }
          .form-grid-responsive { grid-template-columns: 1fr !important; }
          .icon-only-btn { padding: 10px !important; }
          .tabs-scroll { overflow-x: auto; padding-bottom: 5px; -webkit-overflow-scrolling: touch; }
        }
      `}</style>
    </div>
  );
}

const styles: any = {
  container: { padding: '20px', minHeight: '100vh', background: '#022c22', position: 'relative', overflowX: 'hidden' },
  militaryOverlay: { position: 'fixed', inset: 0, opacity: 0.05, pointerEvents: 'none', backgroundImage: `linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)`, backgroundSize: '30px 30px' },
  scanLine: { position: 'absolute', width: '100%', height: '2px', background: 'rgba(251, 191, 36, 0.2)', left: 0, animation: 'scanline 8s linear infinite', boxShadow: '0 0 15px #fbbf24', pointerEvents: 'none' },
  headerGradient: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px', padding: '25px', borderRadius: '15px', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.1)', position: 'relative' },
  headerTitle: { margin: 0, fontSize: '1.6rem', fontWeight: '900', color: '#fff' },
  glassIcon: { padding: '10px', background: 'rgba(255, 255, 255, 0.1)', borderRadius: '12px' },
  statGrid: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '15px', marginBottom: '25px' },
  statBox: { display: 'flex', alignItems: 'center', gap: '15px', padding: '15px', background: 'rgba(255, 255, 255, 0.03)', borderRadius: '15px', border: '1px solid rgba(255, 255, 255, 0.08)' },
  statCircle: { width: '40px', height: '40px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  statLabel: { fontSize: '9px', color: '#94a3b8', fontWeight: '800' },
  statValue: { fontSize: '16px', fontWeight: '900', color: '#fff' },
  tabContainer: { display: 'flex', gap: '10px', marginBottom: '20px', alignItems: 'center' },
  tabActive: { padding: '10px 15px', background: '#fbbf24', color: '#022c22', border: 'none', borderRadius: '8px', fontWeight: '900', fontSize: '12px' },
  tabInactive: { padding: '10px 15px', background: 'rgba(255,255,255,0.05)', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '12px' },
  searchBar: { flex: 1, display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(0,0,0,0.2)', padding: '10px 15px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)' },
  searchInput: { background: 'transparent', border: 'none', outline: 'none', color: '#fff', fontSize: '13px', width: '100%' },
  tableWrapper: { background: 'rgba(15, 23, 42, 0.4)', borderRadius: '20px', border: '1px solid rgba(255, 255, 255, 0.08)', overflow: 'hidden' },
  table: { width: '100%', borderCollapse: 'collapse' },
  thRow: { background: 'rgba(255,255,255,0.02)' },
  th: { textAlign: 'left', padding: '15px 20px', color: '#64748b', fontSize: '10px', textTransform: 'uppercase', fontWeight: '800' },
  tr: { borderBottom: '1px solid rgba(255, 255, 255, 0.03)' },
  td: { padding: '15px 20px', fontSize: '13px', color: '#cbd5e1' },
  codeBadge: { background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: '5px', color: '#fbbf24', fontWeight: '800', fontSize: '11px' },
  usernameBadge: { color: '#4ade80', fontWeight: '700', fontSize:'12px' },
  btnWhite: { padding: '10px 15px', background: '#fff', color: '#022c22', border: 'none', borderRadius: '8px', fontWeight: '900', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '5px' },
  btnLight: { padding: '10px 15px', background: 'rgba(255,255,255,0.1)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '8px', fontWeight: '900' },
  formWrapper: { background: 'rgba(0,0,0,0.2)', padding: '20px', borderRadius: '15px', marginBottom: '25px', border: '1px solid rgba(251,191,36,0.3)' },
  formGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '15px', alignItems: 'end' },
  label: { fontSize: '9px', fontWeight: '800', color: '#fbbf24', marginBottom: '5px', display: 'block' },
  input: { width: '100%', padding: '12px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '13px' },
  select: { width: '100%', padding: '12px', borderRadius: '8px', background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' },
  submitBtn: { padding: '12px', background: '#fbbf24', color: '#022c22', border: 'none', borderRadius: '8px', fontWeight: '900', fontSize: '12px' },
  toast: (type: string) => ({ position: 'fixed', bottom: '20px', right: '20px', zIndex: 10001, background: type === 'success' ? '#059669' : '#dc2626', color: '#fff', padding: '15px 25px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '10px', fontWeight: '900' }),
  modalOverlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(5px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000, padding:'20px' },
  modalContent: { background: '#0f172a', padding: '30px', borderRadius: '20px', textAlign: 'center', width: '100%', maxWidth: '350px', border: '1px solid rgba(239, 68, 68, 0.3)' },
  btnCancel: { flex: 1, padding: '12px', background: 'rgba(255,255,255,0.05)', color: '#94a3b8', border: 'none', borderRadius: '8px', fontWeight: '900' },
  btnConfirmDelete: { flex: 1, padding: '12px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '900' },
  iconBtn: { background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' },
  mobileCard: { background: 'rgba(255,255,255,0.03)', padding: '15px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }
};