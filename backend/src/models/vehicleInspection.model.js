const mongoose = require('mongoose');
const { Schema } = mongoose;

const regionSchema = new Schema(
  {
    image_group: { type: String, enum: ['before', 'after'], required: true },
    image_index: { type: Number, required: true, min: 0 },
    x: { type: Number, default: 0 },
    y: { type: Number, default: 0 },
    width: { type: Number, default: 0 },
    height: { type: Number, default: 0 },
  },
  { _id: false },
);

const observationSchema = new Schema(
  {
    area: { type: String, default: '' },
    description: { type: String, default: '' },
    evidence: { type: String, default: '' },
    likely_new_damage: { type: Boolean, default: false },
    severity_level: {
      type: String,
      enum: ['none', 'minor', 'moderate', 'severe'],
      default: 'none',
    },
    confidence: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'low',
    },
    needs_manual_review: { type: Boolean, default: false },
    regions: { type: [regionSchema], default: [] },
  },
  { _id: false },
);

const analysisRunSchema = new Schema(
  {
    run_by: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    run_at: { type: Date, default: Date.now },
    status: { type: String, enum: ['completed', 'failed'], required: true },
    ai_payload: { type: Schema.Types.Mixed, default: {} },
    damage_detected: { type: Boolean, default: false },
    severity: {
      type: String,
      enum: ['none', 'minor', 'moderate', 'severe'],
      default: 'none',
    },
    observations: { type: [observationSchema], default: [] },
    summary: { type: String, default: '' },
    conclusion: { type: String, default: '' },
    error_message: { type: String, default: '' },
  },
  { _id: true },
);

const vehicleInspectionSchema = new Schema(
  {
    vehicle_id: { type: Schema.Types.ObjectId, ref: 'Vehicle', required: true, index: true },
    booking_id: { type: Schema.Types.ObjectId, ref: 'Booking', default: null, index: true },
    showroom_id: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    inspection_type: { type: String, enum: ['pickup', 'return'], default: 'return' },
    inspected_by_role: { type: String, enum: ['showroom', 'renter'], default: 'showroom' },
    inspected_by_id: { type: Schema.Types.ObjectId, ref: 'User', default: null },

    vehicle_name: { type: String, default: '' },
    vehicle_plate: { type: String, default: '' },
    inspected_by_name: { type: String, default: '' },
    booking_code: { type: String, default: '' },

    // Free-form pickup and return galleries for the new inspection flow.
    pickup_images: { type: [String], default: [] },
    return_images: { type: [String], default: [] },
    gallery_images: { type: [String], default: [] },
    gallery_analyzed: { type: Number, default: 0 },

    ai_status: {
      type: String,
      enum: ['not_run', 'processing', 'completed', 'failed'],
      default: 'not_run',
    },
    published_to_renter: { type: Boolean, default: false },
    confirmed_by: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    confirmed_at: { type: Date, default: null },
    analysis_runs: { type: [analysisRunSchema], default: [] },

    ai_payload: { type: Schema.Types.Mixed, default: {} },
    damage_detected: { type: Boolean, default: false },
    severity: {
      type: String,
      enum: ['none', 'minor', 'moderate', 'severe'],
      default: 'none',
    },
    observations: { type: [observationSchema], default: [] },
    summary: { type: String, default: '' },
    conclusion: { type: String, default: '' },
    disclaimer: { type: String, default: '' },
    comparison_mode: {
      type: String,
      enum: ['gallery', 'current_only'],
      default: 'gallery',
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model('VehicleInspection', vehicleInspectionSchema);
