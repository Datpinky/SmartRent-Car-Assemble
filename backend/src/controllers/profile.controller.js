const ProfileService = require('../services/profile.service');

class ProfileController {
  async getProfileById(req, res, next) {
    try {
      const user = await ProfileService.getProfileById(req.params.userId);
      if (!user) {
        return res.status(404).json({ message: 'Không tìm thấy hồ sơ' });
      }
      res.status(200).json({ message: 'Lấy hồ sơ thành công', data: user });
    } catch (err) {
      next(err);
    }
  }

  async getListProfiles(req, res, next) {
    try {
      const result = await ProfileService.getListProfiles(req.body);
      res.status(200).json({ message: 'Lấy danh sách hồ sơ thành công', ...result });
    } catch (err) {
      next(err);
    }
  }

  async updateProfile(req, res, next) {
    try {
      const userId = req.params.userId;
      const body = req.body;
      const updatedUser = await ProfileService.updateProfile(userId, body);
      if (!updatedUser) {
        return res.status(404).json({ message: 'Không tìm thấy hồ sơ để cập nhật' });
      }
      res.status(200).json({ message: 'Cập nhật hồ sơ thành công', data: updatedUser });
    } catch (err) {
      next(err);
    }
  }

  async deleteProfileById(req, res, next) {
    try {
      const deletedUser = await ProfileService.deleteProfileById(req.params.userId);
      if (!deletedUser) {
        return res.status(404).json({ message: 'Không tìm thấy hồ sơ để xóa' });
      }
      res.status(200).json({ message: 'Xóa hồ sơ thành công' });
    } catch (err) {
      next(err);
    }
  }

  async updateDriverLicense(req, res, next) {
    try {
      const userId = req.params.userId;
      if (req.user.userId.toString() !== userId) {
        return res.status(403).json({ message: 'Không có quyền cập nhật hồ sơ này' });
      }
      const updated = await ProfileService.updateDriverLicense(userId, req.body);
      if (!updated) {
        return res.status(404).json({ message: 'Không tìm thấy hồ sơ' });
      }
      res.status(200).json({ message: 'Cập nhật giấy phép lái xe thành công', data: updated });
    } catch (err) {
      next(err);
    }
  }

  async verifyDriverLicense(req, res, next) {
    try {
      const { userId } = req.params;
      const { action, reason } = req.body;
      const updated = await ProfileService.verifyDriverLicense(userId, action, reason || '');
      if (!updated) {
        return res.status(404).json({ message: 'Không tìm thấy người dùng' });
      }
      res.status(200).json({
        message: `Giấy phép lái xe đã được ${action === 'approved' ? 'phê duyệt' : 'từ chối'}`,
        data: updated,
      });
    } catch (err) {
      next(err);
    }
  }
  async getListDriverLicenses(req, res, next) {
    try {
      const { status, page, limit } = req.body;
      const result = await ProfileService.getListDriverLicenses({ status, page, limit });
      res.status(200).json({ message: 'Lấy danh sách GPLX thành công', ...result });
    } catch (err) {
      next(err);
    }
  }

  /** PUT /api/profile/becomeShowroom — renter chuyển sang showroom (kèm chữ ký) */
  async becomeShowroom(req, res, next) {
    try {
      const userId = req.user.userId;
      const { signature, business_name, tax_code } = req.body;
      if (!signature || signature.length < 100) {
        return res.status(400).json({ message: 'Vui lòng cung cấp chữ ký hợp lệ' });
      }
      const updated = await ProfileService.becomeShowroom(userId, { signature, business_name, tax_code });
      if (!updated) return res.status(404).json({ message: 'Không tìm thấy người dùng' });
      res.status(200).json({ message: 'Chúc mừng! Tài khoản đã được nâng cấp thành Showroom.', data: updated });
    } catch (err) {
      next(err);
    }
  }

  /** PUT /api/profile/updateSignature — cập nhật chữ ký (showroom) */
  async updateSignature(req, res, next) {
    try {
      const userId = req.user.userId;
      const { signature } = req.body;
      if (!signature || signature.length < 100) {
        return res.status(400).json({ message: 'Chữ ký không hợp lệ' });
      }
      const updated = await ProfileService.updateSignature(userId, signature);
      res.status(200).json({ message: 'Cập nhật chữ ký thành công', data: updated });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new ProfileController();
