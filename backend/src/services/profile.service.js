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
        return await UserModel.findByIdAndUpdate(userId, data, { new: true }).select('-password');
    }

    async deleteProfileById(userId) {
        return await UserModel.findByIdAndDelete(userId);
    }
}

module.exports = new ProfileService();