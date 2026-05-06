const mongoose = require("mongoose");

const auditLogSchema = new mongoose.Schema(
  {
    actor_id: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    actor_role: { type: String },
    action: { type: String, required: true },
    entity: { type: String, required: true },
    entity_id: { type: mongoose.Schema.Types.ObjectId, required: true },
    before: { type: mongoose.Schema.Types.Mixed, default: null },
    after: { type: mongoose.Schema.Types.Mixed, default: null },
    metadata: { type: mongoose.Schema.Types.Mixed, default: null },
  },
  { timestamps: true }
);

auditLogSchema.index({ entity: 1, entity_id: 1, createdAt: -1 });
auditLogSchema.index({ actor_id: 1, createdAt: -1 });

module.exports = mongoose.model("AuditLog", auditLogSchema);
