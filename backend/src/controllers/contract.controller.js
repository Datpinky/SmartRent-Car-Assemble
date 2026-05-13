const contractService = require('../services/contract.service');

class ContractController {
  /** GET /api/contracts/by-booking/:bookingId */
  async getByBookingId(req, res, next) {
    try {
      const contract = await contractService.getByBookingId(req.params.bookingId, req.user.userId);
      res.status(200).json({ message: 'Lấy hợp đồng thành công', data: contract });
    } catch (err) {
      next(err);
    }
  }

  /** POST /api/contracts/sign/:contractId */
  async signByRenter(req, res, next) {
    try {
      const { signature } = req.body;
      if (!signature) return res.status(400).json({ message: 'Thiếu chữ ký (signature)' });
      const contract = await contractService.signByRenter(req.params.contractId, req.user.userId, signature);
      res.status(200).json({ message: 'Ký hợp đồng thành công', data: contract });
    } catch (err) {
      next(err);
    }
  }

  /** GET /api/contracts/my (renter) */
  async listMyRenterContracts(req, res, next) {
    try {
      const { page, limit } = req.query;
      const result = await contractService.listByRenter(req.user.userId, {
        page: Number(page) || 1,
        limit: Number(limit) || 10,
      });
      res.status(200).json({ message: 'Danh sách hợp đồng', ...result });
    } catch (err) {
      next(err);
    }
  }

  /** GET /api/contracts/showroom (showroom) */
  async listShowroomContracts(req, res, next) {
    try {
      const { page, limit } = req.query;
      const result = await contractService.listByShowroom(req.user.userId, {
        page: Number(page) || 1,
        limit: Number(limit) || 10,
      });
      res.status(200).json({ message: 'Danh sách hợp đồng showroom', ...result });
    } catch (err) {
      next(err);
    }
  }

  /** POST /api/contracts/regenerate-pdf/:contractId */
  async regeneratePdf(req, res, next) {
    try {
      const contract = await contractService.regeneratePdf(req.params.contractId, req.user.userId);
      res.status(200).json({ message: 'Tạo lại PDF thành công', data: contract });
    } catch (err) {
      next(err);
    }
  }

  /** GET /api/contracts/admin (admin) */
  async listAllContracts(req, res, next) {
    try {
      const { page, limit, status } = req.query;
      const result = await contractService.listAll({
        page: Number(page) || 1,
        limit: Number(limit) || 20,
        status,
      });
      res.status(200).json({ message: 'Tất cả hợp đồng', ...result });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new ContractController();
