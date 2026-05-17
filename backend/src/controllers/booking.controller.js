const bookingService = require('../services/booking.service');

class BookingController {
  async createBooking(req, res, next) {
    try {
      const userId = req.user.userId;
      const data = req.body;
      const result = await bookingService.createBooking(data, userId);
      return res.status(201).json({
        message: 'Tạo booking thành công',
        data: result,
        bookingStatus: result.status,
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
        message: 'Lấy danh sách booking thành công',
        ...result,
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
          message: 'Không tìm thấy booking',
        });
      }
      return res.status(200).json({
        message: 'Lấy thông tin booking thành công',
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
      const role = req.user.role;
      const userId = req.user.userId;
      if (!status) {
        return res.status(400).json({
          message: 'Trạng thái không được để trống',
        });
      }
      const result = await bookingService.updateBookingStatus(bookingId, status, role, userId);
      if (!result) {
        return res.status(404).json({
          message: 'Không tìm thấy booking để cập nhật',
        });
      }

      return res.status(200).json({
        message: 'Cập nhật trạng thái booking thành công',
        data: result,
        ...(result._refundResult !== undefined && {
          refundResult: result._refundResult,
          paymentStatus: result._refundResult?.paymentStatus || undefined,
          refundStatus: result._refundResult?.status || undefined,
        }),
        ...(result._refundError && {
          refundError: result._refundError,
        }),
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
          message: 'Không tìm thấy booking để xóa',
        });
      }
      return res.status(200).json({
        message: 'Xóa booking thành công',
      });
    } catch (error) {
      next(error);
    }
  }

  async verifyHandoverOtp(req, res, next) {
    try {
      const { bookingId } = req.params;
      const { otp } = req.body;
      const userId = req.user.userId;
      if (!otp) {
        return res.status(400).json({ message: 'Vui lòng nhập mã OTP' });
      }
      const result = await bookingService.verifyHandoverOtp(bookingId, otp, userId);
      return res.status(200).json({
        message: 'Xác nhận nhận xe thành công. Chúc bạn có chuyến đi vui vẻ!',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async resendHandoverOtp(req, res, next) {
    try {
      const { bookingId } = req.params;
      const role = req.user.role;
      const userId = req.user.userId;
      const result = await bookingService.resendHandoverOtp(bookingId, role, userId);
      return res.status(200).json({
        message: 'Mã OTP đã được tạo lại',
        data: {
          handover_otp: result.handover_otp,
          handover_otp_expires_at: result.handover_otp_expires_at,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async requestRefund(req, res, next) {
    try {
      if (req.user.role !== 'user') {
        return res.status(403).json({ message: 'Chỉ người thuê mới có thể gửi yêu cầu hoàn trả' });
      }
      const { bookingId } = req.params;
      const { reason } = req.body;
      const result = await bookingService.requestRefundByRenter(bookingId, req.user.userId, reason);
      return res.status(200).json({
        message: 'Đã gửi yêu cầu hoàn trả. Showroom sẽ xác nhận và xử lý hoàn tiền.',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async confirmRefund(req, res, next) {
    try {
      const role = req.user.role;
      if (role !== 'showroom' && role !== 'admin') {
        return res.status(403).json({ message: 'Chỉ showroom hoặc admin có thể xác nhận hoàn trả' });
      }
      const { bookingId } = req.params;
      const result = await bookingService.confirmRefundByShowroom(bookingId, role, req.user.userId);
      return res.status(200).json({
        message: 'Đã xử lý hoàn trả',
        data: result,
        ...(result._refundResult !== undefined && {
          refundResult: result._refundResult,
          paymentStatus: result._refundResult?.paymentStatus || undefined,
          refundStatus: result._refundResult?.status || undefined,
        }),
        ...(result._refundError && {
          refundError: result._refundError,
        }),
      });
    } catch (error) {
      next(error);
    }
  }

  async savePickupImages(req, res, next) {
    try {
      const { bookingId } = req.params;
      const { pickup_images } = req.body;
      console.log('🔔 Backend savePickupImages called:', { bookingId, imagesCount: pickup_images?.length });
      if (!Array.isArray(pickup_images)) {
        console.error('❌ pickup_images không phải array:', typeof pickup_images);
        return res.status(400).json({ message: 'pickup_images phải là mảng URL' });
      }
      if (pickup_images.length > 6) {
        return res.status(400).json({ message: 'Chỉ được lưu tối đa 6 ảnh bàn giao' });
      }
      const result = await bookingService.savePickupImages(bookingId, req.user.userId, pickup_images);
      console.log('✅ Backend saved:', { bookingId, savedCount: result.pickup_images?.length });
      return res.status(200).json({ message: 'Lưu ảnh bàn giao thành công', data: result });
    } catch (error) {
      console.error('❌ Backend error:', error);
      next(error);
    }
  }
}

module.exports = new BookingController();
