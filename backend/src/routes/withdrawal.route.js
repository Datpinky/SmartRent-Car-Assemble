const express = require('express');
const router = express.Router();
const withdrawalController = require('../controllers/withdrawal.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const authorizeRoles = require('../middlewares/authorize.middleware');

// ─── Showroom routes ───────────────────────────────────────────────────────────
// Xem số dư khả dụng
router.get('/my/balance', authMiddleware, authorizeRoles('showroom'), withdrawalController.getBalance);

// Tạo yêu cầu rút tiền
router.post('/', authMiddleware, authorizeRoles('showroom'), withdrawalController.createRequest);

// Lịch sử yêu cầu của showroom đang đăng nhập
router.get('/my', authMiddleware, authorizeRoles('showroom'), withdrawalController.listMy);

// ─── Admin routes ──────────────────────────────────────────────────────────────
// Xem tất cả yêu cầu (lọc theo ?status=pending|approved|rejected)
router.get('/admin', authMiddleware, authorizeRoles('admin'), withdrawalController.listAll);

// Duyệt yêu cầu
router.put('/:id/approve', authMiddleware, authorizeRoles('admin'), withdrawalController.approve);

// Từ chối yêu cầu (bắt buộc có admin_note)
router.put('/:id/reject', authMiddleware, authorizeRoles('admin'), withdrawalController.reject);

module.exports = router;
