/**
 * seed-db.js — Thêm dữ liệu mẫu sạch vào database
 *
 * Cách dùng (chạy từ thư mục gốc dự án):
 *   node backend/scripts/seed-db.js              # seed tất cả
 *   node backend/scripts/seed-db.js --only-users # chỉ seed users
 *   node backend/scripts/seed-db.js --dry-run    # xem sẽ tạo gì, không ghi DB
 *
 * Script KHÔNG xóa dữ liệu cũ. Nếu muốn reset sạch trước, chạy clear-db.js.
 * Accounts được tạo:
 *   admin@smartrent.com      / Admin@123
 *   showroom1@smartrent.com  / Show@123  (Showroom Hà Nội)
 *   showroom2@smartrent.com  / Show@123  (Showroom Sài Gòn)
 *   renter1@smartrent.com    / Rent@123
 *   renter2@smartrent.com    / Rent@123
 *   renter3@smartrent.com    / Rent@123
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const MONGO_URI = process.env.MONGO_URI || process.env.DB_URI || process.env.MONGODB_URI;
if (!MONGO_URI) {
  console.error('❌  Không tìm thấy MONGO_URI trong .env');
  process.exit(1);
}

const args = process.argv.slice(2);
const ONLY_USERS = args.includes('--only-users');
const DRY_RUN = args.includes('--dry-run');

// ─── Models ────────────────────────────────────────────────────────────────
const User = require('../src/models/user.model');
const Vehicle = require('../src/models/vehicle.model');
const Booking = require('../src/models/booking.model');
const Payment = require('../src/models/payment.model');
const Review = require('../src/models/review.model');

// ─── Helpers ───────────────────────────────────────────────────────────────
const hashPw = (pw) => bcrypt.hash(pw, 10);
const daysFromNow = (n) => new Date(Date.now() + n * 86400000);
const daysAgo = (n) => new Date(Date.now() - n * 86400000);

function log(msg) {
  console.log(`  ${msg}`);
}
function ok(msg) {
  console.log(`  ✅  ${msg}`);
}
function info(msg) {
  console.log(`  ℹ️   ${msg}`);
}

// ─── Data definitions ──────────────────────────────────────────────────────

const USERS_DEF = [
  {
    name: 'Admin SmartRent',
    email: 'admin@smartrent.com',
    password: 'Admin@123',
    role: 'admin',
    phone: '0900000000',
    address: 'Hà Nội',
    is_active: true,
    driver_license_status: 'none',
  },
  {
    name: 'Showroom Hà Nội',
    email: 'showroom1@smartrent.com',
    password: 'Show@123',
    role: 'showroom',
    phone: '0911111111',
    address: '12 Trần Duy Hưng, Cầu Giấy, Hà Nội',
    business_name: 'SmartRent Hà Nội',
    tax_code: '0123456789',
    is_active: true,
    driver_license_status: 'none',
  },
  {
    name: 'Showroom Sài Gòn',
    email: 'showroom2@smartrent.com',
    password: 'Show@123',
    role: 'showroom',
    phone: '0922222222',
    address: '45 Nguyễn Trãi, Quận 1, TP.HCM',
    business_name: 'SmartRent Sài Gòn',
    tax_code: '9876543210',
    is_active: true,
    driver_license_status: 'none',
  },
  {
    name: 'Nguyễn Văn An',
    email: 'renter1@smartrent.com',
    password: 'Rent@123',
    role: 'user',
    phone: '0933333333',
    address: '7 Hoàng Diệu, Ba Đình, Hà Nội',
    age: 28,
    is_active: true,
    driver_license_status: 'approved',
    driver_license_number: 'B1-123456',
    driver_license_fullname: 'Nguyễn Văn An',
    driver_license_class: 'B1',
    driver_license_dob: new Date('1998-03-15'),
    driver_license_expiry: new Date('2030-03-15'),
  },
  {
    name: 'Trần Thị Bình',
    email: 'renter2@smartrent.com',
    password: 'Rent@123',
    role: 'user',
    phone: '0944444444',
    address: '22 Lê Lợi, Quận 1, TP.HCM',
    age: 25,
    is_active: true,
    driver_license_status: 'approved',
    driver_license_number: 'B2-654321',
    driver_license_fullname: 'Trần Thị Bình',
    driver_license_class: 'B2',
    driver_license_dob: new Date('2001-07-20'),
    driver_license_expiry: new Date('2031-07-20'),
  },
  {
    name: 'Phạm Minh Cường',
    email: 'renter3@smartrent.com',
    password: 'Rent@123',
    role: 'user',
    phone: '0955555555',
    address: '88 Đinh Tiên Hoàng, Quận Bình Thạnh, TP.HCM',
    age: 32,
    is_active: true,
    driver_license_status: 'approved',
    driver_license_number: 'B1-789012',
    driver_license_fullname: 'Phạm Minh Cường',
    driver_license_class: 'B1',
    driver_license_dob: new Date('1994-11-05'),
    driver_license_expiry: new Date('2028-11-05'),
  },
];

const makeVehicles = (showroom1Id, showroom2Id) => [
  // ── Showroom Hà Nội ──
  {
    vehicle_name: 'Toyota Camry 2.5Q',
    vehicle_type: 'Sedan',
    brand: 'Toyota',
    vehicle_brand: 'Toyota',
    model: '2.5Q',
    vehicle_model: '2.5Q',
    year: 2022,
    number_of_seats: 5,
    transmission: 'automatic',
    fuel_type: 'petrol',
    vehicle_hire_rate_in_figures: 900000,
    vehicle_hire_rate_currency: 'VND',
    vehicle_hire_charge_per_timing: 'day',
    vehicle_plate_number: '30A-12345',
    vehicle_engine_number: 'ENG-CAM-001',
    vehicle_identification_number: 'VIN-CAM-001',
    status: 'available',
    added_by: showroom1Id,
    active: true,
    verified: daysAgo(10),
    description: 'Xe sang trọng, điều hòa mát, ghế da cao cấp. Phù hợp công tác và gia đình.',
    images: ['https://images.unsplash.com/photo-1621007947382-bb3c3994e3fb?w=600'],
  },
  {
    vehicle_name: 'Honda Civic RS',
    vehicle_type: 'Sedan',
    brand: 'Honda',
    vehicle_brand: 'Honda',
    model: 'Civic RS',
    vehicle_model: 'Civic RS',
    year: 2023,
    number_of_seats: 5,
    transmission: 'automatic',
    fuel_type: 'petrol',
    vehicle_hire_rate_in_figures: 700000,
    vehicle_hire_rate_currency: 'VND',
    vehicle_hire_charge_per_timing: 'day',
    vehicle_plate_number: '30B-54321',
    vehicle_engine_number: 'ENG-CIV-001',
    vehicle_identification_number: 'VIN-CIV-001',
    status: 'available',
    added_by: showroom1Id,
    active: true,
    verified: daysAgo(8),
    description: 'Honda Civic RS thể thao, tiết kiệm nhiên liệu, nội thất hiện đại.',
    images: ['https://images.unsplash.com/photo-1605559424843-9e4c228bf1c2?w=600'],
  },
  {
    vehicle_name: 'Hyundai Tucson 2.0AT',
    vehicle_type: 'SUV',
    brand: 'Hyundai',
    vehicle_brand: 'Hyundai',
    model: 'Tucson',
    vehicle_model: 'Tucson 2.0AT',
    year: 2022,
    number_of_seats: 5,
    transmission: 'automatic',
    fuel_type: 'petrol',
    vehicle_hire_rate_in_figures: 1100000,
    vehicle_hire_rate_currency: 'VND',
    vehicle_hire_charge_per_timing: 'day',
    vehicle_plate_number: '30C-11111',
    vehicle_engine_number: 'ENG-TUC-001',
    vehicle_identification_number: 'VIN-TUC-001',
    status: 'available',
    added_by: showroom1Id,
    active: true,
    verified: daysAgo(5),
    description: 'SUV gầm cao, phù hợp gia đình đi du lịch dài ngày, cốp rộng.',
    images: ['https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=600'],
  },
  {
    vehicle_name: 'Mazda CX-5 Luxury',
    vehicle_type: 'SUV',
    brand: 'Mazda',
    vehicle_brand: 'Mazda',
    model: 'CX-5',
    vehicle_model: 'CX-5 Luxury',
    year: 2023,
    number_of_seats: 5,
    transmission: 'automatic',
    fuel_type: 'petrol',
    vehicle_hire_rate_in_figures: 1200000,
    vehicle_hire_rate_currency: 'VND',
    vehicle_hire_charge_per_timing: 'day',
    vehicle_plate_number: '30D-22222',
    vehicle_engine_number: 'ENG-CX5-001',
    vehicle_identification_number: 'VIN-CX5-001',
    status: 'available',
    added_by: showroom1Id,
    active: true,
    verified: daysAgo(3),
    description: 'Mazda CX-5 sang trọng, trang bị đầy đủ, an toàn 5 sao.',
    images: ['https://images.unsplash.com/photo-1609521263047-f8f205293f24?w=600'],
  },

  // ── Showroom Sài Gòn ──
  {
    vehicle_name: 'VinFast VF8 Plus',
    vehicle_type: 'SUV',
    brand: 'VinFast',
    vehicle_brand: 'VinFast',
    model: 'VF8',
    vehicle_model: 'VF8 Plus',
    year: 2024,
    number_of_seats: 5,
    transmission: 'automatic',
    fuel_type: 'electric',
    vehicle_hire_rate_in_figures: 1300000,
    vehicle_hire_rate_currency: 'VND',
    vehicle_hire_charge_per_timing: 'day',
    vehicle_plate_number: '51A-88888',
    vehicle_engine_number: 'ENG-VF8-001',
    vehicle_identification_number: 'VIN-VF8-001',
    status: 'available',
    added_by: showroom2Id,
    active: true,
    verified: daysAgo(7),
    description: 'SUV thuần điện VinFast VF8, không phát thải, tiết kiệm chi phí vận hành.',
    images: ['https://images.unsplash.com/photo-1593941707882-a5bba14938c7?w=600'],
  },
  {
    vehicle_name: 'Kia Seltos 1.4T Premium',
    vehicle_type: 'SUV',
    brand: 'Kia',
    vehicle_brand: 'Kia',
    model: 'Seltos',
    vehicle_model: 'Seltos 1.4T Premium',
    year: 2023,
    number_of_seats: 5,
    transmission: 'automatic',
    fuel_type: 'petrol',
    vehicle_hire_rate_in_figures: 950000,
    vehicle_hire_rate_currency: 'VND',
    vehicle_hire_charge_per_timing: 'day',
    vehicle_plate_number: '51B-77777',
    vehicle_engine_number: 'ENG-SEL-001',
    vehicle_identification_number: 'VIN-SEL-001',
    status: 'available',
    added_by: showroom2Id,
    active: true,
    verified: daysAgo(4),
    description: 'Kia Seltos trẻ trung, năng động, cảm giác lái tốt, camera 360°.',
    images: ['https://images.unsplash.com/photo-1617788138017-80ad40651399?w=600'],
  },
  {
    vehicle_name: 'Toyota Fortuner 2.7AT',
    vehicle_type: 'SUV',
    brand: 'Toyota',
    vehicle_brand: 'Toyota',
    model: 'Fortuner',
    vehicle_model: 'Fortuner 2.7AT',
    year: 2022,
    number_of_seats: 7,
    transmission: 'automatic',
    fuel_type: 'petrol',
    vehicle_hire_rate_in_figures: 1500000,
    vehicle_hire_rate_currency: 'VND',
    vehicle_hire_charge_per_timing: 'day',
    vehicle_plate_number: '51C-66666',
    vehicle_engine_number: 'ENG-FOR-001',
    vehicle_identification_number: 'VIN-FOR-001',
    status: 'available',
    added_by: showroom2Id,
    active: true,
    verified: daysAgo(6),
    description: 'Toyota Fortuner 7 chỗ, gầm cao, phù hợp địa hình đồi núi và gia đình đông.',
    images: ['https://images.unsplash.com/photo-1519641471654-76ce0107ad1b?w=600'],
  },
  {
    vehicle_name: 'Mitsubishi Xpander 1.5AT',
    vehicle_type: 'Wagon',
    brand: 'Mitsubishi',
    vehicle_brand: 'Mitsubishi',
    model: 'Xpander',
    vehicle_model: 'Xpander 1.5AT',
    year: 2023,
    number_of_seats: 7,
    transmission: 'automatic',
    fuel_type: 'petrol',
    vehicle_hire_rate_in_figures: 850000,
    vehicle_hire_rate_currency: 'VND',
    vehicle_hire_charge_per_timing: 'day',
    vehicle_plate_number: '51D-55555',
    vehicle_engine_number: 'ENG-XPA-001',
    vehicle_identification_number: 'VIN-XPA-001',
    status: 'available',
    added_by: showroom2Id,
    active: true,
    verified: daysAgo(2),
    description: 'MPV 7 chỗ kinh tế, khoang hành lý linh hoạt, phù hợp du lịch nhóm.',
    images: ['https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=600'],
  },
];

const makeBookingsAndPayments = (users, vehicles) => {
  const renter1 = users.find((u) => u.email === 'renter1@smartrent.com');
  const renter2 = users.find((u) => u.email === 'renter2@smartrent.com');
  const renter3 = users.find((u) => u.email === 'renter3@smartrent.com');
  const sh1 = users.find((u) => u.email === 'showroom1@smartrent.com');
  const sh2 = users.find((u) => u.email === 'showroom2@smartrent.com');

  // xe của showroom1
  const camry = vehicles.find((v) => v.vehicle_name === 'Toyota Camry 2.5Q');
  const civic = vehicles.find((v) => v.vehicle_name === 'Honda Civic RS');
  const tucson = vehicles.find((v) => v.vehicle_name === 'Hyundai Tucson 2.0AT');
  // xe của showroom2
  const vf8 = vehicles.find((v) => v.vehicle_name === 'VinFast VF8 Plus');
  const seltos = vehicles.find((v) => v.vehicle_name === 'Kia Seltos 1.4T Premium');
  const fortuner = vehicles.find((v) => v.vehicle_name === 'Toyota Fortuner 2.7AT');

  const calc = (rate, start, end) => {
    const days = Math.ceil((end - start) / 86400000);
    const sub = rate * days;
    return { days, total: sub + Math.round(sub * 0.05) };
  };

  const bookings = [];
  const payments = [];

  // 1. Hoàn thành — renter1 thuê Camry 7 ngày trước
  {
    const start = daysAgo(14);
    const end = daysAgo(7);
    const { total } = calc(camry.vehicle_hire_rate_in_figures, start, end);
    const b = {
      _id: new mongoose.Types.ObjectId(),
      user_id: renter1._id,
      showroom_id: sh1._id,
      vehicle_id: camry._id,
      start_date: start,
      end_date: end,
      total_price: total,
      status: 'completed',
      note: 'Đặt cho chuyến công tác Hà Nội',
    };
    bookings.push(b);
    payments.push({
      booking_id: b._id,
      amount: total,
      currency: 'vnd',
      payment_method: 'stripe',
      payment_status: 'successful',
      stripe_payment_intent_id: 'pi_test_completed_001',
      transaction_code: 'TXN-001',
      paid_at: daysAgo(14),
      paid_by: renter1._id,
    });
  }

  // 2. Hoàn thành — renter2 thuê Kia Seltos 5 ngày trước
  {
    const start = daysAgo(10);
    const end = daysAgo(5);
    const { total } = calc(seltos.vehicle_hire_rate_in_figures, start, end);
    const b = {
      _id: new mongoose.Types.ObjectId(),
      user_id: renter2._id,
      showroom_id: sh2._id,
      vehicle_id: seltos._id,
      start_date: start,
      end_date: end,
      total_price: total,
      status: 'completed',
      note: '',
    };
    bookings.push(b);
    payments.push({
      booking_id: b._id,
      amount: total,
      currency: 'vnd',
      payment_method: 'stripe',
      payment_status: 'successful',
      stripe_payment_intent_id: 'pi_test_completed_002',
      transaction_code: 'TXN-002',
      paid_at: daysAgo(10),
      paid_by: renter2._id,
    });
  }

  // 3. Đang thuê (in_use) — renter3 thuê Fortuner, đang chạy
  {
    const start = daysAgo(2);
    const end = daysFromNow(3);
    const { total } = calc(fortuner.vehicle_hire_rate_in_figures, start, end);
    const b = {
      _id: new mongoose.Types.ObjectId(),
      user_id: renter3._id,
      showroom_id: sh2._id,
      vehicle_id: fortuner._id,
      start_date: start,
      end_date: end,
      total_price: total,
      status: 'in_use',
      note: 'Chuyến du lịch Đà Lạt',
    };
    bookings.push(b);
    payments.push({
      booking_id: b._id,
      amount: total,
      currency: 'vnd',
      payment_method: 'stripe',
      payment_status: 'successful',
      stripe_payment_intent_id: 'pi_test_inuse_003',
      transaction_code: 'TXN-003',
      paid_at: daysAgo(2),
      paid_by: renter3._id,
    });
    // Cập nhật trạng thái xe
    fortuner._seedStatus = 'rented';
  }

  // 4. Chờ bàn giao (waiting_handover) — renter1 thuê VF8
  {
    const start = daysFromNow(1);
    const end = daysFromNow(4);
    const { total } = calc(vf8.vehicle_hire_rate_in_figures, start, end);
    const b = {
      _id: new mongoose.Types.ObjectId(),
      user_id: renter1._id,
      showroom_id: sh2._id,
      vehicle_id: vf8._id,
      start_date: start,
      end_date: end,
      total_price: total,
      status: 'waiting_handover',
      note: '',
    };
    bookings.push(b);
    payments.push({
      booking_id: b._id,
      amount: total,
      currency: 'vnd',
      payment_method: 'stripe',
      payment_status: 'successful',
      stripe_payment_intent_id: 'pi_test_handover_004',
      transaction_code: 'TXN-004',
      paid_at: daysAgo(1),
      paid_by: renter1._id,
    });
    vf8._seedStatus = 'waiting_handover';
  }

  // 5. Đã thanh toán, showroom chưa xử lý (paid) — renter2 thuê Tucson
  {
    const start = daysFromNow(3);
    const end = daysFromNow(6);
    const { total } = calc(tucson.vehicle_hire_rate_in_figures, start, end);
    const b = {
      _id: new mongoose.Types.ObjectId(),
      user_id: renter2._id,
      showroom_id: sh1._id,
      vehicle_id: tucson._id,
      start_date: start,
      end_date: end,
      total_price: total,
      status: 'paid',
      note: 'Cần xe từ sáng sớm',
    };
    bookings.push(b);
    payments.push({
      booking_id: b._id,
      amount: total,
      currency: 'vnd',
      payment_method: 'stripe',
      payment_status: 'successful',
      stripe_payment_intent_id: 'pi_test_paid_005',
      transaction_code: 'TXN-005',
      paid_at: daysAgo(0),
      paid_by: renter2._id,
    });
  }

  // 6. Chờ thanh toán (pending) — renter3 đặt Civic
  {
    const start = daysFromNow(5);
    const end = daysFromNow(8);
    const { total } = calc(civic.vehicle_hire_rate_in_figures, start, end);
    bookings.push({
      _id: new mongoose.Types.ObjectId(),
      user_id: renter3._id,
      showroom_id: sh1._id,
      vehicle_id: civic._id,
      start_date: start,
      end_date: end,
      total_price: total,
      status: 'pending',
      note: '',
    });
  }

  // 7. Đã hủy — renter1 đặt Xpander rồi hủy
  {
    const xpander = vehicles.find((v) => v.vehicle_name === 'Mitsubishi Xpander 1.5AT');
    const start = daysAgo(5);
    const end = daysAgo(2);
    const { total } = calc(xpander.vehicle_hire_rate_in_figures, start, end);
    bookings.push({
      _id: new mongoose.Types.ObjectId(),
      user_id: renter1._id,
      showroom_id: sh2._id,
      vehicle_id: xpander._id,
      start_date: start,
      end_date: end,
      total_price: total,
      status: 'cancelled',
      note: 'Thay đổi kế hoạch',
    });
  }

  return { bookings, payments };
};

const makeReviews = (users, vehicles) => {
  const renter1 = users.find((u) => u.email === 'renter1@smartrent.com');
  const renter2 = users.find((u) => u.email === 'renter2@smartrent.com');
  const camry = vehicles.find((v) => v.vehicle_name === 'Toyota Camry 2.5Q');
  const seltos = vehicles.find((v) => v.vehicle_name === 'Kia Seltos 1.4T Premium');

  return [
    {
      user: renter1._id,
      vehicle_id: camry._id,
      rating: 5,
      comment: 'Xe rất sạch sẽ, điều hòa mát lạnh, showroom nhiệt tình hỗ trợ. Sẽ đặt lại lần sau!',
    },
    {
      user: renter2._id,
      vehicle_id: seltos._id,
      rating: 4,
      comment: 'Xe chạy ổn, tiêu hao ít xăng. Bàn giao nhanh, thủ tục đơn giản.',
    },
  ];
};

// ─── Main ──────────────────────────────────────────────────────────────────

async function run() {
  await mongoose.connect(MONGO_URI);
  console.log('✅  Connected:', MONGO_URI.replace(/:\/\/[^@]+@/, '://***@'));
  console.log('');

  if (DRY_RUN) {
    console.log('⚠️   DRY RUN — chỉ in kế hoạch, không ghi DB.\n');
  }

  // ── 1. Users ──
  console.log('👤  Tạo Users...');
  const createdUsers = [];
  for (const def of USERS_DEF) {
    const exists = await User.findOne({ email: def.email }).lean();
    if (exists) {
      info(`Skip (đã tồn tại): ${def.email}`);
      createdUsers.push(exists);
      continue;
    }
    if (DRY_RUN) {
      info(`[DRY] Sẽ tạo: ${def.email} (${def.role})`);
      createdUsers.push({ ...def, _id: new mongoose.Types.ObjectId() });
      continue;
    }
    // Không hash thủ công — User model đã có pre('save') hook tự hash
    const user = await User.create(def);
    ok(`Tạo: ${def.email} (${def.role})`);
    createdUsers.push(user);
  }
  console.log('');

  if (ONLY_USERS) {
    console.log('ℹ️   --only-users: dừng tại đây.\n');
    await mongoose.disconnect();
    return;
  }

  // ── 2. Vehicles ──
  console.log('🚗  Tạo Vehicles...');
  const sh1 = createdUsers.find((u) => u.email === 'showroom1@smartrent.com');
  const sh2 = createdUsers.find((u) => u.email === 'showroom2@smartrent.com');
  const vehiclesDef = makeVehicles(sh1._id, sh2._id);
  const createdVehicles = [];

  for (const def of vehiclesDef) {
    const exists = await Vehicle.findOne({
      vehicle_plate_number: def.vehicle_plate_number,
    }).lean();
    if (exists) {
      info(`Skip (đã tồn tại biển số ${def.vehicle_plate_number}): ${def.vehicle_name}`);
      createdVehicles.push(exists);
      continue;
    }
    if (DRY_RUN) {
      info(`[DRY] Sẽ tạo: ${def.vehicle_name}`);
      createdVehicles.push({ ...def, _id: new mongoose.Types.ObjectId() });
      continue;
    }
    const vehicle = await Vehicle.create(def);
    ok(`Tạo: ${def.vehicle_name} (${def.vehicle_plate_number})`);
    createdVehicles.push(vehicle);
  }
  console.log('');

  // ── 3. Bookings & Payments ──
  console.log('📋  Tạo Bookings & Payments...');
  const { bookings: bookingsDef, payments: paymentsDef } = makeBookingsAndPayments(createdUsers, createdVehicles);

  // Bookings
  for (const def of bookingsDef) {
    if (DRY_RUN) {
      info(
        `[DRY] Booking: ${def.status}, xe ${createdVehicles.find((v) => String(v._id) === String(def.vehicle_id))?.vehicle_name || '?'}`,
      );
      continue;
    }
    await Booking.create(def);
    const vName = createdVehicles.find((v) => String(v._id) === String(def.vehicle_id))?.vehicle_name || '?';
    ok(`Booking [${def.status}]: ${vName}`);
  }

  // Cập nhật trạng thái xe sau seed booking
  if (!DRY_RUN) {
    for (const v of createdVehicles) {
      if (v._seedStatus) {
        await Vehicle.findByIdAndUpdate(v._id, { status: v._seedStatus });
        info(`Cập nhật xe ${v.vehicle_name} → ${v._seedStatus}`);
      }
    }
  }

  // Payments
  if (!DRY_RUN) {
    for (const def of paymentsDef) {
      await Payment.create(def);
    }
    ok(`Tạo ${paymentsDef.length} payment records`);
  } else {
    info(`[DRY] Sẽ tạo ${paymentsDef.length} payment records`);
  }
  console.log('');

  // ── 4. Reviews ──
  console.log('⭐  Tạo Reviews...');
  const reviewsDef = makeReviews(createdUsers, createdVehicles);
  for (const def of reviewsDef) {
    if (DRY_RUN) {
      info(`[DRY] Review: rating ${def.rating}`);
      continue;
    }
    await Review.create(def);
    ok(`Review ${def.rating}★: "${def.comment.slice(0, 40)}..."`);
  }
  console.log('');

  // ── Tổng kết ──
  console.log('══════════════════════════════════════════');
  console.log('🎉  Seed hoàn thành!');
  console.log('');
  console.log('  Accounts:');
  for (const u of USERS_DEF) {
    console.log(`    ${u.email.padEnd(35)} pw: ${u.password}  (${u.role})`);
  }
  console.log('══════════════════════════════════════════');
  console.log('');

  await mongoose.disconnect();
}

run().catch((err) => {
  console.error('❌  Script lỗi:', err);
  process.exit(1);
});
