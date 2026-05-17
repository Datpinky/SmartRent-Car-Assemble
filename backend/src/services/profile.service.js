const UserModel = require('../models/user.model');

const BaseService = require('./base.service');
const QueryBuilder = require('../utils/queryBuilder');

class ProfileService {
  async getProfileById(userId) {
    return await UserModel.findById(userId).select('-password');
  }

  async getListProfiles(body = {}) {
    const { search, role, email, sort_by, sort_by_name, page, limit } = body;

    // Pagination
    const pagination = BaseService.parsePagination({ page, limit });
    const searchFilter = QueryBuilder.buildSearchFilter(search, { name: 1, email });
    const fieldFilter = QueryBuilder.buildExactFieldFilter({ role, email });

    const filter = { $and: [searchFilter, fieldFilter] };

    const sortOptions = QueryBuilder.buildSortOptions([
      { field: 'name', value: sort_by_name },
      { field: 'createdAt', value: sort_by },
    ]);

    const result = await BaseService.findPaginated(UserModel, filter, sortOptions, pagination);
    const safeData = {
      ...result,
      data: result.data.map(({ password, __v, ...rest }) => rest),
    };
    return safeData;
  }

  async updateProfile(userId, data) {
    const allowed = [
      'name',
      'address',
      'phone',
      'age',
      'business_name',
      'tax_code',
      'public_address',
      'showroom_representative_name',
      'opening_hours',
      'showroom_license_public',
      'policy_text',
      'logo_url',
      'showroom_description',
    ];
    const update = {};
    for (const key of allowed) {
      if (Object.prototype.hasOwnProperty.call(data, key)) {
        update[key] = data[key];
      }
    }

    const current = await UserModel.findById(userId);
    if (!current) {
      return null;
    }

    const merged = { ...current.toObject(), ...update };
    if (merged.role === 'showroom') {
      const addr = String(merged.public_address ?? '').trim();
      if (addr.length < 10) {
        const err = new Error(
          'Showroom bắt buộc nhập địa chỉ công khai (tối thiểu 10 ký tự) để hiển thị điểm nhận xe cho khách.',
        );
        err.statusCode = 400;
        throw err;
      }
    }

    if (Object.keys(update).length === 0) {
      return await UserModel.findById(userId).select('-password');
    }

    return await UserModel.findByIdAndUpdate(userId, update, { new: true }).select('-password');
  }

  async updateDriverLicense(userId, data) {
    // Không cho phép sửa GPLX đã được admin duyệt
    const current = await UserModel.findById(userId).select('driver_license_status').lean();
    if (!current) {
      const err = new Error('Người dùng không tồn tại');
      err.statusCode = 404;
      throw err;
    }
    if (current.driver_license_status === 'approved') {
      const err = new Error(
        'Giấy phép lái xe đã được xác minh và không thể chỉnh sửa. Nếu cần thay đổi, vui lòng liên hệ Admin.',
      );
      err.statusCode = 403;
      throw err;
    }

    const allowed = [
      'driver_license_number',
      'driver_license_fullname',
      'driver_license_dob',
      'driver_license_class',
      'driver_license_expiry',
      'driver_license_front_image',
      'driver_license_back_image',
    ];
    const update = {};
    for (const key of allowed) {
      if (Object.prototype.hasOwnProperty.call(data, key)) {
        update[key] = data[key];
      }
    }
    // Submitting new/updated license resets status to pending for re-review
    update.driver_license_status = 'pending';
    update.driver_license_reject_reason = '';
    return await UserModel.findByIdAndUpdate(userId, update, { new: true }).select('-password');
  }

  async verifyDriverLicense(userId, action, reason = '') {
    if (!['approved', 'rejected'].includes(action)) {
      const err = new Error('Action phải là approved hoặc rejected');
      err.statusCode = 400;
      throw err;
    }
    const update = {
      driver_license_status: action,
      driver_license_reject_reason: action === 'rejected' ? reason : '',
    };
    return await UserModel.findByIdAndUpdate(userId, update, { new: true }).select('-password');
  }

  async deleteProfileById(userId) {
    return await UserModel.findByIdAndDelete(userId);
  }

  async getListDriverLicenses({ status = 'all', page, limit } = {}) {
    const pagination = BaseService.parsePagination({ page, limit });
    const filter = { driver_license_number: { $exists: true, $ne: '' } };
    if (status && status !== 'all') {
      filter.driver_license_status = status;
    }
    const result = await BaseService.findPaginated(UserModel, filter, { createdAt: -1 }, pagination);
    return {
      ...result,
      data: result.data.map(({ password, __v, ...rest }) => rest),
    };
  }

  async becomeShowroom(userId, { signature, business_name = '', tax_code = '' }) {
    return await UserModel.findByIdAndUpdate(
      userId,
      { role: 'showroom', signature, business_name, tax_code },
      { new: true },
    ).select('-password');
  }

  async updateSignature(userId, signature) {
    return await UserModel.findByIdAndUpdate(userId, { signature }, { new: true }).select('-password');
  }
}

module.exports = new ProfileService();
