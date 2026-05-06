const express = require('express');
const authController = require('../controllers/auth.controller');
const authValidation = require('../validations/auth.validation');
const validate = require('../middlewares/validate.middleware');
const authMiddleware = require('../middlewares/auth.middleware');
const router = express.Router();

router.get('/me', authMiddleware, authController.getMe);

router.post('/register', authValidation.register, validate, authController.register);

router.post('/login', authValidation.login, validate, authController.login);

module.exports = router;
