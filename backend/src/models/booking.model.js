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
                'waiting_handover',
                'handed_over',
                'in_use',
                'waiting_return_confirmation'
            ],
            default: 'pending'
        },
        note: { type: String, default: '' }
    },
    { timestamps: true }
);

module.exports = mongoose.model('Booking', bookingSchema);
