const mongoose = require('mongoose');

const AIInspectionSchema = new mongoose.Schema({
    booking_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Booking',
        required: true,
        unique: true
    },
    // Danh sách đường dẫn ảnh trước khi thuê
    before_images_paths: {
        type: [String],
        default: []
    },
    // Danh sách đường dẫn ảnh sau khi trả
    after_images_paths: {
        type: [String],
        default: []
    },
    ai_results: {
        has_damage: { type: Boolean, default: false },
        details: { type: String }
    }
}, { timestamps: true });

module.exports = mongoose.model('AIInspection', AIInspectionSchema);