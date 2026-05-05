const { body, param } = require("express-validator");

const VEHICLE_TYPES = ["Sedan", "Bike", "Bicyle", "SUV", "Wagon", "Truck", "others"];
const CURRENCIES = ["VND", "USD"];
const CHARGES = ["minutes", "seconds", "hourly", "day", "negotiable"];
const STATUS = ['available', 'waiting_handover', 'rented', 'maintenance', 'reserved'];
class VehicleValidation {
    createVehicle = [
        body("vehicle_type").notEmpty().isIn(VEHICLE_TYPES),
        body("vehicle_brand").notEmpty().trim(),
        body("vehicle_model").notEmpty().trim(),
        body("vehicle_engine_number").notEmpty().trim(),
        body("vehicle_identification_number").notEmpty().trim(),
        body("vehicle_plate_number").notEmpty().trim(),

        body("vehicle_images_paths").optional().isArray().withMessage("vehicle_images_paths bắt buộc array"),
        body("vehicle_images_paths.*").optional().isURL().withMessage("vehicle_images_paths bắt buộc là url"),

        body("vehicle_hire_rate_in_figures").optional().isFloat({ gt: 0 }).withMessage("vehicle_hire_rate_in_figures phải là số lớn hơn 0"),
        body("vehicle_hire_rate_currency").optional().isIn(CURRENCIES),

        body("vehicle_hire_charge_per_timing").optional().isIn(CHARGES),

        body("maximum_allowable_distance").optional().trim(),
        body("status").optional().isIn(STATUS),

        body("company_owned").optional().isBoolean(),
        body("active").optional().isBoolean(),
    ];

    getListVehicles = [
        body("search").optional().trim(),
        body("page").optional().isInt({ min: 1 }).withMessage("page phải là số nguyên >= 1"),
        body("limit").optional().isInt({ min: 1, max: 100 }).withMessage("limit từ 1 đến 100"),
        body("sort_by").optional().toInt().isIn([-1, 1]).withMessage("sort_by phải là -1 (mới nhất) hoặc 1 (cũ nhất)"),
        body("sort_by_price").optional().toInt().isIn([-1, 1]).withMessage("sort_by_price phải là -1 hoặc 1"),
        body("vehicle_type").optional().isIn(VEHICLE_TYPES).withMessage("vehicle_type không hợp lệ"),
        body("added_by").optional().isMongoId().withMessage("added_by phải là MongoId hợp lệ"),
    ];

    getVehicleById = [
        param("vehicleId").notEmpty().withMessage("vehicleId là bắt buộc").isMongoId().withMessage("vehicleId phải là MongoId hợp lệ"),
    ];

    deleteVehicleById = [
        param("vehicleId").notEmpty().withMessage("vehicleId là bắt buộc").isMongoId().withMessage("vehicleId phải là MongoId hợp lệ"),
    ];
}

module.exports = new VehicleValidation();
