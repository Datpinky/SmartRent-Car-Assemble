const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema(
    {
        user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        showroom_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        vehicle_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle', required: true },
        start_date: { type: Date, required: true },
        end_date: { type: Date, required: true },
        total_price: { type: Number, required: true },
        status: {
            type: String,
            required: true,
            enum: [
                'pending',
                'confirmed',
                'cancelled',
                'completed',
                'waiting_payment',
                'paid',
                'payment_failed',
                'waiting_handover',
                'handed_over',
                'in_use',
                'waiting_return_confirmation'
            ],
            default: 'pending'
        },
        pricing_snapshot: {
            platform_fee: { type: Number, default: 0 },
            showroom_share: { type: Number, default: 0 },
            consignor_share: { type: Number, default: 0 },
            currency: { type: String, default: 'VND' },
            pricing_snapshot_at: { type: Date }
        },
        inspection: {
            handover_images: { type: [String], default: [] },
            return_images: { type: [String], default: [] },
            ai_report: { type: mongoose.Schema.Types.Mixed, default: null },
            report_generated_at: { type: Date }
        },
        note: { type: String, default: '' }
    },
    { timestamps: true }
);

bookingSchema.index({ showroom_id: 1, status: 1, createdAt: -1 });
bookingSchema.index({ user_id: 1, createdAt: -1 });

module.exports = mongoose.model('Booking', bookingSchema);
