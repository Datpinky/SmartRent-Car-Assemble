const mongoose = require('mongoose');
const WithdrawalRequest = require('../models/withdrawal.model');
const PaymentModel = require('../models/payment.model');
const BookingModel = require('../models/booking.model');
const UserModel = require('../models/user.model');
const throwError = require('../utils/throwError');

const MIN_WITHDRAWAL = 10000; // 10,000 VNĐ

// Tất cả trạng thái booking mà renter đã thanh toán thành công
// (tiền đã vào platform, showroom có quyền rút)
const PAID_BOOKING_STATUSES = [
  'paid',
  'waiting_handover',
  'handed_over',
  'in_use',
  'waiting_return_confirmation',
  'completed',
];

class WithdrawalService {
  /**
   * Tính số dư khả dụng của showroom:
   *   Tổng thu = Σ payment.amount (booking đã thanh toán, payment successful, showroom = showroomId)
   *   Đã rút   = Σ withdrawal.amount (status approved)
   *   Số dư    = Tổng thu − Đã rút − Đang pending
   *
   * Bảo mật: showroomId phải là ObjectId hợp lệ của user có role=showroom
   */
  async getBalance(showroomId) {
    const showroom = await UserModel.findOne({ _id: showroomId, role: 'showroom' }).lean();
    if (!showroom) throwError('Showroom không tồn tại', 404);

    // Lấy tất cả bookingId của showroom đã được thanh toán (bao gồm đang thuê + đã hoàn thành)
    const paidBookingIds = await BookingModel.find({
      showroom_id: showroomId,
      status: { $in: PAID_BOOKING_STATUSES },
    })
      .select('_id')
      .lean();

    const bookingIdList = paidBookingIds.map((b) => b._id);

    // Tổng tiền đã thu (payment successful cho các booking đã thanh toán)
    const earningsAgg = await PaymentModel.aggregate([
      {
        $match: {
          booking_id: { $in: bookingIdList },
          payment_status: 'successful',
        },
      },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);
    const totalEarned = earningsAgg[0]?.total ?? 0;

    // Tổng đã rút (approved)
    const withdrawnAgg = await WithdrawalRequest.aggregate([
      {
        $match: {
          showroom_id: new mongoose.Types.ObjectId(showroomId),
          status: 'approved',
        },
      },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);
    const totalWithdrawn = withdrawnAgg[0]?.total ?? 0;

    // Tổng đang chờ duyệt (pending) — khoá lại, không cho rút trùng
    const pendingAgg = await WithdrawalRequest.aggregate([
      {
        $match: {
          showroom_id: new mongoose.Types.ObjectId(showroomId),
          status: 'pending',
        },
      },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);
    const totalPending = pendingAgg[0]?.total ?? 0;

    const available = totalEarned - totalWithdrawn - totalPending;

    return {
      totalEarned,
      totalWithdrawn,
      totalPending,
      available: Math.max(0, available),
    };
  }

  /**
   * Showroom tạo yêu cầu rút tiền.
   * Validate:
   *  - amount >= MIN_WITHDRAWAL
   *  - amount <= available balance
   *  - Không có request pending nào đang chờ (giới hạn 1 pending tại 1 thời điểm)
   *  - Thông tin ngân hàng đầy đủ
   */
  async createRequest(showroomId, { amount, bank_name, bank_account, bank_holder, note }) {
    const showroom = await UserModel.findOne({ _id: showroomId, role: 'showroom' }).lean();
    if (!showroom) throwError('Showroom không tồn tại', 404);

    // Validate input
    if (!amount || isNaN(amount) || amount < MIN_WITHDRAWAL) {
      throwError(`Số tiền rút tối thiểu là ${MIN_WITHDRAWAL.toLocaleString('vi-VN')} VNĐ`, 400);
    }
    if (!bank_name?.trim()) throwError('Vui lòng nhập tên ngân hàng', 400);
    if (!bank_account?.trim()) throwError('Vui lòng nhập số tài khoản', 400);
    if (!bank_holder?.trim()) throwError('Vui lòng nhập tên chủ tài khoản', 400);

    // Kiểm tra không có pending request
    const existingPending = await WithdrawalRequest.findOne({
      showroom_id: showroomId,
      status: 'pending',
    });
    if (existingPending) {
      throwError(
        'Bạn đang có một yêu cầu rút tiền chờ xử lý. Vui lòng chờ admin duyệt trước khi tạo yêu cầu mới.',
        400,
      );
    }

    // Kiểm tra số dư
    const balance = await this.getBalance(showroomId);
    if (amount > balance.available) {
      throwError(
        `Số tiền rút (${Number(amount).toLocaleString('vi-VN')} VNĐ) vượt quá số dư khả dụng (${balance.available.toLocaleString('vi-VN')} VNĐ)`,
        400,
      );
    }

    const request = await WithdrawalRequest.create({
      showroom_id: showroomId,
      amount: Math.round(amount),
      bank_name: bank_name.trim(),
      bank_account: bank_account.trim(),
      bank_holder: bank_holder.trim(),
      note: note?.trim() || '',
      status: 'pending',
    });

    return request.toObject();
  }

  /**
   * Lấy danh sách yêu cầu của showroom (có phân trang)
   */
  async listByShowroom(showroomId, { page = 1, limit = 10 } = {}) {
    const skip = (page - 1) * limit;
    const filter = { showroom_id: showroomId };

    const [items, total] = await Promise.all([
      WithdrawalRequest.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('admin_id', 'name email')
        .lean(),
      WithdrawalRequest.countDocuments(filter),
    ]);

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  /**
   * Admin lấy tất cả yêu cầu (lọc theo status, phân trang)
   */
  async listAll({ page = 1, limit = 20, status } = {}) {
    const skip = (page - 1) * limit;
    const filter = {};
    if (status) filter.status = status;

    const [items, total] = await Promise.all([
      WithdrawalRequest.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('showroom_id', 'name email business_name phone')
        .populate('admin_id', 'name email')
        .lean(),
      WithdrawalRequest.countDocuments(filter),
    ]);

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  /**
   * Admin duyệt yêu cầu rút tiền.
   * Dùng findOneAndUpdate với filter {status:'pending'} để tránh race condition:
   * nếu 2 admin duyệt đồng thời, chỉ 1 request thành công, request sau sẽ nhận 404.
   */
  async approve(requestId, adminId, { admin_note, receipt_image } = {}) {
    // Đọc request trước để lấy showroom_id và amount cho việc kiểm tra số dư
    const existing = await WithdrawalRequest.findOne({ _id: requestId, status: 'pending' });
    if (!existing) {
      // Phân biệt không tồn tại vs đã xử lý
      const any = await WithdrawalRequest.findById(requestId).lean();
      if (!any) throwError('Yêu cầu rút tiền không tồn tại', 404);
      throwError(`Yêu cầu này đã được xử lý (${any.status}), không thể duyệt lại`, 400);
    }

    // Kiểm tra số dư TRƯỚC khi ghi (balance.available đã trừ pending của request này)
    const balance = await this.getBalance(existing.showroom_id);
    const availableWithThisRequest = balance.available + existing.amount;
    if (existing.amount > availableWithThisRequest) {
      throwError('Số dư không đủ để duyệt yêu cầu này (balance đã thay đổi)', 400);
    }

    // Atomic update: chỉ update nếu vẫn còn ở trạng thái 'pending'
    // Tránh race condition: nếu đã bị approve/reject bởi call khác, sẽ trả về null
    const request = await WithdrawalRequest.findOneAndUpdate(
      { _id: requestId, status: 'pending' },
      {
        $set: {
          status: 'approved',
          admin_id: adminId,
          admin_note: admin_note?.trim() || '',
          receipt_image: receipt_image?.trim() || '',
          processed_at: new Date(),
        },
      },
      { new: true },
    );
    if (!request) throwError('Yêu cầu đã được xử lý bởi tác vụ khác, vui lòng tải lại', 409);

    return request.toObject();
  }

  /**
   * Admin từ chối yêu cầu rút tiền.
   * Atomic update tương tự approve để tránh race condition.
   */
  async reject(requestId, adminId, { admin_note } = {}) {
    // Kiểm tra tồn tại và trạng thái
    const existing = await WithdrawalRequest.findOne({ _id: requestId, status: 'pending' });
    if (!existing) {
      const any = await WithdrawalRequest.findById(requestId).lean();
      if (!any) throwError('Yêu cầu rút tiền không tồn tại', 404);
      throwError(`Yêu cầu này đã được xử lý (${any.status}), không thể từ chối`, 400);
    }

    // Atomic update với filter status='pending'
    const request = await WithdrawalRequest.findOneAndUpdate(
      { _id: requestId, status: 'pending' },
      {
        $set: {
          status: 'rejected',
          admin_id: adminId,
          admin_note: admin_note?.trim() || '',
          processed_at: new Date(),
        },
      },
      { new: true },
    );
    if (!request) throwError('Yêu cầu đã được xử lý bởi tác vụ khác, vui lòng tải lại', 409);

    return request.toObject();
  }
}

module.exports = new WithdrawalService();
