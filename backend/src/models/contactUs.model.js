const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const contactUsSchema = new Schema(
    {
        user: { type: Schema.Types.ObjectId, ref: 'User' },
        title: { type: String, maxLength: 30 },
        body: { type: String, maxLength: 100 },
        name: String,
        email: String
    },
    { timestamps: true }
);
module.exports = mongoose.model('ContactUs', contactUsSchema);
