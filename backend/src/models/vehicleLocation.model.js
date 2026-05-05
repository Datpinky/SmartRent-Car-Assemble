const mongoose = require('mongoose');

const vehicleLocationSchema = new mongoose.Schema(
    {
        address: String,
        latitude: String,
        longitude: String,
        plus_code: String,
        vehicle: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle', required: true },
    },
    { timestamps: true }
);

module.exports = mongoose.model('VehicleLocation', vehicleLocationSchema);
