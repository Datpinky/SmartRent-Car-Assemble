const mongoose = require('mongoose');

/**
 * WithdrawalRequest — Yêu cầu rút tiền của showroom
 *
 * Bảo mật:
 *  - showroom_id readonly sau khi tạo (không được phép sửa)
 *  - amount phải > 0 và không vượt số dư khả dụng (kiểm tra ở service)
 *  - Chỉ admin mới có thể approve/reject
 *  - Mỗi request phải có thông tin ngân hàng đầy đủ (validate ở service)
 *  - admin_id ghi lại ai đã duyệt/từ chối
 */
const withdrawalSchema = new mongoose.Schema(
  {
    showroom_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      immutable: true, // không cho sửa sau khi tạo
    },

    amount: {
      type: Number,
      required: true,
      min: [10000, 'Số tiền rút tối thiểu là 10.000 VNĐ'],
    },

    // Thông tin ngân hàng snapshot tại thời điểm tạo request
    bank_name: { type: String, required: true, trim: true },
    bank_account: { type: String, required: true, trim: true },
    bank_holder: { type: String, required: true, trim: true },

    // Ghi chú của showroom
    note: { type: String, trim: true, default: '' },

    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },

    // Admin xử lý
    admin_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    admin_note: { type: String, trim: true, default: '' },
    receipt_image: { type: String, trim: true, default: '' },
    processed_at: { type: Date, default: null },
  },
  { timestamps: true },
);

// Index để query nhanh theo showroom và status
withdrawalSchema.index({ showroom_id: 1, status: 1 });
withdrawalSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('WithdrawalRequest', withdrawalSchema);
