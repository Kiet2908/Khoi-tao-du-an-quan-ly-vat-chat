import { useState, useEffect, useRef, useMemo } from 'react';
import { 
  UserPlus, Trash2, Eye, EyeOff, Users, 
  CheckCircle, AlertCircle, Key, X, Fingerprint, FileUp, 
  Shield, Search, Target, Briefcase, GraduationCap 
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
  const [changePassUser, setChangePassUser] = useState<UserAccount | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message: String(message), type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchUsers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('User')
      .select('*')
      .order('id', { ascending: false });

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

  // --- LOGIC LỌC DỮ LIỆU ---
  const filteredUsers = useMemo(() => {
    return users.filter(u => 
      u.role === activeTab && 
      (u.fullName.toLowerCase().includes(searchTerm.toLowerCase()) || 
       u.code.includes(searchTerm))
    );
  }, [users, activeTab, searchTerm]);

  const teacherCount = users.filter(u => u.role === 'TEACHER').length;
  const studentCount = users.filter(u => u.role === 'STUDENT').length;

  // --- CÁC HÀM API (GIỮ NGUYÊN LOGIC CỦA BẠN) ---
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
    else { showToast(`Đã thêm: ${newUserRow['Ho Ten']}`); fetchUsers(); setShowForm(false); }
  };

  const confirmDelete = async () => {
    const { error } = await supabase.from('User').delete().eq('id', deleteConfirm);
    if (error) showToast("Lỗi: " + error.message, "error");
    else { setUsers(users.filter(u => u.id !== deleteConfirm)); setDeleteConfirm(null); showToast("Đã xóa dữ liệu máy chủ", "success"); }
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

      {/* MODAL OVERLAY */}
      {(deleteConfirm || changePassUser) && <div style={styles.modalOverlay}>
        {deleteConfirm && (
          <div className="modal-animate" style={styles.modalContent}>
            <AlertCircle size={48} color="#ef4444" style={{ marginBottom: '15px' }} />
            <h3 style={{ margin: '0 0 10px 0', color: '#fff' }}>XÁC NHẬN TIÊU HỦY?</h3>
            <p style={{ color: '#94a3b8', fontSize: '13px', marginBottom: '25px' }}>Tài khoản sẽ bị gỡ vĩnh viễn khỏi hệ thống.</p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={() => setDeleteConfirm(null)} style={styles.btnCancel}>HỦY</button>
              <button onClick={confirmDelete} style={styles.btnConfirmDelete}>XÁC NHẬN XÓA</button>
            </div>
          </div>
        )}
      </div>}

      <div style={styles.headerGradient}>
        <div style={{ position: 'absolute', right: '-15px', top: '-15px', opacity: 0.1 }}><Shield size={180} color="white" /></div>
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '8px' }}>
            <div style={styles.glassIcon}><Fingerprint size={32} color="white" /></div>
            <div>
              <h2 style={styles.headerTitle}>TRUNG TÂM QUẢN TRỊ DANH TÁNH</h2>
              <p style={{ margin: 0, opacity: 0.7, fontSize: '11px', letterSpacing: '2px', color: '#fff' }}>HỆ THỐNG ĐỒNG BỘ DỮ LIỆU QUÂN KHU</p>
            </div>
          </div>
        </div>
        
        <div style={{ display: 'flex', gap: '12px', position: 'relative', zIndex: 1 }}>
          <input type="file" ref={fileInputRef} onChange={() => {}} accept=".xlsx, .xls" style={{ display: 'none' }} />
          <button onClick={() => fileInputRef.current?.click()} style={styles.btnWhite}><FileUp size={18} /> NHẬP EXCEL</button>
          <button onClick={() => setShowForm(!showForm)} style={styles.btnLight}>{showForm ? <X size={18} /> : <><UserPlus size={18} /> CẤP ID MỚI</>}</button>
        </div>
      </div>

      <div style={styles.statGrid}>
        <div style={styles.statBox}>
          <div style={{ ...styles.statCircle, background: 'rgba(251, 191, 36, 0.1)', color: '#fbbf24' }}><Briefcase size={22}/></div>
          <div>
            <div style={styles.statLabel}>GIẢNG VIÊN (TEACHER)</div>
            <div style={styles.statValue}>{teacherCount} TÀI KHOẢN</div>
          </div>
        </div>
        <div style={styles.statBox}>
          <div style={{ ...styles.statCircle, background: 'rgba(74, 222, 128, 0.1)', color: '#4ade80' }}><GraduationCap size={22}/></div>
          <div>
            <div style={styles.statLabel}>SINH VIÊN (STUDENT)</div>
            <div style={styles.statValue}>{studentCount} TÀI KHOẢN</div>
          </div>
        </div>
      </div>

      {/* FORM CẤP TÀI KHOẢN */}
      {showForm && (
        <div style={styles.formWrapper} className="fade-in">
          <form onSubmit={handleAddUser} style={styles.formGrid}>
            <div><label style={styles.label}>HỌ TÊN</label><input name="fullName" required style={styles.input} /></div>
            <div><label style={styles.label}>MÃ ĐỊNH DANH</label><input name="code" required style={styles.input} /></div>
            <div><label style={styles.label}>USERNAME</label><input name="username" required style={styles.input} /></div>
            <div><label style={styles.label}>MẬT KHẨU</label><input name="password" required style={styles.input} /></div>
            <div>
              <label style={styles.label}>VAI TRÒ QUÂN SỰ</label>
              <select name="role" style={styles.select}>
                <option value="TEACHER">GIẢNG VIÊN</option>
                <option value="STUDENT">SINH VIÊN</option>
              </select>
            </div>
            <button type="submit" style={styles.submitBtn}>XÁC NHẬN LƯU</button>
          </form>
        </div>
      )}

      {/* HỆ THỐNG TABS PHÂN CHIA */}
      <div style={styles.tabContainer}>
        <button onClick={() => setActiveTab('TEACHER')} style={activeTab === 'TEACHER' ? styles.tabActive : styles.tabInactive}>
           <Target size={18} /> QUẢN LÝ GIẢNG VIÊN
        </button>
        <button onClick={() => setActiveTab('STUDENT')} style={activeTab === 'STUDENT' ? styles.tabActive : styles.tabInactive}>
           <Users size={18} /> QUẢN LÝ SINH VIÊN
        </button>
        
        <div style={styles.searchBar}>
          <Search size={18} color="#94a3b8" />
          <input 
            placeholder="TÌM KIẾM THEO TÊN HOẶC MÃ SỐ..." 
            style={styles.searchInput}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div style={styles.tableWrapper}>
        <div style={{ overflowX: 'auto' }}>
          <table style={styles.table}>
            <thead>
              <tr style={styles.thRow}>
                <th style={styles.th}>THÀNH VIÊN</th>
                <th style={styles.th}>MÃ SỐ</th>
                <th style={styles.th}>ĐỊNH DANH USER</th>
                <th style={styles.th}>MẬT KHẨU</th>
                <th style={styles.th}>THAO TÁC</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} style={{ textAlign: 'center', padding: '60px', color: '#94a3b8' }}>ĐANG TRUY XUẤT CƠ SỞ DỮ LIỆU...</td></tr>
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
                      <Key size={18} onClick={() => setChangePassUser(user)} style={{ color: '#fbbf24', cursor: 'pointer' }} />
                      <Trash2 size={18} onClick={() => setDeleteConfirm(user.id)} style={{ color: '#ef4444', cursor: 'pointer' }} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredUsers.length === 0 && !loading && (
            <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>KHÔNG TÌM THẤY DỮ LIỆU PHÙ HỢP</div>
          )}
        </div>
      </div>
    </div>
  );
}

// --- TACTICAL STYLES ---
const styles: any = {
  container: { padding: '40px 20px', minHeight: '100vh', background: '#022c22', position: 'relative', overflow: 'hidden' },
  militaryOverlay: {
    position: 'absolute', inset: 0, opacity: 0.05, pointerEvents: 'none',
    backgroundImage: `linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)`,
    backgroundSize: '40px 40px'
  },
  scanLine: {
    position: 'absolute', width: '100%', height: '2px', background: 'rgba(251, 191, 36, 0.2)',
    left: 0, animation: 'scanline 8s linear infinite', boxShadow: '0 0 15px #fbbf24', pointerEvents: 'none'
  },
  headerGradient: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '35px', padding: '35px', borderRadius: '24px', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.1)', backdropFilter: 'blur(10px)', position: 'relative', overflow: 'hidden' },
  headerTitle: { margin: 0, fontSize: '1.8rem', fontWeight: '900', color: '#fff', letterSpacing: '-1px' },
  glassIcon: { padding: '12px', background: 'rgba(255, 255, 255, 0.1)', borderRadius: '16px', border: '1px solid rgba(255, 255, 255, 0.2)' },
  statGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', marginBottom: '35px' },
  statBox: { display: 'flex', alignItems: 'center', gap: '20px', padding: '25px', background: 'rgba(255, 255, 255, 0.03)', borderRadius: '24px', border: '1px solid rgba(255, 255, 255, 0.08)' },
  statCircle: { width: '50px', height: '50px', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  statLabel: { fontSize: '10px', color: '#94a3b8', fontWeight: '800', letterSpacing: '1px' },
  statValue: { fontSize: '18px', fontWeight: '900', color: '#fff' },
  tabContainer: { display: 'flex', gap: '15px', marginBottom: '25px', alignItems: 'center' },
  tabActive: { display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 25px', background: '#fbbf24', color: '#022c22', border: 'none', borderRadius: '12px', fontWeight: '900', cursor: 'pointer' },
  tabInactive: { display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 25px', background: 'rgba(255,255,255,0.05)', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', cursor: 'pointer' },
  searchBar: { flex: 1, display: 'flex', alignItems: 'center', gap: '12px', background: 'rgba(0,0,0,0.2)', padding: '10px 20px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' },
  searchInput: { background: 'transparent', border: 'none', outline: 'none', color: '#fff', fontSize: '14px', width: '100%' },
  tableWrapper: { background: 'rgba(15, 23, 42, 0.4)', borderRadius: '28px', border: '1px solid rgba(255, 255, 255, 0.08)', overflow: 'hidden' },
  table: { width: '100%', borderCollapse: 'collapse' },
  thRow: { background: 'rgba(255,255,255,0.02)' },
  th: { textAlign: 'left', padding: '20px 25px', color: '#64748b', fontSize: '11px', textTransform: 'uppercase', fontWeight: '800', letterSpacing: '1px' },
  tr: { borderBottom: '1px solid rgba(255, 255, 255, 0.03)', transition: '0.3s' },
  td: { padding: '20px 25px', fontSize: '14px', color: '#cbd5e1' },
  codeBadge: { background: 'rgba(255,255,255,0.05)', padding: '4px 12px', borderRadius: '8px', color: '#fbbf24', fontWeight: '800', fontSize: '12px' },
  usernameBadge: { color: '#4ade80', fontWeight: '700' },
  btnWhite: { padding: '12px 20px', background: '#fff', color: '#022c22', border: 'none', borderRadius: '12px', fontWeight: '900', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' },
  btnLight: { padding: '12px 20px', background: 'rgba(255,255,255,0.1)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '12px', fontWeight: '900', cursor: 'pointer' },
  formWrapper: { background: 'rgba(0,0,0,0.3)', padding: '30px', borderRadius: '24px', marginBottom: '35px', border: '1px solid rgba(251,191,36,0.3)' },
  formGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '20px', alignItems: 'end' },
  label: { fontSize: '10px', fontWeight: '800', color: '#fbbf24', marginBottom: '8px', display: 'block' },
  input: { width: '100%', padding: '14px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', outline: 'none', fontWeight: '700' },
  select: { width: '100%', padding: '14px', borderRadius: '12px', background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontWeight: '700' },
  submitBtn: { padding: '14px 25px', background: '#fbbf24', color: '#022c22', border: 'none', borderRadius: '12px', fontWeight: '900', cursor: 'pointer' },
  toast: (type: string) => ({ position: 'fixed', bottom: '30px', right: '30px', zIndex: 10001, background: type === 'success' ? '#059669' : '#dc2626', color: '#fff', padding: '18px 30px', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '15px', fontWeight: '900', boxShadow: '0 20px 40px rgba(0,0,0,0.4)' }),
  modalOverlay: { position: 'fixed', inset: 0, background: 'rgba(2, 44, 34, 0.85)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000 },
  modalContent: { background: '#0f172a', padding: '40px', borderRadius: '32px', textAlign: 'center', width: '90%', maxWidth: '400px', border: '1px solid rgba(239, 68, 68, 0.3)' },
  btnCancel: { flex: 1, padding: '15px', background: 'rgba(255,255,255,0.05)', color: '#94a3b8', border: 'none', borderRadius: '12px', cursor: 'pointer', fontWeight: '900' },
  btnConfirmDelete: { flex: 1, padding: '15px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '12px', cursor: 'pointer', fontWeight: '900' },
  iconBtn: { background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }
};