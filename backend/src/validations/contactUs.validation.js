const { body, param } = require("express-validator");

class ContactUsValidation {
    // 1. Tạo mới yêu cầu liên hệ
    createContact = [
        body("title")
            .notEmpty().withMessage("Tiêu đề không được để trống")
            .isLength({ max: 30 }).withMessage("Tiêu đề tối đa 30 ký tự")
            .trim(),
        body("body")
            .notEmpty().withMessage("Nội dung không được để trống")
            .isLength({ max: 100 }).withMessage("Nội dung tối đa 100 ký tự")
            .trim(),
        body("name")
            .notEmpty().withMessage("Tên không được để trống")
            .trim(),
        body("email")
            .notEmpty().withMessage("Email không được để trống")
            .isEmail().withMessage("Email không đúng định dạng")
            .normalizeEmail(),
    ];

    // 2. Lấy danh sách (Dùng POST body theo cấu trúc router của bạn)
    getListContacts = [
        body("search").optional().trim(),
        body("page")
            .optional()
            .isInt({ min: 1 }).withMessage("Trang phải là số nguyên >= 1"),
        body("limit")
            .optional()
            .isInt({ min: 1, max: 100 }).withMessage("Số lượng mỗi trang từ 1 đến 100"),
        body("sort_by")
            .optional()
            .toInt()
            .isIn([-1, 1]).withMessage("Sắp xếp phải là -1 (giảm dần) hoặc 1 (tăng dần)"),
        body("name").optional().trim(),
        body("email").optional().isEmail().withMessage("Email lọc không hợp lệ"),
    ];

    // 3. Lấy chi tiết/Xóa theo ID
    getContactById = [
        param("id")
            .notEmpty().withMessage("ID liên hệ là bắt buộc")
            .isMongoId().withMessage("ID không đúng định dạng hệ thống"),
    ];
}

module.exports = new ContactUsValidation();