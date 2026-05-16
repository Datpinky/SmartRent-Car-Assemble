const { body } = require('express-validator');

class UploadValidation {
  validateImageUpload = [
    body('files').custom((value, { req }) => {
      const files = req.files || [];
      if (!files.length) {
        throw new Error('Can it nhat mot file (form-data, field: files, toi da 6 file)');
      }
      if (files.length > 6) {
        throw new Error('Chi duoc upload toi da 6 anh');
      }

      const badNames = files.filter((f) => !f.mimetype?.startsWith('image/')).map((f) => f.originalname || 'file');
      if (badNames.length) {
        throw new Error(`${badNames.join(', ')} khong phai anh`);
      }

      return true;
    }),
  ];
}

module.exports = new UploadValidation();
