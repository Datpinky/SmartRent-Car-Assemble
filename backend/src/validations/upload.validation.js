const { body } = require("express-validator");

/**
 * Multer đưa file vào req.files (không phải req.body).
 * Dùng body('<tên field form-data>').custom(..., { req }) để kiểm tra req.files — cùng style với các validation khác.
 */
class UploadValidation {
    /** Chạy sau multer.array("files"). */
    validateImageUpload = [
        body("files").custom((value, { req }) => {
            const files = req.files || [];
            if (!files.length) {
                throw new Error(
                    "Cần ít nhất một file (form-data, field: files, tối đa 5 file)"
                );
            }
            const badNames = files
                .filter((f) => !f.mimetype?.startsWith("image/"))
                .map((f) => f.originalname || "file");
            if (badNames.length) {
                throw new Error(`${badNames.join(", ")} không phải ảnh`);
            }
            return true;
        }),
    ];

    /** Chạy sau multer.fields([ before_rental, after_return ]). */
    validateVehicleDamageImages = [
        body("before_rental").custom((value, { req }) => {
            const before = req.files?.before_rental;
            if (!before || !before.length) {
                throw new Error(
                    "Cần đúng 1 ảnh xe trước khi cho thuê (form-data, field: before_rental)"
                );
            }
            if (before.length > 1) {
                throw new Error("Chỉ gửi 1 file cho before_rental");
            }
            if (!before[0].mimetype?.startsWith("image/")) {
                throw new Error(
                    `${before[0].originalname || "file"} không phải ảnh`
                );
            }
            return true;
        }),
        body("after_return").custom((value, { req }) => {
            const after = req.files?.after_return;
            if (!after || !after.length) {
                throw new Error(
                    "Cần đúng 1 ảnh xe khi trả (form-data, field: after_return)"
                );
            }
            if (after.length > 1) {
                throw new Error("Chỉ gửi 1 file cho after_return");
            }
            if (!after[0].mimetype?.startsWith("image/")) {
                throw new Error(
                    `${after[0].originalname || "file"} không phải ảnh`
                );
            }
            return true;
        }),
    ];
}

module.exports = new UploadValidation();
