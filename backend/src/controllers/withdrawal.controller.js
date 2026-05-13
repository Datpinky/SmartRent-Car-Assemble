const mongoose = require('mongoose');
const withdrawalService = require('../services/withdrawal.service');

const MAX_LIMIT = 100; // tránh query quá lớn

/** Kiểm tra ObjectId hợp lệ, trả về 400 nếu không hợp lệ */
const validateObjectId = (res, id, label = 'ID') => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    res.status(400).json({ message: `${label} không hợp lệ` });
    return false;
  }
  return true;
};

class WithdrawalController {
  /** GET /api/withdrawals/my/balance — Showroom xem số dư khả dụng */
  async getBalance(req, res, next) {
    try {
      const balance = await withdrawalService.getBalance(req.user.userId);
      res.status(200).json({ message: 'Số dư khả dụng', data: balance });
    } catch (err) {
      next(err);
    }
  }

  /** POST /api/withdrawals — Showroom tạo yêu cầu rút tiền */
  async createRequest(req, res, next) {
    try {
      const { amount, bank_name, bank_account, bank_holder, note } = req.body;
      const request = await withdrawalService.createRequest(req.user.userId, {
        amount,
        bank_name,
        bank_account,
        bank_holder,
        note,
      });
      res.status(201).json({ message: 'Tạo yêu cầu rút tiền thành công', data: request });
    } catch (err) {
      next(err);
    }
  }

  /** GET /api/withdrawals/my — Showroom xem lịch sử yêu cầu của mình */
  async listMy(req, res, next) {
    try {
      const page = Math.max(1, Number(req.query.page) || 1);
      const limit = Math.min(MAX_LIMIT, Math.max(1, Number(req.query.limit) || 10));
      const result = await withdrawalService.listByShowroom(req.user.userId, { page, limit });
      res.status(200).json({ message: 'Danh sách yêu cầu rút tiền', ...result });
    } catch (err) {
      next(err);
    }
  }

  /** GET /api/withdrawals/admin — Admin xem tất cả yêu cầu */
  async listAll(req, res, next) {
    try {
      const page = Math.max(1, Number(req.query.page) || 1);
      const limit = Math.min(MAX_LIMIT, Math.max(1, Number(req.query.limit) || 20));
      const { status } = req.query;
      const VALID_STATUSES = ['pending', 'approved', 'rejected'];
      const result = await withdrawalService.listAll({
        page,
        limit,
        status: VALID_STATUSES.includes(status) ? status : undefined,
      });
      res.status(200).json({ message: 'Tất cả yêu cầu rút tiền', ...result });
    } catch (err) {
      next(err);
    }
  }

  /** PUT /api/withdrawals/:id/approve — Admin duyệt */
  async approve(req, res, next) {
    try {
      if (!validateObjectId(res, req.params.id, 'ID yêu cầu')) return;
      const { admin_note, receipt_image } = req.body;
      const request = await withdrawalService.approve(req.params.id, req.user.userId, { admin_note, receipt_image });
      res.status(200).json({ message: 'Đã duyệt yêu cầu rút tiền', data: request });
    } catch (err) {
      next(err);
    }
  }

  /** PUT /api/withdrawals/:id/reject — Admin từ chối */
  async reject(req, res, next) {
    try {
      if (!validateObjectId(res, req.params.id, 'ID yêu cầu')) return;
      const { admin_note } = req.body;
      if (!admin_note?.trim()) {
        return res.status(400).json({ message: 'Vui lòng nhập lý do từ chối' });
      }
      const request = await withdrawalService.reject(req.params.id, req.user.userId, { admin_note });
      res.status(200).json({ message: 'Đã từ chối yêu cầu rút tiền', data: request });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new WithdrawalController();
