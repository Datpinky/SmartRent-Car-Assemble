const mongoose = require('mongoose');

const vehicleSchema = new mongoose.Schema(
    {
        vehicle_name: { type: String, trim: true },
        vehicle_type: {
            type: String,
            required: true,
            enum: ['Sedan', 'Bike', 'Bicycle', 'SUV', 'Wagon', 'Truck', 'others'],
            default: 'Sedan'
        },
        brand: { type: String },
        model: { type: String },
        year: { type: Number },
        number_of_seats: { type: Number },
        transmission: { type: String, enum: ['manual', 'automatic', 'semi-auto'], default: 'manual' },
        fuel_type: { type: String, enum: ['petrol', 'diesel', 'electric', 'hybrid', 'others'], default: 'petrol' },
        description: { type: String, default: '' },

        vehicle_brand: { type: String },
        vehicle_model: { type: String },
        vehicle_engine_number: { type: String },
        vehicle_identification_number: { type: String },
        vehicle_plate_number: { type: String },
        vehicle_images_paths: { type: [String], default: [] },
        images: { type: [String], default: [] },
        vehicle_hire_rate_in_figures: { type: Number },
        vehicle_hire_rate_currency: {
            type: String,
            required: true,
            enum: ['VND', 'USD'],
            default: 'VND'
        },
        vehicle_hire_charge_per_timing: {
            type: String,
            required: true,
            enum: ['minutes', 'seconds', 'hourly', 'day', 'negotiable'],
            default: 'day'
        },
        maximum_allowable_distance: String,
        status: {
            type: String,
            required: true,
            enum: ['available', 'waiting_handover', 'rented', 'maintenance', 'reserved'],
            default: 'available'
        },
        verified: { type: Date },
        company_owned: { type: Boolean, default: false },
        added_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        active: { type: Boolean, default: true }
    },
    { timestamps: true }
);


module.exports = mongoose.model('Vehicle', vehicleSchema);
