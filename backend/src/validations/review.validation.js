const { body } = require("express-validator");

class ReviewValidation {
    createReview = [
        body("vehicle_id")
            .notEmpty()
            .withMessage("vehicle_id là bắt buộc")
            .isMongoId()
            .withMessage("vehicle_id phải là MongoId hợp lệ"),
        body("rating")
            .notEmpty()
            .withMessage("rating là bắt buộc")
            .isInt({ min: 1, max: 5 })
            .withMessage("rating phải từ 1 đến 5"),
        body("comment")
            .optional()
            .trim()
            .isLength({ max: 1000 })
            .withMessage("comment tối đa 1000 ký tự"),
    ];

    updateReview = [
        body("review_id")
            .notEmpty()
            .withMessage("review_id là bắt buộc")
            .isMongoId()
            .withMessage("review_id phải là MongoId hợp lệ"),
        body("rating")
            .notEmpty()
            .withMessage("rating là bắt buộc")
            .isInt({ min: 1, max: 5 })
            .withMessage("rating phải từ 1 đến 5"),
        body("comment")
            .optional()
            .trim()
            .isLength({ max: 1000 })
            .withMessage("comment tối đa 1000 ký tự"),
    ];

    getReviewsByVehicleId = [
        body("vehicle_id")
            .notEmpty()
            .withMessage("vehicle_id là bắt buộc")
            .isMongoId()
            .withMessage("vehicle_id phải là MongoId hợp lệ"),
        body("page").optional().isInt({ min: 1 }).withMessage("page phải là số nguyên >= 1"),
        body("limit").optional().isInt({ min: 1, max: 100 }).withMessage("limit phải từ 1 đến 100"),
    ];
}

module.exports = new ReviewValidation();
