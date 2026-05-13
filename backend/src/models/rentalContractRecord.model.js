const mongoose = require('mongoose');

/**
 * Hợp đồng thuê xe — lưu trữ bất biến (immutable snapshot).
 * KHÔNG dùng ref để tránh dữ liệu thay đổi theo thời gian.
 * Mọi thông tin (tên, xe, giá…) được snapshot tại thời điểm ký.
 */
const rentalContractRecordSchema = new mongoose.Schema(
  {
    // ─── Tracking refs (chỉ để tra cứu/liên kết, không dùng populate) ───────
    booking_id: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    renter_user_id: { type: mongoose.Schema.Types.ObjectId, required: true },
    showroom_user_id: { type: mongoose.Schema.Types.ObjectId, required: true },
    vehicle_id: { type: mongoose.Schema.Types.ObjectId, required: true },

    // ─── Số hợp đồng ──────────────────────────────────────────────────────────
    contract_number: { type: String, required: true, unique: true },

    // ─── Snapshot Bên A (showroom / cho thuê) ──────────────────────────────
    party_a_name: { type: String, required: true },
    party_a_email: { type: String, default: '' },
    party_a_phone: { type: String, default: '' },
    party_a_address: { type: String, default: '' },
    party_a_tax_code: { type: String, default: '' },
    party_a_representative: { type: String, default: '' }, // tên người đại diện nếu là công ty

    // ─── Snapshot Bên B (renter / người thuê) ─────────────────────────────
    party_b_name: { type: String, required: true },
    party_b_email: { type: String, default: '' },
    party_b_phone: { type: String, default: '' },
    party_b_address: { type: String, default: '' },
    party_b_license_number: { type: String, default: '' }, // số GPLX
    party_b_license_class: { type: String, default: '' },

    // ─── Snapshot thông tin xe ────────────────────────────────────────────
    vehicle_name: { type: String, required: true },
    vehicle_plate: { type: String, default: '' },
    vehicle_type: { type: String, default: '' },
    vehicle_brand: { type: String, default: '' },
    vehicle_model: { type: String, default: '' },
    vehicle_seats: { type: Number, default: 0 },
    vehicle_engine_number: { type: String, default: '' },
    vehicle_frame_number: { type: String, default: '' },
    vehicle_fuel_type: { type: String, default: '' },
    vehicle_year: { type: Number, default: 0 },

    // ─── Snapshot điều khoản thuê ────────────────────────────────────────
    start_date: { type: Date, required: true },
    end_date: { type: Date, required: true },
    duration_days: { type: Number, required: true },
    daily_rate: { type: Number, required: true }, // VND/ngày
    service_fee: { type: Number, default: 0 },
    total_price: { type: Number, required: true },
    payment_method: { type: String, default: 'Stripe' },
    signed_at: { type: Date, default: null }, // thời điểm ký kết

    // ─── Chữ ký ──────────────────────────────────────────────────────────
    /** base64 PNG — chữ ký của Bên B (renter) vẽ sau khi thanh toán */
    renter_signature: { type: String, default: null },
    renter_signed_at: { type: Date, default: null },

    /** base64 PNG — chữ ký của Bên A (showroom) lưu từ bước onboarding */
    showroom_signature: { type: String, default: null },

    // ─── File PDF ────────────────────────────────────────────────────────
    pdf_url: { type: String, default: null },

    // ─── Trạng thái ──────────────────────────────────────────────────────
    status: {
      type: String,
      enum: ['pending_signature', 'signed', 'voided'],
      default: 'pending_signature',
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model('RentalContractRecord', rentalContractRecordSchema);
