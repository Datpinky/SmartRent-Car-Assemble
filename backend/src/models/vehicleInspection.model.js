const mongoose = require('mongoose');
const { Schema } = mongoose;

const positionResultSchema = new Schema(
  {
    position: { type: String }, // label từ AI, e.g. "Đầu xe"
    damage_detected: { type: Boolean, default: false },
    severity: {
      type: String,
      enum: ['none', 'minor', 'moderate', 'severe'],
      default: 'none',
    },
    differences: { type: Schema.Types.Mixed, default: [] },
    notes: { type: String, default: '' },
  },
  { _id: false },
);

const positionImageSchema = new Schema(
  {
    position_key: { type: String }, // 'front', 'rear', 'left', 'right', 'interior', 'odometer'
    position_label: { type: String }, // 'Đầu xe', ...
    before_url: { type: String, default: '' },
    after_url: { type: String, default: '' },
  },
  { _id: false },
);

const vehicleInspectionSchema = new Schema(
  {
    // ── Trace ──────────────────────────────────────────────────────────────
    vehicle_id: { type: Schema.Types.ObjectId, ref: 'Vehicle', required: true, index: true },
    booking_id: { type: Schema.Types.ObjectId, ref: 'Booking', default: null, index: true },
    showroom_id: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },

    // Denormalised for fast display without populates
    vehicle_name: { type: String, default: '' },
    vehicle_plate: { type: String, default: '' },
    inspected_by_name: { type: String, default: '' },
    booking_code: { type: String, default: '' }, // e.g. BK7855DA

    // ── Images per position ───────────────────────────────────────────────
    positions: { type: [positionImageSchema], default: [] },
    positions_analyzed: { type: Number, default: 0 }, // positions where both images existed

    // ── AI result ─────────────────────────────────────────────────────────
    ai_payload: { type: Schema.Types.Mixed, default: {} },
    damage_detected: { type: Boolean, default: false },
    severity: {
      type: String,
      enum: ['none', 'minor', 'moderate', 'severe'],
      default: 'none',
    },
    // Per-position breakdown stored from AI response
    position_results: { type: [positionResultSchema], default: [] },
  },
  { timestamps: true },
);

module.exports = mongoose.model('VehicleInspection', vehicleInspectionSchema);
