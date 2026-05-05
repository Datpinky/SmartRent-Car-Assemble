
const express = require('express');
const userLocationController = require('../controllers/userLocation.controller');
const router = express.Router();

router.post('/createUserLocation/:userId',
    userLocationController.createUserLocation
);

router.get('/getUserLocationByUserId/:userId',
    userLocationController.getUserLocationByUserId
);

router.put('/updateUserLocationByUserId/:userId',
    userLocationController.updateUserLocationByUserId
);

router.delete('/deleteUserLocationByUserId/:userId',
    userLocationController.deleteUserLocationByUserId
);

module.exports = router;