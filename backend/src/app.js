const express = require('express');
var morgan = require('morgan');
var cors = require('cors');
// import routes
const authRoutes = require('./routes/auth.route');
const uploadRoutes = require('./routes/upload.route');
const vehicleRoutes = require('./routes/vehicle.route')
const vehicleLocationRoutes = require('./routes/vehicleLocation.routes')
const contactUsRoutes = require('./routes/contactUs.route')
const bookingRoutes = require('./routes/booking.route')
const paymentRoutes = require('./routes/payment.route')
const mapRoutes = require('./routes/map.route')

const userLocationRoutes = require('./routes/userLocation.route');
const reviewRoutes = require('./routes/review.route');
const favoriteRoutes = require('./routes/favorite.route');
const rentalContractRoutes = require('./routes/rentalContract.route');
// middleware for hand
const errorHandler = require('./middlewares/errorHandler');
const app = express();


//// Stop forwarding events
// events.close()

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(express.static("src/public"));

const profileRoutes = require('./routes/profile.route')
require('dotenv').config();

app.use(morgan('dev'));
app.use(
    cors({
        origin: 'http://localhost:5000', // đổi theo frontend của bạn
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
        credentials: true, // nếu dùng cookie / auth
    })
);
app.use('/api/uploads', uploadRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/vehicles', vehicleRoutes);
app.use('/api/vehicle_location', vehicleLocationRoutes);
app.use('/api/user_location', userLocationRoutes);
app.use('/api/contact_us', contactUsRoutes);
app.use('/api/booking/', bookingRoutes)
app.use('/api/payment/', paymentRoutes)
app.use('/api/map', mapRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/favorites', favoriteRoutes);
app.use('/api/rental-contract', rentalContractRoutes);
app.use(errorHandler);



module.exports = app;
