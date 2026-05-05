const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
    {
        booking_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true },
        amount: { type: Number, required: true },
        currency: { type: String, default: 'vnd' },
        payment_method: {
            type: String,
            required: true,
            enum: ['stripe', 'Debit/Credit Card', 'Paypal', 'Bank Transfer', 'Cash', 'Bitcoin', 'Ethereum'],
            default: 'stripe'
        },
        payment_status: {
            type: String,
            required: true,
            enum: ['pending', 'declined', 'successful', 'failed'],
            default: 'pending'
        },
        stripe_payment_intent_id: { type: String, trim: true },
        transaction_code: { type: String, trim: true },
        paid_at: { type: Date },
        paid_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    },
    { timestamps: true }
);

module.exports = mongoose.model('Payment', paymentSchema);
