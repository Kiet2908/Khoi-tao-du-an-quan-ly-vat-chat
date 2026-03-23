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
        <Route path="/" element={<Login />} />
        
        {/* Nhóm các trang quản trị dùng chung Layout xanh quân đội */}
        <Route path="/admin" element={<Layout />}>
          <Route path="equipment" element={<Equipment />} />
          <Route path="review" element={<Review />} />
          <Route path="moments" element={<Moments />} /> 
          
          {/* 2. THÊM DÒNG NÀY VÀO ĐÂY */}
          <Route path="users" element={<UserManagement />} /> 
        </Route>

      </Routes>
    </BrowserRouter>
  );
}