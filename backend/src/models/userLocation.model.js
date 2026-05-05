const mongoose = require('mongoose');

const userLocationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', // tham chiếu tới bảng User
    required: true
  },
  address: {
    type: String,
    required: true, // địa chỉ text
    trim: true
  },
  latitude: {
    type: String,
    required: true
  },
  longitude: {
    type: String,
    required: true
  },
  // plus_code tạm thời có thể bỏ, hoặc để optional
  plus_code: {
    type: String,
    default: null
  },

}, {
  timestamps: true // tự động thêm createdAt, updatedAt
});

module.exports = mongoose.model('UserLocation', userLocationSchema);