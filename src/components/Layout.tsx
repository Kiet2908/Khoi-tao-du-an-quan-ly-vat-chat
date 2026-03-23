import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Shield, Box, BookOpen, Camera, LogOut, Users, Code2, Phone } from 'lucide-react';
import '../Dashboard.css';

export default function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  
  const userRole = localStorage.getItem('userRole'); 
  const userFullName = localStorage.getItem('userFullName') || 'Người dùng';
  const userCode = localStorage.getItem('userCode') || 'N/A';

  const handleLogout = () => {
    localStorage.removeItem('userRole'); 
    localStorage.removeItem('userName');
    localStorage.removeItem('userFullName');
    localStorage.removeItem('userCode');
    navigate('/'); 
  };

  return (
    <div className="dashboard-layout" style={{ background: '#022c22' }}> {/* Fix viền nền tổng */}
      <aside className="sidebar">
        <div className="sidebar-header hide-mobile" style={{ padding: '20px 15px', textAlign: 'center', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <Shield size={42} style={{ margin: '0 auto', color: '#fff', display: 'block' }} />
          <h1 style={{ color: '#fff', fontSize: '14.3px', marginTop: '10px' }}>Giáo dục quốc phòng và an ninh</h1>
          <div style={{ marginTop: '15px' }}>
            <h2 style={{ color: '#fff', fontSize: '16px', margin: '0', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              {userFullName}
            </h2>
            <div style={{ fontSize: '11px', color: '#dcfce7', marginTop: '5px', background: 'rgba(255,255,255,0.1)', display: 'inline-block', padding: '2px 10px', borderRadius: '20px', fontWeight: '500' }}>
              {userRole === 'ADMIN' ? 'ID: ADMIN' : `${userRole === 'TEACHER' ? 'GIẢNG VIÊN' : 'SINH VIÊN'}: ${userCode}`}
            </div>
          </div>
        </div>
        
        <nav className="nav-menu" style={{ flex: 1 }}>
          {(userRole === 'ADMIN' || userRole === 'TEACHER') && (
            <Link to="/admin/equipment" className={`nav-item ${location.pathname.includes('equipment') ? 'active' : ''}`}>
              <Box size={22} /> <span>Vật chất</span>
            </Link>
          )}
          <Link to="/admin/review" className={`nav-item ${location.pathname.includes('review') ? 'active' : ''}`}>
            <BookOpen size={22} /> <span>Ôn tập</span>
          </Link>
          <Link to="/admin/moments" className={`nav-item ${location.pathname.includes('moments') ? 'active' : ''}`}>
            <Camera size={22} /> <span>Ảnh</span>
          </Link>
          {userRole === 'ADMIN' && (
            <Link to="/admin/users" className={`nav-item ${location.pathname.includes('users') ? 'active' : ''}`}>
              <Users size={22} /> <span>Tài khoản</span>
            </Link>
          )}
        </nav>

        {/* --- PHẦN GIỚI THIỆU DEVELOPER: ĐÃ UPDATE --- */}
        <div className="sidebar-footer hide-mobile" style={{ padding: '15px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          <div style={{ 
            background: 'rgba(255, 255, 255, 0.05)', 
            borderRadius: '16px', 
            padding: '14px', 
            marginBottom: '15px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(10px)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <div style={{ background: '#fbbf24', padding: '4px', borderRadius: '6px' }}>
                <Code2 size={14} color="#022c22" />
              </div>
              <span style={{ fontSize: '10px', color: '#fbbf24', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '1px' }}>Developer</span>
            </div>
            
            <p style={{ color: '#fff', fontSize: '14px', fontWeight: '800', margin: '0 0 6px 0', letterSpacing: '0.5px' }}>
              PHẠM GIA TUẤN KIỆT
            </p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <p style={{ color: '#94a3b8', fontSize: '11px', margin: 0, fontWeight: '500' }}>Khoa CNTT - CD25TT3</p>
              <p style={{ 
                color: '#fbbf24', 
                fontSize: '11px', 
                margin: 0, 
                display: 'flex', 
                alignItems: 'center', 
                gap: '5px',
                fontWeight: '600' 
              }}>
                <Phone size={10} /> 0523.732.134
              </p>
            </div>
          </div>

          <button onClick={handleLogout} className="logout-btn" style={{ width: '100%', justifyContent: 'center' }}>
            <LogOut size={20} /> <b>Đăng xuất</b>
          </button>
        </div>
      </aside>

      {/* FIX: Ép màu nền xanh rêu tràn toàn bộ phần content */}
      <main className="main-content" style={{ background: '#022c22', padding: 0 }}>
        <Outlet />
      </main>
    </div>
  );
}