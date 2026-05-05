const rentalContractService = require('../services/rentalContract.service');

class RentalContractController {
  async getByBookingId(req, res, next) {
    try {
      const { bookingId } = req.params;
      const data = await rentalContractService.buildContract(bookingId);
      return res.status(200).json({
        message: 'Lấy dữ liệu hợp đồng thuê xe thành công',
        data,
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new RentalContractController();
