const UploadService = require('../services/upload.service');
const AiService = require('../services/ai.service');

class UploadController {
  async uploadImageFiles(req, res, next) {
    try {
      const files = req.files || [];
      const results = await Promise.all(
        files.map((file) => UploadService.uploadBuffer(file.buffer, file.originalname)),
      );

      return res.status(200).json({ message: 'Upload successful', data: results });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST multipart: before_rental + after_return (single pair, legacy).
   */
  async compareVehicleDamage(req, res, next) {
    try {
      const before = req.files.before_rental[0];
      const after = req.files.after_return[0];
      const analysis = await AiService.compareVehicleRentalDamage(
        { buffer: before.buffer, mimetype: before.mimetype },
        { buffer: after.buffer, mimetype: after.mimetype },
      );
      return res.status(200).json({
        message: 'Phân tích so sánh ảnh xe hoàn tất',
        data: analysis,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST multipart: nhiều cặp ảnh theo vị trí.
   * Fields: pos_0_before, pos_0_after, pos_1_before, ...
   * Body: label_0, label_1, ... count (number of positions)
   */
  async compareMultiPosition(req, res, next) {
    try {
      const count = parseInt(req.body?.count, 10) || 0;
      if (count === 0) {
        return res.status(400).json({ message: 'Cần ít nhất một cặp ảnh (count > 0)' });
      }

      const positions = [];
      for (let i = 0; i < count; i++) {
        const beforeArr = req.files?.[`pos_${i}_before`];
        const afterArr = req.files?.[`pos_${i}_after`];
        if (!beforeArr?.[0] || !afterArr?.[0]) continue;
        positions.push({
          label: req.body?.[`label_${i}`] || `Vị trí ${i + 1}`,
          before: { buffer: beforeArr[0].buffer, mimetype: beforeArr[0].mimetype },
          after: { buffer: afterArr[0].buffer, mimetype: afterArr[0].mimetype },
        });
      }

      if (positions.length === 0) {
        return res.status(400).json({ message: 'Không có cặp ảnh hợp lệ để phân tích' });
      }

      const analysis = await AiService.compareMultiPosition(positions);
      return res.status(200).json({
        message: 'Phân tích đa vị trí hoàn tất',
        data: analysis,
      });
    } catch (error) {
      next(error);
    }
  }
}
module.exports = new UploadController();
