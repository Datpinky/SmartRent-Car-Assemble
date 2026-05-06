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
      const requestedId = req.params.userId;
      const { userId: tokenUserId, role } = req.user;

      if (role !== 'admin' && String(tokenUserId) !== String(requestedId)) {
        return res.status(403).json({ message: 'Bạn chỉ có thể cập nhật hồ sơ của chính mình' });
      }

      // Prevent role escalation via profile update
      const { role: _stripped, password: _pwd, ...safeBody } = req.body;

      const updatedUser = await ProfileService.updateProfile(requestedId, safeBody);
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
}

module.exports = new ProfileController();
