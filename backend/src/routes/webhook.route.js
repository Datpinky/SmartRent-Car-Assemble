const express = require('express');
const router = express.Router();
const { stripeWebhook } = require('../controllers/webhook.controller');

// Raw body bắt buộc cho Stripe signature verification
// Route này phải được đăng ký TRƯỚC express.json() middleware trong app.js
router.post('/stripe', express.raw({ type: 'application/json' }), stripeWebhook);

module.exports = router;
