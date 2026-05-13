export const FLOW_STEPS = [
  { status: 'waiting_handover', label: 'Chờ bàn giao' },
  { status: 'handed_over', label: 'Đã bàn giao' },
  { status: 'in_use', label: 'Đang sử dụng' },
  { status: 'waiting_return_confirmation', label: 'Chờ xác nhận trả' },
  { status: 'completed', label: 'Hoàn thành' },
];

export const RECEIVE_FIELDS = [
  { key: 'exterior', label: 'Ngoại thất không có va chạm bất thường' },
  { key: 'interior', label: 'Nội thất sạch sẽ, đủ phụ kiện' },
  { key: 'documents', label: 'Đã nhận giấy tờ và hướng dẫn xe' },
  { key: 'fuelLevel', label: 'Mức nhiên liệu / pin đúng như bàn giao' },
];

export const RETURN_FIELDS = [
  { key: 'belongings', label: 'Đã lấy hết đồ cá nhân ra khỏi xe' },
  { key: 'cleanliness', label: 'Tình trạng vệ sinh đã được kiểm tra' },
  { key: 'damagesChecked', label: 'Đã đối chiếu vết trầy xước / hư hỏng' },
  { key: 'fuelLevel', label: 'Đã ghi nhận lại mức nhiên liệu / pin' },
];

export const NOTICE_STYLES = {
  info: {
    background: '#eff6ff',
    border: '1px solid #bfdbfe',
    color: '#1d4ed8',
  },
  success: {
    background: '#f0fdf4',
    border: '1px solid #86efac',
    color: '#166534',
  },
  warning: {
    background: '#fff7ed',
    border: '1px solid #fdba74',
    color: '#9a3412',
  },
};

export const BASE_CARD_STYLE = {
  background: '#fff',
  border: '1px solid #e5e7eb',
  borderRadius: 20,
  padding: 18,
  boxShadow: '0 10px 30px rgba(15, 23, 42, 0.04)',
};
