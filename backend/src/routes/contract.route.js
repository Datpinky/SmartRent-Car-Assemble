const express = require('express');
const router = express.Router();
const contractController = require('../controllers/contract.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const authorizeRoles = require('../middlewares/authorize.middleware');

// Lấy hợp đồng theo booking (renter hoặc showroom của booking đó)
router.get('/by-booking/:bookingId', authMiddleware, contractController.getByBookingId);

// Renter ký hợp đồng sau khi thanh toán
router.post('/sign/:contractId', authMiddleware, authorizeRoles('user'), contractController.signByRenter);

// Danh sách hợp đồng của renter đang đăng nhập
router.get('/my', authMiddleware, authorizeRoles('user'), contractController.listMyRenterContracts);

// Danh sách hợp đồng của showroom đang đăng nhập
router.get('/showroom', authMiddleware, authorizeRoles('showroom'), contractController.listShowroomContracts);

// Regenerate PDF cho hợp đồng đã ký (renter hoặc showroom của booking đó)
router.post('/regenerate-pdf/:contractId', authMiddleware, contractController.regeneratePdf);

// Admin: xem tất cả hợp đồng
router.get('/admin', authMiddleware, authorizeRoles('admin'), contractController.listAllContracts);

module.exports = router;
