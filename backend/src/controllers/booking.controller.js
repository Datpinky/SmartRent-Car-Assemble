const bookingService = require("../services/booking.service");

class BookingController {
  async createBooking(req, res, next) {
    try {
      if (!["user", "admin"].includes(req.user.role)) {
        return res.status(403).json({ message: "Chỉ renter hoặc admin mới được tạo booking" });
      }
      const userId = req.user.userId;
      const data = req.body;
      const result = await bookingService.createBooking(data, String(userId));
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
        const result = await bookingService.getListBookings(filters, req.user);

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
      const result = await bookingService.getBookingByIdScoped(bookingId, req.user);
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
      const result = await bookingService.transitionBookingStatus(bookingId, status, req.user);
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
      const result = await bookingService.deleteBooking(bookingId, req.user);
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

  async submitHandoverInspection(req, res, next) {
    try {
      const { bookingId } = req.params;
      const files = req.files || [];
      const result = await bookingService.submitHandoverInspection(bookingId, files, req.user);
      return res.status(200).json({
        message: "Lưu ảnh bàn giao thành công",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async submitReturnInspection(req, res, next) {
    try {
      const { bookingId } = req.params;
      const files = req.files || [];
      const result = await bookingService.submitReturnInspection(bookingId, files, req.user);
      return res.status(200).json({
        message: "Lưu ảnh trả xe và phân tích AI thành công",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async getInspectionReport(req, res, next) {
    try {
      const { bookingId } = req.params;
      const report = await bookingService.getInspectionReport(bookingId, req.user);
      return res.status(200).json({
        message: "Lấy báo cáo kiểm tra AI thành công",
        data: report,
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new BookingController();