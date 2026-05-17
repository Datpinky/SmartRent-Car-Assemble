const express = require('express');
const router = express.Router();
const multer = require('multer');
const uploadController = require('../controllers/upload.controller');
const uploadValidation = require('../validations/upload.validation');
const validate = require('../middlewares/validate.middleware');
const authMiddleware = require('../middlewares/auth.middleware');
const authorizeRoles = require('../middlewares/authorize.middleware');

const upload = multer({ storage: multer.memoryStorage() });

router.post(
  '/image/files',
  authMiddleware,
  authorizeRoles('user', 'showroom', 'admin'),
  upload.array('files', 6),
  ...uploadValidation.validateImageUpload,
  validate,
  uploadController.uploadImageFiles,
);

// Gallery: image_0, image_1, ... (up to 6 images, free-form)
const GALLERY_FIELDS = Array.from({ length: 6 }, (_, i) => ({ name: `image_${i}`, maxCount: 1 }));

router.post(
  '/image/vehicle-damage-gallery',
  authMiddleware,
  authorizeRoles('showroom', 'admin'),
  upload.fields(GALLERY_FIELDS),
  uploadController.compareGalleryImages,
);

const GALLERY_COMPARE_FIELDS = Array.from({ length: 6 }, (_, i) => [
  { name: `before_${i}`, maxCount: 1 },
  { name: `after_${i}`, maxCount: 1 },
]).flat();

router.post(
  '/image/vehicle-damage-gallery-compare',
  authMiddleware,
  authorizeRoles('showroom', 'admin'),
  upload.fields(GALLERY_COMPARE_FIELDS),
  uploadController.compareBeforeAfterGallery,
);

module.exports = router;
