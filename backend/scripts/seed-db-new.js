/**
 * Seed database script - xóa tất cả dữ liệu cũ và insert dữ liệu mẫu mới
 * Cấu trúc database mới nhất (Gallery-based AI Inspection)
 *
 * Chạy: node scripts/seed-db-new.js
 */

const mongoose = require('mongoose');
require('dotenv').config();

const User = require('../src/models/user.model');
const Vehicle = require('../src/models/vehicle.model');
const Booking = require('../src/models/booking.model');
const VehicleInspection = require('../src/models/vehicleInspection.model');
const Review = require('../src/models/review.model');
const Favorite = require('../src/models/favorite.model');
const Payment = require('../src/models/payment.model');
const ContactUs = require('../src/models/contactUs.model');
const UserLocation = require('../src/models/userLocation.model');
const VehicleLocation = require('../src/models/vehicleLocation.model');
const RentalContractRecord = require('../src/models/rentalContractRecord.model');
const Withdrawal = require('../src/models/withdrawal.model');

const DB_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/smartrent';

const connectDB = async () => {
  try {
    await mongoose.connect(DB_URI);
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ Failed to connect:', error.message);
    process.exit(1);
  }
};

const clearAllCollections = async () => {
  console.log('\n🗑️  Clearing all collections...');
  const collections = await mongoose.connection.db.listCollections().toArray();

  for (const collection of collections) {
    await mongoose.connection.db.collection(collection.name).deleteMany({});
    console.log(`  ✓ Cleared ${collection.name}`);
  }
};

const seedUsers = async () => {
  console.log('\n👥 Seeding users...');

  const users = [
    // Admin
    {
      name: 'Admin User',
      email: 'admin@smartrent.com',
      password: 'password123',
      role: 'admin',
      phone: '+84901234567',
      address: 'Hà Nội, Việt Nam',
      driver_license_status: 'approved',
    },
    // Showroom 1
    {
      name: 'Showroom A',
      email: 'showroom1@smartrent.com',
      password: 'password123',
      role: 'showroom',
      phone: '+84912345678',
      address: 'Quân 1, TP.HCM',
      signature:
        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      driver_license_status: 'approved',
    },
    // Showroom 2
    {
      name: 'Showroom B',
      email: 'showroom2@smartrent.com',
      password: 'password123',
      role: 'showroom',
      phone: '+84923456789',
      address: 'Quân 3, TP.HCM',
      signature:
        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      driver_license_status: 'approved',
    },
    // Renter 1
    {
      name: 'Nguyễn Văn A',
      email: 'renter1@smartrent.com',
      password: 'password123',
      role: 'user',
      phone: '+84934567890',
      address: 'Quân 7, TP.HCM',
      driver_license_number: 'A1234567',
      driver_license_fullname: 'Nguyễn Văn A',
      driver_license_status: 'approved',
    },
    // Renter 2
    {
      name: 'Trần Thị B',
      email: 'renter2@smartrent.com',
      password: 'password123',
      role: 'user',
      phone: '+84945678901',
      address: 'Quân 5, TP.HCM',
      driver_license_number: 'B2345678',
      driver_license_fullname: 'Trần Thị B',
      driver_license_status: 'approved',
    },
    // Renter 3
    {
      name: 'Lê Minh C',
      email: 'renter3@smartrent.com',
      password: 'password123',
      role: 'user',
      phone: '+84956789012',
      address: 'Bình Thạnh, TP.HCM',
      driver_license_number: 'C3456789',
      driver_license_fullname: 'Lê Minh C',
      driver_license_status: 'approved',
    },
  ];

  // Use .save() instead of insertMany to trigger pre-save hooks for password hashing
  const savedUsers = [];
  for (const userData of users) {
    const user = new User(userData);
    await user.save();
    savedUsers.push(user);
  }
  console.log(`  ✓ Created ${savedUsers.length} users`);
  return savedUsers;
};

const seedVehicles = async (users) => {
  console.log('\n🚗 Seeding vehicles...');

  const showroom1 = users.find((u) => u.email === 'showroom1@smartrent.com');
  const showroom2 = users.find((u) => u.email === 'showroom2@smartrent.com');

  const vehicles = [
    // Showroom A vehicles
    {
      vehicle_name: 'Toyota Camry 2023',
      vehicle_type: 'Sedan',
      vehicle_brand: 'Toyota',
      vehicle_model: 'Camry',
      brand: 'Toyota',
      model: 'Camry',
      year: 2023,
      number_of_seats: 5,
      transmission: 'automatic',
      fuel_type: 'petrol',
      vehicle_plate_number: '75A-123456',
      vehicle_engine_number: 'ENGINE123456',
      vehicle_identification_number: 'VIN123456789',
      vehicle_hire_rate_in_figures: 1500000,
      vehicle_hire_rate_currency: 'VND',
      vehicle_hire_charge_per_timing: 'day',
      maximum_allowable_distance: '500km',
      status: 'available',
      added_by: showroom1._id,
      active: true,
    },
    {
      vehicle_name: 'Honda CR-V 2022',
      vehicle_type: 'SUV',
      vehicle_brand: 'Honda',
      vehicle_model: 'CR-V',
      brand: 'Honda',
      model: 'CR-V',
      year: 2022,
      number_of_seats: 5,
      transmission: 'automatic',
      fuel_type: 'petrol',
      vehicle_plate_number: '75A-234567',
      vehicle_engine_number: 'ENGINE234567',
      vehicle_identification_number: 'VIN234567890',
      vehicle_hire_rate_in_figures: 1800000,
      vehicle_hire_rate_currency: 'VND',
      vehicle_hire_charge_per_timing: 'day',
      maximum_allowable_distance: '600km',
      status: 'available',
      added_by: showroom1._id,
      active: true,
    },
    {
      vehicle_name: 'Mazda 3 2021',
      vehicle_type: 'Sedan',
      vehicle_brand: 'Mazda',
      vehicle_model: '3',
      brand: 'Mazda',
      model: '3',
      year: 2021,
      number_of_seats: 5,
      transmission: 'automatic',
      fuel_type: 'petrol',
      vehicle_plate_number: '75A-345678',
      vehicle_engine_number: 'ENGINE345678',
      vehicle_identification_number: 'VIN345678901',
      vehicle_hire_rate_in_figures: 1200000,
      vehicle_hire_rate_currency: 'VND',
      vehicle_hire_charge_per_timing: 'day',
      maximum_allowable_distance: '400km',
      status: 'available',
      added_by: showroom1._id,
      active: true,
    },
    // Showroom B vehicles
    {
      vehicle_name: 'Hyundai Elantra 2023',
      vehicle_type: 'Sedan',
      vehicle_brand: 'Hyundai',
      vehicle_model: 'Elantra',
      brand: 'Hyundai',
      model: 'Elantra',
      year: 2023,
      number_of_seats: 5,
      transmission: 'automatic',
      fuel_type: 'petrol',
      vehicle_plate_number: '75B-123456',
      vehicle_engine_number: 'ENGINE456789',
      vehicle_identification_number: 'VIN456789012',
      vehicle_hire_rate_in_figures: 1000000,
      vehicle_hire_rate_currency: 'VND',
      vehicle_hire_charge_per_timing: 'day',
      maximum_allowable_distance: '350km',
      status: 'available',
      added_by: showroom2._id,
      active: true,
    },
    {
      vehicle_name: 'Kia Sorento 2022',
      vehicle_type: 'SUV',
      vehicle_brand: 'Kia',
      vehicle_model: 'Sorento',
      brand: 'Kia',
      model: 'Sorento',
      year: 2022,
      number_of_seats: 7,
      transmission: 'automatic',
      fuel_type: 'diesel',
      vehicle_plate_number: '75B-234567',
      vehicle_engine_number: 'ENGINE567890',
      vehicle_identification_number: 'VIN567890123',
      vehicle_hire_rate_in_figures: 2000000,
      vehicle_hire_rate_currency: 'VND',
      vehicle_hire_charge_per_timing: 'day',
      maximum_allowable_distance: '700km',
      status: 'available',
      added_by: showroom2._id,
      active: true,
    },
  ];

  const savedVehicles = await Vehicle.insertMany(vehicles);
  console.log(`  ✓ Created ${savedVehicles.length} vehicles`);
  return savedVehicles;
};

const seedBookings = async (users, vehicles) => {
  console.log('\n📅 Seeding bookings...');

  const renter1 = users.find((u) => u.email === 'renter1@smartrent.com');
  const renter2 = users.find((u) => u.email === 'renter2@smartrent.com');
  const renter3 = users.find((u) => u.email === 'renter3@smartrent.com');
  const showroom1 = users.find((u) => u.email === 'showroom1@smartrent.com');
  const showroom2 = users.find((u) => u.email === 'showroom2@smartrent.com');

  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const bookings = [
    // Completed booking (ready for inspection)
    {
      user_id: renter1._id,
      showroom_id: showroom1._id,
      vehicle_id: vehicles[0]._id,
      start_date: yesterday,
      end_date: now,
      total_price: 1500000,
      status: 'completed',
      pickup_images: [
        'https://via.placeholder.com/400x300?text=Vehicle+Front',
        'https://via.placeholder.com/400x300?text=Vehicle+Back',
        'https://via.placeholder.com/400x300?text=Vehicle+Left',
      ],
    },
    // In-use booking
    {
      user_id: renter2._id,
      showroom_id: showroom1._id,
      vehicle_id: vehicles[1]._id,
      start_date: yesterday,
      end_date: nextWeek,
      total_price: 2700000,
      status: 'in_use',
      pickup_images: [
        'https://via.placeholder.com/400x300?text=Vehicle+Front',
        'https://via.placeholder.com/400x300?text=Vehicle+Back',
      ],
    },
    // Pending booking
    {
      user_id: renter3._id,
      showroom_id: showroom2._id,
      vehicle_id: vehicles[3]._id,
      start_date: tomorrow,
      end_date: nextWeek,
      total_price: 6000000,
      status: 'confirmed',
    },
    // Completed booking 2
    {
      user_id: renter1._id,
      showroom_id: showroom2._id,
      vehicle_id: vehicles[4]._id,
      start_date: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
      end_date: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
      total_price: 4000000,
      status: 'completed',
      pickup_images: [
        'https://via.placeholder.com/400x300?text=Kia+Front',
        'https://via.placeholder.com/400x300?text=Kia+Back',
      ],
    },
  ];

  const savedBookings = await Booking.insertMany(bookings);
  console.log(`  ✓ Created ${savedBookings.length} bookings`);
  return savedBookings;
};

const seedInspections = async (users, vehicles, bookings) => {
  console.log('\n🔍 Seeding vehicle inspections (Gallery-based)...');

  const showroom1 = users.find((u) => u.email === 'showroom1@smartrent.com');
  const showroom2 = users.find((u) => u.email === 'showroom2@smartrent.com');
  const renter1 = users.find((u) => u.email === 'renter1@smartrent.com');
  const renter2 = users.find((u) => u.email === 'renter2@smartrent.com');

  const completedBooking1 = bookings[0];
  const completedBooking2 = bookings[3];

  const inspections = [
    // Pickup inspection by Showroom
    {
      vehicle_id: vehicles[0]._id,
      booking_id: completedBooking1._id,
      showroom_id: showroom1._id,
      inspection_type: 'pickup',
      inspected_by_role: 'showroom',
      inspected_by_id: showroom1._id,
      vehicle_name: vehicles[0].vehicle_name,
      vehicle_plate: vehicles[0].vehicle_plate_number,
      inspected_by_name: showroom1.name,
      booking_code: 'BK' + completedBooking1._id.toString().slice(-6).toUpperCase(),
      pickup_images: completedBooking1.pickup_images,
      gallery_images: [],
      gallery_analyzed: 0,
      damage_detected: false,
      severity: 'none',
      observations: [],
      summary: 'Xe ở tình trạng tốt',
      conclusion: 'Sẵn sàng cho thuê',
      disclaimer: 'Đánh giá AI chỉ mang tính hỗ trợ, không thay thế cho kiểm tra thực tế, nghiệp vụ hoặc pháp lý.',
      comparison_mode: 'gallery',
      ai_payload: {
        damage_detected: false,
        severity: 'none',
        observations: [],
      },
    },
    // Return inspection by Renter
    {
      vehicle_id: vehicles[0]._id,
      booking_id: completedBooking1._id,
      showroom_id: showroom1._id,
      inspection_type: 'return',
      inspected_by_role: 'renter',
      inspected_by_id: renter1._id,
      vehicle_name: vehicles[0].vehicle_name,
      vehicle_plate: vehicles[0].vehicle_plate_number,
      inspected_by_name: renter1.name,
      booking_code: 'BK' + completedBooking1._id.toString().slice(-6).toUpperCase(),
      pickup_images: completedBooking1.pickup_images,
      gallery_images: [
        'https://via.placeholder.com/400x300?text=Return+Front',
        'https://via.placeholder.com/400x300?text=Return+Back',
        'https://via.placeholder.com/400x300?text=Return+Left',
      ],
      gallery_analyzed: 3,
      damage_detected: false,
      severity: 'none',
      observations: [
        {
          description: 'Xe sạch, không có vết xước',
          severity_level: 'none',
          likely_new_damage: false,
          confidence: 'high',
        },
      ],
      summary: 'AI không phát hiện hư hỏng mới',
      conclusion: 'Xe trả về trong tình trạng tốt',
      disclaimer: 'Đánh giá AI chỉ mang tính hỗ trợ, không thay thế cho kiểm tra thực tế, nghiệp vụ hoặc pháp lý.',
      comparison_mode: 'gallery',
      ai_payload: {
        damage_detected: false,
        severity: 'none',
        observations: [
          {
            description: 'Xe sạch, không có vết xước',
            severity_level: 'none',
            likely_new_damage: false,
            confidence: 'high',
          },
        ],
      },
    },
    // Pickup inspection for second vehicle
    {
      vehicle_id: vehicles[4]._id,
      booking_id: completedBooking2._id,
      showroom_id: showroom2._id,
      inspection_type: 'pickup',
      inspected_by_role: 'showroom',
      inspected_by_id: showroom2._id,
      vehicle_name: vehicles[4].vehicle_name,
      vehicle_plate: vehicles[4].vehicle_plate_number,
      inspected_by_name: showroom2.name,
      booking_code: 'BK' + completedBooking2._id.toString().slice(-6).toUpperCase(),
      pickup_images: completedBooking2.pickup_images,
      gallery_images: [],
      gallery_analyzed: 0,
      damage_detected: false,
      severity: 'none',
      observations: [],
      summary: 'Kiểm tra ban giao',
      conclusion: 'Sẵn sàng cho thuê',
      disclaimer: 'Đánh giá AI chỉ mang tính hỗ trợ, không thay thế cho kiểm tra thực tế, nghiệp vụ hoặc pháp lý.',
      comparison_mode: 'gallery',
      ai_payload: {},
    },
    // Return inspection with damage
    {
      vehicle_id: vehicles[4]._id,
      booking_id: completedBooking2._id,
      showroom_id: showroom2._id,
      inspection_type: 'return',
      inspected_by_role: 'renter',
      inspected_by_id: renter1._id,
      vehicle_name: vehicles[4].vehicle_name,
      vehicle_plate: vehicles[4].vehicle_plate_number,
      inspected_by_name: renter1.name,
      booking_code: 'BK' + completedBooking2._id.toString().slice(-6).toUpperCase(),
      pickup_images: completedBooking2.pickup_images,
      gallery_images: [
        'https://via.placeholder.com/400x300?text=Return+Left+Side',
        'https://via.placeholder.com/400x300?text=Return+Damage+Area',
        'https://via.placeholder.com/400x300?text=Return+Back',
      ],
      gallery_analyzed: 3,
      damage_detected: true,
      severity: 'minor',
      observations: [
        {
          description: 'Vết xước nhỏ ở cửa bên trái',
          severity_level: 'minor',
          likely_new_damage: true,
          confidence: 'high',
          area: 'Cửa trái',
        },
      ],
      summary: 'AI phát hiện hư hỏng nhỏ ở cửa bên trái',
      conclusion: 'Cần đối chứng trực tiếp để xác nhận mức độ thiệt hại',
      disclaimer: 'Đánh giá AI chỉ mang tính hỗ trợ, không thay thế cho kiểm tra thực tế, nghiệp vụ hoặc pháp lý.',
      comparison_mode: 'gallery',
      ai_payload: {
        damage_detected: true,
        severity: 'minor',
        observations: [
          {
            description: 'Vết xước nhỏ ở cửa bên trái',
            severity_level: 'minor',
            likely_new_damage: true,
            confidence: 'high',
            area: 'Cửa trái',
          },
        ],
      },
    },
  ];

  const savedInspections = await VehicleInspection.insertMany(inspections);
  console.log(`  ✓ Created ${savedInspections.length} inspections`);
  return savedInspections;
};

const seedReviews = async (users, vehicles) => {
  console.log('\n⭐ Seeding reviews...');

  const renter1 = users.find((u) => u.email === 'renter1@smartrent.com');
  const renter2 = users.find((u) => u.email === 'renter2@smartrent.com');

  const reviews = [
    {
      user: renter1._id,
      vehicle_id: vehicles[0]._id,
      rating: 5,
      comment: 'Xe tuyệt vời, rất sạch sẽ và an toàn',
    },
    {
      user: renter2._id,
      vehicle_id: vehicles[1]._id,
      rating: 4,
      comment: 'Xe tốt, chỉ là giá hơi cao',
    },
  ];

  const savedReviews = await Review.insertMany(reviews);
  console.log(`  ✓ Created ${savedReviews.length} reviews`);
  return savedReviews;
};

const seedFavorites = async (users, vehicles) => {
  console.log('\n❤️  Seeding favorites...');

  const renter1 = users.find((u) => u.email === 'renter1@smartrent.com');
  const renter2 = users.find((u) => u.email === 'renter2@smartrent.com');

  const favorites = [
    {
      user_id: renter1._id,
      vehicle_id: vehicles[0]._id,
    },
    {
      user_id: renter1._id,
      vehicle_id: vehicles[2]._id,
    },
    {
      user_id: renter2._id,
      vehicle_id: vehicles[1]._id,
    },
  ];

  const savedFavorites = await Favorite.insertMany(favorites);
  console.log(`  ✓ Created ${savedFavorites.length} favorites`);
  return savedFavorites;
};

const seedContactUs = async (users) => {
  console.log('\n💌 Seeding contact us messages...');

  const renter1 = users.find((u) => u.email === 'renter1@smartrent.com');

  const contactMessages = [
    {
      user: renter1._id,
      title: 'Câu hỏi về xe Toyota',
      body: 'Tôi muốn thuê xe Toyota Camry, có xe nào disponible không?',
      name: 'Nguyễn Văn A',
      email: 'renter1@smartrent.com',
    },
  ];

  const savedMessages = await ContactUs.insertMany(contactMessages);
  console.log(`  ✓ Created ${savedMessages.length} contact messages`);
  return savedMessages;
};

const seedUserLocations = async (users) => {
  console.log('\n📍 Seeding user locations...');

  const renter1 = users.find((u) => u.email === 'renter1@smartrent.com');
  const renter2 = users.find((u) => u.email === 'renter2@smartrent.com');

  const locations = [
    {
      user: renter1._id,
      address: '123 Nguyễn Huệ, Quận 1, TP.HCM',
      latitude: '10.7769',
      longitude: '106.7009',
      plus_code: '4V8G+9R TP.HCM',
    },
    {
      user: renter2._id,
      address: '456 Võ Văn Kiệt, Quận 5, TP.HCM',
      latitude: '10.7598',
      longitude: '106.6629',
      plus_code: '4V63+WW TP.HCM',
    },
  ];

  const savedLocations = await UserLocation.insertMany(locations);
  console.log(`  ✓ Created ${savedLocations.length} user locations`);
  return savedLocations;
};

const seedVehicleLocations = async (vehicles) => {
  console.log('\n🗺️  Seeding vehicle locations...');

  const locations = [
    {
      address: '789 Lê Lợi, Quận 1, TP.HCM',
      latitude: '10.7680',
      longitude: '106.7038',
      plus_code: '4V8G+2X TP.HCM',
      vehicle: vehicles[0]._id,
    },
    {
      address: '321 Pasteur, Quận 1, TP.HCM',
      latitude: '10.7755',
      longitude: '106.7010',
      plus_code: '4V8G+9P TP.HCM',
      vehicle: vehicles[1]._id,
    },
    {
      address: '555 Trần Hưng Đạo, Quận 1, TP.HCM',
      latitude: '10.7675',
      longitude: '106.6915',
      plus_code: '4V8F+58 TP.HCM',
      vehicle: vehicles[2]._id,
    },
  ];

  const savedLocations = await VehicleLocation.insertMany(locations);
  console.log(`  ✓ Created ${savedLocations.length} vehicle locations`);
  return savedLocations;
};

const seedPayments = async (bookings, users) => {
  console.log('\n💳 Seeding payments...');

  const renter1 = users.find((u) => u.email === 'renter1@smartrent.com');

  const payments = [
    {
      booking_id: bookings[0]._id,
      amount: 1500000,
      currency: 'vnd',
      payment_method: 'stripe',
      payment_status: 'successful',
      paid_by: renter1._id,
      transaction_code: 'TXN20260515001',
      paid_at: new Date(),
    },
    {
      booking_id: bookings[1]._id,
      amount: 2700000,
      currency: 'vnd',
      payment_method: 'stripe',
      payment_status: 'successful',
      paid_by: renter1._id,
      transaction_code: 'TXN20260515002',
      paid_at: new Date(),
    },
  ];

  const savedPayments = await Payment.insertMany(payments);
  console.log(`  ✓ Created ${savedPayments.length} payments`);
  return savedPayments;
};

const seedWithdrawals = async (users) => {
  console.log('\n💰 Seeding withdrawals...');

  const showroom1 = users.find((u) => u.email === 'showroom1@smartrent.com');

  const withdrawals = [
    {
      showroom_id: showroom1._id,
      amount: 5000000,
      bank_name: 'Ngân hàng Vietcombank',
      bank_account: '1234567890',
      bank_holder: 'Showroom A',
      note: 'Rút tiền hoa hồng tháng 5/2026',
      status: 'pending',
    },
  ];

  const savedWithdrawals = await Withdrawal.insertMany(withdrawals);
  console.log(`  ✓ Created ${savedWithdrawals.length} withdrawals`);
  return savedWithdrawals;
};

const seedRentalContracts = async (users, vehicles, bookings) => {
  console.log('\n📄 Seeding rental contracts...');

  const showroom1 = users.find((u) => u.email === 'showroom1@smartrent.com');
  const renter1 = users.find((u) => u.email === 'renter1@smartrent.com');

  const rentalStart = new Date(new Date().getTime() - 24 * 60 * 60 * 1000);
  const rentalEnd = new Date();
  const durationDays = 1;
  const dailyRate = 1500000;

  const contracts = [
    {
      booking_id: bookings[0]._id,
      renter_user_id: renter1._id,
      showroom_user_id: showroom1._id,
      vehicle_id: vehicles[0]._id,
      contract_number: 'CT20260515001',
      party_a_name: showroom1.name,
      party_a_email: showroom1.email,
      party_a_phone: showroom1.phone,
      party_a_address: showroom1.address,
      party_b_name: renter1.name,
      party_b_email: renter1.email,
      party_b_phone: renter1.phone,
      party_b_address: renter1.address,
      party_b_license_number: renter1.driver_license_number,
      vehicle_name: vehicles[0].vehicle_name,
      vehicle_plate: vehicles[0].vehicle_plate_number,
      vehicle_type: vehicles[0].vehicle_type,
      vehicle_brand: vehicles[0].brand,
      vehicle_model: vehicles[0].model,
      vehicle_year: vehicles[0].year,
      start_date: rentalStart,
      end_date: rentalEnd,
      duration_days: durationDays,
      daily_rate: dailyRate,
      total_price: dailyRate * durationDays,
      payment_method: 'Stripe',
      status: 'signed',
    },
  ];

  const savedContracts = await RentalContractRecord.insertMany(contracts);
  console.log(`  ✓ Created ${savedContracts.length} rental contracts`);
  return savedContracts;
};

const main = async () => {
  try {
    await connectDB();

    // Clear all collections
    await clearAllCollections();

    // Seed in order
    const users = await seedUsers();
    const vehicles = await seedVehicles(users);
    const bookings = await seedBookings(users, vehicles);
    const inspections = await seedInspections(users, vehicles, bookings);
    const reviews = await seedReviews(users, vehicles);
    const favorites = await seedFavorites(users, vehicles);
    const contacts = await seedContactUs(users);
    const userLocations = await seedUserLocations(users);
    const vehicleLocations = await seedVehicleLocations(vehicles);
    const payments = await seedPayments(bookings, users);
    const contracts = await seedRentalContracts(users, vehicles, bookings);
    const withdrawals = await seedWithdrawals(users);

    console.log('\n✅ Database seeding completed successfully!');
    console.log('\n📋 Summary:');
    console.log(`   Users: ${users.length}`);
    console.log(`   Vehicles: ${vehicles.length}`);
    console.log(`   Bookings: ${bookings.length}`);
    console.log(`   Inspections: ${inspections.length}`);
    console.log(`   Reviews: ${reviews.length}`);
    console.log(`   Favorites: ${favorites.length}`);
    console.log(`   Contact Messages: ${contacts.length}`);
    console.log(`   User Locations: ${userLocations.length}`);
    console.log(`   Vehicle Locations: ${vehicleLocations.length}`);
    console.log(`   Payments: ${payments.length}`);
    console.log(`   Rental Contracts: ${contracts.length}`);
    console.log(`   Withdrawals: ${withdrawals.length}`);

    console.log('\n🔑 Test Credentials:');
    console.log('   Showroom 1: showroom1@smartrent.com / password123');
    console.log('   Showroom 2: showroom2@smartrent.com / password123');
    console.log('   Renter 1: renter1@smartrent.com / password123');
    console.log('   Renter 2: renter2@smartrent.com / password123');
    console.log('   Renter 3: renter3@smartrent.com / password123');
    console.log('   Admin: admin@smartrent.com / password123');

    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error.message);
    console.error(error);
    process.exit(1);
  }
};

main();
