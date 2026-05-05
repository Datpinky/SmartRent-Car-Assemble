const { body } = require("express-validator");

class FavoriteValidation {
    toggleFavorite = [
        body("vehicle_id")
            .notEmpty()
            .withMessage("vehicle_id là bắt buộc")
            .isMongoId()
            .withMessage("vehicle_id phải là MongoId hợp lệ"),
    ];

    getMyFavorites = [
        body("page").optional().isInt({ min: 1 }).withMessage("page phải là số nguyên >= 1"),
        body("limit").optional().isInt({ min: 1, max: 100 }).withMessage("limit từ 1 đến 100"),
    ];
}

module.exports = new FavoriteValidation();
