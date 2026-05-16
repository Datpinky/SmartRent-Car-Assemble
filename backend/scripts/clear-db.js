/**
 * clear-db.js — Xóa sạch toàn bộ dữ liệu trong DB (giữ lại users nếu muốn)
 *
 * Cách dùng:
 *   node backend/scripts/clear-db.js            # xóa mọi thứ kể cả users
 *   node backend/scripts/clear-db.js --keep-users  # giữ lại users, xóa phần còn lại
 *   node backend/scripts/clear-db.js --dry-run   # chỉ xem sẽ xóa gì, không xóa thật
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const readline = require('readline');

const MONGO_URI = process.env.MONGO_URI || process.env.DB_URI || process.env.MONGODB_URI;

if (!MONGO_URI) {
  console.error('❌  Không tìm thấy MONGO_URI trong .env');
  process.exit(1);
}

const args = process.argv.slice(2);
const KEEP_USERS = args.includes('--keep-users');
const DRY_RUN = args.includes('--dry-run');

// Thứ tự xóa: collection phụ trước, collection chính sau
const COLLECTIONS_TO_CLEAR = [
  { name: 'bookings', label: 'Bookings' },
  { name: 'payments', label: 'Payments' },
  { name: 'reviews', label: 'Reviews' },
  { name: 'favorites', label: 'Favorites' },
  { name: 'withdrawals', label: 'Withdrawals' },
  { name: 'rentalcontractrecords', label: 'Rental Contract Records' },
  { name: 'contactus', label: 'Contact Us messages' },
  { name: 'userlocations', label: 'User Locations' },
  { name: 'vehiclelocations', label: 'Vehicle Locations' },
  { name: 'vehicles', label: 'Vehicles' },
  { name: 'vehicleinspections', label: 'Vehicle Inspections' },
];

const USER_COLLECTION = { name: 'users', label: 'Users' };

async function confirm(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim().toLowerCase());
    });
  });
}

async function run() {
  await mongoose.connect(MONGO_URI);
  console.log('✅  Connected to MongoDB:', MONGO_URI.replace(/:\/\/[^@]+@/, '://***@'));

  const db = mongoose.connection.db;
  const existingCols = new Set((await db.listCollections().toArray()).map((c) => c.name));

  const targets = [...COLLECTIONS_TO_CLEAR, ...(KEEP_USERS ? [] : [USER_COLLECTION])];

  console.log('\n📋  Sẽ xóa các collection sau:');
  const toDelete = [];
  for (const col of targets) {
    const exists = existingCols.has(col.name);
    const marker = exists ? '🗑 ' : '⬜ (không tồn tại)';
    console.log(`  ${marker}  ${col.label.padEnd(32)} [${col.name}]`);
    if (exists) toDelete.push(col);
  }

  if (KEEP_USERS) {
    console.log(`\n  🔒  Users — GIỮ LẠI (--keep-users)`);
  }

  if (DRY_RUN) {
    console.log('\n⚠️   DRY RUN — không xóa gì cả. Bỏ --dry-run để chạy thật.\n');
    await mongoose.disconnect();
    return;
  }

  if (toDelete.length === 0) {
    console.log('\n✅  DB đã sạch, không có gì để xóa.\n');
    await mongoose.disconnect();
    return;
  }

  const answer = await confirm(
    `\n⚠️   Xóa ${toDelete.length} collection${KEEP_USERS ? ' (giữ users)' : ' + users'}?\n` +
      `    Nhập "yes" để xác nhận: `,
  );

  if (answer !== 'yes') {
    console.log('🚫  Đã hủy.\n');
    await mongoose.disconnect();
    return;
  }

  console.log('\n🗑   Đang xóa...');
  const results = [];
  for (const col of toDelete) {
    try {
      const result = await db.collection(col.name).deleteMany({});
      results.push({ label: col.label, count: result.deletedCount, ok: true });
      console.log(`  ✅  ${col.label.padEnd(32)} — xóa ${result.deletedCount} document(s)`);
    } catch (err) {
      results.push({ label: col.label, count: 0, ok: false, err: err.message });
      console.error(`  ❌  ${col.label.padEnd(32)} — lỗi: ${err.message}`);
    }
  }

  const totalDeleted = results.reduce((sum, r) => sum + r.count, 0);
  const failed = results.filter((r) => !r.ok);

  console.log(`\n✅  Hoàn thành. Đã xóa tổng cộng ${totalDeleted} document(s).`);
  if (failed.length > 0) {
    console.warn(`⚠️   ${failed.length} collection lỗi: ${failed.map((r) => r.label).join(', ')}`);
  }
  console.log('');

  await mongoose.disconnect();
}

run().catch((err) => {
  console.error('❌  Script lỗi:', err.message);
  process.exit(1);
});
