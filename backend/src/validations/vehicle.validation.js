const { body, param } = require("express-validator");

/** Khớp enum trong `vehicle.model.js` (Sửa typo Bicyle → Bicycle) */
const VEHICLE_TYPES = ["Sedan", "Bike", "Bicycle", "SUV", "Wagon", "Truck", "others"];
const CURRENCIES = ["VND", "USD"];
const CHARGES = ["minutes", "seconds", "hourly", "day", "negotiable"];
const STATUS = ['available', 'waiting_handover', 'rented', 'maintenance', 'reserved'];
const OWNERSHIP_TYPES = ['showroom_owned', 'consigned'];
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
        body("ownership_type").optional().isIn(OWNERSHIP_TYPES),
        body("source").optional().isIn(OWNERSHIP_TYPES),
        body("active").optional().isBoolean(),
    ];

    getListVehicles = [
        body("search").optional({ nullable: true, checkFalsy: true }).trim(),
        body("page")
            .optional({ nullable: true, checkFalsy: true })
            .toInt()
            .isInt({ min: 1 })
            .withMessage("page phải là số nguyên >= 1"),
        body("limit")
            .optional({ nullable: true, checkFalsy: true })
            .toInt()
            .isInt({ min: 1, max: 200 })
            .withMessage("limit từ 1 đến 200"),
        body("sort_by")
            .optional({ nullable: true, checkFalsy: true })
            .toInt()
            .isIn([-1, 1])
            .withMessage("sort_by phải là -1 (mới nhất) hoặc 1 (cũ nhất)"),
        body("sort_by_price")
            .optional({ nullable: true, checkFalsy: true })
            .toInt()
            .isIn([-1, 1])
            .withMessage("sort_by_price phải là -1 hoặc 1"),
        body("vehicle_type").optional({ nullable: true, checkFalsy: true }).isIn(VEHICLE_TYPES).withMessage("vehicle_type không hợp lệ"),
        body("added_by").optional({ nullable: true, checkFalsy: true }).isMongoId().withMessage("added_by phải là MongoId hợp lệ"),
        body("showroom_id").optional({ nullable: true, checkFalsy: true }).isMongoId().withMessage("showroom_id phải là MongoId hợp lệ"),
        body("ownership_type").optional({ nullable: true, checkFalsy: true }).isIn(OWNERSHIP_TYPES).withMessage("ownership_type không hợp lệ"),
    ];

    getVehicleById = [
        param("vehicleId").notEmpty().withMessage("vehicleId là bắt buộc").isMongoId().withMessage("vehicleId phải là MongoId hợp lệ"),
    ];

    deleteVehicleById = [
        param("vehicleId").notEmpty().withMessage("vehicleId là bắt buộc").isMongoId().withMessage("vehicleId phải là MongoId hợp lệ"),
    ];
}

module.exports = new VehicleValidation();
