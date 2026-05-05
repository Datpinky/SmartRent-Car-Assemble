class BaseService {
    static DEFAULT_PAGE = 1;
    static DEFAULT_LIMIT = 10;
    static MAX_LIMIT = 100;

    static parsePagination(query = {}) {
        const page = Math.max(1, parseInt(query.page, 10) || this.DEFAULT_PAGE);
        const limit = Math.min(
            this.MAX_LIMIT,
            Math.max(1, parseInt(query.limit, 10) || this.DEFAULT_LIMIT)
        );
        const skip = (page - 1) * limit;
        return { page, limit, skip };
    }

    static parseSortDirection(value) {
        if (value == null) return null;
        const num = parseInt(value, 10);
        return num === -1 || num === 1 ? num : null;
    }

    static async findPaginated(Model, filter, sort, { page, limit, skip }) {
        const [data, total] = await Promise.all([
            Model.find(filter).sort(sort).skip(skip).limit(limit).lean(),
            Model.countDocuments(filter),
        ]);
        return {
            data,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit) || 0,
            },
        };
    }
}

module.exports = BaseService;
