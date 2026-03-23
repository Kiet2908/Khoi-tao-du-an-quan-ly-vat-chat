import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, User, Lock, ArrowRight, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '../supabaseClient';
import './Login.css';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const navigate = useNavigate();

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const cleanUser = username.trim();
    const cleanPass = password.trim();

    if (cleanUser === 'admin' && cleanPass === '123456') {
      localStorage.setItem('userRole', 'ADMIN');
      localStorage.setItem('userName', 'admin');
      localStorage.setItem('userFullName', 'Quản trị viên');
      showToast('Chào mừng Quản trị viên!');
      setTimeout(() => navigate('/admin/equipment'), 1000);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('User')
        .select('UserName, PassWord, VaiTro, MaSo, "Ho Ten"')
        .eq('UserName', cleanUser)
        .maybeSingle(); 

      if (error) {
        showToast('Lỗi kết nối hệ thống!', 'error');
        return;
      }

      if (!data) {
        showToast('Tài khoản không tồn tại!', 'error');
        return;
      }

      if (String(data.PassWord).trim() === cleanPass) {
        localStorage.clear();
        localStorage.setItem('userRole', data.VaiTro);
        localStorage.setItem('userName', data.UserName);
        localStorage.setItem('userFullName', data['Ho Ten'] || 'Người dùng');
        localStorage.setItem('userCode', data.MaSo || '---');

        showToast(`Đăng nhập thành công!`);

        const targetPath = (data.VaiTro === 'TEACHER' || data.VaiTro === 'ADMIN')
          ? '/admin/equipment' 
          : '/admin/review';
          
        setTimeout(() => navigate(targetPath), 1000);
      } else {
        showToast('Mật khẩu không chính xác!', 'error');
      }
    } catch (err) {
      showToast('Hệ thống gặp sự cố!', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      {/* Các đốm màu nền tạo hiệu ứng chiều sâu */}
      <div className="blob blob-1"></div>
      <div className="blob blob-2"></div>
      
      {toast && (
        <div className={`toast-box ${toast.type}`}>
          {toast.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
          <span>{toast.message}</span>
        </div>
      )}

      <div className="login-card">
        <div className="login-brand">
          <div className="icon-wrapper">
            <Shield size={40} />
          </div>
          <h1 className="brand-name">Giáo dục quốc phòng và an ninh</h1>
          <p className="brand-sub">Khoa Khoa Học Cơ Bản</p>
          <p className="brand-sub">Cao Đẳng Công Nghệ Thủ Đức</p>
        </div>

        <form onSubmit={handleLogin} className="login-form">
          <div className="input-field-wrapper">
            <User className="input-icon" size={20} />
            <input 
              type="text"
              placeholder="Tên đăng nhập"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>

          <div className="input-field-wrapper">
            <Lock className="input-icon" size={20} />
            <input 
              type="password"
              placeholder="Mật khẩu"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="login-submit-btn" disabled={loading}>
            {loading ? (
              <span className="loader"></span>
            ) : (
              <>
                ĐĂNG NHẬP NGAY <ArrowRight size={20} />
              </>
            )}
          </button>
        </form>

        <div className="login-footer">
          <span>© 2026 Developed by Pham Gia Tuan Kiet</span>
        </div>
      </div>
    </div>
  );
}