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
            { field: 'createdAt', value: sort_by }
        ]);

        const result = await BaseService.findPaginated(UserModel, filter, sortOptions, pagination);
        const safeData = {
            ...result,
            data: result.data.map(({ password, __v, ...rest }) => rest)
        };
        return safeData;
    }

    async updateProfile(userId, data) {
        const payload = { ...(data || {}) };
        if (Object.prototype.hasOwnProperty.call(payload, 'logo_url')) {
            payload.logo = payload.logo_url;
            delete payload.logo_url;
        }
        if (Object.prototype.hasOwnProperty.call(payload, 'public_address')) {
            const pa = payload.public_address;
            if (pa && !payload.address) payload.address = pa;
            if (pa && !payload.showroom_address) payload.showroom_address = pa;
            delete payload.public_address;
        }
        return await UserModel.findByIdAndUpdate(userId, payload, { new: true }).select('-password');
    }

    async deleteProfileById(userId) {
        return await UserModel.findByIdAndDelete(userId);
    }
}

module.exports = new ProfileService();