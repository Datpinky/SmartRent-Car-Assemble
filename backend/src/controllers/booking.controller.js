const bookingService = require("../services/booking.service");

class BookingController {
  async createBooking(req, res, next) {
    try {
      const userId = req.user.userId;
      const data = req.body;
      const result = await bookingService.createBooking(data, userId);
      return res.status(201).json({
        message: "Tạo booking thành công",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async getListBookings(req, res, next) {
    try {
        const filters = req.body;
        const result = await bookingService.getListBookings(filters);

        return res.status(200).json({
            message: "Lấy danh sách booking thành công",
            ...result
        });
    } catch (error) {
        next(error);
    }
}


  async getBookingById(req, res, next) {
    try {
      const { bookingId } = req.params;
      const result = await bookingService.getBookingById(bookingId);
      if (!result) {
        return res.status(404).json({
          message: "Không tìm thấy booking",
        });
      }
      return res.status(200).json({
        message: "Lấy thông tin booking thành công",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async updateBookingStatus(req, res, next) {
    try {
      const { bookingId } = req.params;
      const { status } = req.body;
      if (!status) {
        return res.status(400).json({
          message: "Trạng thái không được để trống",
        });
      }
      const result = await bookingService.updateBookingStatus(bookingId, status);
      if (!result) {
        return res.status(404).json({
          message: "Không tìm thấy booking để cập nhật",
        });
      }
      
      return res.status(200).json({
        message: "Cập nhật trạng thái booking thành công",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteBooking(req, res, next) {
    try {
      const { bookingId } = req.params;
      const result = await bookingService.deleteBooking(bookingId);
      if (!result) {
        return res.status(404).json({
          message: "Không tìm thấy booking để xóa",
        });
      }
      return res.status(200).json({
        message: "Xóa booking thành công",
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new BookingController();