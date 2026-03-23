export interface EquipmentItem {
  id: string;
  name: string;
  quantity: number;
  condition: 'Tốt' | 'Hỏng' | 'Đang sửa';
}

export interface Moment {
  id: string;
  imageUrl: string;
  caption: string;
}

export interface Lesson {
  id: string;
  title: string;
  description: string;
}