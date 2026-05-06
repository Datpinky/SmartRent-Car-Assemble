const { body } = require("express-validator");

// Only user-selectable roles at registration; admin is assigned by admins only
const REGISTER_ROLES = ["user", "showroom"];

class AuthValidation {
    register = [
        body("name").notEmpty().trim().withMessage("name là bắt buộc"),
        body("email")
            .notEmpty()
            .withMessage("email là bắt buộc")
            .isEmail()
            .withMessage("email không hợp lệ")
            .normalizeEmail(),
        body("password")
            .notEmpty()
            .withMessage("password là bắt buộc")
            .isLength({ min: 6 })
            .withMessage("password tối thiểu 6 ký tự"),
        body("role").optional().isIn(REGISTER_ROLES).withMessage("role không hợp lệ, chỉ chấp nhận: user, showroom"),
        body("is_active").optional().isBoolean().withMessage("is_active phải là boolean"),
        body("age").optional().isInt({ min: 0, max: 150 }).withMessage("age không hợp lệ"),
    ];

    login = [
        body("email")
            .notEmpty()
            .withMessage("email là bắt buộc")
            .isEmail()
            .withMessage("email không hợp lệ")
            .normalizeEmail(),
        body("password").notEmpty().withMessage("password là bắt buộc"),
    ];
}

module.exports = new AuthValidation();
