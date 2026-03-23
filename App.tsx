import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Login from './src/pages/Login';
import Layout from './src/components/Layout';
import Equipment from './src/pages/Equipment';
import Moments from './src/pages/Moments';

// Component trang Review tương tự các trang trên, bạn tự thêm nhé.
const Review = () => <div className="text-2xl font-bold">Nội dung ôn tập lý thuyết & thực hành</div>;

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Route đăng nhập ở ngoài */}
        <Route path="/" element={<Login />} />
        
        {/* Các Route có Layout bọc ngoài (yêu cầu đăng nhập) */}
        <Route path="/admin" element={<Layout />}>
          <Route path="equipment" element={<Equipment />} />
          <Route path="review" element={<Review />} />
          <Route path="moments" element={<Moments />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}