const UploadService = require('../services/upload.service');
const AiService = require('../services/ai.service');

class UploadController {
    async uploadImageFiles(req, res, next) {
        try {
            const files = req.files || [];
            const results = await Promise.all(
                files.map((file) => UploadService.uploadBuffer(file.buffer, file.originalname))
            );

            return res.status(200).json({ message: 'Upload successful', data: results })

        } catch (error) {
            next(error);
        }
    }

    /**
     * POST multipart: before_rental + after_return (cùng cơ chế multer memory như /image/files).
     */
    async compareVehicleDamage(req, res, next) {
        try {
            const before = req.files.before_rental[0];
            const after = req.files.after_return[0];
            const analysis = await AiService.compareVehicleRentalDamage(
                { buffer: before.buffer, mimetype: before.mimetype },
                { buffer: after.buffer, mimetype: after.mimetype }
            );
            return res.status(200).json({
                message: 'Phân tích so sánh ảnh xe hoàn tất',
                data: analysis,
            });
        } catch (error) {
            next(error);
        }
    }
}
module.exports = new UploadController();
