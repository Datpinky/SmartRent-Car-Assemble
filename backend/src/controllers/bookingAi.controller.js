const bookingService = require("../services/booking.service");

class BookingAiController {
  async getReport(req, res, next) {
    try {
      const { bookingId } = req.params;
      const data = await bookingService.getAiReportByBookingId(bookingId, req.user);
      return res.status(200).json({
        message: "Lấy báo cáo AI thành công",
        data,
      });
    } catch (error) {
      next(error);
    }
  }

  async generateReport(req, res, next) {
    try {
      const { bookingId } = req.params;
      const data = await bookingService.generateAiReportFromUrls(bookingId, req.body, req.user);
      return res.status(200).json({
        message: "Tạo báo cáo AI thành công",
        data,
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new BookingAiController();
