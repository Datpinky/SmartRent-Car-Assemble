const express = require('express');
const profileController = require('../controllers/profile.controller');
const router = express.Router();

const authorizeRoles = require('../middlewares/authorize.middleware');
const authMiddleware = require('../middlewares/auth.middleware');

router.get('/getProfileById/:userId', authMiddleware, profileController.getProfileById);

// Lấy danh sách profiles
router.post('/getListProfiles', authMiddleware, authorizeRoles('admin'), profileController.getListProfiles);

// Cập nhật profile
router.put('/updateProfile/:userId', authMiddleware, profileController.updateProfile);

// Xóa profile theo id
router.delete(
  '/deleteProfileById/:userId',
  authMiddleware,
  authorizeRoles('admin'),
  profileController.deleteProfileById,
);

// Cập nhật giấy phép lái xe
router.put('/updateDriverLicense/:userId', authMiddleware, profileController.updateDriverLicense);

// Admin xác thực giấy phép lái xe
router.put(
  '/verifyDriverLicense/:userId',
  authMiddleware,
  authorizeRoles('admin'),
  profileController.verifyDriverLicense,
);

// Lấy danh sách user có GPLX chờ duyệt (admin)
router.post('/listDriverLicenses', authMiddleware, authorizeRoles('admin'), profileController.getListDriverLicenses);

// Renter đăng ký trở thành showroom (kèm chữ ký điện tử)
router.put('/becomeShowroom', authMiddleware, authorizeRoles('user'), profileController.becomeShowroom);

// Cập nhật chữ ký điện tử (showroom)
router.put('/updateSignature', authMiddleware, authorizeRoles('showroom'), profileController.updateSignature);

module.exports = router;
