// ============================================================
// MOCK DATA FOR ALL DASHBOARDS
// ============================================================

export const REVENUE_MONTHLY = [
  { month: 'T1', revenue: 120, bookings: 45, target: 130 },
  { month: 'T2', revenue: 135, bookings: 52, target: 130 },
  { month: 'T3', revenue: 148, bookings: 61, target: 150 },
  { month: 'T4', revenue: 162, bookings: 58, target: 150 },
  { month: 'T5', revenue: 178, bookings: 74, target: 170 },
  { month: 'T6', revenue: 195, bookings: 82, target: 180 },
  { month: 'T7', revenue: 210, bookings: 91, target: 200 },
  { month: 'T8', revenue: 198, bookings: 86, target: 200 },
  { month: 'T9', revenue: 220, bookings: 95, target: 210 },
  { month: 'T10', revenue: 245, bookings: 108, target: 230 },
  { month: 'T11', revenue: 268, bookings: 115, target: 250 },
  { month: 'T12', revenue: 310, bookings: 142, target: 280 },
];

export const USER_GROWTH = [
  { month: 'T7', renters: 520, consignedVehicles: 34, showrooms: 12 },
  { month: 'T8', renters: 610, consignedVehicles: 38, showrooms: 14 },
  { month: 'T9', renters: 720, consignedVehicles: 45, showrooms: 16 },
  { month: 'T10', renters: 890, consignedVehicles: 52, showrooms: 19 },
  { month: 'T11', renters: 1050, consignedVehicles: 61, showrooms: 22 },
  { month: 'T12', renters: 1247, consignedVehicles: 73, showrooms: 23 },
];

export const VEHICLE_STATUS_PIE = [
  { name: 'Sẵn sàng', value: 28, color: '#059669' },
  { name: 'Đang thuê', value: 12, color: '#2563eb' },
  { name: 'Bảo dưỡng', value: 5, color: '#7c3aed' },
  { name: 'Chờ duyệt', value: 3, color: '#d97706' },
];

export const VEHICLE_CATEGORY_PIE = [
  { name: 'SUV', value: 18, color: '#00b14f' },
  { name: 'Sedan', value: 12, color: '#2563eb' },
  { name: 'MPV', value: 7, color: '#7c3aed' },
  { name: 'Hatchback', value: 5, color: '#d97706' },
  { name: 'Bán tải', value: 3, color: '#0891b2' },
];

export const MOCK_USERS = [
  { id: 1, name: 'Nguyễn Văn An',     email: 'an.nguyen@gmail.com',     role: 'renter',   status: 'verified',   phone: '0912345678', createdAt: '10/01/2026', bookings: 8 },
  { id: 2, name: 'Trần Thị Bình',     email: 'binh.tran@gmail.com',     role: 'renter',   status: 'unverified', phone: '0923456789', createdAt: '15/01/2026', bookings: 2 },
  { id: 3, name: 'Lê Minh Cường',     email: 'cuong.le@gmail.com',      role: 'showroom', status: 'verified',   phone: '0934567890', createdAt: '20/01/2026', bookings: 0 },
  { id: 4, name: 'Phạm Thị Dung',     email: 'dung.pham@gmail.com',     role: 'showroom', status: 'approved',   phone: '0945678901', createdAt: '05/02/2026', bookings: 0 },
  { id: 5, name: 'Hoàng Văn Em',      email: 'em.hoang@gmail.com',      role: 'renter',   status: 'locked',     phone: '0956789012', createdAt: '08/02/2026', bookings: 15 },
  { id: 6, name: 'Vũ Thị Phương',     email: 'phuong.vu@gmail.com',     role: 'renter',   status: 'verified',   phone: '0967890123', createdAt: '12/02/2026', bookings: 4 },
  { id: 7, name: 'Đặng Minh Giang',   email: 'giang.dang@gmail.com',    role: 'showroom', status: 'unverified', phone: '0978901234', createdAt: '18/02/2026', bookings: 0 },
  { id: 8, name: 'Ngô Thị Hoa',       email: 'hoa.ngo@gmail.com',       role: 'renter',   status: 'verified',   phone: '0989012345', createdAt: '22/02/2026', bookings: 6 },
  { id: 9, name: 'Đinh Văn Inh',      email: 'inh.dinh@gmail.com',      role: 'renter',   status: 'verified',   phone: '0990123456', createdAt: '01/03/2026', bookings: 11 },
  { id: 10, name: 'Bùi Thị Kim',      email: 'kim.bui@gmail.com',       role: 'showroom', status: 'verified',   phone: '0901234567', createdAt: '05/03/2026', bookings: 0 },
  { id: 11, name: 'Trương Văn Long',  email: 'long.truong@gmail.com',   role: 'renter',   status: 'unverified', phone: '0912345670', createdAt: '08/03/2026', bookings: 1 },
  { id: 12, name: 'Lý Thị Mơ',        email: 'mo.ly@gmail.com',         role: 'renter',   status: 'verified',   phone: '0923456780', createdAt: '10/03/2026', bookings: 3 },
];

export const MOCK_SHOWROOMS = [
  { id: 1, name: 'Showroom Minh Hoàng', owner: 'Phạm Thị Dung', address: '123 Lê Văn Lương, Q.7, TP.HCM', phone: '028 1234 5678', email: 'minhhoang@gmail.com', vehicles: 45, status: 'approved', createdAt: '01/01/2026', license: 'GP001/2026', rating: 4.8 },
  { id: 2, name: 'Auto Center Quận 1',  owner: 'Lê Văn Bình',   address: '456 Nguyễn Trãi, Q.1, TP.HCM',  phone: '028 2345 6789', email: 'autocenter@gmail.com', vehicles: 32, status: 'approved', createdAt: '15/01/2026', license: 'GP002/2026', rating: 4.6 },
  { id: 3, name: 'Xe Tốt Thủ Đức',     owner: 'Hoàng Thị Lan', address: '789 Võ Văn Ngân, Thủ Đức',       phone: '028 3456 7890', email: 'xetot@gmail.com',      vehicles: 18, status: 'pending',  createdAt: '10/02/2026', license: 'GP003/2026', rating: 0 },
  { id: 4, name: 'Vina Car Rental',     owner: 'Trần Văn Cường', address: '321 Điện Biên Phủ, Bình Thạnh', phone: '028 4567 8901', email: 'vina@gmail.com',       vehicles: 27, status: 'approved', createdAt: '01/02/2026', license: 'GP004/2026', rating: 4.7 },
  { id: 5, name: 'Premium Motors',      owner: 'Nguyễn Thị Diệu', address: '654 Nguyễn Văn Linh, Q.7',   phone: '028 5678 9012', email: 'premium@gmail.com',    vehicles: 0,  status: 'rejected', createdAt: '05/03/2026', license: null, rating: 0 },
];

export const MOCK_VEHICLES_ADMIN = [
  { id: 1, name: 'Toyota Camry 2.5Q 2023',     brand: 'Toyota',  category: 'Sedan', price: 1200, status: 'approved',  showroom: 'Showroom Minh Hoàng', seats: 5, fuel: 'Xăng',  submittedAt: '01/03/2026', source: 'showroom' },
  { id: 2, name: 'Honda CR-V L 2023',          brand: 'Honda',   category: 'SUV',   price: 1100, status: 'approved',  showroom: 'Auto Center Quận 1',  seats: 5, fuel: 'Xăng',  submittedAt: '02/03/2026', source: 'consigned' },
  { id: 3, name: 'Mazda CX-5 Premium 2022',    brand: 'Mazda',   category: 'SUV',   price: 950,  status: 'pending',   showroom: 'Vina Car Rental',     seats: 5, fuel: 'Xăng',  submittedAt: '08/03/2026', source: 'showroom' },
  { id: 4, name: 'Hyundai Tucson 2.0 2023',    brand: 'Hyundai', category: 'SUV',   price: 900,  status: 'pending',   showroom: 'Xe Tốt Thủ Đức',     seats: 5, fuel: 'Xăng',  submittedAt: '09/03/2026', source: 'consigned' },
  { id: 5, name: 'VinFast VF8 Eco 2023',       brand: 'VinFast', category: 'SUV',   price: 1050, status: 'approved',  showroom: 'Showroom Minh Hoàng', seats: 5, fuel: 'Điện',  submittedAt: '01/02/2026', source: 'showroom' },
  { id: 6, name: 'Ford Ranger Wildtrak 2022',  brand: 'Ford',    category: 'Bán tải',price: 1300,status: 'rejected',  showroom: 'Premium Motors',      seats: 5, fuel: 'Dầu',   submittedAt: '05/03/2026', source: 'consigned' },
];

export const MOCK_BOOKINGS = [
  { id: 'BK0001', renter: 'Nguyễn Văn An',   vehicle: 'Toyota Camry 2.5Q 2023',  showroom: 'Showroom Minh Hoàng', from: '10/03/2026', to: '12/03/2026', days: 2, total: 2520000, status: 'active',    payStatus: 'paid' },
  { id: 'BK0002', renter: 'Trần Thị Bình',   vehicle: 'Honda CR-V L 2023',        showroom: 'Auto Center Quận 1',  from: '11/03/2026', to: '13/03/2026', days: 2, total: 2310000, status: 'pending',   payStatus: 'pending' },
  { id: 'BK0003', renter: 'Lê Minh Cường',   vehicle: 'Mazda CX-5 Premium 2022',  showroom: 'Vina Car Rental',     from: '08/03/2026', to: '09/03/2026', days: 1, total:  997500, status: 'completed', payStatus: 'paid' },
  { id: 'BK0004', renter: 'Hoàng Văn Em',    vehicle: 'VinFast VF8 Eco 2023',     showroom: 'Showroom Minh Hoàng', from: '09/03/2026', to: '11/03/2026', days: 2, total: 2205000, status: 'completed', payStatus: 'paid' },
  { id: 'BK0005', renter: 'Vũ Thị Phương',   vehicle: 'Hyundai Tucson 2.0 2023',  showroom: 'Xe Tốt Thủ Đức',     from: '12/03/2026', to: '14/03/2026', days: 2, total: 1890000, status: 'approved',  payStatus: 'paid' },
  { id: 'BK0006', renter: 'Ngô Thị Hoa',     vehicle: 'Toyota Camry 2.5Q 2023',  showroom: 'Showroom Minh Hoàng', from: '14/03/2026', to: '16/03/2026', days: 2, total: 2520000, status: 'pending',   payStatus: 'pending' },
  { id: 'BK0007', renter: 'Đinh Văn Inh',    vehicle: 'Honda CR-V L 2023',        showroom: 'Auto Center Quận 1',  from: '05/03/2026', to: '07/03/2026', days: 2, total: 2310000, status: 'completed', payStatus: 'paid' },
  { id: 'BK0008', renter: 'Trương Văn Long', vehicle: 'Mazda CX-5 Premium 2022',  showroom: 'Vina Car Rental',     from: '15/03/2026', to: '17/03/2026', days: 2, total: 1995000, status: 'cancelled', payStatus: 'failed' },
];

export const MOCK_TRANSACTIONS = [
  { id: 'GD0001', bookingId: 'BK0001', renter: 'Nguyễn Văn An',   showroom: 'Showroom Minh Hoàng', amount: 2520000, method: 'Ví điện tử', status: 'paid',    date: '10/03/2026 14:25' },
  { id: 'GD0002', bookingId: 'BK0004', renter: 'Hoàng Văn Em',    showroom: 'Showroom Minh Hoàng', amount: 2205000, method: 'Thẻ tín dụng', status: 'paid',   date: '09/03/2026 10:15' },
  { id: 'GD0003', bookingId: 'BK0005', renter: 'Vũ Thị Phương',   showroom: 'Xe Tốt Thủ Đức',     amount: 1890000, method: 'Ví điện tử', status: 'paid',    date: '12/03/2026 09:30' },
  { id: 'GD0004', bookingId: 'BK0002', renter: 'Trần Thị Bình',   showroom: 'Auto Center Quận 1',  amount: 2310000, method: 'Chuyển khoản', status: 'processing', date: '11/03/2026 16:45' },
  { id: 'GD0005', bookingId: 'BK0007', renter: 'Đinh Văn Inh',    showroom: 'Auto Center Quận 1',  amount: 2310000, method: 'Ví điện tử', status: 'paid',    date: '05/03/2026 08:00' },
  { id: 'GD0006', bookingId: 'BK0003', renter: 'Lê Minh Cường',   showroom: 'Vina Car Rental',     amount:  997500, method: 'Thẻ tín dụng', status: 'paid',   date: '08/03/2026 13:20' },
  { id: 'GD0007', bookingId: 'BK0008', renter: 'Trương Văn Long', showroom: 'Vina Car Rental',     amount: 1995000, method: 'Ví điện tử', status: 'failed',  date: '15/03/2026 11:00' },
];

export const MOCK_SHOWROOM_VEHICLES = [
  { id: 1, name: 'Toyota Camry 2.5Q 2023',    plate: '51G-12345', brand: 'Toyota',  category: 'Sedan',   price: 1200, status: 'active',      fuel: 'Xăng',  seats: 5, trips: 28, rating: 4.9, source: 'showroom',  consignOwner: null },
  { id: 2, name: 'Honda CR-V L 2023',         plate: '51H-23456', brand: 'Honda',   category: 'SUV',     price: 1100, status: 'available',   fuel: 'Xăng',  seats: 5, trips: 19, rating: 4.8, source: 'consigned', consignOwner: 'Nguyễn Văn Khoa' },
  { id: 3, name: 'Mazda CX-5 Premium 2022',   plate: '51K-34567', brand: 'Mazda',   category: 'SUV',     price: 950,  status: 'available',   fuel: 'Xăng',  seats: 5, trips: 15, rating: 4.7, source: 'showroom',  consignOwner: null },
  { id: 4, name: 'VinFast VF8 Eco 2023',      plate: '51L-45678', brand: 'VinFast', category: 'SUV',     price: 1050, status: 'maintenance', fuel: 'Điện',  seats: 5, trips: 22, rating: 4.6, source: 'showroom',  consignOwner: null },
  { id: 5, name: 'Toyota Fortuner 2.7 2023',  plate: '51M-56789', brand: 'Toyota',  category: 'SUV',     price: 1400, status: 'active',      fuel: 'Xăng',  seats: 7, trips: 31, rating: 4.8, source: 'consigned', consignOwner: 'Lê Thị Lan' },
  { id: 6, name: 'Hyundai Accent 1.4 2022',   plate: '51N-67890', brand: 'Hyundai', category: 'Sedan',   price: 650,  status: 'available',   fuel: 'Xăng',  seats: 5, trips: 45, rating: 4.5, source: 'showroom',  consignOwner: null },
  { id: 7, name: 'Kia Carnival 2.2D 2023',    plate: '51P-78901', brand: 'Kia',     category: 'MPV',     price: 1600, status: 'active',      fuel: 'Dầu',   seats: 8, trips: 12, rating: 4.9, source: 'showroom',  consignOwner: null },
  { id: 8, name: 'Ford Ranger Wildtrak 2022', plate: '51Q-89012', brand: 'Ford',    category: 'Bán tải', price: 1300, status: 'available',   fuel: 'Dầu',   seats: 5, trips: 8,  rating: 4.7, source: 'consigned', consignOwner: 'Bùi Thị Kim' },
];

export const MOCK_CONTRACTS = [
  { id: 'HD0001', type: 'rental',  renter: 'Nguyễn Văn An',   vehicle: 'Toyota Camry 2.5Q',  bookingId: 'BK0001', from: '10/03/2026', to: '12/03/2026', total: 2520000, status: 'signed',  createdAt: '10/03/2026' },
  { id: 'HD0002', type: 'rental',  renter: 'Hoàng Văn Em',    vehicle: 'VinFast VF8 Eco',    bookingId: 'BK0004', from: '09/03/2026', to: '11/03/2026', total: 2205000, status: 'signed',  createdAt: '09/03/2026' },
  { id: 'HD0003', type: 'rental',  renter: 'Vũ Thị Phương',   vehicle: 'Hyundai Tucson 2.0', bookingId: 'BK0005', from: '12/03/2026', to: '14/03/2026', total: 1890000, status: 'signed',  createdAt: '12/03/2026' },
  { id: 'HD0004', type: 'service', renter: 'Showroom Minh Hoàng', vehicle: '-',              bookingId: '-',      from: '01/01/2026', to: '31/12/2026', total: 0,       status: 'signed',  createdAt: '01/01/2026' },
  { id: 'HD0005', type: 'rental',  renter: 'Trần Thị Bình',   vehicle: 'Honda CR-V L',       bookingId: 'BK0002', from: '11/03/2026', to: '13/03/2026', total: 2310000, status: 'draft',   createdAt: '11/03/2026' },
  { id: 'HD0006', type: 'rental',  renter: 'Lê Minh Cường',   vehicle: 'Mazda CX-5',         bookingId: 'BK0003', from: '08/03/2026', to: '09/03/2026', total:  997500, status: 'expired', createdAt: '08/03/2026' },
];

export const MOCK_OWNER_VEHICLES = [
  { id: 1, name: 'Honda CR-V L 2023',        plate: '51H-23456', showroom: 'Showroom Minh Hoàng', status: 'active',  price: 1100, trips: 19, revenue: 20900000, pendingRevenue: 2200000 },
  { id: 2, name: 'Toyota Vios G 2022',        plate: '30A-98765', showroom: 'Auto Center Quận 1',  status: 'available', price: 700, trips: 35, revenue: 24500000, pendingRevenue: 0 },
  { id: 3, name: 'Mazda 3 Sport 2023',        plate: '51B-11223', showroom: 'Vina Car Rental',     status: 'maintenance', price: 850, trips: 12, revenue: 10200000, pendingRevenue: 0 },
];

export const MOCK_OWNER_REVENUE = [
  { month: 'T9',  revenue: 3200000, payouts: 2880000 },
  { month: 'T10', revenue: 5400000, payouts: 4860000 },
  { month: 'T11', revenue: 4800000, payouts: 4320000 },
  { month: 'T12', revenue: 7200000, payouts: 6480000 },
  { month: 'T1',  revenue: 6100000, payouts: 5490000 },
  { month: 'T2',  revenue: 5800000, payouts: 5220000 },
  { month: 'T3',  revenue: 2200000, payouts: 0 },
];

// Doanh thu hàng tháng theo từng xe (simulate backend /revenue?vehicle_id=X)
export const MOCK_REVENUE_BY_VEHICLE = {
  all: [
    { month: 'T9',  revenue: 3200000, payouts: 2880000 },
    { month: 'T10', revenue: 5400000, payouts: 4860000 },
    { month: 'T11', revenue: 4800000, payouts: 4320000 },
    { month: 'T12', revenue: 7200000, payouts: 6480000 },
    { month: 'T1',  revenue: 6100000, payouts: 5490000 },
    { month: 'T2',  revenue: 5800000, payouts: 5220000 },
    { month: 'T3',  revenue: 2200000, payouts: 0 },
  ],
  1: [
    { month: 'T9',  revenue: 1100000, payouts: 990000 },
    { month: 'T10', revenue: 2200000, payouts: 1980000 },
    { month: 'T11', revenue: 1980000, payouts: 1782000 },
    { month: 'T12', revenue: 3300000, payouts: 2970000 },
    { month: 'T1',  revenue: 3300000, payouts: 2970000 },
    { month: 'T2',  revenue: 3400000, payouts: 3060000 },
    { month: 'T3',  revenue: 1100000, payouts: 0 },
  ],
  2: [
    { month: 'T9',  revenue: 1400000, payouts: 1260000 },
    { month: 'T10', revenue: 1750000, payouts: 1575000 },
    { month: 'T11', revenue: 1540000, payouts: 1386000 },
    { month: 'T12', revenue: 2100000, payouts: 1890000 },
    { month: 'T1',  revenue: 1750000, payouts: 1575000 },
    { month: 'T2',  revenue: 1400000, payouts: 1260000 },
    { month: 'T3',  revenue: 700000,  payouts: 0 },
  ],
  3: [
    { month: 'T9',  revenue: 700000,  payouts: 630000 },
    { month: 'T10', revenue: 1450000, payouts: 1305000 },
    { month: 'T11', revenue: 1280000, payouts: 1152000 },
    { month: 'T12', revenue: 1800000, payouts: 1620000 },
    { month: 'T1',  revenue: 1050000, payouts: 945000 },
    { month: 'T2',  revenue: 1000000, payouts: 900000 },
    { month: 'T3',  revenue: 400000,  payouts: 0 },
  ],
};

// Chỉ số dashboard theo từng xe (simulate backend /dashboard?vehicle_id=X)
export const MOCK_STATS_BY_VEHICLE = {
  all:  { total: 34700000, received: 29250000, pending: 2200000 },
  1:    { total: 16380000, received: 13752000, pending: 1100000 },
  2:    { total: 10640000, received: 9946000,  pending: 700000  },
  3:    { total: 6680000,  revenue: 6552000,   pending: 400000  },
};

export const MOCK_RENTER_BOOKINGS = [
  { id: 'BK0001', vehicle: 'Toyota Camry 2.5Q 2023',  showroom: 'Showroom Minh Hoàng', from: '10/03/2026', to: '12/03/2026', days: 2, total: 2520000, status: 'active',    payStatus: 'paid',    location: 'TP.HCM', image: null, contractId: 'HD0001' },
  { id: 'BK0004', vehicle: 'VinFast VF8 Eco 2023',    showroom: 'Showroom Minh Hoàng', from: '01/03/2026', to: '03/03/2026', days: 2, total: 2205000, status: 'completed', payStatus: 'paid',    location: 'TP.HCM', image: null, contractId: 'HD0002' },
  { id: 'BK0007', vehicle: 'Honda CR-V L 2023',       showroom: 'Auto Center Quận 1',  from: '20/02/2026', to: '22/02/2026', days: 2, total: 2310000, status: 'completed', payStatus: 'paid',    location: 'TP.HCM', image: null, contractId: null },
  { id: 'BK0010', vehicle: 'Mazda CX-5 Premium 2022', showroom: 'Vina Car Rental',     from: '25/03/2026', to: '27/03/2026', days: 2, total: 1995000, status: 'approved',  payStatus: 'paid',    location: 'TP.HCM', image: null, contractId: null },
  { id: 'BK0011', vehicle: 'Toyota Fortuner 2.7 2023',showroom: 'Showroom Minh Hoàng', from: '15/01/2026', to: '17/01/2026', days: 2, total: 2940000, status: 'completed', payStatus: 'paid',    location: 'TP.HCM', image: null, contractId: null },
  { id: 'BK0008', vehicle: 'Mazda CX-5 Premium 2022', showroom: 'Vina Car Rental',     from: '15/02/2026', to: '17/02/2026', days: 2, total: 1995000, status: 'cancelled', payStatus: 'failed',  location: 'TP.HCM', image: null, contractId: null },
];