export const INFO_FIELDS = [
  ['Tên showroom (hiển thị)', 'business_name'],
  ['Người đại diện', 'showroom_representative_name'],
  ['Số điện thoại (10 số)', 'phone'],
  ['Email', 'email'],
  ['Giờ mở cửa', 'opening_hours'],
  ['Giấy phép / GPKD (công khai)', 'showroom_license_public'],
];

export const TABS = [
  ['info', 'Thông tin cơ bản'],
  ['policy', 'Chính sách'],
  ['logo', 'Logo & Hình ảnh'],
  ['signature', 'Chữ ký điện tử'],
];

export const INITIAL_FORM = {
  business_name: '',
  showroom_representative_name: '',
  phone: '',
  email: '',
  public_address: '',
  showroom_description: '',
  opening_hours: '',
  showroom_license_public: '',
  policy_text: '',
  logo_url: '',
};

export const buildFormFromUser = (u) => ({
  business_name: u.business_name || '',
  showroom_representative_name: u.showroom_representative_name || '',
  phone: u.phone || '',
  email: u.email || '',
  public_address: u.public_address || '',
  showroom_description: u.showroom_description || '',
  opening_hours: u.opening_hours || '',
  showroom_license_public: u.showroom_license_public || '',
  policy_text: u.policy_text || '',
  logo_url: u.logo_url || '',
});

export const buildSavePayload = (form) => {
  const digits = String(form.phone).replace(/\D/g, '');
  const payload = {
    business_name: form.business_name,
    showroom_representative_name: form.showroom_representative_name,
    public_address: String(form.public_address || '').trim(),
    showroom_description: form.showroom_description,
    opening_hours: form.opening_hours,
    showroom_license_public: form.showroom_license_public,
    policy_text: form.policy_text,
    logo_url: form.logo_url,
  };
  if (digits.length === 10) payload.phone = digits;
  return payload;
};