const vehicleModel = require("../models/vehicle.model");
const vehicleLocationModel = require("../models/vehicleLocation.model");
const throwError = require("../utils/throwError");

class VehicleLocationService {
    async createVehicleLocation(location, vehicleId) {
        return vehicleLocationModel.create({ ...location, vehicle: vehicleId });
    }

    async getVehicleLocationByVehicleId(vehicleId) {
        return vehicleLocationModel.findOne({ vehicle: vehicleId });
    }

    async updateCurrentLocation(vehicleId, showroomId, body) {
        const vehicle = await vehicleModel.findById(vehicleId);
        if (!vehicle) throwError("Khong tim thay xe", 404);

        const update = {
            address: body.address || "",
            latitude: String(body.latitude ?? ""),
            longitude: String(body.longitude ?? ""),
            plus_code: body.plus_code || "",
            vehicle: vehicleId,
        };

        const doc = await vehicleLocationModel.findOneAndUpdate(
            { vehicle: vehicleId },
            { $set: update },
            { upsert: true, new: true }
        );
        return doc;
    }
}

module.exports = new VehicleLocationService();
