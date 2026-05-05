const mongoose = require('mongoose');

const favoriteSchema = new mongoose.Schema(
    {
        user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        vehicle_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle', required: true }
    },
    { timestamps: true }
);

favoriteSchema.index({ user_id: 1, vehicle_id: 1 }, { unique: true });

module.exports = mongoose.model('Favorite', favoriteSchema);
