const AuditLog = require("../models/auditLog.model");

class AuditLogService {
  async record(payload = {}) {
    try {
      return await AuditLog.create(payload);
    } catch (error) {
      // Do not break core business flow if audit logging fails.
      console.error("[audit] failed:", error?.message || error);
      return null;
    }
  }
}

module.exports = new AuditLogService();
