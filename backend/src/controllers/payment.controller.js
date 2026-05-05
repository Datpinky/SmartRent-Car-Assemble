const paymentService = require('../services/payment.service');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const PaymentModel = require('../models/payment.model');

class PaymentController {
  async createPaymentForBooking(req, res, next) {
    try {
      const { bookingId } = req.params;

      const payment = await paymentService.createPaymentForBooking(bookingId);

      return res.status(201).json({
        message: 'Tạo thanh toán thành công',
        data: payment
      });
    } catch (error) {
      next(error);
    }
  }


  async createPaymentDB(req, res) {
    try {
      const { ...body } = req.body;
      const payment = await paymentService.createPaymentDB(body);
      res.status(201).json({ message: 'Tạo dữ liệu thanh toán thành công', data: payment });
    } catch (error) {
      next(error);
    }
  }

  async getPaymentDBById(req, res, next) {
    try {
      const { paymentId } = req.params;
      const payment = await paymentService.getPaymentDBById(paymentId);

      if (!payment) {
        return res.status(404).json({ error: "Không tìm thấy dữ liệu thanh toán" });
      }

      return res.status(200).json({ message: "Lấy dữ liệu thanh toán thành công", data: payment });
    } catch (err) {
      next(err);
    }
  }



  async getPaymentIntentById(req, res, next) {
    try {
      const { intentId } = req.params;
      const paymentIntent = await paymentService.getPaymentIntentById(intentId);


      if (!paymentIntent) {
        return res.status(404).json({
          message: 'Không tìm thấy Payment Intent'
        });
      }


      return res.status(200).json({
        message: 'Lấy Payment Intent thành công',
        data: {
          clientSecret: paymentIntent.client_secret,
        }
      });
    } catch (error) {
      next(error);
    }
  }

  async getListPaymentDB(req, res, next) {
    try {
      const payments = await paymentService.getListPaymentDB(req.body);
      res.status(200).json({
        message: "Lấy danh sách thanh toán thành công",
        data: payments
      });
    } catch (err) {
      next(err);
    }
  }

  async getPaymentState(req, res, next) {
    try {
      const { bookingId } = req.params;

      const state = await paymentService.getPaymentState(bookingId);

      return res.status(200).json({
        message: "Lấy trạng thái thanh toán thành công",
        data: state
      });
    } catch (error) {
      next(error);
    }
  }

  /** Cập nhật trạng thái của payment db và booking db, trả về intent id và intent status cho frontend xử lý */
  async syncPaymentIntentWithDB(req, res, next) {
    try {
      const { paymentIntentId } = req.body;

      const { intent, paymentStatus, bookingStatus } = await paymentService.syncPaymentIntentWithDB(paymentIntentId);

      // dựng message ngắn gọn
      const statusMessage =
        paymentStatus === 'successful'
          ? `Thanh toán ${intent.amount} ${intent.currency} thành công!`
          : paymentStatus === 'failed'
            ? `Thanh toán ${intent.amount} ${intent.currency} thất bại hoặc bị hủy!`
            : `Intent đang ở trạng thái: ${intent.status}`;

      return res.status(200).json({
        message: statusMessage,
        data: { 
          intentId: intent.id, 
          intentStatus: intent.status, 
          paymentStatus, bookingStatus 
        }
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new PaymentController();