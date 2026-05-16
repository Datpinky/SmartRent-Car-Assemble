const UploadService = require('../services/upload.service');
const AiService = require('../services/ai.service');
const throwError = require('../utils/throwError');

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
   * POST multipart: gallery ảnh tự do (không yêu cầu vị trí).
   * Fields: image_0, image_1, ... (file) or image_url_0, image_url_1, ... (URL strings)
   * Body: count (number of images)
   */
  async compareGalleryImages(req, res, next) {
    try {
      const count = parseInt(req.body?.count, 10) || 0;
      if (count === 0) {
        return res.status(400).json({ message: 'Cần ít nhất một ảnh (count > 0)' });
      }

      if (count > 6) {
        return res.status(400).json({ message: 'Chi duoc phan tich toi da 6 anh' });
      }

      const images = [];
      for (let i = 0; i < count; i++) {
        // Check for file upload
        const fileArr = req.files?.[`image_${i}`];
        if (fileArr?.[0]) {
          if (!fileArr[0].mimetype?.startsWith('image/')) {
            throwError(`${fileArr[0].originalname || 'file'} khong phai anh`, 400);
          }
          images.push({
            type: 'file',
            buffer: fileArr[0].buffer,
            mimetype: fileArr[0].mimetype,
          });
        } else {
          // Check for URL
          const urlField = `image_url_${i}`;
          const url = req.body?.[urlField];
          if (url) {
            images.push({
              type: 'url',
              url: url,
            });
          }
        }
      }

      if (images.length === 0) {
        return res.status(400).json({ message: 'Không có ảnh hợp lệ để phân tích' });
      }

      const analysis = await AiService.compareGalleryImages(images);
      return res.status(200).json({
        message: 'Phân tích gallery ảnh hoàn tất',
        data: analysis,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST multipart: free-form BEFORE and AFTER galleries.
   * Fields: before_0..before_5, after_0..after_5 or before_url_0.., after_url_0..
   * Body: before_count, after_count
   */
  async compareBeforeAfterGallery(req, res, next) {
    try {
      const beforeCount = parseInt(req.body?.before_count, 10) || 0;
      const afterCount = parseInt(req.body?.after_count, 10) || 0;

      if (afterCount === 0) {
        return res.status(400).json({ message: 'Cần ít nhất một ảnh SAU để phân tích' });
      }

      if (beforeCount > 6 || afterCount > 6) {
        return res.status(400).json({ message: 'Moi nhom anh chi duoc toi da 6 anh' });
      }

      const readGallery = (prefix, count) => {
        const images = [];
        for (let i = 0; i < count; i++) {
          const fileArr = req.files?.[`${prefix}_${i}`];
          if (fileArr?.[0]) {
            if (!fileArr[0].mimetype?.startsWith('image/')) {
              throwError(`${fileArr[0].originalname || 'file'} khong phai anh`, 400);
            }
            images.push({
              type: 'file',
              buffer: fileArr[0].buffer,
              mimetype: fileArr[0].mimetype,
            });
            continue;
          }

          const url = req.body?.[`${prefix}_url_${i}`];
          if (url) {
            images.push({ type: 'url', url });
          }
        }
        return images;
      };

      const beforeImages = readGallery('before', beforeCount);
      const afterImages = readGallery('after', afterCount);

      if (afterImages.length === 0) {
        return res.status(400).json({ message: 'Không có ảnh SAU hợp lệ để phân tích' });
      }

      const analysis =
        beforeImages.length > 0
          ? await AiService.compareBeforeAfterGallery(beforeImages, afterImages)
          : await AiService.compareGalleryImages(afterImages);

      return res.status(200).json({
        message: beforeImages.length > 0 ? 'Phân tích so sánh gallery hoàn tất' : 'Phân tích gallery ảnh hoàn tất',
        data: analysis,
      });
    } catch (error) {
      next(error);
    }
  }
}
module.exports = new UploadController();
