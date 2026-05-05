// controllers/userLocationController.js
const userLocationService = require('../services/userLocation.service');

class UserLocationController {
  async createUserLocation(req, res, next) {
    try {
      const body = req.body;
      const userId = req.params.userId;
      const location = await userLocationService.createUserLocation(body, userId);
      res.status(201).json({
        message: 'Tạo location thành công',
        data: location
      });
    } catch (error) {
      next(error);
    }
  }


  async getUserLocationByUserId(req, res, next) {
    try {
      const location = await userLocationService.getUserLocationByUserId(req.params.userId);
      if (!location) {
        return res.status(404).json({ message: 'Không tìm thấy location người dùng' });
      }
      res.status(200).json({
        message: 'Lấy location thành công',
        data: location
      });
    } catch (error) {
      next(error);
    }
  }

  async updateUserLocationByUserId(req, res, next) {
    try {
      const location = await userLocationService.updateUserLocationByUserId(req.params.userId, req.body);
      if (!location) {
        return res.status(404).json({ message: 'Không tìm thấy location để cập nhật' });
      }
      res.status(200).json({
        message: 'Cập nhật location thành công',
        data: location
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteUserLocationByUserId(req, res, next) {
    try {
      const location = await userLocationService.deleteUserLocationByUserId(req.params.userId);
      if (!location) {
        return res.status(404).json({ message: 'Không tìm thấy location để xoá' });
      }
      res.status(200).json({
        message: 'Xoá location thành công',
        data: location
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new UserLocationController();
