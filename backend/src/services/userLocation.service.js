const UserLocation = require('../models/userLocation.model');
const BaseService = require('./base.service');
const QueryBuilder = require('../utils/queryBuilder');
const userModel = require('../models/user.model');
const throwError = require('../utils/throwError');
class UserLocationService {
  async createUserLocation(body = {}, userId) {
    const location = await UserLocation.create({ ...body, user: userId });
    return location
  }


  async getUserLocationByUserId(userId) {
    const location = await UserLocation.findOne({ user: userId });

    return location;
  }

  async updateUserLocationByUserId(userId, body={}) {
    return await UserLocation.findOneAndUpdate({ user: userId }, { ...body }, { new: true })
  }


  async deleteUserLocationByUserId(userId) {
    return await UserLocation.findOneAndDelete({ user: userId })
  }



}

module.exports = new UserLocationService();