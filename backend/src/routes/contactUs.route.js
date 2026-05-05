const express = require('express');
const contactUsController = require('../controllers/contactUs.controller');
const contactUsValidation = require('../validations/contactUs.validation');
const authorizeRoles = require('../middlewares/authorize.middleware');
const authMiddleware = require('../middlewares/auth.middleware');
const validate = require('../middlewares/validate.middleware');

const router = express.Router();

router.post('/create',
    contactUsValidation.createContact, 
    validate,
    contactUsController.createContact
);

router.post('/getListContacts',
    authMiddleware,
    authorizeRoles('admin'), // Chỉ admin mới được xem danh sách
    contactUsValidation.getListContacts,
    validate,
    contactUsController.getListContacts
);

router.delete('/deleteContact/:id',
    authMiddleware,
    authorizeRoles('admin'),
    contactUsValidation.getContactById,
    validate,
    contactUsController.deleteContact
);
module.exports = router;