import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Shield, Box, BookOpen, Camera, LogOut, Users } from 'lucide-react';

export default function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const userRole = localStorage.getItem('userRole'); 

  const handleLogout = () => {
    localStorage.clear();
    navigate('/'); 
  };

  // SỬA LỖI PATH: Dùng .includes để đảm bảo trang con vẫn sáng đèn
  const checkActive = (path: string) => location.pathname === path || location.pathname.startsWith(path + '/');
  return (
    <div style={{ background: '#022c22', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <style>{`
        @media (min-width: 1024px) {
          .layout-flex { flex-direction: row !important; }
          .side-bar { display: flex !important; width: 260px; height: 100vh; position: sticky; top: 0; background: #064e3b; flex-direction: column; border-right: 1px solid rgba(255,255,255,0.1); }
          .bot-nav { display: none !important; }
        }
        @media (max-width: 1023px) {
          .side-bar { display: none !important; }
          .bot-nav { 
            display: flex !important; 
            position: fixed; 
            bottom: 0; 
            left: 0; 
            right: 0; 
            height: 70px; 
            background: #064e3b; 
            justify-content: space-around; 
            align-items: center; 
            z-index: 9999; 
            border-top: 1px solid rgba(255,255,255,0.1); 
            padding-bottom: env(safe-area-inset-bottom);
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
          <div style={{ padding: '30px', textAlign: 'center' }}>
            <Shield size={40} color="#fbbf24" style={{ margin: '0 auto' }} />
            <h2 style={{ color: '#fff', fontSize: '14px', marginTop: '10px', fontWeight: '900' }}>QUÂN KHU</h2>
          </div>
          <nav style={{ flex: 1 }}>
            {/* DÙNG ĐƯỜNG DẪN TUYỆT ĐỐI ĐỂ KHÔNG BỊ LỖI KHI F5 */}
            <Link to="/admin/equipment" className={`nav-link ${checkActive('/admin/equipment') ? 'active' : ''}`}><Box size={20}/> Vật chất</Link>
            <Link to="/admin/review" className={`nav-link ${checkActive('/admin/review') ? 'active' : ''}`}><BookOpen size={20}/> Ôn tập</Link>
            <Link to="/admin/moments" className={`nav-link ${checkActive('/admin/moments') ? 'active' : ''}`}><Camera size={20}/> Kỷ niệm</Link>
            {userRole === 'ADMIN' && <Link to="/admin/users" className={`nav-link ${checkActive('/admin/users') ? 'active' : ''}`}><Users size={20}/> Tài khoản</Link>}
          </nav>
          <button onClick={handleLogout} style={{ margin: '20px', padding: '12px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>Đăng xuất</button>
        </aside>

        {/* BOTTOM NAV MOBILE */}
        <nav className="bot-nav">
          <Link to="/admin/equipment" className={`m-link ${checkActive('/admin/equipment') ? 'active' : ''}`}><Box size={22}/><span>Vật chất</span></Link>
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