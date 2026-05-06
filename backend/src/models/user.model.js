const mongoose = require('mongoose')
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true
        },

        email: {
            type: String,
            required: true,
            unique: true,
        },

        password: {
            type: String,
            required: true,
            minlength: 6,
        },

        role: {
            type: String,
            enum: ["user", "showroom", "admin"],
            default: "user"
        },

        is_active: {
            type: Boolean,
            default: true
        },

        address: {
            type: String,
        },
        phone: {
            type: String,
        },
        age: {
            type: Number,
        },

        // Showroom-specific fields (populated when role === 'showroom')
        business_name: { type: String, trim: true },
        tax_code: { type: String, trim: true },
        showroom_status: {
            type: String,
            enum: ['pending', 'approved', 'rejected', 'suspended'],
            default: 'pending'
        },
        showroom_description: { type: String },
        logo: { type: String },
        license_image: { type: String },
        showroom_address: { type: String },
    },
    { timestamps: true }
);

userSchema.pre("save", async function () {
    if (!this.isModified("password")) return;

    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});

userSchema.methods.comparePassword = async function (plainPassword) {
    return bcrypt.compare(plainPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
