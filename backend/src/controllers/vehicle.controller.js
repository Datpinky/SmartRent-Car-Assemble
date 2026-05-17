const vehicleService = require("../services/vehicle.service");

class VeHicleController {
    async createVehicle(req, res, next) {
        try {
            const userId = req.user.userId;
            const vehicle = req.body;
            const result = await vehicleService.createVehicle(vehicle, userId);
            return res.status(201).json({ message: "Vehicle created successfully", data: result });
        } catch (error) {
            next(error);
        }
    }

    async getListVehicles(req, res, next) {
        try {
            const result = await vehicleService.getListVehicles(req.body);
            return res.status(200).json({ message: "Vehicle received successfully", ...result });
        } catch (error) {
            next(error);
        }
    }

    async getVehicleById(req, res, next) {
        try {
            const vehicleId = req.params.vehicleId;
            const result = await vehicleService.getVehicleById(vehicleId);
            return res.status(200).json({ message: "Vehicle received successfully", data: result });
        } catch (error) {
            next(error);
        }
    }

    async getVehiclesByIds(req, res, next) {
        try {
            const { vehicle_ids } = req.body;
            if (!Array.isArray(vehicle_ids) || vehicle_ids.length === 0) {
                return res.status(400).json({ message: "vehicle_ids phải là mảng không rỗng" });
            }
            const data = await vehicleService.getVehiclesByIds(vehicle_ids);
            return res.status(200).json({ message: "Lấy batch vehicles thành công", data });
        } catch (error) {
            next(error);
        }
    }

    async updateVehicle(req, res, next) {
        try {
            const vehicleId = req.params.vehicleId;
            const userId = req.user.userId;
            const result = await vehicleService.updateVehicle(vehicleId, req.body, userId);
            return res.status(200).json({ message: "Vehicle updated successfully", data: result });
        } catch (error) {
            next(error);
        }
    }

    async deleteVehicleById(req, res, next) {
        try {
            const vehicleId = req.params.vehicleId;
            const result = await vehicleService.deleteVehicleById(vehicleId);
            return res.status(201).json({ message: "Vehicle delete successfully", data: result });
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new VeHicleController();
