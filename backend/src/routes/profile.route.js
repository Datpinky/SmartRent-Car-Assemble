
const express = require('express');
const profileController = require('../controllers/profile.controller');
const router = express.Router();

const authorizeRoles = require('../middlewares/authorize.middleware');
const authMiddleware = require('../middlewares/auth.middleware');


router.get(
  '/getProfileById/:userId',
  authMiddleware,
  profileController.getProfileById
);

// Lấy danh sách profiles
router.post(
  '/getListProfiles',
  authMiddleware, 
  authorizeRoles(['admin']),
  profileController.getListProfiles
);

// Cập nhật profile
router.put(
  '/updateProfile/:userId',
  authMiddleware,
  profileController.updateProfile
);

// Xóa profile theo id
router.delete(
  '/deleteProfileById/:userId',
  authMiddleware,
  authorizeRoles(['admin']),
  profileController.deleteProfileById
);
module.exports = router;