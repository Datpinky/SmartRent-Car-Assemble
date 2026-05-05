const { body } = require("express-validator");

const ROLES = ["user", "showroom", "admin"];

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
        body("role").optional().isIn(ROLES).withMessage("role không hợp lệ"),
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
