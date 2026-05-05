const express = require('express');
const vehicleController = require('../controllers/vehicle.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const vehicleValidation = require('../validations/vehicle.validation');
const validate = require('../middlewares/validate.middleware');
const router = express.Router();

router.post('/create',
    authMiddleware,
    vehicleValidation.createVehicle, validate,
    vehicleController.createVehicle
);

router.post('/getListVehicles',
    vehicleValidation.getListVehicles,
    validate,
    vehicleController.getListVehicles
);

router.get('/getVehicleById/:vehicleId',
    vehicleValidation.getVehicleById,
    validate,
    vehicleController.getVehicleById
);

router.delete('/deleteVehicleById/:vehicleId',
    vehicleValidation.deleteVehicleById,
    validate,
    vehicleController.deleteVehicleById
);


module.exports = router;

