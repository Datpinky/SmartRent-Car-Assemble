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
        showroom_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        added_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        active: { type: Boolean, default: true },

        ownership_type: {
            type: String,
            enum: ['showroom_owned', 'consigned'],
            default: 'showroom_owned'
        },
        source: {
            type: String,
            enum: ['showroom_owned', 'consigned'],
            default: 'showroom_owned'
        },
        consignor: {
            name: { type: String },
            phone: { type: String },
            id_doc: { type: String }
        },
        consignor_name: { type: String }, // legacy compatibility
        consignor_phone: { type: String }, // legacy compatibility
        revenue_share_rule: {
            platform_fee_percent: { type: Number, min: 0, max: 100, default: 10 },
            showroom_share_percent: { type: Number, min: 0, max: 100, default: 90 },
            consignor_share_percent: { type: Number, min: 0, max: 100, default: 0 }
        },
        commission_rate: { type: Number, min: 0, max: 100 }, // legacy compatibility
        consignment_status: {
            type: String,
            enum: ['pending', 'active', 'suspended', 'ended'],
            default: 'pending'
        },
    },
    { timestamps: true }
);

vehicleSchema.index({ vehicle_plate_number: 1 }, { unique: true, sparse: true });
vehicleSchema.index({ showroom_id: 1, status: 1, createdAt: -1 });

module.exports = mongoose.model('Vehicle', vehicleSchema);
