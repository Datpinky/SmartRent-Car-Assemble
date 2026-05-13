const express = require('express');
const router = express.Router();
const multer = require('multer');
const uploadController = require('../controllers/upload.controller');
const uploadValidation = require('../validations/upload.validation');
const validate = require('../middlewares/validate.middleware');

const upload = multer({ storage: multer.memoryStorage() });

router.post(
  '/image/files',
  upload.array('files', 5),
  ...uploadValidation.validateImageUpload,
  validate,
  uploadController.uploadImageFiles,
);

router.post(
  '/image/vehicle-damage',
  upload.fields([
    { name: 'before_rental', maxCount: 1 },
    { name: 'after_return', maxCount: 1 },
  ]),
  ...uploadValidation.validateVehicleDamageImages,
  validate,
  uploadController.compareVehicleDamage,
);

// Multi-position: pos_0_before, pos_0_after, pos_1_before, ... (up to 6 positions)
const POSITION_FIELDS = Array.from({ length: 6 }, (_, i) => [
  { name: `pos_${i}_before`, maxCount: 1 },
  { name: `pos_${i}_after`, maxCount: 1 },
]).flat();

router.post('/image/vehicle-damage-multi', upload.fields(POSITION_FIELDS), uploadController.compareMultiPosition);

module.exports = router;
