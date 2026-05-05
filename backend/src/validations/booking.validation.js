const { body, param } = require("express-validator");

const BOOKING_STATUSES = ['pending',
  'confirmed',
  'cancelled',
  'completed',
  'waiting_payment',
  'paid',
  'waiting_handover',
  'handed_over',
  'in_use',
  'waiting_return_confirmation'
];

class BookingValidation {
  createBooking = [
    body("user_id")
      .notEmpty().withMessage("Không được để trống")
      .isMongoId().withMessage("Phải là MongoId hợp lệ"),

    body("vehicle_id")
      .notEmpty().withMessage("Không được để trống")
      .isMongoId().withMessage("Phải là MongoId hợp lệ"),

    body("showroom_id")
      .notEmpty().withMessage("Không được để trống")
      .isMongoId().withMessage("Phải là MongoId hợp lệ"),

    body("start_date")
      .notEmpty().withMessage("Không được để trống")
      .isISO8601().withMessage("Không đúng định dạng (ISO8601)"),

    body("end_date")
      .notEmpty().withMessage("Không được để trống")
      .isISO8601().withMessage("Không đúng định dạng (ISO8601)"),

    body("total_price")
      .notEmpty().withMessage("Không được để trống")
      .isFloat({ gt: 0 }).withMessage("Phải là số lớn hơn 0"),

    body("note")
      .optional()
      .isString().withMessage("Phải là chuỗi ký tự")
      .isLength({ max: 500 }).withMessage("Không được vượt quá 500 ký tự"),
  ];

  getListBookings = [
    body("search").optional().trim(),

    body("page")
      .optional()
      .isInt({ min: 1 }).withMessage("Phải là số nguyên >= 1"),

    body("limit")
      .optional()
      .isInt({ min: 1, max: 100 }).withMessage("Phải là số nguyên từ 1 đến 100"),

    body("sort_by")
      .optional()
      .toInt()
      .isIn([-1, 1]).withMessage("Phải là -1 (mới nhất) hoặc 1 (cũ nhất)"),

    body("status")
      .optional()
      .isIn(BOOKING_STATUSES)
      .withMessage(`Phải là một trong: ${BOOKING_STATUSES.join(" | ")}`),

    body("vehicle_id")
      .optional()
      .isMongoId().withMessage("Phải là MongoId hợp lệ"),

    body("user_id")
      .optional()
      .isMongoId().withMessage("Phải là MongoId hợp lệ"),

    body("showroom_id")
      .optional()
      .isMongoId().withMessage("Phải là MongoId hợp lệ"),
  ];

  getBookingById = [
    param("bookingId")
      .notEmpty().withMessage("Không được để trống")
      .isMongoId().withMessage("Phải là MongoId hợp lệ"),
  ];

  updateBookingStatus = [
    param("bookingId")
      .notEmpty().withMessage("Không được để trống")
      .isMongoId().withMessage("Phải là MongoId hợp lệ"),

    body("status")
      .notEmpty().withMessage("Không được để trống")
      .isIn(BOOKING_STATUSES)
      .withMessage(`Phải là một trong: ${BOOKING_STATUSES.join(" | ")}`),
  ];

  deleteBooking = [
    param("bookingId")
      .notEmpty().withMessage("Không được để trống")
      .isMongoId().withMessage("Phải là MongoId hợp lệ"),
  ];
}

module.exports = new BookingValidation();