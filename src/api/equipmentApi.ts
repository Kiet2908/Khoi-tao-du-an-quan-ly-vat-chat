import { supabase } from '../supabaseClient';

export interface ChoMuonLog {
  id?: number;
  NgayThang: string;
  NguoiNhan: string; // Lưu Họ Tên giáo viên
  VatChat: string;
  SoLuong: number;
  TrangThai: string; // "Đang giữ" hoặc "Đã trả"
}

export const equipmentApi = {
  // Lấy danh sách từ bảng ChoMuon
  async getChoMuonLogs() {
    const { data, error } = await supabase
      .from('ChoMuon')
      .select('*')
      .order('id', { ascending: false });
    if (error) throw error;
    return data as ChoMuonLog[];
  },

  // Lưu lệnh mượn mới
  async createChoMuon(newLog: Omit<ChoMuonLog, 'id'>) {
    const { data, error } = await supabase
      .from('ChoMuon')
      .insert([newLog]);
    if (error) throw error;
    return data;
  },

  // Cập nhật trả đồ
  async updateReturnStatus(id: number) {
    const { error } = await supabase
      .from('ChoMuon')
      .update({ TrangThai: 'Đã trả' })
      .eq('id', id);
    if (error) throw error;
  }
};