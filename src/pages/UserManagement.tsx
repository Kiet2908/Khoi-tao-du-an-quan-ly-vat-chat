import { useState, useEffect, useMemo } from 'react';
import { 
  UserPlus, Trash2, Eye, EyeOff,   
  CheckCircle, AlertCircle, X, Fingerprint, 
  Search, Loader2 
} from 'lucide-react';
import { supabase } from '../supabaseClient'; 
import './UserManagement.css'; 

export default function UserManagement() {
  const [activeTab, setActiveTab] = useState<'TEACHER' | 'STUDENT'>('TEACHER');
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showPasswordId, setShowPasswordId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchUsers = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('User').select('*').order('id', { ascending: false });
    if (error) {
      showToast("Lỗi API", "error");
    } else {
      setUsers(data.map((u: any) => ({
        id: u.id.toString(),
        fullName: u['Ho Ten'],
        code: u.MaSo,
        username: u.UserName,
        password: u.PassWord,
        role: u.VaiTro
      })));
    }
    setLoading(false);
  };

  useEffect(() => { fetchUsers(); }, []);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const filteredUsers = useMemo(() => {
    return users.filter(u => 
      u.role === activeTab && 
      (u.fullName.toLowerCase().includes(searchTerm.toLowerCase()) || u.code.includes(searchTerm))
    );
  }, [users, activeTab, searchTerm]);

  const handleAddUser = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const { error } = await supabase.from('User').insert([{
      "Ho Ten": formData.get('fullName'),
      "MaSo": formData.get('code'),
      "UserName": formData.get('username'),
      "PassWord": formData.get('password'),
      "VaiTro": formData.get('role')
    }]);
    if (error) showToast("Lỗi hệ thống", "error");
    else { showToast("Đã cấp danh tánh!"); fetchUsers(); setShowForm(false); }
  };

  const confirmDelete = async () => {
    const { error } = await supabase.from('User').delete().eq('id', deleteConfirm);
    if (error) showToast("Lỗi xóa", "error");
    else { fetchUsers(); setDeleteConfirm(null); showToast("Đã tiêu hủy dữ liệu"); }
  };

  return (
    <div className="user-mgmt-container">
      {toast && (
        <div style={{ position: 'fixed', bottom: '20px', right: '20px', background: toast.type === 'success' ? '#14532d' : '#dc2626', color: 'white', padding: '15px 25px', borderRadius: '12px', zIndex: 10001, fontWeight: 800, display: 'flex', gap: '10px' }}>
          {toast.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
          {toast.message.toUpperCase()}
        </div>
      )}

      {/* Header */}
      <div className="header-identity">
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <Fingerprint size={32} color="white" />
          <div>
            <h2 className="header-title">QUẢN LÝ TÀI KHOẢN-TDC</h2>
            <p style={{ margin: 0, opacity: 0.8, fontSize: '10px', color: '#bbf7d0' }}>Tổ bộ môn Giáo dục quốc phòng và an ninh - TDC</p>
          </div>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="submit-btn" style={{ background: 'white', color: '#14532d' }}>
          {showForm ? <X size={20} /> : <UserPlus size={20} />}
        </button>
      </div>

      {/* Form thêm mới (Đã sửa lỗi dính lẹo) */}
      {showForm && (
        <div className="form-wrapper">
          <form onSubmit={handleAddUser} className="form-grid-responsive">
            <div className="input-field"><label className="input-label">Họ tên</label><input name="fullName" required className="user-input" placeholder="Nguyễn Văn A" /></div>
            <div className="input-field"><label className="input-label">Mã số</label><input name="code" required className="user-input" placeholder="MS-123" /></div>
            <div className="input-field"><label className="input-label">Username</label><input name="username" required className="user-input" placeholder="user.01" /></div>
            <div className="input-field"><label className="input-label">Mật khẩu</label><input name="password" required className="user-input" type="password" /></div>
            <div className="input-field">
              <label className="input-label">Vai trò</label>
              <select name="role" className="user-input">
                <option value="TEACHER">Giảng viên</option>
                <option value="STUDENT">Sinh viên</option>
              </select>
            </div>
            <button type="submit" className="submit-btn">Lưu danh tánh</button>
          </form>
        </div>
      )}

      {/* Tabs & Tìm kiếm */}
      <div style={{ display: 'flex', gap: '15px', marginBottom: '25px', alignItems: 'center', flexWrap: 'wrap' }}>
        <button onClick={() => setActiveTab('TEACHER')} style={{ padding: '10px 20px', borderRadius: '10px', border: 'none', background: activeTab === 'TEACHER' ? '#14532d' : 'white', color: activeTab === 'TEACHER' ? 'white' : '#64748b', fontWeight: 800, cursor: 'pointer' }}>GIẢNG VIÊN</button>
        <button onClick={() => setActiveTab('STUDENT')} style={{ padding: '10px 20px', borderRadius: '10px', border: 'none', background: activeTab === 'STUDENT' ? '#14532d' : 'white', color: activeTab === 'STUDENT' ? 'white' : '#64748b', fontWeight: 800, cursor: 'pointer' }}>SINH VIÊN</button>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '10px', background: 'white', padding: '10px 15px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          <Search size={18} color="#16a34a" />
          <input placeholder="Tìm kiếm tên hoặc mã số..." style={{ border: 'none', outline: 'none', width: '100%' }} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
      </div>

      {/* Bảng danh sách */}
      <div className="table-wrapper">
        <table className="main-table">
          <thead>
            <tr><th>Thành viên</th><th>Mã số</th><th>User</th><th>Mật khẩu</th><th>Thao tác</th></tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} style={{ textAlign: 'center', padding: '40px' }}><Loader2 className="animate-spin" /></td></tr>
            ) : filteredUsers.map((user) => (
              <tr key={user.id}>
                <td><b>{user.fullName}</b></td>
                <td><span style={{ background: '#f1f5f9', padding: '4px 8px', borderRadius: '6px', fontSize: '12px', fontWeight: 700 }}>{user.code}</span></td>
                <td><span style={{ color: '#16a34a', fontWeight: 700 }}>@{user.username}</span></td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {showPasswordId === user.id ? user.password : '••••••'}
                    <button onClick={() => setShowPasswordId(showPasswordId === user.id ? null : user.id)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#94a3b8' }}>
                      {showPasswordId === user.id ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </td>
                <td>
                  <Trash2 size={18} onClick={() => setDeleteConfirm(user.id)} style={{ color: '#dc2626', cursor: 'pointer' }} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal xóa */}
      {deleteConfirm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000 }}>
          <div style={{ background: 'white', padding: '30px', borderRadius: '20px', textAlign: 'center', maxWidth: '350px' }}>
            <AlertCircle size={40} color="#dc2626" />
            <h3 style={{ margin: '15px 0', color: '#1e293b' }}>Xác nhận xóa danh tánh?</h3>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setDeleteConfirm(null)} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #ddd', background: 'none' }}>Hủy</button>
              <button onClick={confirmDelete} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: 'none', background: '#dc2626', color: 'white', fontWeight: 800 }}>Xác nhận</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}