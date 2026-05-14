export const fmtVnd = (value) => {
  const n = Number(value || 0);
  return n.toLocaleString('vi-VN', { style: 'currency', currency: 'VND' });
};

export const fmtDate = (value) => {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

export const BANKS = [
  { code: 'VCB', name: 'Vietcombank', full: 'Ngân hàng TMCP Ngoại thương Việt Nam', color: '#00703c' },
  { code: 'TCB', name: 'Techcombank', full: 'Ngân hàng TMCP Kỹ thương Việt Nam', color: '#e8192c' },
  { code: 'MB', name: 'MB Bank', full: 'Ngân hàng TMCP Quân đội', color: '#003087' },
  { code: 'ACB', name: 'ACB', full: 'Ngân hàng TMCP Á Châu', color: '#0066b2' },
  { code: 'BIDV', name: 'BIDV', full: 'Ngân hàng TMCP Đầu tư và Phát triển VN', color: '#005c9e' },
  { code: 'VTB', name: 'Vietinbank', full: 'Ngân hàng TMCP Công thương Việt Nam', color: '#c41e3a' },
  { code: 'AGR', name: 'Agribank', full: 'Ngân hàng Nông nghiệp và Phát triển Nông thôn', color: '#e8192c' },
  { code: 'VPB', name: 'VPBank', full: 'Ngân hàng TMCP Việt Nam Thịnh Vượng', color: '#00a651' },
  { code: 'STB', name: 'Sacombank', full: 'Ngân hàng TMCP Sài Gòn Thương Tín', color: '#003087' },
  { code: 'EIB', name: 'Eximbank', full: 'Ngân hàng TMCP Xuất Nhập khẩu Việt Nam', color: '#009900' },
  { code: 'SHB', name: 'SHB', full: 'Ngân hàng TMCP Sài Gòn - Hà Nội', color: '#e31e24' },
  { code: 'HDB', name: 'HDBank', full: 'Ngân hàng TMCP Phát triển TP.HCM', color: '#004a97' },
  { code: 'LPB', name: 'LienVietPostBank', full: 'Ngân hàng TMCP Bưu điện Liên Việt', color: '#006837' },
  { code: 'PGB', name: 'PGBank', full: 'Ngân hàng TMCP Xăng dầu Petrolimex', color: '#003087' },
  { code: 'NVB', name: 'NamABank', full: 'Ngân hàng TMCP Nam Á', color: '#c41e3a' },
  { code: 'OCB', name: 'OCB', full: 'Ngân hàng TMCP Phương Đông', color: '#0066b2' },
  { code: 'VCCB', name: 'Bản Việt', full: 'Ngân hàng TMCP Bản Việt', color: '#009900' },
  { code: 'KLB', name: 'Kienlongbank', full: 'Ngân hàng TMCP Kiên Long', color: '#003087' },
  { code: 'TPB', name: 'TPBank', full: 'Ngân hàng TMCP Tiên Phong', color: '#5b2d8e' },
  { code: 'MSB', name: 'MSB', full: 'Ngân hàng TMCP Hàng Hải Việt Nam', color: '#e8192c' },
  { code: 'SEAB', name: 'SeABank', full: 'Ngân hàng TMCP Đông Nam Á', color: '#003087' },
  { code: 'BAB', name: 'BacABank', full: 'Ngân hàng TMCP Bắc Á', color: '#0066b2' },
  { code: 'OTHER', name: 'Khác', full: 'Ngân hàng khác', color: '#6b7280' },
];

export const INITIAL_FORM = { amount: '', bank_name: '', bank_account: '', bank_holder: '', note: '' };