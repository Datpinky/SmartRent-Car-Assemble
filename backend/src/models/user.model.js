const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
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
      enum: ['user', 'showroom', 'admin'],
      default: 'user',
    },

    is_active: {
      type: Boolean,
      default: true,
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
    driver_license_number: { type: String, trim: true, default: '' },
    driver_license_fullname: { type: String, trim: true, default: '' },
    driver_license_dob: { type: Date, default: null },
    driver_license_class: { type: String, trim: true, default: '' },
    driver_license_expiry: { type: Date, default: null },
    driver_license_front_image: { type: String, default: '' },
    driver_license_back_image: { type: String, default: '' },
    driver_license_status: {
      type: String,
      enum: ['none', 'pending', 'approved', 'rejected'],
      default: 'none',
    },
    driver_license_reject_reason: { type: String, default: '' },

    /** Chữ ký điện tử (base64 PNG) — lưu khi hoàn tất onboarding showroom */
    signature: { type: String, default: null },

    /** Stripe Customer ID — tạo tự động khi user lần đầu thanh toán */
    stripe_customer_id: { type: String, default: '' },

    /** Thông tin showroom */
    business_name: { type: String, default: '' },
    tax_code: { type: String, default: '' },
    /** Địa chỉ nhận xe công khai (showroom); bắt buộc khi lưu hồ sơ showroom */
    public_address: { type: String, trim: true, default: '' },
    showroom_representative_name: { type: String, trim: true, default: '' },
    opening_hours: { type: String, trim: true, default: '' },
    showroom_license_public: { type: String, trim: true, default: '' },
    policy_text: { type: String, default: '' },
    logo_url: { type: String, trim: true, default: '' },
    showroom_description: { type: String, default: '' },
  },
  { timestamps: true },
);

userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

userSchema.methods.comparePassword = async function (plainPassword) {
  return bcrypt.compare(plainPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
