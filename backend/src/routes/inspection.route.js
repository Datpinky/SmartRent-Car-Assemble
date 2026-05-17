const express = require('express');
const router = express.Router();
const inspectionController = require('../controllers/inspection.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const authorizeRoles = require('../middlewares/authorize.middleware');

router.use(authMiddleware);
router.use(authorizeRoles('showroom', 'user', 'renter', 'admin'));

router.get('/return-review/:bookingId', authorizeRoles('showroom', 'admin'), inspectionController.getReturnReview);
router.post(
  '/return-review/:bookingId/analyze',
  authorizeRoles('showroom', 'admin'),
  inspectionController.analyzeReturnReview,
);
router.post(
  '/return-review/:bookingId/confirm',
  authorizeRoles('showroom', 'admin'),
  inspectionController.confirmReturnReview,
);

router.get('/', inspectionController.list);
router.post('/', inspectionController.create);
router.get('/:id', inspectionController.getById);

module.exports = router;
