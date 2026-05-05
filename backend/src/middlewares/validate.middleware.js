const { validationResult } = require("express-validator");

const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (errors.isEmpty()) return next();

    return res.status(422).json({
        message: "Validation error",
        errors: errors.array().map(e => ({ field: e.path, msg: e.msg }))
    });
};

module.exports = validate;
