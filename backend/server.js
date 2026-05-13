const dotenv = require('dotenv');

dotenv.config(); // load .env
const app = require('./src/app');
const connectDB = require('./src/config/db');
const { startBookingExpiryJob } = require('./src/jobs/bookingExpiry.job');
const PORT = process.env.PORT || 3000;

connectDB().then(() => {
  startBookingExpiryJob();
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
