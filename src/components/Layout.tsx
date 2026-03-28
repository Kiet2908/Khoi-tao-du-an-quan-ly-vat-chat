import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Shield, Box, BookOpen, Camera, LogOut, Users, Code2, Phone } from 'lucide-react';

export default function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  
  const userRole = localStorage.getItem('userRole'); 
  const userFullName = localStorage.getItem('userFullName') || 'Người dùng';
  const userCode = localStorage.getItem('userCode') || 'N/A';

  const handleLogout = () => {
    localStorage.clear();
    navigate('/'); 
  };

  const checkActive = (path: string) => location.pathname === path || location.pathname.startsWith(path + '/');

  return (
    <div style={{ background: '#fff', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <style>{`
        @media (min-width: 1024px) {
          .layout-flex { flex-direction: row !important; }
          .side-bar { display: flex !important; width: 260px; height: 100vh; position: sticky; top: 0; background: #064e3b; flex-direction: column; border-right: 1px solid rgba(255,255,255,0.1); }
          .bot-nav { display: none !important; }
        }
        @media (max-width: 1023px) {
          .side-bar { display: none !important; }
          .bot-nav { 
            display: flex !important; position: fixed; bottom: 0; left: 0; right: 0; 
            height: 70px; background: #064e3b; justify-content: space-around; align-items: center; 
            z-index: 9999; border-top: 1px solid rgba(255,255,255,0.1); padding-bottom: env(safe-area-inset-bottom);
            box-shadow: 0 -4px 20px rgba(0,0,0,0.5);
          }
          .main-view { padding-bottom: 90px !important; }
        }
        .nav-link { display: flex; align-items: center; gap: 10px; padding: 12px 20px; color: #94a3b8; text-decoration: none; border-radius: 10px; margin: 5px 10px; transition: 0.3s; }
        .nav-link.active { background: #10b981 !important; color: white !important; }
        .m-link { display: flex; flex-direction: column; align-items: center; font-size: 10px; color: #94a3b8; text-decoration: none; gap: 4px; transition: 0.2s; }
        .m-link.active { color: #34d399 !important; font-weight: bold; }
      `}</style>

      <div className="layout-flex" style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
        {/* SIDEBAR PC */}
        <aside className="side-bar">
          <div style={{ padding: '25px 15px', textAlign: 'center', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
            <Shield size={40} color="#fbbf24" style={{ margin: '0 auto' }} />
            <h2 style={{ color: '#fff', fontSize: '15px', marginTop: '10px', fontWeight: '900' }}>Tổ bộ Giáo dục quốc phòng và an ninh </h2>
            <p style={{ color: '#fff', fontSize: '15px', marginTop: '10px', fontWeight: '900' }}>TDC</p>
            <div style={{ marginTop: '10px' }}>
              <p style={{ color: '#fff', fontSize: '14px', margin: 0, fontWeight: '700' }}>{userFullName}</p>
              <span style={{ fontSize: '10px', color: '#fbbf24', background: 'rgba(251,191,36,0.1)', padding: '2px 8px', borderRadius: '10px' }}>
                {userRole === 'ADMIN' ? 'ADMIN' : userRole === 'TEACHER' ? 'GIẢNG VIÊN' : `SV: ${userCode}`}
              </span>
            </div>
          </div>

          <nav style={{ flex: 1, marginTop: '15px' }}>
            {/* LOGIC PHÂN QUYỀN: CHỈ ADMIN/TEACHER THẤY VẬT CHẤT */}
            {(userRole === 'ADMIN' || userRole === 'TEACHER') && (
              <Link to="/admin/equipment" className={`nav-link ${checkActive('/admin/equipment') ? 'active' : ''}`}><Box size={20}/> Vật chất</Link>
            )}
            <Link to="/admin/review" className={`nav-link ${checkActive('/admin/review') ? 'active' : ''}`}><BookOpen size={20}/> Ôn tập</Link>
            <Link to="/admin/moments" className={`nav-link ${checkActive('/admin/moments') ? 'active' : ''}`}><Camera size={20}/> Kỷ niệm</Link>
            {userRole === 'ADMIN' && (
              <Link to="/admin/users" className={`nav-link ${checkActive('/admin/users') ? 'active' : ''}`}><Users size={20}/> Tài khoản</Link>
            )}
          </nav>

          {/* PHẦN GIỚI THIỆU DEVELOPER (TUẤN KIỆT) */}
          <div style={{ padding: '15px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
            <div style={{ background: 'rgba(255, 255, 255, 0.03)', borderRadius: '12px', padding: '12px', marginBottom: '10px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '5px' }}>
                <Code2 size={12} color="#fbbf24" />
                <span style={{ fontSize: '9px', color: '#fbbf24', fontWeight: '900' }}>DEVELOPER</span>
              </div>
              <p style={{ color: '#fff', fontSize: '12px', fontWeight: '800', margin: 0 }}>PHẠM GIA TUẤN KIỆT</p>
              <p style={{ color: '#fff', fontSize: '12px', fontWeight: '800', margin: 0 }}>Hổ trợ : Cao Trần Trí</p>
              
              {/* SỐ ĐIỆN THOẠI CỦA DŨNG Ở ĐÂY */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#fbbf24', fontSize: '10px', fontWeight: '600' }}>
                <Phone size={10} /> 0523.732.134
              </div>
            </div>
            
            <button onClick={handleLogout} style={{ width: '100%', padding: '10px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              <LogOut size={16} /> Thoát
            </button>
          </div>
        </aside>

        {/* BOTTOM NAV MOBILE */}
        <nav className="bot-nav">
          {(userRole === 'ADMIN' || userRole === 'TEACHER') && (
            <Link to="/admin/equipment" className={`m-link ${checkActive('/admin/equipment') ? 'active' : ''}`}><Box size={22}/><span>Vật chất</span></Link>
          )}
          <Link to="/admin/review" className={`m-link ${checkActive('/admin/review') ? 'active' : ''}`}><BookOpen size={22}/><span>Ôn tập</span></Link>
          <Link to="/admin/moments" className={`m-link ${checkActive('/admin/moments') ? 'active' : ''}`}><Camera size={22}/><span>Kỷ niệm</span></Link>
          <button onClick={handleLogout} style={{ background: 'none', border: 'none', color: '#f87171' }} className="m-link"><LogOut size={22}/><span>Thoát</span></button>
        </nav>

        <main className="main-view" style={{ flex: 1, position: 'relative', width: '100%' }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}