const express = require("express");
const router = express.Router();
const multer = require("multer");
const uploadController = require("../controllers/upload.controller");
const uploadValidation = require("../validations/upload.validation");
const validate = require("../middlewares/validate.middleware");

const upload = multer({ storage: multer.memoryStorage() });

router.post(
    "/image/files",
    upload.array("files", 5),
    ...uploadValidation.validateImageUpload,
    validate,
    uploadController.uploadImageFiles
);

router.post(
    "/image/vehicle-damage",
    upload.fields([
        { name: "before_rental", maxCount: 1 },
        { name: "after_return", maxCount: 1 },
    ]),
    ...uploadValidation.validateVehicleDamageImages,
    validate,
    uploadController.compareVehicleDamage
);

module.exports = router;
