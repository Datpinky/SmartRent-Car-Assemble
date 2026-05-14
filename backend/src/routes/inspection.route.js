const express = require('express');
const router = express.Router();
const inspectionController = require('../controllers/inspection.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const authorizeRoles = require('../middlewares/authorize.middleware');

router.use(authMiddleware);
router.use(authorizeRoles('showroom', 'user', 'renter', 'admin'));

router.get('/', inspectionController.list);
router.get('/:id', inspectionController.getById);
router.post('/', inspectionController.create);

module.exports = router;
