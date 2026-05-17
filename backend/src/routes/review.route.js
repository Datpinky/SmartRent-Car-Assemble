const express = require("express");
const reviewController = require("../controllers/review.controller");
const authMiddleware = require("../middlewares/auth.middleware");
const authorizeRoles = require("../middlewares/authorize.middleware");
const reviewValidation = require("../validations/review.validation");
const validate = require("../middlewares/validate.middleware");

const router = express.Router();

router.post(
    "/get-by-vehicle",
    reviewValidation.getReviewsByVehicleId,
    validate,
    reviewController.getReviewsByVehicleId,
);

router.post("/batch-summary", reviewController.getBatchSummary);

router.use(authMiddleware);
router.use(authorizeRoles("user"));

router.post("/my-by-vehicle", reviewValidation.getReviewsByVehicleId, validate, reviewController.getMyReviewsByVehicleId);

router.post("/create", reviewValidation.createReview, validate, reviewController.createReview);

router.patch("/update", reviewValidation.updateReview, validate, reviewController.updateReview);

module.exports = router;
