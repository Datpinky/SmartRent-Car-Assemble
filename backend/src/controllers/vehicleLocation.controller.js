const vehicleLocationService = require("../services/vehicleLocation.service");

class VehicleLocationController {
    async createVehicleLocation(req, res, next) {
        try {
            const vehicleId = req.params.vehicleId;
            const location = req.body;
            const result = await vehicleLocationService.createVehicleLocation(location, vehicleId);
            return res.status(201).json({ message: "Vehicle location created successfully ", data: result });
        } catch (error) {
            next(error)
        }
    }

    async getVehicleLocationByVehicleId(req, res, next) {
        try {
            const vehicleId = req.params.vehicleId;
            const result = await vehicleLocationService.getVehicleLocationByVehicleId(vehicleId);
            return res.status(200).json({ message: "User location received successfully", data: result });
        } catch (error) {
            next(error);
        }
    }

    async updateCurrentLocation(req, res, next) {
        try {
            const vehicleId = req.params.vehicleId;
            const showroomId = req.user.userId;
            const result = await vehicleLocationService.updateCurrentLocation(vehicleId, showroomId, req.body);
            return res.status(200).json({ message: "Vehicle location updated successfully", data: result });
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new VehicleLocationController();
