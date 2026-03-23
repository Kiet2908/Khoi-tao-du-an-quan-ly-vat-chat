import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import Layout from './components/Layout';
import Equipment from './pages/Equipment';
import Moments from './pages/Moments';
import Review from './pages/Review';
import UserManagement from './pages/UserManagement'; // 1. Thêm dòng import này

export default function App() {
  return (
    <BrowserRouter>
   <Routes>
  {/* Trang đăng nhập là gốc */}
  <Route path="/" element={<Login />} />

  {/* Nhóm Admin: Bắt buộc phải có dấu / ở path parent */}
  <Route path="/admin" element={<Layout />}>
    {/* Các trang con: KHÔNG ĐƯỢC có dấu / ở đầu path */}
    <Route path="equipment" element={<Equipment />} />
    <Route path="review" element={<Review />} />
    <Route path="moments" element={<Moments />} />
    <Route path="users" element={<UserManagement />} />
  </Route>

  {/* Trang báo lỗi nếu vào link bậy bạ */}
  <Route path="*" element={<div>Trang không tồn tại - 404</div>} />
</Routes>
    </BrowserRouter>
  );
}