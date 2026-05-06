const vehicleModel = require("../models/vehicle.model");
const BaseService = require("./base.service");
const throwError = require("../utils/throwError");
const auditLogService = require("./auditLog.service");

/** Trường dùng để search theo tên (regex) */
const SEARCH_FIELDS = ["vehicle_brand", "vehicle_model"];

class VehicleService {
    async createVehicle(vehicle, userId) {
        const ownershipType = vehicle.ownership_type || vehicle.source || "showroom_owned";
        const payload = {
            ...vehicle,
            ownership_type: ownershipType,
            source: ownershipType, // keep legacy field in sync
            showroom_id: userId,
            added_by: userId,
        };
        return vehicleModel.create(payload);
    }

    async getListVehicles(body = {}) {
        const {
            search,
            vehicle_type,
            added_by,
            showroom_id,
            ownership_type,
            sort_by,
            sort_by_price,
            page,
            limit,
        } = body;

        const andParts = [];

        if (search && String(search).trim()) {
            const regex = new RegExp(String(search).trim(), 'i');
            andParts.push({ $or: SEARCH_FIELDS.map((field) => ({ [field]: regex })) });
        }

        if (vehicle_type) andParts.push({ vehicle_type });
        if (ownership_type) andParts.push({ ownership_type });

        if (showroom_id && added_by) {
            andParts.push({ showroom_id });
            andParts.push({ added_by });
        } else if (showroom_id) {
            andParts.push({ showroom_id });
        } else if (added_by) {
            andParts.push({
                $or: [{ added_by }, { showroom_id: added_by }],
            });
        }

        const filter =
            andParts.length === 0 ? {} : andParts.length === 1 ? andParts[0] : { $and: andParts };

        const parsedSortBy = BaseService.parseSortDirection(sort_by);
        const parsedSortByPrice = BaseService.parseSortDirection(sort_by_price);

        const sort = {
            createdAt: parsedSortBy !== null ? parsedSortBy : -1,
        };

        if (parsedSortByPrice !== null) {
            sort.vehicle_hire_rate_in_figures = parsedSortByPrice;
        }

        const pagination = BaseService.parsePagination({ page, limit });

        const [data, total] = await Promise.all([
            vehicleModel
                .find(filter)
                .sort(sort)
                .skip(pagination.skip)
                .limit(pagination.limit)
                .populate({ path: "showroom_id", select: "name business_name email role address showroom_address" })
                .populate({ path: "added_by", select: "name business_name email role address showroom_address" })
                .lean(),
            vehicleModel.countDocuments(filter),
        ]);

        return {
            data,
            pagination: {
                total,
                page: pagination.page,
                limit: pagination.limit,
                totalPages: Math.ceil(total / pagination.limit) || 0,
            },
        };
    }

    async getVehicleById(vehicleId) {
        return vehicleModel
            .findById(vehicleId)
            .populate({ path: "showroom_id", select: "name business_name email role address showroom_address" })
            .populate({ path: "added_by", select: "name business_name email role address showroom_address" });
    }

    async updateVehicle(vehicleId, updates, actor) {
        const existing = await vehicleModel.findById(vehicleId);
        if (!existing) {
            throwError("Không tìm thấy xe", 404);
        }
        if (actor.role !== "admin" && String(existing.showroom_id) !== String(actor.userId)) {
            throwError("Bạn không có quyền cập nhật xe của showroom khác", 403);
        }

        // Strip protected fields the client should not set directly
        const { added_by: _a, showroom_id: _s, _id: _i, ...safeUpdates } = updates;
        if (safeUpdates.ownership_type && !safeUpdates.source) {
            safeUpdates.source = safeUpdates.ownership_type;
        }
        if (safeUpdates.source && !safeUpdates.ownership_type) {
            safeUpdates.ownership_type = safeUpdates.source;
        }

        const updated = await vehicleModel.findByIdAndUpdate(
            vehicleId,
            { $set: safeUpdates },
            { new: true, runValidators: true }
        );
        await auditLogService.record({
            actor_id: actor.userId,
            actor_role: actor.role,
            action: "vehicle.update",
            entity: "vehicle",
            entity_id: existing._id,
            before: existing.toObject(),
            after: updated?.toObject?.() || updated,
        });
        return updated;
    }

    async deleteVehicleById(vehicleId, actor) {
        const existing = await vehicleModel.findById(vehicleId);
        if (!existing) {
            throwError("Không tìm thấy xe", 404);
        }
        if (actor.role !== "admin" && String(existing.showroom_id) !== String(actor.userId)) {
            throwError("Bạn không có quyền xoá xe của showroom khác", 403);
        }
        const deleted = await vehicleModel.findByIdAndDelete(vehicleId);
        await auditLogService.record({
            actor_id: actor.userId,
            actor_role: actor.role,
            action: "vehicle.delete",
            entity: "vehicle",
            entity_id: existing._id,
            before: existing.toObject(),
            after: null,
        });
        return deleted;
    }
}

module.exports = new VehicleService();
