const vehicleService = require("../services/vehicle.service");

class VeHicleController {
    async createVehicle(req, res, next) {
        try {
            const userId = req.user.userId;
            const role = req.user.role;
            if (!["showroom", "admin"].includes(role)) {
                return res.status(403).json({ message: "Chỉ showroom hoặc admin mới được tạo xe" });
            }
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

    async updateVehicle(req, res, next) {
        try {
            const { vehicleId } = req.params;
            const result = await vehicleService.updateVehicle(vehicleId, req.body, req.user);
            if (!result) return res.status(404).json({ message: "Không tìm thấy xe" });
            return res.status(200).json({ message: "Cập nhật xe thành công", data: result });
        } catch (error) {
            next(error);
        }
    }

    async deleteVehicleById(req, res, next) {
        try {
            const vehicleId = req.params.vehicleId;
            const result = await vehicleService.deleteVehicleById(vehicleId, req.user);
            return res.status(200).json({ message: "Vehicle deleted successfully", data: result });
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new VeHicleController();
