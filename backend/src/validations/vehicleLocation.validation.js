const { body, param } = require("express-validator");

class VehicleLocationValidation {
    createVehicleLocation = [
        param("vehicleId").notEmpty().withMessage("vehicleId là bắt buộc").isMongoId().withMessage("vehicleId phải là MongoId hợp lệ"),
        body("address").optional().trim(),
        body("latitude").optional().trim(),
        body("longitude").optional().trim(),
        body("plus_code").optional().trim(),
    ];

    getVehicleLocationByVehicleId = [
        param("vehicleId").notEmpty().withMessage("vehicleId là bắt buộc").isMongoId().withMessage("vehicleId phải là MongoId hợp lệ"),
    ];

    updateCurrentLocation = [
        param("vehicleId").notEmpty().withMessage("vehicleId là bắt buộc").isMongoId().withMessage("vehicleId phải là MongoId hợp lệ"),
        body("latitude").notEmpty().withMessage("latitude là bắt buộc").trim(),
        body("longitude").notEmpty().withMessage("longitude là bắt buộc").trim(),
        body("address").optional().trim(),
        body("plus_code").optional().trim(),
    ];
}

module.exports = new VehicleLocationValidation();
