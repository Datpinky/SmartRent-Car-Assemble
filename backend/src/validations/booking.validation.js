const { body, param } = require('express-validator');

const BOOKING_STATUSES = [
  'pending',
  'confirmed',
  'cancel_pending',
  'cancel_failed',
  'cancelled',
  'completed',
  'waiting_payment',
  'paid',
  'refund_requested',
  'waiting_handover',
  'handed_over',
  'in_use',
  'waiting_return_confirmation',
];

class BookingValidation {
  createBooking = [
    body('vehicle_id').notEmpty().withMessage('Không được để trống').isMongoId().withMessage('Phải là MongoId hợp lệ'),

    body('showroom_id').notEmpty().withMessage('Không được để trống').isMongoId().withMessage('Phải là MongoId hợp lệ'),

    body('start_date')
      .notEmpty()
      .withMessage('Không được để trống')
      .isISO8601()
      .withMessage('Không đúng định dạng (ISO8601)'),

    body('end_date')
      .notEmpty()
      .withMessage('Không được để trống')
      .isISO8601()
      .withMessage('Không đúng định dạng (ISO8601)'),

    body('delivery_type').optional().isIn(['delivery', 'self']).withMessage('delivery_type phải là delivery hoặc self'),

    body('delivery_address')
      .optional()
      .isString()
      .withMessage('delivery_address phải là chuỗi ký tự')
      .isLength({ min: 0, max: 500 })
      .withMessage('delivery_address không được vượt quá 500 ký tự'),

    body('delivery_latitude')
      .optional()
      .isFloat({ min: -90, max: 90 })
      .withMessage('delivery_latitude phải là số hợp lệ giữa -90 và 90'),

    body('delivery_longitude')
      .optional()
      .isFloat({ min: -180, max: 180 })
      .withMessage('delivery_longitude phải là số hợp lệ giữa -180 và 180'),

    body('delivery_plus_code').optional().isString().withMessage('delivery_plus_code phải là chuỗi ký tự'),

    body('note')
      .optional()
      .isString()
      .withMessage('Phải là chuỗi ký tự')
      .isLength({ max: 500 })
      .withMessage('Không được vượt quá 500 ký tự'),
    // If delivery_type is delivery, require a non-empty address
    body()
      .custom((value, { req }) => {
        if (req.body.delivery_type === 'delivery') {
          const addr = String(req.body.delivery_address || '').trim();
          if (!addr || addr.length < 6) {
            throw new Error('Khi chọn giao tận nơi, delivery_address phải có ít nhất 6 ký tự');
          }
        }
        return true;
      })
      .withMessage('Invalid delivery payload'),
  ];

  getListBookings = [
    body('search').optional().trim(),

    body('page').optional().isInt({ min: 1 }).withMessage('Phải là số nguyên >= 1'),

    body('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Phải là số nguyên từ 1 đến 100'),

    body('sort_by').optional().toInt().isIn([-1, 1]).withMessage('Phải là -1 (mới nhất) hoặc 1 (cũ nhất)'),

    body('status')
      .optional()
      .isIn(BOOKING_STATUSES)
      .withMessage(`Phải là một trong: ${BOOKING_STATUSES.join(' | ')}`),

    body('vehicle_id').optional().isMongoId().withMessage('Phải là MongoId hợp lệ'),

    body('user_id').optional().isMongoId().withMessage('Phải là MongoId hợp lệ'),

    body('showroom_id').optional().isMongoId().withMessage('Phải là MongoId hợp lệ'),
  ];

  getBookingById = [
    param('bookingId').notEmpty().withMessage('Không được để trống').isMongoId().withMessage('Phải là MongoId hợp lệ'),
  ];

  updateBookingStatus = [
    param('bookingId').notEmpty().withMessage('Không được để trống').isMongoId().withMessage('Phải là MongoId hợp lệ'),

    body('status')
      .notEmpty()
      .withMessage('Không được để trống')
      .isIn(BOOKING_STATUSES)
      .withMessage(`Phải là một trong: ${BOOKING_STATUSES.join(' | ')}`),
  ];

  deleteBooking = [
    param('bookingId').notEmpty().withMessage('Không được để trống').isMongoId().withMessage('Phải là MongoId hợp lệ'),
  ];

  requestRefund = [
    param('bookingId').notEmpty().withMessage('Không được để trống').isMongoId().withMessage('Phải là MongoId hợp lệ'),
    body('reason')
      .trim()
      .notEmpty()
      .withMessage('Vui lòng nhập lý do hoàn trả')
      .isLength({ min: 10, max: 2000 })
      .withMessage('Lý do từ 10 đến 2000 ký tự'),
  ];

  confirmRefund = [
    param('bookingId').notEmpty().withMessage('Không được để trống').isMongoId().withMessage('Phải là MongoId hợp lệ'),
  ];
}

module.exports = new BookingValidation();
