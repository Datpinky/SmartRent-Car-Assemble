const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema(
    {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        vehicle_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle', required: true },
        booking_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', default: null, index: true },
        rating: { type: Number, required: true, min: 1, max: 5 },
        comment: { type: String, default: '' }
    },
    { timestamps: true }
);

reviewSchema.index(
    { booking_id: 1, user: 1 },
    { unique: true, partialFilterExpression: { booking_id: { $type: 'objectId' } } }
);

module.exports = mongoose.model('Review', reviewSchema);
