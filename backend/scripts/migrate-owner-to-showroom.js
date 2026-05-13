/**
 * Migration: owner → showroom
 *
 * Converts all users with role='owner' to role='showroom'.
 * Run once:  node backend/scripts/migrate-owner-to-showroom.js
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGO_URI || process.env.DB_URI || process.env.MONGODB_URI;

if (!MONGO_URI) {
  console.error('No MongoDB URI found. Set MONGO_URI in .env');
  process.exit(1);
}

async function run() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB');

  const result = await mongoose.connection
    .collection('users')
    .updateMany({ role: 'owner' }, { $set: { role: 'showroom' } });

  console.log(`Migrated ${result.modifiedCount} user(s) from role='owner' → role='showroom'`);
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
